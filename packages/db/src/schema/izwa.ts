import { index, integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

// Learned Data Unit kernel — Drizzle mirror of
// packages/db/src/migrations/0001_izwa_refinery.sql (canonical DDL).
// D1 is the control plane: metadata + lineage. R2 holds immutable bytes,
// Vectorize holds representations.

export const izwaAssets = sqliteTable(
  "izwa_assets",
  {
    assetId: text("asset_id").primaryKey(),
    modality: text("modality").notNull(),
    tenant: text("tenant").notNull().default("default"),
    source: text("source"),
    contentHash: text("content_hash").notNull(),
    sizeBytes: integer("size_bytes"),
    mimeType: text("mime_type"),
    textContent: text("text_content"),
    r2Key: text("r2_key"),
    profileJson: text("profile_json").notNull(),
    metaJson: text("meta_json"),
    createdAtMs: integer("created_at_ms").notNull(),
  },
  (t) => [
    index("idx_izwa_assets_hash").on(t.contentHash),
    index("izwa_assets_tenant_created").on(t.tenant, t.createdAtMs),
  ]
);

export const izwaTasks = sqliteTable(
  "izwa_tasks",
  {
    taskId: text("task_id").primaryKey(),
    assetId: text("asset_id").notNull(),
    vertical: text("vertical").notNull().default("language"),
    tenant: text("tenant").notNull().default("default"),
    status: text("status").notNull().default("queued"),
    phase: text("phase").notNull().default("queued"),
    contractId: text("contract_id"),
    teamJson: text("team_json"),
    compositeQualityJson: text("composite_quality_json"),
    decisionJson: text("decision_json"),
    error: text("error"),
    createdAtMs: integer("created_at_ms").notNull(),
    updatedAtMs: integer("updated_at_ms").notNull(),
  },
  (t) => [
    index("idx_izwa_tasks_asset").on(t.assetId),
    index("idx_izwa_tasks_status").on(t.status, t.createdAtMs),
  ]
);

export const izwaProposals = sqliteTable(
  "izwa_proposals",
  {
    proposalId: text("proposal_id").primaryKey(),
    taskId: text("task_id").notNull(),
    specialistRole: text("specialist_role").notNull(),
    agentKey: text("agent_key").notNull(),
    modelId: text("model_id").notNull(),
    promptVersion: text("prompt_version").notNull(),
    independenceJson: text("independence_json").notNull(),
    payloadJson: text("payload_json").notNull(),
    confidence: real("confidence"),
    uncertaintyJson: text("uncertainty_json"),
    provenanceJson: text("provenance_json"),
    createdAtMs: integer("created_at_ms").notNull(),
  },
  (t) => [index("idx_izwa_proposals_task").on(t.taskId)]
);

export const izwaRecords = sqliteTable(
  "izwa_records",
  {
    recordId: text("record_id").primaryKey(),
    taskId: text("task_id").notNull(),
    contractId: text("contract_id").notNull(),
    vertical: text("vertical").notNull(),
    tenant: text("tenant").notNull().default("default"),
    payloadJson: text("payload_json").notNull(),
    qualityJson: text("quality_json").notNull(),
    verificationStatus: text("verification_status").notNull(),
    verifiedBy: text("verified_by"),
    modelVersionsJson: text("model_versions_json"),
    schemaVersion: text("schema_version").notNull(),
    provenanceJson: text("provenance_json"),
    createdAtMs: integer("created_at_ms").notNull(),
    exportStatus: text("export_status").notNull().default("pending"),
  },
  (t) => [index("idx_izwa_records_task").on(t.taskId)]
);

export const izwaEscalations = sqliteTable(
  "izwa_escalations",
  {
    escalationId: text("escalation_id").primaryKey(),
    taskId: text("task_id").notNull(),
    assetId: text("asset_id").notNull(),
    tenant: text("tenant").notNull().default("default"),
    status: text("status").notNull().default("open"),
    reasonJson: text("reason_json").notNull(),
    debateJson: text("debate_json"),
    expertId: text("expert_id"),
    resolutionJson: text("resolution_json"),
    resolvedRecordId: text("resolved_record_id"),
    createdAtMs: integer("created_at_ms").notNull(),
    claimedAtMs: integer("claimed_at_ms"),
    resolvedAtMs: integer("resolved_at_ms"),
  },
  (t) => [index("idx_izwa_escalations_status").on(t.status, t.createdAtMs)]
);

export const izwaProvenance = sqliteTable(
  "izwa_provenance",
  {
    provenanceId: text("provenance_id").primaryKey(),
    recordId: text("record_id"),
    taskId: text("task_id").notNull(),
    step: text("step").notNull(),
    refType: text("ref_type").notNull(),
    refId: text("ref_id").notNull(),
    detailJson: text("detail_json").notNull(),
    createdAtMs: integer("created_at_ms").notNull(),
  },
  (t) => [index("idx_izwa_provenance_task").on(t.taskId, t.createdAtMs)]
);

export type IzwaAssetRow = typeof izwaAssets.$inferSelect;
export type IzwaTaskRow = typeof izwaTasks.$inferSelect;
export type IzwaRecordRow = typeof izwaRecords.$inferSelect;
