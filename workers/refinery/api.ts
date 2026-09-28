// IZWA refinery API surface. Mounted under /api/izwa/* on the main
// worker. The public contract is tiny on purpose: ingest raw material,
// watch tasks, resolve escalations, browse the crystallized records and
// the evaluation/learning assets. All heavy orchestration lives in the
// SwarmCoordinator DO.

import { Hono } from "hono";
import { contentHash, isIzwaId, newId } from "./ids";
import { profileInput } from "./profile";
import { embedText } from "./embed";
import { queryNearest } from "./retrieval";
import { composeTeam } from "./router";
import { LANGUAGE_CONTRACT, resolveContract } from "./contracts";
import {
  createAsset,
  createTask,
  getLineage,
  getProposalsForTask,
  getRecord,
  getTask,
  insertProvenance,
  listContracts,
  listEvalCases,
  listExperts,
  listMemory,
  listOpenEscalations,
  listRecords,
  listTasks,
  saveContract,
  upsertExpert,
  type AssetRow,
  type ExpertRow,
  type TaskRow,
} from "./store";
import type { IngestInput, SpecialistTeam } from "./types";
import type { SwarmCoordinator } from "./coordinator";
import { exportDataset } from "./export";
import { seedRefinery } from "./seed";

const MAX_AUDIO_BYTES = 8 * 1024 * 1024;
const AUDIO_PREFIX = "audio";

// Durable Object stubs are RPC proxies; in the committed workers-types the
// stub's RPC surface can resolve to `never` for methods whose params span
// multiple modules. Casting to the class type is accurate — stub calls
// forward to the same public methods.
function coordinatorStub(env: Env, taskId: string): SwarmCoordinator {
  return env.SwarmCoordinator.get(env.SwarmCoordinator.idFromName(taskId)) as unknown as SwarmCoordinator;
}

interface IngestRequest extends IngestInput {
  audioBase64?: string;
  audioKey?: string;
  async?: boolean;
}

function parseIngest(body: unknown): IngestRequest | string {
  if (!body || typeof body !== "object") return "invalid body";
  const b = body as Record<string, unknown>;
  const text = typeof b.text === "string" ? b.text : undefined;
  const audioBase64 = typeof b.audioBase64 === "string" ? b.audioBase64 : undefined;
  const audioKey = typeof b.audioKey === "string" ? b.audioKey : undefined;
  if (!text && !audioBase64 && !audioKey) return "provide text, audioBase64, or audioKey";
  return {
    text,
    audioBase64,
    audioKey,
    audioDurationSec: typeof b.audioDurationSec === "number" ? b.audioDurationSec : undefined,
    source: typeof b.source === "string" ? b.source : undefined,
    tenant: typeof b.tenant === "string" ? b.tenant : undefined,
    modality: typeof b.modality === "string" ? (b.modality as IngestInput["modality"]) : undefined,
    meta: b.meta && typeof b.meta === "object" ? (b.meta as Record<string, unknown>) : undefined,
    vertical: "language",
    async: b.async === true,
  };
}

async function ensureAsset(
  env: Env,
  req: IngestRequest,
): Promise<{ asset: AssetRow; bytes: Uint8Array | null }> {
  let bytes: Uint8Array | null = null;
  let textBytes: Uint8Array | null = null;
  let audioKey: string | null = req.audioKey ?? null;

  if (req.audioKey) {
    const obj = await env.IZWA_ASSETS.get(`${AUDIO_PREFIX}/${req.audioKey}`);
    if (!obj) throw new Error(`audioKey not found in R2: ${req.audioKey}`);
    bytes = new Uint8Array(await obj.arrayBuffer());
  } else if (req.audioBase64) {
    const decoded = decodeBase64(req.audioBase64);
    if (decoded.byteLength > MAX_AUDIO_BYTES) throw new Error("audioBase64 exceeds 8MB; use PUT /api/izwa/assets/raw instead");
    bytes = decoded;
    audioKey = `asset_${newId("asset_").split("_")[1]}.wav`;
    await env.IZWA_ASSETS.put(`${AUDIO_PREFIX}/${audioKey}`, decoded, {
      httpMetadata: { contentType: "audio/wav" },
    });
  }
  if (req.text) textBytes = new TextEncoder().encode(req.text);

  const combined = new Uint8Array((bytes?.byteLength ?? 0) + (textBytes?.byteLength ?? 0));
  let offset = 0;
  if (bytes) {
    combined.set(bytes, 0);
    offset = bytes.byteLength;
  }
  if (textBytes) combined.set(textBytes, offset);
  const hash = await contentHash(combined);

  const assetId = newId("asset_");
  const profile = profileInput({
    text: req.text,
    modality: req.modality,
    audioDurationSec: req.audioDurationSec,
    textHash: hash,
  });
  const asset: AssetRow = {
    assetId,
    modality: profile.modality,
    tenant: req.tenant ?? "default",
    source: req.source ?? null,
    contentHash: hash,
    sizeBytes: bytes?.byteLength ?? (textBytes?.byteLength ?? null),
    mimeType: req.modality === "audio" || req.audioKey || req.audioBase64 ? "audio/wav" : "text/plain",
    textContent: req.text ?? null,
    r2Key: audioKey ? `${AUDIO_PREFIX}/${audioKey}` : null,
    profileJson: JSON.stringify(profile),
    metaJson: req.meta ? JSON.stringify(req.meta) : null,
    createdAtMs: Date.now(),
  };
  await createAsset(env.DB, asset);
  await insertProvenance(env.DB, {
    provenanceId: newId("prov_"),
    taskId: "",
    step: "ingest",
    refType: "asset",
    refId: assetId,
    detail: { modality: profile.modality, hash: hash.slice(0, 16), duplicate: profile.duplicateOf },
  });
  return { asset, bytes };
}

export function createRefineryApp() {
  // `basePath()` returns a new app (Hono doesn't mutate), so chain it.
  // Mounted at /api/izwa/* on the main worker (src/index.ts), which passes
  // the full request path to Hono — so the app must carry the base path.
  const app = new Hono<{ Bindings: Env }>().basePath("/api/izwa");

  // Raw audio upload (avoids base64 for large wav files). Stores the bytes
  // to R2 and returns an audioKey to reference in POST /api/izwa/ingest.
  app.put("/assets/raw/:key", async (c) => {
    const key = c.req.param("key");
    if (!/^[A-Za-z0-9._-]{1,128}$/.test(key)) return c.json({ error: "invalid audio key" }, 400);
    const body = await c.req.arrayBuffer();
    if (body.byteLength > MAX_AUDIO_BYTES * 4) {
      return c.json({ error: "audio too large (max 32MB)" }, 413);
    }
    await c.env.IZWA_ASSETS.put(`${AUDIO_PREFIX}/${key}`, body, {
      httpMetadata: { contentType: c.req.header("content-type") || "audio/wav" },
    });
    return c.json({ audioKey: key, sizeBytes: body.byteLength });
  });

  // Primary entry point: profile -> embed -> route -> dispatch to the
  // SwarmCoordinator DO.
  app.post("/ingest", async (c) => {
    const req = parseIngest(await c.req.json());
    if (typeof req === "string") return c.json({ error: req }, 400);

    try {
      const { asset } = await ensureAsset(c.env, req);
      const text = req.text ?? "";
      const profile = JSON.parse(asset.profileJson) as ReturnType<typeof profileInput>;

      // Vector scouting: nearest dialect/human anchors + semantic precedents.
      const vector = text ? await embedText(c.env, text) : await embedText(c.env, profile.languageHints.join(" ") || "audio");
      const [anchors, evidence] = await Promise.all([
        queryNearest(c.env, vector, { topK: 3, kinds: ["dialect_anchor", "human_anchor"] }),
        queryNearest(c.env, vector, { topK: 4, kinds: ["semantic"] }),
      ]);

      // Compose the task-specific specialist team.
      const team: SpecialistTeam = composeTeam({
        vertical: "language",
        text,
        profile,
        anchors,
        evidence,
        env: c.env,
      });

      const contract = await resolveContract(c.env, "language");
      const task: TaskRow = {
        taskId: newId("task_"),
        assetId: asset.assetId,
        vertical: "language",
        tenant: asset.tenant,
        status: "routing",
        phase: "routing",
        contractId: contract.contractId,
        teamJson: JSON.stringify(team),
        compositeQualityJson: null,
        decisionJson: null,
        error: null,
        createdAtMs: Date.now(),
        updatedAtMs: Date.now(),
      };
      await createTask(c.env.DB, task);
      await insertProvenance(c.env.DB, {
        provenanceId: newId("prov_"),
        taskId: task.taskId,
        step: "ingest",
        refType: "asset",
        refId: asset.assetId,
        detail: { modality: profile.modality },
      });

      const coordinator = coordinatorStub(c.env, task.taskId);

      const input = { taskId: task.taskId, assetId: asset.assetId, tenant: asset.tenant, vertical: "language" as const, text, contractId: contract.contractId, team };
      if (req.async) {
        c.executionCtx.waitUntil(
          coordinator.negotiate(input).catch((error) => {
            console.error(`[izwa] background negotiate failed for ${task.taskId}: ${error instanceof Error ? error.message : String(error)}`);
          }),
        );
        return c.json({ taskId: task.taskId, status: "queued", async: true }, 202);
      }

      const result = await coordinator.negotiate(input);
      return c.json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return c.json({ error: message }, 500);
    }
  });

  // -------------------------------------------------------------------------
  // Tasks
  // -------------------------------------------------------------------------

  app.get("/tasks", async (c) => {
    const status = c.req.query("status") ?? undefined;
    const tenant = c.req.query("tenant") ?? undefined;
    const limit = parseInt(c.req.query("limit") ?? "50", 10);
    const items = await listTasks(c.env.DB, { status, tenant, limit: Math.min(200, limit) });
    return c.json({ items });
  });

  app.get("/tasks/:taskId", async (c) => {
    const taskId = c.req.param("taskId");
    if (!isIzwaId(taskId, "task_")) return c.json({ error: "invalid task id" }, 400);
    const task = await getTask(c.env.DB, taskId);
    if (!task) return c.json({ error: "task not found" }, 404);
    const proposals = await getProposalsForTask(c.env.DB, taskId);
    const coordinator = coordinatorStub(c.env, taskId);
    const detail = await coordinator.status(taskId).catch(() => null);
    return c.json({ task, proposals, escalation: detail?.escalation ?? null, record: detail?.record ?? null });
  });

  app.get("/tasks/:taskId/lineage", async (c) => {
    const taskId = c.req.param("taskId");
    if (!isIzwaId(taskId, "task_")) return c.json({ error: "invalid task id" }, 400);
    const lineage = await getLineage(c.env.DB, taskId);
    return c.json({ taskId, lineage });
  });

  // -------------------------------------------------------------------------
  // Human-in-the-loop resolution
  // -------------------------------------------------------------------------

  app.post("/resolve", async (c) => {
    const body = await c.req.json().catch(() => null);
    if (!body || typeof body !== "object") return c.json({ error: "invalid body" }, 400);
    const b = body as Record<string, unknown>;
    const taskId = typeof b.taskId === "string" ? b.taskId : "";
    const escalationId = typeof b.escalationId === "string" ? b.escalationId : "";
    const expertId = typeof b.expertId === "string" ? b.expertId : "";
    const correction = b.correction && typeof b.correction === "object" ? (b.correction as Record<string, unknown>) : null;
    const resolutionText = typeof b.resolutionText === "string" ? b.resolutionText : "";
    if (!isIzwaId(taskId, "task_") || !isIzwaId(escalationId, "escalation_") || !isIzwaId(expertId, "exp_")) {
      return c.json({ error: "taskId, escalationId, and expertId are required" }, 400);
    }
    if (!correction) return c.json({ error: "correction object is required" }, 400);

    const coordinator = coordinatorStub(c.env, taskId);
    const result = await coordinator.resolve({ taskId, escalationId, expertId, correction, resolutionText });
    if (result.status === "failed") return c.json({ error: result.error ?? "resolve failed" }, 500);
    return c.json(result);
  });

  // -------------------------------------------------------------------------
  // Crystallized records
  // -------------------------------------------------------------------------

  app.get("/records", async (c) => {
    const tenant = c.req.query("tenant") ?? undefined;
    const items = await listRecords(c.env.DB, { tenant });
    return c.json({ items });
  });

  app.get("/records/:recordId", async (c) => {
    const recordId = c.req.param("recordId");
    if (!isIzwaId(recordId, "record_")) return c.json({ error: "invalid record id" }, 400);
    const record = await getRecord(c.env.DB, recordId);
    if (!record) return c.json({ error: "record not found" }, 404);
    const lineage = await getLineage(c.env.DB, record.taskId);
    return c.json({ record, lineage });
  });

  // -------------------------------------------------------------------------
  // Escalations (HITL queue)
  // -------------------------------------------------------------------------

  app.get("/escalations", async (c) => {
    const tenant = c.req.query("tenant") ?? undefined;
    const items = await listOpenEscalations(c.env.DB, { tenant });
    return c.json({ items });
  });

  // -------------------------------------------------------------------------
  // Experts
  // -------------------------------------------------------------------------

  app.post("/experts", async (c) => {
    const body = await c.req.json().catch(() => null);
    if (!body || typeof body !== "object") return c.json({ error: "invalid body" }, 400);
    const b = body as Record<string, unknown>;
    const expertId = typeof b.expertId === "string" && isIzwaId(b.expertId, "exp_") ? b.expertId : newId("exp_");
    const name = typeof b.name === "string" && b.name.length > 0 ? b.name : null;
    if (!name) return c.json({ error: "name is required" }, 400);
    const expert: ExpertRow = {
      expertId,
      name,
      rolesJson: JSON.stringify(Array.isArray(b.roles) ? b.roles : ["annotator"]),
      languagesJson: JSON.stringify(Array.isArray(b.languages) ? b.languages : []),
      taskClassesJson: JSON.stringify(Array.isArray(b.taskClasses) ? b.taskClasses : ["linguist"]),
      statsJson: JSON.stringify({ resolved: 0, agreements: 0, avgTurnaroundMs: 0, conflicts: 0 }),
      active: 1,
      createdAtMs: Date.now(),
    };
    await upsertExpert(c.env.DB, expert);
    return c.json({ expertId, status: "registered" });
  });

  app.get("/experts", async (c) => {
    const items = await listExperts(c.env.DB);
    return c.json({ items });
  });

  // -------------------------------------------------------------------------
  // Evaluation + memory
  // -------------------------------------------------------------------------

  app.get("/evals", async (c) => {
    const vertical = c.req.query("vertical") ?? undefined;
    const kind = c.req.query("kind") ?? undefined;
    const items = await listEvalCases(c.env.DB, { vertical, kind });
    return c.json({ items });
  });

  app.get("/memory", async (c) => {
    const kind = c.req.query("kind") ?? undefined;
    const items = await listMemory(c.env.DB, { kind });
    return c.json({ items });
  });

  // -------------------------------------------------------------------------
  // Data contracts
  // -------------------------------------------------------------------------

  app.get("/contracts", async (c) => {
    const vertical = c.req.query("vertical") ?? undefined;
    const items = await listContracts(c.env.DB, vertical);
    return c.json({ items, default: LANGUAGE_CONTRACT });
  });

  // Idempotent bootstrap: contract + native-speaker experts + dialect
  // anchors. Call once on a fresh deployment before first ingest.
  app.post("/seed", async (c) => {
    const result = await seedRefinery(c.env);
    return c.json({ status: "seeded", ...result });
  });

  // Materialize crystallized records into a JSONL dataset on R2 (with
  // manifest). The lineage bundle keeps every row auditable.
  app.post("/export", async (c) => {
    const body = await c.req.json().catch(() => null);
    const tenant =
      body && typeof body === "object" && typeof (body as Record<string, unknown>).tenant === "string"
        ? ((body as Record<string, unknown>).tenant as string)
        : undefined;
    const result = await exportDataset(c.env, { tenant });
    return c.json(result);
  });

  app.post("/contracts", async (c) => {
    const body = await c.req.json().catch(() => null);
    if (!body || typeof body !== "object") return c.json({ error: "invalid body" }, 400);
    const contract = body as unknown as import("./types").QualityContract;
    if (typeof contract.contractId !== "string" || typeof contract.vertical !== "string" || typeof contract.version !== "string") {
      return c.json({ error: "contract requires contractId, vertical, version" }, 400);
    }
    await saveContract(c.env.DB, contract);
    return c.json({ contractId: contract.contractId, status: "saved" });
  });

  app.notFound((c) => c.json({ error: "not found" }, 404));
  return app;
}

export const refineryApp = createRefineryApp();

function decodeBase64(b64: string): Uint8Array {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}
