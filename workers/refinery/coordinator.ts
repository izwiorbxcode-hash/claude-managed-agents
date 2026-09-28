// SwarmCoordinator — the stateful heart of the refinery. One DO per task
// run (idFromName(taskId)); it owns the negotiation lifecycle:
//
//   fan-out to specialist seats -> persist proposals -> compute the
//   composite quality signal -> Crystallize (auto) or Escalate (HITL) ->
//   on expert resolution, self-heal the vector space and promote the
//   failure into an evaluation case.
//
// All probabilistic output is fenced behind deterministic gates here;
// the DO only writes to D1 / Vectorize when the active data contract is
// satisfied.

import { DurableObject } from "cloudflare:workers";
import { embedTexts } from "./embed";
import { LANGUAGE_CONTRACT, resolveContract, validatePayload } from "./contracts";
import { newId } from "./ids";
import { evaluateQuality, type QualityParams } from "./quality";
import { HUMAN_ANCHOR_KIND, SEMANTIC_KIND, upsertAnchor, upsertAnchors } from "./retrieval";
import type { Proposal, ResolveInput } from "./types";
import {
  claimEscalation,
  createTask,
  evaluatorPerformance,
  getEscalationByTask,
  getProposalsForTask,
  getTask,
  humanVerificationHistory,
  insertEscalation,
  insertEvalCase,
  insertMemory,
  insertProposal,
  insertProvenance,
  insertRecord,
  listTasks,
  pickExpertForTask,
  resolveEscalation,
  setTaskDecision,
  setTaskTeam,
  updateTaskStatus,
  type EscalationRow,
  type RecordRow,
  type TaskRow,
} from "./store";

export interface NegotiateInput {
  taskId: string;
  assetId: string;
  tenant: string;
  vertical: "language";
  text: string;
  contractId: string;
  team: import("./types").SpecialistTeam;
}

export interface DecisionResult {
  status: "crystallized" | "escalated" | "failed";
  taskId: string;
  recordId?: string;
  escalationId?: string;
  quality?: import("./types").CompositeQuality;
  error?: string;
}

function contractFields(contract: typeof LANGUAGE_CONTRACT): string[] {
  return Object.keys(contract.schema);
}

// Merge per-role payloads into a single consensus payload. Later seats
// fill gaps rather than clobbering earlier, higher-confidence fields.
export function consensusPayload(proposals: Proposal[]): Record<string, unknown> {
  const merged: Record<string, unknown> = {};
  for (const p of proposals) {
    for (const [key, value] of Object.entries(p.payload)) {
      if (value === undefined || value === null) continue;
      const existing = merged[key];
      if (existing === undefined) {
        merged[key] = value;
      } else if (typeof value === "object" && !Array.isArray(value) && value !== null) {
        merged[key] = { ...(existing as object), ...(value as object) };
      }
    }
  }
  return merged;
}

function domainCheck(
  text: string,
  languageHints: string[],
  proposals: Proposal[],
): { score: number; detail: unknown } {
  const candidates = proposals
    .map((p) => p.payload?.language)
    .filter((v): v is string => typeof v === "string" && v.length > 0)
    .map((v) => v.toLowerCase());
  if (candidates.length === 0) return { score: 0, detail: { reason: "no language candidate" } };
  const hintHit = languageHints.some((h) => candidates.includes(h));
  const score = hintHit ? 1 : 0.5;
  return { score, detail: { candidates, languageHints, sourceLength: text.length } };
}

function modelVersions(proposals: Proposal[]): unknown {
  return {
    specialists: proposals.map((p) => ({ model: p.modelId, prompt: p.promptVersion, role: p.specialistRole })),
  };
}

export class SwarmCoordinator extends DurableObject<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
  }

  // The negotiation room. Called by the ingestion worker after the cheap
  // profiling + routing steps are done.
  async negotiate(input: NegotiateInput): Promise<DecisionResult> {
    const { taskId, assetId, tenant, vertical, text, contractId } = input;
    const db = this.env.DB;
    const start = Date.now();

    try {
      await updateTaskStatus(db, taskId, "analyzing", "analyzing", { contractId });
      await setTaskTeam(db, taskId, JSON.stringify(input.team));
      await insertProvenance(db, {
        provenanceId: newId("prov_"),
        taskId,
        step: "route",
        refType: "task",
        refId: taskId,
        detail: { assignments: input.team.assignments.map((a) => a.role), anchors: input.team.anchors.length },
      });

      const contract = await resolveContract(this.env, vertical);
      const fields = contractFields(contract);

      // Fan out to specialist seats in parallel. A seat failure must not
      // kill the run: it is recorded as a zero-confidence proposal so the
      // quality engine honestly reports the loss of coverage.
      const assignments = input.team.assignments;
      const proposals: Proposal[] = await Promise.all(
        assignments.map(async (assignment) => {
          // DO stubs are RPC proxies; in the committed workers-types the
          // stub's RPC surface can resolve to `never` for methods whose
          // params span modules. Casting to the class type is accurate.
          const stub = this.env.SpecialistAgent.get(
            this.env.SpecialistAgent.idFromName(assignment.agentKey),
          ) as unknown as import("./specialist").SpecialistAgent;
          try {
            const p = await stub.analyze(assignment, { taskId, text, contractFields: fields });
            await insertProposal(db, {
              proposalId: p.proposalId,
              taskId,
              specialistRole: p.specialistRole,
              agentKey: p.agentKey,
              modelId: p.modelId,
              promptVersion: p.promptVersion,
              independenceJson: JSON.stringify(assignment.independence),
              payloadJson: JSON.stringify(p.payload),
              confidence: p.confidence,
              uncertaintyJson: JSON.stringify(p.uncertainty),
              provenanceJson: JSON.stringify({ evidenceIds: p.evidenceIds }),
              createdAtMs: Date.now(),
            });
            await insertProvenance(db, {
              provenanceId: newId("prov_"),
              taskId,
              step: "analyze",
              refType: "proposal",
              refId: p.proposalId,
              detail: { role: p.specialistRole, model: p.modelId },
            });
            return p;
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            const failed: Proposal = {
              proposalId: newId("proposal_"),
              taskId,
              specialistRole: assignment.role,
              agentKey: assignment.agentKey,
              modelId: assignment.modelId,
              promptVersion: assignment.promptVersion,
              confidence: 0,
              uncertainty: [`specialist failed: ${message}`],
              payload: {},
              evidenceIds: assignment.independence.evidenceIds,
            };
            await insertProposal(db, {
              proposalId: failed.proposalId,
              taskId,
              specialistRole: failed.specialistRole,
              agentKey: failed.agentKey,
              modelId: failed.modelId,
              promptVersion: failed.promptVersion,
              independenceJson: JSON.stringify(assignment.independence),
              payloadJson: JSON.stringify(failed.payload),
              confidence: 0,
              uncertaintyJson: JSON.stringify(failed.uncertainty),
              provenanceJson: "{}",
              createdAtMs: Date.now(),
            });
            return failed;
          }
        }),
      );

      if (proposals.length === 0) {
        throw new Error("no specialist proposals produced");
      }

      // Composite quality — embeddings of the serialized payloads measure
      // real semantic agreement between independent seats.
      const payloadTexts = proposals.map((p) => JSON.stringify(p.payload));
      const agreementVectors = await embedTexts(this.env, payloadTexts);
      const consensus = consensusPayload(proposals);
      const validation = validatePayload(contract, consensus);
      const [evaluatorScore, humanHistory] = await Promise.all([
        evaluatorPerformance(db),
        humanVerificationHistory(db),
      ]);

      const params: QualityParams = {
        proposals,
        contract,
        validation,
        anchors: input.team.anchors,
        retrievalEvidence: input.team.retrievedEvidence,
        agreementVectors,
        domainCheck: domainCheck(text, [], proposals),
        evaluatorPerformance: evaluatorScore,
        humanVerificationHistory: humanHistory,
      };
      const quality = evaluateQuality(params);
      await setTaskDecision(db, taskId, JSON.stringify({ decision: quality.satisfied ? "crystallize" : "escalate" }), JSON.stringify(quality));
      await updateTaskStatus(db, taskId, quality.satisfied ? "crystallized" : "escalated", "evaluating");

      await insertMemory(db, {
        memoryId: newId("mem_"),
        kind: "episodic",
        vertical,
        tenant,
        refId: taskId,
        content: { outcome: quality.satisfied ? "crystallized" : "escalated", overall: quality.overall, auto: quality.satisfied ? 1 : 0 },
        tags: ["negotiation"],
      });

      if (quality.satisfied) {
        return await this.crystallize(taskId, assetId, tenant, vertical, contractId, consensus, quality, proposals, null);
      }

      return await this.escalate(taskId, assetId, tenant, vertical, quality, proposals, languageHintFrom(consensus));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await updateTaskStatus(db, taskId, "failed", "failed", { error: message }).catch(() => {});
      console.error(`[izwa] coordinator negotiate failed for ${taskId}: ${message}`);
      return { status: "failed", taskId, error: message };
    }
  }

  // Expert resolution endpoint. Self-heals the vector space with a human
  // anchor, crystallizes the verified record, promotes the failure to an
  // evaluation case, and updates the expert's performance stats.
  async resolve(input: ResolveInput): Promise<DecisionResult> {
    const { taskId, escalationId, expertId, correction, resolutionText } = input;
    const db = this.env.DB;
    try {
      const task = await getTask(db, taskId);
      if (!task) return { status: "failed", taskId, error: "task not found" };
      const contract = await resolveContract(this.env, task.vertical);
      const proposals = await getProposalsForTask(db, taskId).then((rows) =>
        rows.map((r) => ({
          proposalId: r.proposalId,
          taskId: r.taskId,
          specialistRole: r.specialistRole as Proposal["specialistRole"],
          agentKey: r.agentKey,
          modelId: r.modelId,
          promptVersion: r.promptVersion,
          confidence: r.confidence ?? 0,
          uncertainty: safeArr(r.uncertaintyJson),
          payload: safeObj(r.payloadJson),
          evidenceIds: safeIds(r.provenanceJson),
        })),
      );

      // 1. Human anchor → Vectorize (self-healing routing).
      const [vector] = await embedTexts(this.env, [resolutionText || JSON.stringify(correction)]);
      const anchorId = `human_anchor_${taskId}`;
      await upsertAnchor(this.env, {
        id: anchorId,
        values: vector,
        kind: HUMAN_ANCHOR_KIND,
        metadata: { taskId, expertId, language: languageHintFrom(correction), source: "human_expert" },
      });

      // 2. Verified payload: human correction on top of the debate.
      const consensus = { ...consensusPayload(proposals), ...correction };
      const validation = validatePayload(contract, consensus);
      const quality = evaluateQuality({
        proposals,
        contract,
        validation,
        anchors: [],
        retrievalEvidence: [],
        agreementVectors: [],
        domainCheck: { score: 1, detail: { humanVerified: true } },
        evaluatorPerformance: await evaluatorPerformance(db),
        humanVerificationHistory: 1,
      });

      // 3. Crystallize the verified record.
      const record = await this.insertVerifiedRecord(task, contract.contractId, consensus, quality, proposals, expertId);

      // 4. Close the escalation, promote the failure to an eval case.
      await resolveEscalation(db, escalationId, JSON.stringify({ correction, expertId }), record.recordId);
      await insertEvalCase(db, {
        evalId: newId("eval_"),
        vertical: task.vertical,
        kind: "regression",
        sourceTaskId: taskId,
        inputJson: JSON.stringify({ taskId, assetId: task.assetId }),
        expectedJson: JSON.stringify(consensus),
        status: "active",
        createdAtMs: Date.now(),
      });
      await updateTaskStatus(db, taskId, "crystallized", "resolved");
      await insertMemory(db, {
        memoryId: newId("mem_"),
        kind: "episodic",
        vertical: task.vertical,
        tenant: task.tenant,
        refId: taskId,
        content: { outcome: "human_verified", auto: 0, language: languageHintFrom(consensus), expertId },
        tags: ["resolution", "hitl"],
      });
      await insertProvenance(db, {
        provenanceId: newId("prov_"),
        recordId: record.recordId,
        taskId,
        step: "resolve",
        refType: "expert",
        refId: expertId,
        detail: { anchorId },
      });
      await insertProvenance(db, {
        provenanceId: newId("prov_"),
        recordId: record.recordId,
        taskId,
        step: "crystallize",
        refType: "record",
        refId: record.recordId,
        detail: { verificationStatus: "human_verified" },
      });

      return { status: "crystallized", taskId, recordId: record.recordId, quality };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[izwa] coordinator resolve failed for ${taskId}: ${message}`);
      return { status: "failed", taskId, error: message };
    }
  }

  // Read path for the dashboard / API: task + proposals + escalation + record.
  async status(taskId: string): Promise<{
    task: TaskRow | null;
    proposals: Proposal[];
    escalation: EscalationRow | null;
    record: RecordRow | null;
  }> {
    const db = this.env.DB;
    const [task, proposalRows, escalation] = await Promise.all([
      getTask(db, taskId),
      getProposalsForTask(db, taskId),
      getEscalationByTask(db, taskId),
    ]);
    let record: RecordRow | null = null;
    if (escalation?.resolvedRecordId) {
      record = await db
        .prepare(`SELECT * FROM izwa_records WHERE record_id = ?`)
        .bind(escalation.resolvedRecordId)
        .first<Record<string, unknown>>() as unknown as RecordRow | null;
    } else if (task?.status === "crystallized") {
      record = await db
        .prepare(`SELECT * FROM izwa_records WHERE task_id = ? ORDER BY created_at_ms DESC LIMIT 1`)
        .bind(taskId)
        .first<Record<string, unknown>>() as unknown as RecordRow | null;
    }
    const proposals: Proposal[] = proposalRows.map((r) => ({
      proposalId: r.proposalId,
      taskId: r.taskId,
      specialistRole: r.specialistRole as Proposal["specialistRole"],
      agentKey: r.agentKey,
      modelId: r.modelId,
      promptVersion: r.promptVersion,
      confidence: r.confidence ?? 0,
      uncertainty: safeArr(r.uncertaintyJson),
      payload: safeObj(r.payloadJson),
      evidenceIds: [],
    }));
    return { task, proposals, escalation, record };
  }

  private async crystallize(
    taskId: string,
    assetId: string,
    tenant: string,
    vertical: "language",
    contractId: string,
    payload: Record<string, unknown>,
    quality: import("./types").CompositeQuality,
    proposals: Proposal[],
    expertId: string | null,
  ): Promise<DecisionResult> {
    const db = this.env.DB;
    const recordId = newId("record_");
    const versions = modelVersions(proposals);
    const record: RecordRow = {
      recordId,
      taskId,
      contractId,
      vertical,
      tenant,
      payloadJson: JSON.stringify(payload),
      qualityJson: JSON.stringify(quality),
      verificationStatus: expertId ? "human_verified" : "auto",
      verifiedBy: expertId,
      modelVersionsJson: JSON.stringify(versions),
      schemaVersion: "language-v1",
      provenanceJson: JSON.stringify({ taskId, assetId, proposals: proposals.map((p) => p.proposalId) }),
      createdAtMs: Date.now(),
      exportStatus: "pending",
    };
    await insertRecord(db, record);

    // Semantic memory: the crystallized payload becomes a vector so future
    // similar inputs route to this precedent instead of cold-starting.
    const [vector] = await embedTexts(this.env, [JSON.stringify(payload)]);
    const semanticId = `semantic_${recordId}`;
    await upsertAnchor(this.env, {
      id: semanticId,
      values: vector,
      kind: SEMANTIC_KIND,
      metadata: { recordId, taskId, language: languageHintFrom(payload) },
    });

    await insertProvenance(db, {
      provenanceId: newId("prov_"),
      recordId,
      taskId,
      step: "crystallize",
      refType: "record",
      refId: recordId,
      detail: { quality: quality.overall, verificationStatus: record.verificationStatus },
    });

    return { status: "crystallized", taskId, recordId, quality };
  }

  private async escalate(
    taskId: string,
    assetId: string,
    tenant: string,
    vertical: "language",
    quality: import("./types").CompositeQuality,
    proposals: Proposal[],
    languageHint: string | null,
  ): Promise<DecisionResult> {
    const db = this.env.DB;
    const escalationId = newId("escalation_");
    await insertEscalation(db, {
      escalationId,
      taskId,
      assetId,
      tenant,
      status: "open",
      reasonJson: JSON.stringify({
        overall: quality.overall,
        threshold: quality.threshold,
        unsatisfiedGates: quality.unsatisfiedGates,
        components: quality.components.map((c) => ({ name: c.name, score: c.score })),
      }),
      debateJson: JSON.stringify({
        proposals: proposals.map((p) => ({ role: p.specialistRole, confidence: p.confidence, uncertainty: p.uncertainty, payload: p.payload })),
        quality,
      }),
      expertId: null,
      resolutionJson: null,
      resolvedRecordId: null,
      createdAtMs: Date.now(),
      claimedAtMs: null,
      resolvedAtMs: null,
    });

    // Autonomous expert routing: pre-claim the task for the most-qualified
    // native speaker so the HITL dashboard can surface it immediately.
    try {
      const expert = await pickExpertForTask(db, { taskClass: "linguist", language: languageHint ?? undefined });
      if (expert) {
        await claimEscalation(db, escalationId, expert.expertId);
      }
    } catch (error) {
      console.warn(`[izwa] expert routing failed for ${taskId}: ${error instanceof Error ? error.message : String(error)}`);
    }

    await insertProvenance(db, {
      provenanceId: newId("prov_"),
      taskId,
      step: "escalate",
      refType: "task",
      refId: taskId,
      detail: { escalationId, overall: quality.overall, gates: quality.unsatisfiedGates },
    });

    return { status: "escalated", taskId, escalationId, quality };
  }

  private async insertVerifiedRecord(
    task: TaskRow,
    contractId: string,
    payload: Record<string, unknown>,
    quality: import("./types").CompositeQuality,
    proposals: Proposal[],
    expertId: string,
  ): Promise<RecordRow> {
    const db = this.env.DB;
    const recordId = newId("record_");
    const record: RecordRow = {
      recordId,
      taskId: task.taskId,
      contractId,
      vertical: task.vertical,
      tenant: task.tenant,
      payloadJson: JSON.stringify(payload),
      qualityJson: JSON.stringify(quality),
      verificationStatus: "human_verified",
      verifiedBy: expertId,
      modelVersionsJson: JSON.stringify(modelVersions(proposals)),
      schemaVersion: "language-v1",
      provenanceJson: JSON.stringify({ taskId: task.taskId, assetId: task.assetId }),
      createdAtMs: Date.now(),
      exportStatus: "pending",
    };
    await insertRecord(db, record);
    return record;
  }
}

function languageHintFrom(payload: Record<string, unknown>): string | null {
  const lang = payload?.language ?? payload?.dialect;
  return typeof lang === "string" && lang.length > 0 ? lang.toLowerCase() : null;
}

function safeArr(text: string): string[] {
  try {
    const v = JSON.parse(text);
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return [];
  }
}

function safeObj(text: string): Record<string, unknown> {
  try {
    const v = JSON.parse(text);
    return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function safeIds(text: string): string[] {
  try {
    const v = JSON.parse(text) as { evidenceIds?: unknown };
    return Array.isArray(v.evidenceIds) ? v.evidenceIds.map(String) : [];
  } catch {
    return [];
  }
}
