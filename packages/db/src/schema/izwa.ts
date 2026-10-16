import {
  index,
  integer,
  real,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";

// Learned Data Unit kernel — Drizzle mirror of
// packages/db/src/migrations/0001_izwa_refinery.sql (canonical DDL).
// D1 is the control plane: metadata + lineage. R2 holds immutable bytes,
// Vectorize holds representations.

export const izwaAssets = sqliteTable(
  "izwa_assets",
  {
    assetId: text("asset_id").primaryKey(),
    consentJson: text("consent_json"),
    contentHash: text("content_hash").notNull(),
    createdAtMs: integer("created_at_ms").notNull(),
    metaJson: text("meta_json"),
    mimeType: text("mime_type"),
    modality: text("modality").notNull(),
    profileJson: text("profile_json").notNull(),
    r2Key: text("r2_key"),
    sizeBytes: integer("size_bytes"),
    source: text("source"),
    sourceGroupId: text("source_group_id"),
    tenant: text("tenant").notNull().default("default"),
    textContent: text("text_content"),
    transcriptVtt: text("transcript_vtt"),
  },
  (t) => [
    index("idx_izwa_assets_hash").on(t.contentHash),
    index("izwa_assets_tenant_created").on(t.tenant, t.createdAtMs),
  ]
);

export const izwaTasks = sqliteTable(
  "izwa_tasks",
  {
    assetId: text("asset_id").notNull(),
    compositeQualityJson: text("composite_quality_json"),
    contractId: text("contract_id"),
    createdAtMs: integer("created_at_ms").notNull(),
    decisionJson: text("decision_json"),
    error: text("error"),
    phase: text("phase").notNull().default("queued"),
    status: text("status").notNull().default("queued"),
    taskId: text("task_id").primaryKey(),
    teamJson: text("team_json"),
    tenant: text("tenant").notNull().default("default"),
    updatedAtMs: integer("updated_at_ms").notNull(),
    vertical: text("vertical").notNull().default("language"),
  },
  (t) => [
    index("idx_izwa_tasks_asset").on(t.assetId),
    index("idx_izwa_tasks_status").on(t.status, t.createdAtMs),
  ]
);

export const izwaProposals = sqliteTable(
  "izwa_proposals",
  {
    agentKey: text("agent_key").notNull(),
    confidence: real("confidence"),
    createdAtMs: integer("created_at_ms").notNull(),
    independenceJson: text("independence_json").notNull(),
    modelId: text("model_id").notNull(),
    payloadJson: text("payload_json").notNull(),
    promptVersion: text("prompt_version").notNull(),
    proposalId: text("proposal_id").primaryKey(),
    provenanceJson: text("provenance_json"),
    specialistRole: text("specialist_role").notNull(),
    taskId: text("task_id").notNull(),
    uncertaintyJson: text("uncertainty_json"),
  },
  (t) => [index("idx_izwa_proposals_task").on(t.taskId)]
);

export const izwaRecords = sqliteTable(
  "izwa_records",
  {
    contractId: text("contract_id").notNull(),
    createdAtMs: integer("created_at_ms").notNull(),
    exportStatus: text("export_status").notNull().default("pending"),
    modelVersionsJson: text("model_versions_json"),
    payloadJson: text("payload_json").notNull(),
    provenanceJson: text("provenance_json"),
    qualityJson: text("quality_json").notNull(),
    recordId: text("record_id").primaryKey(),
    schemaVersion: text("schema_version").notNull(),
    taskId: text("task_id").notNull(),
    tenant: text("tenant").notNull().default("default"),
    verificationStatus: text("verification_status").notNull(),
    verifiedBy: text("verified_by"),
    vertical: text("vertical").notNull(),
  },
  (t) => [index("idx_izwa_records_task").on(t.taskId)]
);

export const izwaEscalations = sqliteTable(
  "izwa_escalations",
  {
    assetId: text("asset_id").notNull(),
    claimedAtMs: integer("claimed_at_ms"),
    createdAtMs: integer("created_at_ms").notNull(),
    debateJson: text("debate_json"),
    escalationId: text("escalation_id").primaryKey(),
    expertId: text("expert_id"),
    reasonJson: text("reason_json").notNull(),
    resolutionJson: text("resolution_json"),
    resolvedAtMs: integer("resolved_at_ms"),
    resolvedRecordId: text("resolved_record_id"),
    status: text("status").notNull().default("open"),
    taskId: text("task_id").notNull(),
    tenant: text("tenant").notNull().default("default"),
  },
  (t) => [index("idx_izwa_escalations_status").on(t.status, t.createdAtMs)]
);

export const izwaProvenance = sqliteTable(
  "izwa_provenance",
  {
    createdAtMs: integer("created_at_ms").notNull(),
    detailJson: text("detail_json").notNull(),
    provenanceId: text("provenance_id").primaryKey(),
    recordId: text("record_id"),
    refId: text("ref_id").notNull(),
    refType: text("ref_type").notNull(),
    step: text("step").notNull(),
    taskId: text("task_id").notNull(),
  },
  (t) => [index("idx_izwa_provenance_task").on(t.taskId, t.createdAtMs)]
);

export const izwaMediaSegments = sqliteTable(
  "izwa_media_segments",
  {
    assetId: text("asset_id").notNull(),
    createdAtMs: integer("created_at_ms").notNull(),
    endMs: integer("end_ms").notNull(),
    r2Key: text("r2_key"),
    segmentId: text("segment_id").primaryKey(),
    sourceGroupId: text("source_group_id").notNull(),
    speakerLabel: text("speaker_label"),
    startMs: integer("start_ms").notNull(),
    transcript: text("transcript").notNull().default(""),
    transcriptStatus: text("transcript_status").notNull().default("machine"),
  },
  (t) => [index("idx_izwa_segments_asset").on(t.assetId, t.startMs)]
);

export const izwaReviews = sqliteTable(
  "izwa_reviews",
  {
    blind: integer("blind").notNull().default(1),
    createdAtMs: integer("created_at_ms").notNull(),
    evidenceIdsJson: text("evidence_ids_json").notNull().default("[]"),
    payloadJson: text("payload_json").notNull(),
    reviewerId: text("reviewer_id").notNull(),
    reviewerRole: text("reviewer_role").notNull(),
    reviewId: text("review_id").primaryKey(),
    stage: text("stage").notNull(),
    taskId: text("task_id").notNull(),
    verdict: text("verdict").notNull(),
    verifiedFieldsJson: text("verified_fields_json").notNull(),
  },
  (t) => [index("idx_izwa_reviews_task").on(t.taskId, t.createdAtMs)]
);

export const izwaFieldVerifications = sqliteTable(
  "izwa_field_verifications",
  {
    basis: text("basis").notNull(),
    evidenceIdsJson: text("evidence_ids_json").notNull().default("[]"),
    field: text("field").notNull(),
    recordId: text("record_id"),
    reviewedAtMs: integer("reviewed_at_ms").notNull(),
    reviewerId: text("reviewer_id").notNull(),
    reviewerRole: text("reviewer_role").notNull(),
    taskId: text("task_id").notNull(),
    verdict: text("verdict").notNull(),
    verificationId: text("verification_id").primaryKey(),
  },
  (t) => [index("idx_izwa_field_verifications_task").on(t.taskId, t.field)]
);

export const izwaDatasets = sqliteTable("izwa_datasets", {
  createdAtMs: integer("created_at_ms").notNull(),
  datasetId: text("dataset_id").primaryKey(),
  description: text("description"),
  license: text("license"),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  tenant: text("tenant").notNull(),
});

export const izwaDatasetVersions = sqliteTable("izwa_dataset_versions", {
  contentHash: text("content_hash").notNull(),
  contractId: text("contract_id").notNull(),
  createdAtMs: integer("created_at_ms").notNull(),
  dataCardR2Key: text("data_card_r2_key").notNull(),
  datasetId: text("dataset_id").notNull(),
  datasetVersionId: text("dataset_version_id").primaryKey(),
  jsonlR2Key: text("jsonl_r2_key").notNull(),
  manifestR2Key: text("manifest_r2_key").notNull(),
  parentVersionId: text("parent_version_id"),
  recordCount: integer("record_count").notNull(),
  status: text("status").notNull().default("published"),
  version: text("version").notNull(),
});

export const izwaPassages = sqliteTable(
  "izwa_passages",
  {
    annotationState: text("annotation_state").notNull().default("draft"),
    assetId: text("asset_id").notNull(),
    contextAfter: text("context_after"),
    contextBefore: text("context_before"),
    createdAtMs: integer("created_at_ms").notNull(),
    currentRevisionId: text("current_revision_id"),
    endMs: integer("end_ms").notNull(),
    passageId: text("passage_id").primaryKey(),
    paymentState: text("payment_state").notNull().default("unaccrued"),
    permissionState: text("permission_state").notNull().default("pending"),
    processingState: text("processing_state").notNull().default("ready"),
    releaseState: text("release_state").notNull().default("unassigned"),
    reviewState: text("review_state").notNull().default("unassigned"),
    startMs: integer("start_ms").notNull(),
    tenant: text("tenant").notNull().default("default"),
    updatedAtMs: integer("updated_at_ms").notNull(),
  },
  (t) => [
    index("idx_izwa_passages_asset").on(t.assetId, t.startMs),
    index("idx_izwa_passages_review").on(
      t.tenant,
      t.reviewState,
      t.updatedAtMs
    ),
  ]
);

export const izwaPassageRevisions = sqliteTable(
  "izwa_passage_revisions",
  {
    contributorId: text("contributor_id"),
    correctedTranscript: text("corrected_transcript"),
    createdAtMs: integer("created_at_ms").notNull(),
    culturalDetailJson: text("cultural_detail_json").notNull().default("{}"),
    interpretationJson: text("interpretation_json").notNull().default("{}"),
    languageJson: text("language_json").notNull().default("{}"),
    machineTranscript: text("machine_transcript").notNull(),
    meaningJson: text("meaning_json").notNull().default("{}"),
    normalizedTranscript: text("normalized_transcript"),
    passageId: text("passage_id").notNull(),
    passageRevisionId: text("passage_revision_id").primaryKey(),
    revisionNumber: integer("revision_number").notNull(),
    revisionReason: text("revision_reason").notNull(),
  },
  (t) => [
    index("idx_izwa_passage_revisions_passage").on(
      t.passageId,
      t.revisionNumber
    ),
  ]
);

export const izwaModelRuns = sqliteTable(
  "izwa_model_runs",
  {
    attemptCount: integer("attempt_count").notNull().default(0),
    completedAtMs: integer("completed_at_ms"),
    createdAtMs: integer("created_at_ms").notNull(),
    errorCode: text("error_code"),
    errorDetail: text("error_detail"),
    jobKey: text("job_key").notNull().unique(),
    modelRunId: text("model_run_id").primaryKey(),
    passageId: text("passage_id").notNull(),
    passageRevisionId: text("passage_revision_id").notNull(),
    probabilitiesJson: text("probabilities_json"),
    proposedLabelsJson: text("proposed_labels_json"),
    provider: text("provider").notNull(),
    requestedModel: text("requested_model").notNull(),
    requestJson: text("request_json"),
    resolvedModel: text("resolved_model"),
    responseJson: text("response_json"),
    rubricVersion: text("rubric_version").notNull(),
    startedAtMs: integer("started_at_ms"),
    status: text("status").notNull().default("queued"),
    task: text("task").notNull(),
    usageJson: text("usage_json"),
  },
  (t) => [
    index("idx_izwa_model_runs_revision").on(
      t.passageRevisionId,
      t.createdAtMs
    ),
    index("idx_izwa_model_runs_status").on(t.status, t.createdAtMs),
  ]
);

export type IzwaAssetRow = typeof izwaAssets.$inferSelect;
export type IzwaTaskRow = typeof izwaTasks.$inferSelect;
export type IzwaRecordRow = typeof izwaRecords.$inferSelect;
