// D1-backed persistence for the IZWA refinery kernel. Thin wrappers in
// the style of `src/storage.ts` — handlers own the JSON serialization of
// nested payloads; the store owns the SQL.

import type { Modality, QualityContract, TaskStatus, Vertical } from "./types.js";

const nowMs = () => Date.now();

// ---------------------------------------------------------------------------
// Assets
// ---------------------------------------------------------------------------

export interface AssetRow {
  assetId: string;
  modality: Modality;
  tenant: string;
  source: string | null;
  contentHash: string;
  sizeBytes: number | null;
  mimeType: string | null;
  textContent: string | null;
  r2Key: string | null;
  profileJson: string;
  metaJson: string | null;
  createdAtMs: number;
}

export async function createAsset(db: D1Database, a: AssetRow): Promise<void> {
  await db
    .prepare(
      `INSERT INTO izwa_assets (asset_id, modality, tenant, source, content_hash, size_bytes, mime_type, text_content, r2_key, profile_json, meta_json, created_at_ms)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)`,
    )
    .bind(
      a.assetId,
      a.modality,
      a.tenant,
      a.source,
      a.contentHash,
      a.sizeBytes,
      a.mimeType,
      a.textContent,
      a.r2Key,
      a.profileJson,
      a.metaJson,
      a.createdAtMs,
    )
    .run();
}

export async function getAsset(db: D1Database, assetId: string): Promise<AssetRow | null> {
  const row = await db
    .prepare(`SELECT * FROM izwa_assets WHERE asset_id = ?`)
    .bind(assetId)
    .first<Record<string, unknown>>();
  return row ? rowFromDb<AssetRow>(row) : null;
}

export async function findByContentHash(db: D1Database, hash: string): Promise<AssetRow | null> {
  const row = await db
    .prepare(`SELECT * FROM izwa_assets WHERE content_hash = ? ORDER BY created_at_ms DESC LIMIT 1`)
    .bind(hash)
    .first<Record<string, unknown>>();
  return row ? rowFromDb<AssetRow>(row) : null;
}

// ---------------------------------------------------------------------------
// Tasks
// ---------------------------------------------------------------------------

export interface TaskRow {
  taskId: string;
  assetId: string;
  vertical: Vertical;
  tenant: string;
  status: TaskStatus;
  phase: string;
  contractId: string | null;
  teamJson: string | null;
  compositeQualityJson: string | null;
  decisionJson: string | null;
  error: string | null;
  createdAtMs: number;
  updatedAtMs: number;
}

export async function createTask(db: D1Database, t: TaskRow): Promise<void> {
  const now = t.createdAtMs ?? nowMs();
  await db
    .prepare(
      `INSERT INTO izwa_tasks (task_id, asset_id, vertical, tenant, status, phase, contract_id, team_json, composite_quality_json, decision_json, error, created_at_ms, updated_at_ms)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)`,
    )
    .bind(
      t.taskId,
      t.assetId,
      t.vertical,
      t.tenant,
      t.status,
      t.phase,
      t.contractId,
      t.teamJson,
      t.compositeQualityJson,
      t.decisionJson,
      t.error,
      now,
      now,
    )
    .run();
}

export async function getTask(db: D1Database, taskId: string): Promise<TaskRow | null> {
  const row = await db
    .prepare(`SELECT * FROM izwa_tasks WHERE task_id = ?`)
    .bind(taskId)
    .first<Record<string, unknown>>();
  return row ? rowFromDb<TaskRow>(row) : null;
}

export async function updateTaskStatus(
  db: D1Database,
  taskId: string,
  status: TaskStatus,
  phase: string,
  opts: { error?: string; contractId?: string } = {},
): Promise<void> {
  await db
    .prepare(
      `UPDATE izwa_tasks SET status = ?2, phase = ?3, error = COALESCE(?4, error), contract_id = COALESCE(?5, contract_id), updated_at_ms = ?6 WHERE task_id = ?1`,
    )
    .bind(taskId, status, phase, opts.error ?? null, opts.contractId ?? null, nowMs())
    .run();
}

export async function setTaskTeam(db: D1Database, taskId: string, teamJson: string): Promise<void> {
  await db
    .prepare(`UPDATE izwa_tasks SET team_json = ?2, updated_at_ms = ?3 WHERE task_id = ?1`)
    .bind(taskId, teamJson, nowMs())
    .run();
}

export async function setTaskDecision(
  db: D1Database,
  taskId: string,
  decisionJson: string,
  qualityJson: string,
): Promise<void> {
  await db
    .prepare(
      `UPDATE izwa_tasks SET decision_json = ?2, composite_quality_json = ?3, updated_at_ms = ?4 WHERE task_id = ?1`,
    )
    .bind(taskId, decisionJson, qualityJson, nowMs())
    .run();
}

export async function listTasks(
  db: D1Database,
  opts: { status?: string; tenant?: string; limit?: number; offset?: number } = {},
): Promise<TaskRow[]> {
  const { status, tenant, limit = 50, offset = 0 } = opts;
  const where: string[] = [];
  const params: unknown[] = [];
  if (status) {
    where.push("status = ?");
    params.push(status);
  }
  if (tenant) {
    where.push("tenant = ?");
    params.push(tenant);
  }
  const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";
  params.push(limit, offset);
  const rows = await db
    .prepare(`SELECT * FROM izwa_tasks ${clause} ORDER BY created_at_ms DESC LIMIT ? OFFSET ?`)
    .bind(...params)
    .all<Record<string, unknown>>();
  return (rows.results ?? []).map((r) => rowFromDb<TaskRow>(r));
}

// ---------------------------------------------------------------------------
// Proposals
// ---------------------------------------------------------------------------

export interface ProposalRow {
  proposalId: string;
  taskId: string;
  specialistRole: string;
  agentKey: string;
  modelId: string;
  promptVersion: string;
  independenceJson: string;
  payloadJson: string;
  confidence: number | null;
  uncertaintyJson: string;
  provenanceJson: string;
  createdAtMs: number;
}

export async function insertProposal(db: D1Database, p: ProposalRow): Promise<void> {
  await db
    .prepare(
      `INSERT INTO izwa_proposals (proposal_id, task_id, specialist_role, agent_key, model_id, prompt_version, independence_json, payload_json, confidence, uncertainty_json, provenance_json, created_at_ms)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)`,
    )
    .bind(
      p.proposalId,
      p.taskId,
      p.specialistRole,
      p.agentKey,
      p.modelId,
      p.promptVersion,
      p.independenceJson,
      p.payloadJson,
      p.confidence,
      p.uncertaintyJson,
      p.provenanceJson,
      p.createdAtMs,
    )
    .run();
}

export async function getProposalsForTask(db: D1Database, taskId: string): Promise<ProposalRow[]> {
  const rows = await db
    .prepare(`SELECT * FROM izwa_proposals WHERE task_id = ? ORDER BY created_at_ms ASC`)
    .bind(taskId)
    .all<Record<string, unknown>>();
  return (rows.results ?? []).map((r) => rowFromDb<ProposalRow>(r));
}

// ---------------------------------------------------------------------------
// Contracts
// ---------------------------------------------------------------------------

export async function saveContract(db: D1Database, contract: QualityContract): Promise<void> {
  await db
    .prepare(
      `INSERT INTO izwa_quality_contracts (contract_id, vertical, version, name, spec_json, active, created_at_ms)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
       ON CONFLICT(vertical, version) DO UPDATE SET
         spec_json = ?5, active = ?6, created_at_ms = ?7`,
    )
    .bind(
      contract.contractId,
      contract.vertical,
      contract.version,
      contract.name,
      JSON.stringify(contract),
      contract.version === "v1" ? 1 : 0,
      nowMs(),
    )
    .run();
}

export async function listContracts(db: D1Database, vertical?: string): Promise<QualityContract[]> {
  const rows = vertical
    ? await db
        .prepare(`SELECT spec_json FROM izwa_quality_contracts WHERE vertical = ? ORDER BY created_at_ms DESC`)
        .bind(vertical)
        .all<{ spec_json: string }>()
    : await db
        .prepare(`SELECT spec_json FROM izwa_quality_contracts ORDER BY created_at_ms DESC`)
        .all<{ spec_json: string }>();
  const out: QualityContract[] = [];
  for (const r of rows.results ?? []) {
    try {
      out.push(JSON.parse(r.spec_json) as QualityContract);
    } catch {
      // skip malformed rows
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Records
// ---------------------------------------------------------------------------

export interface RecordRow {
  recordId: string;
  taskId: string;
  contractId: string;
  vertical: Vertical;
  tenant: string;
  payloadJson: string;
  qualityJson: string;
  verificationStatus: "auto" | "human_verified";
  verifiedBy: string | null;
  modelVersionsJson: string;
  schemaVersion: string;
  provenanceJson: string;
  createdAtMs: number;
  exportStatus: string;
}

export async function insertRecord(db: D1Database, r: RecordRow): Promise<void> {
  await db
    .prepare(
      `INSERT INTO izwa_records (record_id, task_id, contract_id, vertical, tenant, payload_json, quality_json, verification_status, verified_by, model_versions_json, schema_version, provenance_json, created_at_ms, export_status)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14)`,
    )
    .bind(
      r.recordId,
      r.taskId,
      r.contractId,
      r.vertical,
      r.tenant,
      r.payloadJson,
      r.qualityJson,
      r.verificationStatus,
      r.verifiedBy,
      r.modelVersionsJson,
      r.schemaVersion,
      r.provenanceJson,
      r.createdAtMs,
      r.exportStatus,
    )
    .run();
}

export async function getRecord(db: D1Database, recordId: string): Promise<RecordRow | null> {
  const row = await db
    .prepare(`SELECT * FROM izwa_records WHERE record_id = ?`)
    .bind(recordId)
    .first<Record<string, unknown>>();
  return row ? rowFromDb<RecordRow>(row) : null;
}

export async function listRecords(
  db: D1Database,
  opts: { tenant?: string; limit?: number; offset?: number } = {},
): Promise<RecordRow[]> {
  const { tenant, limit = 50, offset = 0 } = opts;
  const params: unknown[] = [];
  const where = tenant ? ["tenant = ?"] : [];
  if (tenant) params.push(tenant);
  const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";
  params.push(limit, offset);
  const rows = await db
    .prepare(`SELECT * FROM izwa_records ${clause} ORDER BY created_at_ms DESC LIMIT ? OFFSET ?`)
    .bind(...params)
    .all<Record<string, unknown>>();
  return (rows.results ?? []).map((r) => rowFromDb<RecordRow>(r));
}

export async function markRecordsExported(db: D1Database, recordIds: string[]): Promise<number> {
  if (recordIds.length === 0) return 0;
  const placeholders = recordIds.map(() => "?").join(",");
  const res = await db
    .prepare(`UPDATE izwa_records SET export_status = 'exported' WHERE record_id IN (${placeholders})`)
    .bind(...recordIds)
    .run();
  return res.meta?.changes ?? 0;
}

// ---------------------------------------------------------------------------
// Escalations
// ---------------------------------------------------------------------------

export interface EscalationRow {
  escalationId: string;
  taskId: string;
  assetId: string;
  tenant: string;
  status: "open" | "claimed" | "resolved" | "rejected";
  reasonJson: string;
  debateJson: string | null;
  expertId: string | null;
  resolutionJson: string | null;
  resolvedRecordId: string | null;
  createdAtMs: number;
  claimedAtMs: number | null;
  resolvedAtMs: number | null;
}

export async function insertEscalation(db: D1Database, e: EscalationRow): Promise<void> {
  await db
    .prepare(
      `INSERT INTO izwa_escalations (escalation_id, task_id, asset_id, tenant, status, reason_json, debate_json, expert_id, resolution_json, resolved_record_id, created_at_ms, claimed_at_ms, resolved_at_ms)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)`,
    )
    .bind(
      e.escalationId,
      e.taskId,
      e.assetId,
      e.tenant,
      e.status,
      e.reasonJson,
      e.debateJson,
      e.expertId,
      e.resolutionJson,
      e.resolvedRecordId,
      e.createdAtMs,
      e.claimedAtMs,
      e.resolvedAtMs,
    )
    .run();
}

export async function getEscalation(db: D1Database, escalationId: string): Promise<EscalationRow | null> {
  const row = await db
    .prepare(`SELECT * FROM izwa_escalations WHERE escalation_id = ?`)
    .bind(escalationId)
    .first<Record<string, unknown>>();
  return row ? rowFromDb<EscalationRow>(row) : null;
}

export async function getEscalationByTask(db: D1Database, taskId: string): Promise<EscalationRow | null> {
  const row = await db
    .prepare(`SELECT * FROM izwa_escalations WHERE task_id = ? ORDER BY created_at_ms DESC LIMIT 1`)
    .bind(taskId)
    .first<Record<string, unknown>>();
  return row ? rowFromDb<EscalationRow>(row) : null;
}

export async function listOpenEscalations(
  db: D1Database,
  opts: { tenant?: string; limit?: number } = {},
): Promise<EscalationRow[]> {
  const { tenant, limit = 50 } = opts;
  const params: unknown[] = [];
  let clause = "WHERE status IN ('open', 'claimed')";
  if (tenant) {
    clause += " AND tenant = ?";
    params.push(tenant);
  }
  params.push(limit);
  const rows = await db
    .prepare(`SELECT * FROM izwa_escalations ${clause} ORDER BY created_at_ms ASC LIMIT ?`)
    .bind(...params)
    .all<Record<string, unknown>>();
  return (rows.results ?? []).map((r) => rowFromDb<EscalationRow>(r));
}

export async function claimEscalation(
  db: D1Database,
  escalationId: string,
  expertId: string,
): Promise<void> {
  await db
    .prepare(
      `UPDATE izwa_escalations SET status = 'claimed', expert_id = ?2, claimed_at_ms = ?3 WHERE escalation_id = ?1 AND status = 'open'`,
    )
    .bind(escalationId, expertId, nowMs())
    .run();
}

export async function resolveEscalation(
  db: D1Database,
  escalationId: string,
  resolutionJson: string,
  resolvedRecordId: string,
): Promise<void> {
  await db
    .prepare(
      `UPDATE izwa_escalations SET status = 'resolved', resolution_json = ?2, resolved_record_id = ?3, resolved_at_ms = ?4 WHERE escalation_id = ?1`,
    )
    .bind(escalationId, resolutionJson, resolvedRecordId, nowMs())
    .run();
}

// ---------------------------------------------------------------------------
// Experts
// ---------------------------------------------------------------------------

export interface ExpertRow {
  expertId: string;
  name: string;
  rolesJson: string;
  languagesJson: string;
  taskClassesJson: string;
  statsJson: string;
  active: number;
  createdAtMs: number;
}

export async function upsertExpert(db: D1Database, e: ExpertRow): Promise<void> {
  await db
    .prepare(
      `INSERT INTO izwa_experts (expert_id, name, roles_json, languages_json, task_classes_json, stats_json, active, created_at_ms)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
       ON CONFLICT(expert_id) DO UPDATE SET
         name = ?2, roles_json = ?3, languages_json = ?4, task_classes_json = ?5, active = ?7`,
    )
    .bind(e.expertId, e.name, e.rolesJson, e.languagesJson, e.taskClassesJson, e.statsJson, e.active, e.createdAtMs)
    .run();
}

export async function listExperts(db: D1Database): Promise<ExpertRow[]> {
  const rows = await db
    .prepare(`SELECT * FROM izwa_experts WHERE active = 1 ORDER BY created_at_ms DESC`)
    .all<Record<string, unknown>>();
  return (rows.results ?? []).map((r) => rowFromDb<ExpertRow>(r));
}

// Autonomous expert routing: pick the most-qualified available expert for
// a task class. Prefers experts with the language + task class and the
// fewest outstanding conflicts. Pure-preference, overridable by policy.
export async function pickExpertForTask(
  db: D1Database,
  opts: { taskClass?: string; language?: string },
): Promise<ExpertRow | null> {
  const experts = await listExperts(db);
  if (experts.length === 0) return null;
  let best: ExpertRow | null = null;
  let bestScore = -1;
  for (const e of experts) {
    let score = 0;
    try {
      const roles = JSON.parse(e.rolesJson) as string[];
      const languages = JSON.parse(e.languagesJson) as string[];
      const classes = JSON.parse(e.taskClassesJson) as string[];
      if (opts.taskClass && classes.includes(opts.taskClass)) score += 3;
      if (opts.language && languages.includes(opts.language)) score += 2;
      if (roles.includes("linguist")) score += 1;
      const stats = JSON.parse(e.statsJson) as { resolved?: number };
      score += Math.min(2, (stats.resolved ?? 0) / 10);
    } catch {
      // ignore malformed rows
    }
    if (score > bestScore) {
      bestScore = score;
      best = e;
    }
  }
  return best;
}

// ---------------------------------------------------------------------------
// Evaluation cases
// ---------------------------------------------------------------------------

export interface EvalCaseRow {
  evalId: string;
  vertical: Vertical;
  kind: string;
  sourceTaskId: string | null;
  inputJson: string;
  expectedJson: string;
  status: string;
  createdAtMs: number;
}

export async function insertEvalCase(db: D1Database, c: EvalCaseRow): Promise<void> {
  await db
    .prepare(
      `INSERT INTO izwa_eval_cases (eval_id, vertical, kind, source_task_id, input_json, expected_json, status, created_at_ms)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)`,
    )
    .bind(c.evalId, c.vertical, c.kind, c.sourceTaskId, c.inputJson, c.expectedJson, c.status, c.createdAtMs)
    .run();
}

export async function listEvalCases(
  db: D1Database,
  opts: { vertical?: string; kind?: string; limit?: number } = {},
): Promise<EvalCaseRow[]> {
  const { vertical, kind, limit = 50 } = opts;
  const where: string[] = [];
  const params: unknown[] = [];
  if (vertical) {
    where.push("vertical = ?");
    params.push(vertical);
  }
  if (kind) {
    where.push("kind = ?");
    params.push(kind);
  }
  const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";
  params.push(limit);
  const rows = await db
    .prepare(`SELECT * FROM izwa_eval_cases ${clause} ORDER BY created_at_ms DESC LIMIT ?`)
    .bind(...params)
    .all<Record<string, unknown>>();
  return (rows.results ?? []).map((r) => rowFromDb<EvalCaseRow>(r));
}

// Historical specialist/evaluator accuracy — how often a specialist seat's
// output survived the quality contract without human correction. Seeded
// from resolution statistics in episodic memory; returns 0.5 (unknown)
// when there's no history yet.
export async function evaluatorPerformance(db: D1Database): Promise<number> {
  const row = await db
    .prepare(
      `SELECT COUNT(*) AS resolved, SUM(CASE WHEN json_extract(content_json, '$.auto') = 1 THEN 1 ELSE 0 END) AS auto
       FROM izwa_memory WHERE kind = 'episodic'`,
    )
    .first<{ resolved: number; auto: number }>();
  const resolved = row?.resolved ?? 0;
  if (resolved === 0) return 0.5;
  const auto = row?.auto ?? 0;
  return Math.min(1, auto / resolved);
}

// Similarity-weighted human verification history: if the same input
// language hint has been human-verified before, later items on that
// dialect cluster benefit from the precedent.
export async function humanVerificationHistory(db: D1Database, languageHint?: string): Promise<number> {
  if (!languageHint) return 0.5;
  const row = await db
    .prepare(
      `SELECT COUNT(*) AS n FROM izwa_memory
       WHERE kind = 'episodic' AND json_extract(content_json, '$.language') = ?`,
    )
    .bind(languageHint)
    .first<{ n: number }>();
  const n = row?.n ?? 0;
  return Math.min(1, 0.5 + n * 0.1);
}

// ---------------------------------------------------------------------------
// Memory (episodic / policy) + provenance + versions
// ---------------------------------------------------------------------------

export async function insertMemory(
  db: D1Database,
  m: { memoryId: string; kind: string; vertical: string; tenant?: string; refId?: string; content: unknown; tags?: string[] },
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO izwa_memory (memory_id, kind, vertical, tenant, ref_id, content_json, tags_json, created_at_ms)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)`,
    )
    .bind(
      m.memoryId,
      m.kind,
      m.vertical,
      m.tenant ?? "default",
      m.refId ?? null,
      JSON.stringify(m.content),
      JSON.stringify(m.tags ?? []),
      nowMs(),
    )
    .run();
}

export async function listMemory(
  db: D1Database,
  opts: { kind?: string; vertical?: string; limit?: number } = {},
): Promise<{ memoryId: string; kind: string; vertical: string; refId: string | null; content: unknown; tags: string[]; createdAtMs: number }[]> {
  const { kind, vertical, limit = 50 } = opts;
  const where: string[] = [];
  const params: unknown[] = [];
  if (kind) {
    where.push("kind = ?");
    params.push(kind);
  }
  if (vertical) {
    where.push("vertical = ?");
    params.push(vertical);
  }
  const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";
  params.push(limit);
  const rows = await db
    .prepare(`SELECT * FROM izwa_memory ${clause} ORDER BY created_at_ms DESC LIMIT ?`)
    .bind(...params)
    .all<{ memory_id: string; kind: string; vertical: string; ref_id: string | null; content_json: string; tags_json: string; created_at_ms: number }>();
  return (rows.results ?? []).map((r) => ({
    memoryId: r.memory_id,
    kind: r.kind,
    vertical: r.vertical,
    refId: r.ref_id,
    content: safeJson(r.content_json),
    tags: Array.isArray(safeJson(r.tags_json)) ? (safeJson(r.tags_json) as string[]) : [],
    createdAtMs: r.created_at_ms,
  }));
}

export async function insertProvenance(
  db: D1Database,
  p: {
    provenanceId: string;
    recordId?: string | null;
    taskId: string;
    step: string;
    refType: string;
    refId: string;
    detail?: unknown;
  },
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO izwa_provenance (provenance_id, record_id, task_id, step, ref_type, ref_id, detail_json, created_at_ms)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)`,
    )
    .bind(p.provenanceId, p.recordId ?? null, p.taskId, p.step, p.refType, p.refId, JSON.stringify(p.detail ?? {}), nowMs())
    .run();
}

export async function getLineage(db: D1Database, taskId: string): Promise<
  { provenanceId: string; step: string; refType: string; refId: string; detail: unknown; createdAtMs: number }[]
> {
  const rows = await db
    .prepare(
      `SELECT provenance_id, step, ref_type, ref_id, detail_json, created_at_ms
       FROM izwa_provenance WHERE task_id = ? ORDER BY created_at_ms ASC`,
    )
    .bind(taskId)
    .all<{ provenance_id: string; step: string; ref_type: string; ref_id: string; detail_json: string; created_at_ms: number }>();
  return (rows.results ?? []).map((r) => ({
    provenanceId: r.provenance_id,
    step: r.step,
    refType: r.ref_type,
    refId: r.ref_id,
    detail: safeJson(r.detail_json),
    createdAtMs: r.created_at_ms,
  }));
}

export async function recordVersion(
  db: D1Database,
  v: { versionId: string; kind: "model" | "prompt" | "policy" | "contract"; ref: string; payload: unknown },
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO izwa_versions (version_id, kind, ref, payload_json, created_at_ms)
       VALUES (?1, ?2, ?3, ?4, ?5)
       ON CONFLICT(kind, ref) DO UPDATE SET payload_json = ?4, created_at_ms = ?5`,
    )
    .bind(v.versionId, v.kind, v.ref, JSON.stringify(v.payload), nowMs())
    .run();
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// D1 returns rows keyed by snake_case column names. Remap to the camelCase
// row interface by replacing `_<c>` with `<C>`. Safe for the controlled
// schemas above.
function rowFromDb<T>(row: Record<string, unknown>): T {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    const camel = key.replace(/_([a-z])/g, (_, ch: string) => ch.toUpperCase());
    out[camel] = value;
  }
  return out as T;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
