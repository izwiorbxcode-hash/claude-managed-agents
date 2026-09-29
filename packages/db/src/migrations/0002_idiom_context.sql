-- Trustworthy idiom production: media segments, field-level two-person
-- review, evidence ancestry, held-out evaluation, and immutable datasets.

ALTER TABLE izwa_assets ADD COLUMN consent_json TEXT;
ALTER TABLE izwa_assets ADD COLUMN source_group_id TEXT;
ALTER TABLE izwa_assets ADD COLUMN transcript_vtt TEXT;

CREATE TABLE IF NOT EXISTS izwa_media_segments (
  segment_id TEXT PRIMARY KEY, asset_id TEXT NOT NULL, source_group_id TEXT NOT NULL,
  start_ms INTEGER NOT NULL, end_ms INTEGER NOT NULL, transcript TEXT NOT NULL DEFAULT '',
  transcript_status TEXT NOT NULL DEFAULT 'machine', speaker_label TEXT, r2_key TEXT,
  created_at_ms INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_izwa_segments_asset ON izwa_media_segments(asset_id, start_ms);

CREATE TABLE IF NOT EXISTS izwa_reviews (
  review_id TEXT PRIMARY KEY, task_id TEXT NOT NULL, reviewer_id TEXT NOT NULL,
  reviewer_role TEXT NOT NULL, stage TEXT NOT NULL, verdict TEXT NOT NULL,
  blind INTEGER NOT NULL DEFAULT 1, payload_json TEXT NOT NULL,
  verified_fields_json TEXT NOT NULL, evidence_ids_json TEXT NOT NULL DEFAULT '[]',
  created_at_ms INTEGER NOT NULL, UNIQUE(task_id, reviewer_id, stage)
);
CREATE INDEX IF NOT EXISTS idx_izwa_reviews_task ON izwa_reviews(task_id, created_at_ms);

CREATE TABLE IF NOT EXISTS izwa_field_verifications (
  verification_id TEXT PRIMARY KEY, task_id TEXT NOT NULL, record_id TEXT,
  field TEXT NOT NULL, reviewer_id TEXT NOT NULL, reviewer_role TEXT NOT NULL,
  verdict TEXT NOT NULL, basis TEXT NOT NULL, evidence_ids_json TEXT NOT NULL DEFAULT '[]',
  reviewed_at_ms INTEGER NOT NULL, UNIQUE(task_id, field, reviewer_id)
);
CREATE INDEX IF NOT EXISTS idx_izwa_field_verifications_task ON izwa_field_verifications(task_id, field);

CREATE TABLE IF NOT EXISTS izwa_evidence_edges (
  edge_id TEXT PRIMARY KEY, from_ref TEXT NOT NULL, to_ref TEXT NOT NULL,
  relationship TEXT NOT NULL, root_source_id TEXT NOT NULL, trust_tier TEXT NOT NULL,
  created_at_ms INTEGER NOT NULL, UNIQUE(from_ref, to_ref, relationship)
);
CREATE INDEX IF NOT EXISTS idx_izwa_evidence_root ON izwa_evidence_edges(root_source_id, trust_tier);

CREATE TABLE IF NOT EXISTS izwa_review_samples (
  sample_id TEXT PRIMARY KEY, task_id TEXT NOT NULL UNIQUE, reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open', created_at_ms INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS izwa_datasets (
  dataset_id TEXT PRIMARY KEY, tenant TEXT NOT NULL, slug TEXT NOT NULL,
  name TEXT NOT NULL, description TEXT, license TEXT, created_at_ms INTEGER NOT NULL,
  UNIQUE(tenant, slug)
);

CREATE TABLE IF NOT EXISTS izwa_dataset_versions (
  dataset_version_id TEXT PRIMARY KEY, dataset_id TEXT NOT NULL, version TEXT NOT NULL,
  contract_id TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'published',
  record_count INTEGER NOT NULL, content_hash TEXT NOT NULL,
  manifest_r2_key TEXT NOT NULL, jsonl_r2_key TEXT NOT NULL, data_card_r2_key TEXT NOT NULL,
  parent_version_id TEXT, created_at_ms INTEGER NOT NULL, UNIQUE(dataset_id, version)
);

CREATE TABLE IF NOT EXISTS izwa_dataset_version_records (
  dataset_version_id TEXT NOT NULL, record_id TEXT NOT NULL, source_group_id TEXT NOT NULL,
  split TEXT NOT NULL, PRIMARY KEY(dataset_version_id, record_id)
);
CREATE INDEX IF NOT EXISTS idx_izwa_dataset_split ON izwa_dataset_version_records(dataset_version_id, split);

CREATE TABLE IF NOT EXISTS izwa_evaluation_partitions (
  eval_id TEXT PRIMARY KEY, partition TEXT NOT NULL DEFAULT 'retrieval_regression',
  retrieval_eligible INTEGER NOT NULL DEFAULT 1, training_eligible INTEGER NOT NULL DEFAULT 1,
  contamination_group_id TEXT, notes TEXT
);

INSERT OR REPLACE INTO izwa_evaluation_partitions
  (eval_id, partition, retrieval_eligible, training_eligible, contamination_group_id)
SELECT eval_id, 'retrieval_regression', 1, 1, source_task_id FROM izwa_eval_cases;
