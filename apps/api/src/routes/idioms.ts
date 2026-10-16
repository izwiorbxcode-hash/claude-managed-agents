import type { D1PreparedStatement } from "@cloudflare/workers-types";
import { Izwa } from "@unsung/domain";
import { Hono } from "hono";
import type { Env, Variables } from "../env.js";

const {
  IDIOM_CONTEXT_CONTRACT,
  IDIOM_REQUIRED_REVIEW_FIELDS,
  contentHash,
  newId,
  validateIdiomApprovals,
  validateIdiomPayload,
} = Izwa;

type JsonObject = Record<string, unknown>;
type ReviewerRole = "speaker" | "fluent_reviewer" | "adjudicator";
interface ReviewIdentity {
  expiresAt: number;
  reviewerId: string;
  roles: ReviewerRole[];
  tenant: string;
}
const MEDIA_KEY = /^[A-Za-z0-9][A-Za-z0-9._/-]{0,255}$/;

function actor(c: {
  req: { header: (name: string) => string | undefined };
}): string {
  return c.req.header("x-user-id")?.trim() || "anonymous";
}

function base64UrlBytes(value: string): Uint8Array<ArrayBuffer> {
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

async function requireReviewIdentity(
  env: Env,
  request: Request
): Promise<ReviewIdentity> {
  if (env.IZWA_DEV_AUTH === "true") {
    const reviewerId = request.headers.get("x-user-id")?.trim();
    const role = request.headers.get("x-reviewer-role") as ReviewerRole | null;
    if (
      reviewerId &&
      role &&
      ["speaker", "fluent_reviewer", "adjudicator"].includes(role)
    ) {
      return {
        expiresAt: Date.now() + 60_000,
        reviewerId,
        roles: [role],
        tenant: request.headers.get("x-izwa-tenant") || "default",
      };
    }
  }
  if (!env.REVIEW_AUTH_SECRET) {
    throw new Error("review authentication is not configured");
  }
  const bearer = request.headers.get("authorization");
  if (!bearer?.startsWith("Bearer ")) {
    throw new Error("reviewer bearer token is required");
  }
  const [encodedPayload, encodedSignature] = bearer.slice(7).split(".");
  if (!(encodedPayload && encodedSignature)) {
    throw new Error("invalid reviewer token");
  }
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(env.REVIEW_AUTH_SECRET),
    { hash: "SHA-256", name: "HMAC" },
    false,
    ["verify"]
  );
  const valid = await crypto.subtle.verify(
    "HMAC",
    key,
    base64UrlBytes(encodedSignature),
    new TextEncoder().encode(encodedPayload)
  );
  if (!valid) {
    throw new Error("invalid reviewer token signature");
  }
  const identity = JSON.parse(
    new TextDecoder().decode(base64UrlBytes(encodedPayload))
  ) as ReviewIdentity;
  const rolesAreValid =
    Array.isArray(identity.roles) &&
    identity.roles.every((role) =>
      ["speaker", "fluent_reviewer", "adjudicator"].includes(role)
    );
  if (
    !(identity.reviewerId && identity.tenant && rolesAreValid) ||
    identity.expiresAt <= Date.now()
  ) {
    throw new Error("reviewer token is expired or malformed");
  }
  return identity;
}

function jsonObject(value: unknown): JsonObject | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonObject)
    : null;
}

function jsonArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function resolveModality(mimeType: string): "audio" | "video" | null {
  if (mimeType.startsWith("video/")) {
    return "video";
  }
  if (mimeType.startsWith("audio/")) {
    return "audio";
  }
  return null;
}

function splitFor(sourceGroupId: string): "train" | "validation" | "test" {
  let hash = 2_166_136_261;
  for (const char of sourceGroupId) {
    // biome-ignore lint/suspicious/noBitwiseOperators: FNV-1a requires xor + imul; changing it would reshuffle dataset splits
    hash = Math.imul(hash ^ char.charCodeAt(0), 16_777_619);
  }
  // biome-ignore lint/suspicious/noBitwiseOperators: `>>> 0` coerces to uint32 to keep buckets stable across engines
  const bucket = (hash >>> 0) % 100;
  if (bucket < 80) {
    return "train";
  }
  if (bucket < 90) {
    return "validation";
  }
  return "test";
}

const DATASET_PRODUCTS = [
  "full",
  "speech-transcription",
  "idiom-detection",
  "contextual-interpretation",
  "translation",
  "translation-correction",
  "contrastive",
] as const;
type DatasetProduct = (typeof DATASET_PRODUCTS)[number];

function projectRecord(row: JsonObject, product: DatasetProduct): JsonObject {
  const common = {
    provenance: row.provenance,
    record_id: row.record_id,
    review_evidence: row.review_evidence,
    source_group_id: row.source_group_id,
    source_media: row.source_media,
    split: row.split,
  };
  if (product === "speech-transcription") {
    return {
      ...common,
      expression_span: row.expression_span,
      transcript: row.transcript,
    };
  }
  if (product === "idiom-detection") {
    return {
      ...common,
      expression_span: row.expression_span,
      transcript: row.transcript,
    };
  }
  if (product === "contextual-interpretation") {
    return {
      ...common,
      alternative_readings: row.alternative_readings,
      context: row.context,
      expression_span: row.expression_span,
      meaning_in_source_language: row.meaning_in_source_language,
      social_function: row.social_function,
      speaker_intent: row.speaker_intent,
      usage_conditions: row.usage_conditions,
    };
  }
  if (product === "translation") {
    return {
      ...common,
      context: row.context,
      expression_span: row.expression_span,
      translations: row.translations,
    };
  }
  if (product === "translation-correction") {
    return {
      ...common,
      context: row.context,
      expression_span: row.expression_span,
      failure_explanation: row.failure_explanation,
      known_bad_translation: row.known_bad_translation,
      translations: row.translations,
    };
  }
  if (product === "contrastive") {
    return {
      ...common,
      alternative_readings: row.alternative_readings,
      context: row.context,
      expression_span: row.expression_span,
      translations: row.translations,
    };
  }
  return row;
}

async function transcribe(
  env: Env,
  bytes: ArrayBuffer
): Promise<{ text: string; vtt: string }> {
  if (!env.AI) {
    throw new Error("Workers AI binding is unavailable");
  }
  const result = (await (
    env.AI as { run: (model: string, input: unknown) => Promise<unknown> }
  ).run("@cf/openai/whisper-large-v3-turbo", {
    audio: bytesToBase64(bytes),
    task: "transcribe",
    vad_filter: "true",
  })) as { text?: string; vtt?: string };
  return { text: result.text?.trim() ?? "", vtt: result.vtt ?? "" };
}

function bytesToBase64(bytes: ArrayBuffer): string {
  const view = new Uint8Array(bytes);
  let binary = "";
  const chunkSize = 32_768;
  for (let offset = 0; offset < view.length; offset += chunkSize) {
    binary += String.fromCharCode(...view.subarray(offset, offset + chunkSize));
  }
  return btoa(binary);
}

interface ReviewRow {
  payload_json: string;
  reviewer_id: string;
  reviewer_role: string;
}

const REVIEWER_ROLES = ["speaker", "fluent_reviewer", "adjudicator"] as const;
const PHASE_REQUIRED_ROLE: Record<string, ReviewerRole> = {
  adjudication: "adjudicator",
  fluent_review: "fluent_reviewer",
  speaker_review: "speaker",
};

type ReviewPreflight =
  | { error: string; status: 403 | 404 | 409 | 422 }
  | {
      evidenceIds: string[];
      existingReviews: ReviewRow[];
      payload: JsonObject;
      reviewerId: string;
      role: ReviewerRole;
      task: Record<string, unknown>;
      verifiedFields: string[];
    };

type CrystallizeResult =
  | { error: string; violations: unknown[] }
  | { recordId: string };

function isReviewerRole(value: unknown): value is ReviewerRole {
  return REVIEWER_ROLES.includes(value as ReviewerRole);
}

function stringList(value: unknown): string[] {
  return jsonArray(value).filter(
    (item): item is string => typeof item === "string"
  );
}

// Authorization and shape checks for a review submission. Returns either the
// validated context or the exact error response the route should emit — keeps
// the route handler a thin orchestration layer.
async function reviewPreflight(
  env: Env,
  taskId: string,
  identity: ReviewIdentity,
  body: JsonObject
): Promise<ReviewPreflight> {
  const role = body.reviewerRole;
  if (!isReviewerRole(role)) {
    return {
      error: "reviewerRole must be speaker, fluent_reviewer, or adjudicator",
      status: 422,
    };
  }
  if (!identity.roles.includes(role)) {
    return { error: "reviewer token does not grant this role", status: 403 };
  }
  const payload = jsonObject(body.payload);
  const verifiedFields = stringList(body.verifiedFields);
  if (!payload || verifiedFields.length === 0) {
    return { error: "payload and verifiedFields are required", status: 422 };
  }
  const task = await env.DATABASE.prepare(
    `SELECT t.*, a.source_group_id, a.r2_key FROM izwa_tasks t
     JOIN izwa_assets a ON a.asset_id=t.asset_id WHERE t.task_id=?1`
  )
    .bind(taskId)
    .first<Record<string, unknown>>();
  if (task?.vertical !== "idiom-context") {
    return { error: "idiom task not found", status: 404 };
  }
  if (String(task.tenant) !== identity.tenant) {
    return {
      error: "reviewer token is not valid for this tenant",
      status: 403,
    };
  }
  const requiredRole = PHASE_REQUIRED_ROLE[String(task.phase)];
  if (role !== requiredRole) {
    return {
      error: `this task requires the ${requiredRole ?? "assigned"} role`,
      status: 409,
    };
  }
  const existing = await env.DATABASE.prepare(
    "SELECT reviewer_id, reviewer_role, payload_json FROM izwa_reviews WHERE task_id=?1 ORDER BY created_at_ms"
  )
    .bind(taskId)
    .all<ReviewRow>();
  const existingReviews = existing.results ?? [];
  const hasSpeakerReview = existingReviews.some(
    (review) => review.reviewer_role === "speaker"
  );
  if (
    existingReviews.some((review) => review.reviewer_id === identity.reviewerId)
  ) {
    return { error: "reviewer already submitted for this task", status: 409 };
  }
  if (role !== "speaker" && !hasSpeakerReview) {
    return { error: "speaker review must be completed first", status: 409 };
  }
  return {
    evidenceIds: stringList(body.evidenceIds),
    existingReviews,
    payload,
    reviewerId: identity.reviewerId,
    role,
    task,
    verifiedFields,
  };
}

function buildReviewStatements(
  env: Env,
  input: {
    basis: string;
    evidenceIds: string[];
    payload: JsonObject;
    reviewerId: string;
    reviewId: string;
    role: ReviewerRole;
    taskId: string;
    verdict: string;
    verifiedFields: string[];
    now: number;
  }
): D1PreparedStatement[] {
  const {
    basis,
    evidenceIds,
    now,
    payload,
    reviewerId,
    reviewId,
    role,
    taskId,
    verdict,
    verifiedFields,
  } = input;
  return [
    env.DATABASE.prepare(
      `INSERT INTO izwa_reviews
       (review_id, task_id, reviewer_id, reviewer_role, stage, verdict, blind, payload_json,
        verified_fields_json, evidence_ids_json, created_at_ms)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, 1, ?7, ?8, ?9, ?10)`
    ).bind(
      reviewId,
      taskId,
      reviewerId,
      role,
      role === "speaker" ? "interpretation" : "verification",
      verdict,
      JSON.stringify(payload),
      JSON.stringify(verifiedFields),
      JSON.stringify(evidenceIds),
      now
    ),
    ...verifiedFields.map((field) =>
      env.DATABASE.prepare(
        `INSERT INTO izwa_field_verifications
         (verification_id, task_id, field, reviewer_id, reviewer_role, verdict, basis, evidence_ids_json, reviewed_at_ms)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)`
      ).bind(
        newId("verify_"),
        taskId,
        field,
        reviewerId,
        role,
        verdict,
        basis,
        JSON.stringify(evidenceIds),
        now
      )
    ),
  ];
}

// Speaker and fluent-reviewer disagreeing on a required field escalates the
// task to adjudication instead of crystallizing it.
function detectSpeakerConflicts(
  speakerReview: ReviewRow | undefined,
  payload: JsonObject,
  role: ReviewerRole
): string[] | null {
  if (role !== "fluent_reviewer" || !speakerReview) {
    return null;
  }
  const speakerPayload = JSON.parse(speakerReview.payload_json) as JsonObject;
  const conflicts = IDIOM_REQUIRED_REVIEW_FIELDS.filter(
    (field) =>
      JSON.stringify(speakerPayload[field]) !== JSON.stringify(payload[field])
  );
  return conflicts.length > 0 ? conflicts : null;
}

async function setTaskPhase(
  env: Env,
  taskId: string,
  phase: string,
  now: number
): Promise<void> {
  await env.DATABASE.prepare(
    "UPDATE izwa_tasks SET phase=?2, updated_at_ms=?3 WHERE task_id=?1"
  )
    .bind(taskId, phase, now)
    .run();
}

async function loadReviewEvidence(
  env: Env,
  taskId: string
): Promise<Izwa.FieldVerification[]> {
  const verifications = await env.DATABASE.prepare(
    "SELECT field, reviewer_id, reviewer_role, verdict, basis, evidence_ids_json, reviewed_at_ms FROM izwa_field_verifications WHERE task_id=?1"
  )
    .bind(taskId)
    .all<Record<string, unknown>>();
  return (verifications.results ?? []).map((row) => ({
    basis: String(row.basis),
    evidenceIds: JSON.parse(String(row.evidence_ids_json || "[]")),
    field: String(row.field),
    reviewedAtMs: Number(row.reviewed_at_ms),
    reviewerId: String(row.reviewer_id),
    reviewerRole: String(row.reviewer_role),
    verdict: String(row.verdict),
  })) as Izwa.FieldVerification[];
}

async function crystallizeIdiomReview(
  env: Env,
  input: {
    now: number;
    payload: JsonObject;
    reviewEvidence: Izwa.FieldVerification[];
    reviewerId: string;
    task: Record<string, unknown>;
    taskId: string;
  }
): Promise<CrystallizeResult> {
  const { now, payload, reviewEvidence, reviewerId, task, taskId } = input;
  const validationPayload = { ...payload, review_evidence: reviewEvidence };
  const violations = validateIdiomPayload(validationPayload);
  if (violations.length > 0) {
    return { error: "contract validation failed", violations };
  }
  const recordId = newId("record_");
  const quality = {
    components: [{ name: "field_level_human_approval", score: 1, weight: 1 }],
    humanRequired: true,
    overall: 1,
    satisfied: true,
    threshold: 1,
    unsatisfiedGates: [],
  };
  await env.DATABASE.batch([
    env.DATABASE.prepare(
      `INSERT INTO izwa_records
       (record_id, task_id, contract_id, vertical, tenant, payload_json, quality_json,
        verification_status, verified_by, model_versions_json, schema_version, provenance_json,
        created_at_ms, export_status)
       VALUES (?1, ?2, ?3, 'idiom-context', ?4, ?5, ?6, 'human_verified', ?7, '{}',
       'idiom-context-v1', ?8, ?9, 'pending')`
    ).bind(
      recordId,
      taskId,
      IDIOM_CONTEXT_CONTRACT.contractId,
      String(task.tenant),
      JSON.stringify(validationPayload),
      JSON.stringify(quality),
      reviewerId,
      JSON.stringify({
        approvals: reviewEvidence.length,
        sourceGroupId: task.source_group_id,
      }),
      now
    ),
    env.DATABASE.prepare(
      "UPDATE izwa_field_verifications SET record_id=?2 WHERE task_id=?1"
    ).bind(taskId, recordId),
    env.DATABASE.prepare(
      "UPDATE izwa_tasks SET status='crystallized', phase='resolved', updated_at_ms=?2 WHERE task_id=?1"
    ).bind(taskId, now),
    env.DATABASE.prepare(
      "UPDATE izwa_escalations SET status='resolved', expert_id=?2, resolved_record_id=?3, resolved_at_ms=?4 WHERE task_id=?1"
    ).bind(taskId, reviewerId, recordId, now),
    env.DATABASE.prepare(
      `INSERT INTO izwa_evidence_edges (edge_id, from_ref, to_ref, relationship, root_source_id, trust_tier, created_at_ms)
       VALUES (?1, ?2, ?3, 'human_verified_derivation', ?4, 'human_verified', ?5)`
    ).bind(
      newId("edge_"),
      String(task.asset_id),
      recordId,
      String(task.source_group_id || task.asset_id),
      now
    ),
  ]);
  return { recordId };
}

export const idiomRoutes = new Hono<{ Bindings: Env; Variables: Variables }>()
  .put("/api/izwa/media/:key", async (c) => {
    if (!c.env.IZWA_ASSETS) {
      return c.json({ error: "IZWA_ASSETS binding is unavailable" }, 503);
    }
    const key = c.req.param("key");
    if (!MEDIA_KEY.test(key)) {
      return c.json({ error: "invalid media key" }, 400);
    }
    const consent = c.req.header("x-izwa-consent");
    if (!consent) {
      return c.json({ error: "x-izwa-consent is required" }, 422);
    }
    const bytes = await c.req.arrayBuffer();
    if (bytes.byteLength === 0) {
      return c.json({ error: "empty media body" }, 400);
    }
    const mimeType = c.req.header("content-type") || "application/octet-stream";
    const modality = resolveModality(mimeType);
    if (modality === null) {
      return c.json({ error: "only audio/* or video/* is accepted" }, 415);
    }
    const assetId = newId("asset_");
    const sourceGroupId = c.req.header("x-izwa-source-group") || assetId;
    const r2Key = `sources/${assetId}/${key}`;
    const hash = await contentHash(new Uint8Array(bytes));
    const tenant = c.req.header("x-izwa-tenant") || "default";
    const duplicate = await c.env.DATABASE.prepare(
      `SELECT asset_id, r2_key, size_bytes, source_group_id
       FROM izwa_assets WHERE tenant=?1 AND content_hash=?2 LIMIT 1`
    )
      .bind(tenant, hash)
      .first<{
        asset_id: string;
        r2_key: string;
        size_bytes: number;
        source_group_id: string;
      }>();
    if (duplicate) {
      return c.json({
        assetId: duplicate.asset_id,
        duplicate: true,
        r2Key: duplicate.r2_key,
        sizeBytes: duplicate.size_bytes,
        sourceGroupId: duplicate.source_group_id,
        status: "uploaded",
      });
    }
    await c.env.IZWA_ASSETS.put(r2Key, bytes, {
      customMetadata: { assetId, sourceGroupId, uploadedBy: actor(c) },
      httpMetadata: { contentType: mimeType },
    });
    await c.env.DATABASE.prepare(
      `INSERT INTO izwa_assets
       (asset_id, modality, tenant, source, content_hash, size_bytes, mime_type, text_content,
        r2_key, profile_json, meta_json, created_at_ms, consent_json, source_group_id, transcript_vtt)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, NULL, ?8, '{}', ?9, ?10, ?11, ?12, NULL)`
    )
      .bind(
        assetId,
        modality,
        tenant,
        key,
        hash,
        bytes.byteLength,
        mimeType,
        r2Key,
        JSON.stringify({ uploadedBy: actor(c) }),
        Date.now(),
        consent,
        sourceGroupId
      )
      .run();
    return c.json(
      {
        assetId,
        r2Key,
        sizeBytes: bytes.byteLength,
        sourceGroupId,
        status: "uploaded",
      },
      201
    );
  })
  .get("/api/izwa/media/:assetId/content", async (c) => {
    if (!c.env.IZWA_ASSETS) {
      return c.json({ error: "IZWA_ASSETS binding is unavailable" }, 503);
    }
    const asset = await c.env.DATABASE.prepare(
      "SELECT r2_key, mime_type FROM izwa_assets WHERE asset_id = ?1"
    )
      .bind(c.req.param("assetId"))
      .first<{ r2_key: string; mime_type: string }>();
    if (!asset?.r2_key) {
      return c.json({ error: "asset not found" }, 404);
    }
    const object = await c.env.IZWA_ASSETS.get(asset.r2_key);
    if (!object) {
      return c.json({ error: "media object not found" }, 404);
    }
    return new Response(object.body as unknown as BodyInit, {
      headers: {
        "cache-control": "private, no-store",
        "content-length": String(object.size),
        "content-type": object.httpMetadata?.contentType || asset.mime_type,
        etag: object.httpEtag,
      },
    });
  })
  .get("/api/izwa/media/:assetId/captions", async (c) => {
    const asset = await c.env.DATABASE.prepare(
      "SELECT transcript_vtt FROM izwa_assets WHERE asset_id = ?1"
    )
      .bind(c.req.param("assetId"))
      .first<{ transcript_vtt: string | null }>();
    if (!asset?.transcript_vtt) {
      return c.text("WEBVTT\n\n", 200, { "content-type": "text/vtt" });
    }
    return c.text(asset.transcript_vtt, 200, { "content-type": "text/vtt" });
  })
  .post("/api/izwa/media/:assetId/transcribe", async (c) => {
    if (!c.env.IZWA_ASSETS) {
      return c.json({ error: "IZWA_ASSETS binding is unavailable" }, 503);
    }
    const assetId = c.req.param("assetId");
    const asset = await c.env.DATABASE.prepare(
      "SELECT r2_key, modality, source_group_id FROM izwa_assets WHERE asset_id = ?1"
    )
      .bind(assetId)
      .first<{ r2_key: string; modality: string; source_group_id: string }>();
    if (!asset?.r2_key) {
      return c.json({ error: "asset not found" }, 404);
    }
    if (asset.modality === "video") {
      return c.json(
        {
          error:
            "video must be demuxed to a linked audio asset before transcription",
        },
        422
      );
    }
    const object = await c.env.IZWA_ASSETS.get(asset.r2_key);
    if (!object) {
      return c.json({ error: "media object not found" }, 404);
    }
    const output = await transcribe(c.env, await object.arrayBuffer());
    if (!output.text) {
      return c.json({ error: "transcription returned no text" }, 502);
    }
    const segmentId = newId("segment_");
    await c.env.DATABASE.batch([
      c.env.DATABASE.prepare(
        "UPDATE izwa_assets SET text_content = ?2, transcript_vtt = ?3 WHERE asset_id = ?1"
      ).bind(assetId, output.text, output.vtt),
      c.env.DATABASE.prepare(
        `INSERT INTO izwa_media_segments
         (segment_id, asset_id, source_group_id, start_ms, end_ms, transcript, transcript_status, created_at_ms)
         VALUES (?1, ?2, ?3, 0, 0, ?4, 'machine', ?5)`
      ).bind(
        segmentId,
        assetId,
        asset.source_group_id || assetId,
        output.text,
        Date.now()
      ),
    ]);
    return c.json({
      assetId,
      segmentId,
      status: "machine",
      transcript: output.text,
      vtt: output.vtt,
    });
  })
  .patch("/api/izwa/media/:assetId/transcript", async (c) => {
    const assetId = c.req.param("assetId");
    const body = jsonObject(await c.req.json().catch(() => null));
    const transcript =
      typeof body?.transcript === "string" ? body.transcript.trim() : "";
    if (!transcript) {
      return c.json({ error: "corrected transcript is required" }, 422);
    }
    const asset = await c.env.DATABASE.prepare(
      "SELECT asset_id FROM izwa_assets WHERE asset_id=?1"
    )
      .bind(assetId)
      .first<{ asset_id: string }>();
    if (!asset) {
      return c.json({ error: "asset not found" }, 404);
    }
    const now = Date.now();
    await c.env.DATABASE.batch([
      c.env.DATABASE.prepare(
        "UPDATE izwa_assets SET text_content=?2 WHERE asset_id=?1"
      ).bind(assetId, transcript),
      c.env.DATABASE.prepare(
        `UPDATE izwa_media_segments
         SET transcript=?2, transcript_status='human_corrected'
         WHERE asset_id=?1`
      ).bind(assetId, transcript),
      c.env.DATABASE.prepare(
        `INSERT INTO izwa_provenance
         (provenance_id, task_id, step, ref_type, ref_id, detail_json, created_at_ms)
         VALUES (?1, ?2, 'correct', 'asset', ?2, ?3, ?4)`
      ).bind(
        newId("prov_"),
        assetId,
        JSON.stringify({
          correctedBy: actor(c),
          transcriptStatus: "human_corrected",
        }),
        now
      ),
    ]);
    return c.json({ assetId, status: "human_corrected", transcript });
  })
  .post("/api/izwa/idioms/tasks", async (c) => {
    const body = jsonObject(await c.req.json().catch(() => null));
    if (!body) {
      return c.json({ error: "invalid body" }, 400);
    }
    const assetId = typeof body.assetId === "string" ? body.assetId : "";
    const asset = await c.env.DATABASE.prepare(
      "SELECT tenant, text_content, source_group_id, consent_json FROM izwa_assets WHERE asset_id = ?1"
    )
      .bind(assetId)
      .first<{
        tenant: string;
        text_content: string | null;
        source_group_id: string;
        consent_json: string | null;
      }>();
    if (!asset) {
      return c.json({ error: "asset not found" }, 404);
    }
    if (!asset.consent_json) {
      return c.json({ error: "asset has no recorded consent" }, 422);
    }
    const expression = jsonObject(body.expression_span);
    if (!expression || typeof expression.text !== "string") {
      return c.json(
        { error: "expression_span with exact text is required" },
        422
      );
    }
    const taskId = newId("task_");
    const escalationId = newId("escalation_");
    const now = Date.now();
    const seed = {
      alternative_readings: jsonArray(body.alternative_readings),
      context: typeof body.context === "string" ? body.context : "",
      expression_span: expression,
      intended_meaning:
        typeof body.intended_meaning === "string" ? body.intended_meaning : "",
      literal_meaning:
        typeof body.literal_meaning === "string" ? body.literal_meaning : "",
      social_function: jsonArray(body.social_function),
      source_asset_id: assetId,
      source_group_id: asset.source_group_id || assetId,
      transcript:
        typeof body.transcript === "string"
          ? body.transcript
          : asset.text_content || "",
      uncertainty: typeof body.uncertainty === "string" ? body.uncertainty : "",
    };
    await c.env.DATABASE.batch([
      c.env.DATABASE.prepare(
        `INSERT INTO izwa_tasks
         (task_id, asset_id, vertical, tenant, status, phase, contract_id, team_json,
          composite_quality_json, decision_json, error, created_at_ms, updated_at_ms)
         VALUES (?1, ?2, 'idiom-context', ?3, 'escalated', 'speaker_review', ?4, NULL, NULL,
          ?5, NULL, ?6, ?6)`
      ).bind(
        taskId,
        assetId,
        asset.tenant,
        IDIOM_CONTEXT_CONTRACT.contractId,
        JSON.stringify({ decision: "mandatory_human_review" }),
        now
      ),
      c.env.DATABASE.prepare(
        `INSERT INTO izwa_escalations
         (escalation_id, task_id, asset_id, tenant, status, reason_json, debate_json, created_at_ms)
         VALUES (?1, ?2, ?3, ?4, 'open', ?5, ?6, ?7)`
      ).bind(
        escalationId,
        taskId,
        assetId,
        asset.tenant,
        JSON.stringify({
          reason:
            "idiom contracts require speaker and independent fluent review",
        }),
        JSON.stringify({ seed }),
        now
      ),
      c.env.DATABASE.prepare(
        `INSERT INTO izwa_provenance
         (provenance_id, task_id, step, ref_type, ref_id, detail_json, created_at_ms)
         VALUES (?1, ?2, 'annotate', 'asset', ?3, ?4, ?5)`
      ).bind(
        newId("prov_"),
        taskId,
        assetId,
        JSON.stringify({ blindReview: true, createdBy: actor(c) }),
        now
      ),
    ]);
    return c.json(
      { escalationId, seed, status: "speaker_review", taskId },
      201
    );
  })
  .get("/api/izwa/idioms/review-queue", async (c) => {
    let identity: ReviewIdentity;
    try {
      identity = await requireReviewIdentity(c.env, c.req.raw);
    } catch (error) {
      return c.json(
        { error: error instanceof Error ? error.message : "unauthorized" },
        401
      );
    }
    const { reviewerId } = identity;
    const rows = await c.env.DATABASE.prepare(
      `SELECT t.task_id, t.asset_id, t.phase, t.tenant, a.text_content, a.source_group_id,
              e.escalation_id, e.debate_json,
              EXISTS(SELECT 1 FROM izwa_reviews r WHERE r.task_id=t.task_id AND r.reviewer_id=?1) AS has_reviewed
       FROM izwa_tasks t JOIN izwa_assets a ON a.asset_id=t.asset_id
       JOIN izwa_escalations e ON e.task_id=t.task_id
       WHERE t.vertical='idiom-context' AND t.status='escalated' AND t.tenant=?2
         AND ((t.phase='speaker_review' AND instr(?3, 'speaker') > 0)
           OR (t.phase='fluent_review' AND instr(?3, 'fluent_reviewer') > 0)
           OR (t.phase='adjudication' AND instr(?3, 'adjudicator') > 0))
       ORDER BY t.created_at_ms ASC LIMIT 100`
    )
      .bind(reviewerId, identity.tenant, identity.roles.join(","))
      .all<Record<string, unknown>>();
    const items = (rows.results ?? []).map((row) => {
      const debate = JSON.parse(String(row.debate_json || "{}")) as JsonObject;
      return {
        assetId: row.asset_id,
        blind: !row.has_reviewed,
        escalationId: row.escalation_id,
        // Machine suggestions remain hidden until this reviewer records an initial interpretation.
        machineSuggestions: row.has_reviewed
          ? (debate.machineSuggestions ?? null)
          : null,
        phase: row.phase,
        seed: jsonObject(debate.seed),
        sourceGroupId: row.source_group_id,
        taskId: row.task_id,
        tenant: row.tenant,
        transcript: row.text_content,
      };
    });
    return c.json({ items });
  })
  .post("/api/izwa/idioms/tasks/:taskId/reviews", async (c) => {
    const body = jsonObject(await c.req.json().catch(() => null));
    if (!body) {
      return c.json({ error: "invalid body" }, 400);
    }
    const taskId = c.req.param("taskId");
    let identity: ReviewIdentity;
    try {
      identity = await requireReviewIdentity(c.env, c.req.raw);
    } catch (error) {
      return c.json(
        { error: error instanceof Error ? error.message : "unauthorized" },
        401
      );
    }
    const preflight = await reviewPreflight(c.env, taskId, identity, body);
    if ("error" in preflight) {
      return c.json({ error: preflight.error }, preflight.status);
    }
    const {
      evidenceIds,
      existingReviews,
      payload,
      reviewerId,
      role,
      task,
      verifiedFields,
    } = preflight;
    const now = Date.now();
    const reviewId = newId("review_");
    const verdict = String(body.verdict || "verified");
    const basis = String(
      body.basis ||
        (role === "speaker" ? "speaker_attested" : "reviewer_attested")
    );
    await c.env.DATABASE.batch(
      buildReviewStatements(c.env, {
        basis,
        evidenceIds,
        now,
        payload,
        reviewerId,
        reviewId,
        role,
        taskId,
        verdict,
        verifiedFields,
      })
    );

    const speakerReview = existingReviews.find(
      (review) => review.reviewer_role === "speaker"
    );
    const conflicts = detectSpeakerConflicts(speakerReview, payload, role);
    if (conflicts) {
      await setTaskPhase(c.env, taskId, "adjudication", now);
      return c.json(
        { conflicts, missing: [], reviewId, status: "needs_review" },
        202
      );
    }

    const reviewEvidence = await loadReviewEvidence(c.env, taskId);
    const approval = validateIdiomApprovals(reviewEvidence);
    if (!approval.approved) {
      await setTaskPhase(
        c.env,
        taskId,
        approval.conflicts.length ? "adjudication" : "fluent_review",
        now
      );
      return c.json({ reviewId, status: "needs_review", ...approval }, 202);
    }

    const crystallized = await crystallizeIdiomReview(c.env, {
      now,
      payload,
      reviewEvidence,
      reviewerId,
      task,
      taskId,
    });
    if ("violations" in crystallized) {
      return c.json(
        { error: crystallized.error, violations: crystallized.violations },
        422
      );
    }
    return c.json(
      {
        recordId: crystallized.recordId,
        reviewId,
        status: "crystallized",
        verificationStatus: "human_verified",
      },
      201
    );
  })
  .post("/api/izwa/datasets", async (c) => {
    const body = jsonObject(await c.req.json().catch(() => null));
    if (
      !body ||
      typeof body.slug !== "string" ||
      typeof body.name !== "string"
    ) {
      return c.json({ error: "slug and name are required" }, 422);
    }
    const datasetId = newId("dataset_");
    await c.env.DATABASE.prepare(
      `INSERT INTO izwa_datasets (dataset_id, tenant, slug, name, description, license, created_at_ms)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`
    )
      .bind(
        datasetId,
        String(body.tenant || "default"),
        body.slug,
        body.name,
        body.description ?? null,
        body.license ?? null,
        Date.now()
      )
      .run();
    return c.json({ datasetId }, 201);
  })
  .post("/api/izwa/evaluations", async (c) => {
    const body = jsonObject(await c.req.json().catch(() => null));
    if (
      !body ||
      typeof body.input !== "object" ||
      typeof body.expected !== "object"
    ) {
      return c.json({ error: "input and expected are required" }, 422);
    }
    const partition =
      body.partition === "held_out" ? "held_out" : "retrieval_regression";
    const evalId = newId("eval_");
    await c.env.DATABASE.batch([
      c.env.DATABASE.prepare(
        `INSERT INTO izwa_eval_cases (eval_id, vertical, kind, source_task_id, input_json, expected_json, status, created_at_ms)
         VALUES (?1, 'idiom-context', ?2, ?3, ?4, ?5, 'active', ?6)`
      ).bind(
        evalId,
        partition === "held_out" ? "held_out" : "regression",
        body.sourceTaskId ?? null,
        JSON.stringify(body.input),
        JSON.stringify(body.expected),
        Date.now()
      ),
      c.env.DATABASE.prepare(
        `INSERT INTO izwa_evaluation_partitions
         (eval_id, partition, retrieval_eligible, training_eligible, contamination_group_id, notes)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)`
      ).bind(
        evalId,
        partition,
        partition === "held_out" ? 0 : 1,
        partition === "held_out" ? 0 : 1,
        body.sourceGroupId ?? null,
        body.notes ?? null
      ),
    ]);
    return c.json(
      { evalId, partition, retrievalEligible: partition !== "held_out" },
      201
    );
  })
  .get("/api/izwa/evaluations", async (c) => {
    const partition = c.req.query("partition");
    const rows = await c.env.DATABASE.prepare(
      `SELECT e.*, p.partition, p.retrieval_eligible, p.training_eligible, p.contamination_group_id
       FROM izwa_eval_cases e JOIN izwa_evaluation_partitions p ON p.eval_id=e.eval_id
       WHERE (?1 IS NULL OR p.partition=?1) ORDER BY e.created_at_ms DESC LIMIT 200`
    )
      .bind(partition || null)
      .all<Record<string, unknown>>();
    return c.json({ items: rows.results ?? [] });
  })
  .post("/api/izwa/datasets/:datasetId/versions", async (c) => {
    if (!c.env.IZWA_ASSETS) {
      return c.json({ error: "IZWA_ASSETS binding is unavailable" }, 503);
    }
    const body = jsonObject(await c.req.json().catch(() => null));
    if (!body || typeof body.version !== "string") {
      return c.json({ error: "version is required" }, 422);
    }
    const dataset = await c.env.DATABASE.prepare(
      "SELECT * FROM izwa_datasets WHERE dataset_id=?1"
    )
      .bind(c.req.param("datasetId"))
      .first<Record<string, unknown>>();
    if (!dataset) {
      return c.json({ error: "dataset not found" }, 404);
    }
    const records = await c.env.DATABASE.prepare(
      `SELECT r.record_id, r.task_id, r.payload_json, r.provenance_json, a.source_group_id, a.r2_key
       FROM izwa_records r JOIN izwa_tasks t ON t.task_id=r.task_id JOIN izwa_assets a ON a.asset_id=t.asset_id
       WHERE r.tenant=?1 AND r.vertical='idiom-context' AND r.verification_status='human_verified'
         AND r.export_status!='revoked' ORDER BY r.created_at_ms`
    )
      .bind(String(dataset.tenant))
      .all<Record<string, unknown>>();
    if ((records.results ?? []).length === 0) {
      return c.json({ error: "no eligible human-verified idiom records" }, 409);
    }
    const product = DATASET_PRODUCTS.includes(body.product as DatasetProduct)
      ? (body.product as DatasetProduct)
      : "full";
    const versionId = newId("dataset_version_");
    const fullRows = (records.results ?? []).map((record) => ({
      record_id: record.record_id,
      source_group_id: record.source_group_id,
      source_media: record.r2_key,
      split: splitFor(String(record.source_group_id || record.record_id)),
      task_id: record.task_id,
      ...JSON.parse(String(record.payload_json)),
      provenance: JSON.parse(String(record.provenance_json || "{}")),
    }));
    const rows = fullRows.map((row) => projectRecord(row, product));
    const jsonl = `${rows.map((row) => JSON.stringify(row)).join("\n")}\n`;
    const hash = await contentHash(new TextEncoder().encode(jsonl));
    const prefix = `datasets/${dataset.slug}/${body.version}`;
    const manifest = {
      contentHash: hash,
      contract: IDIOM_CONTEXT_CONTRACT.contractId,
      createdAtMs: Date.now(),
      datasetId: dataset.dataset_id,
      datasetVersionId: versionId,
      product,
      recordCount: rows.length,
      sourceGrouping: "all derivatives of a source_group_id stay in one split",
      splits: Object.fromEntries(
        ["train", "validation", "test"].map((split) => [
          split,
          rows.filter((row) => row.split === split).length,
        ])
      ),
      version: body.version,
    };
    const dataCard = {
      contract: IDIOM_CONTEXT_CONTRACT,
      description: dataset.description,
      license: dataset.license,
      limitations: [
        "Cultural meanings are context- and community-specific.",
        "Human verification applies only to fields listed in review_evidence.",
      ],
      manifest,
      name: dataset.name,
    };
    await Promise.all([
      c.env.IZWA_ASSETS.put(`${prefix}/data.jsonl`, jsonl, {
        httpMetadata: { contentType: "application/x-ndjson" },
      }),
      c.env.IZWA_ASSETS.put(
        `${prefix}/manifest.json`,
        JSON.stringify(manifest, null, 2),
        { httpMetadata: { contentType: "application/json" } }
      ),
      c.env.IZWA_ASSETS.put(
        `${prefix}/data-card.json`,
        JSON.stringify(dataCard, null, 2),
        { httpMetadata: { contentType: "application/json" } }
      ),
    ]);
    const statements = [
      c.env.DATABASE.prepare(
        `INSERT INTO izwa_dataset_versions
         (dataset_version_id, dataset_id, version, contract_id, record_count, content_hash,
          manifest_r2_key, jsonl_r2_key, data_card_r2_key, created_at_ms)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)`
      ).bind(
        versionId,
        dataset.dataset_id,
        body.version,
        IDIOM_CONTEXT_CONTRACT.contractId,
        rows.length,
        hash,
        `${prefix}/manifest.json`,
        `${prefix}/data.jsonl`,
        `${prefix}/data-card.json`,
        Date.now()
      ),
      ...fullRows.map((row) =>
        c.env.DATABASE.prepare(
          "INSERT INTO izwa_dataset_version_records (dataset_version_id, record_id, source_group_id, split) VALUES (?1, ?2, ?3, ?4)"
        ).bind(versionId, row.record_id, row.source_group_id, row.split)
      ),
    ];
    await c.env.DATABASE.batch(statements);
    return c.json(manifest, 201);
  });
