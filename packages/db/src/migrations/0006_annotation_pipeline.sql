-- Passage-centred annotation pipeline. Machine observations are immutable,
-- revision-bound suggestions and never update human-approved fields.

CREATE TABLE IF NOT EXISTS izwa_passages (
  passage_id TEXT PRIMARY KEY,
  asset_id TEXT NOT NULL,
  tenant TEXT NOT NULL DEFAULT 'default',
  start_ms INTEGER NOT NULL,
  end_ms INTEGER NOT NULL,
  context_before TEXT,
  context_after TEXT,
  processing_state TEXT NOT NULL DEFAULT 'ready',
  annotation_state TEXT NOT NULL DEFAULT 'draft',
  review_state TEXT NOT NULL DEFAULT 'unassigned',
  permission_state TEXT NOT NULL DEFAULT 'pending',
  payment_state TEXT NOT NULL DEFAULT 'unaccrued',
  release_state TEXT NOT NULL DEFAULT 'unassigned',
  current_revision_id TEXT,
  created_at_ms INTEGER NOT NULL,
  updated_at_ms INTEGER NOT NULL,
  CHECK (start_ms >= 0),
  CHECK (end_ms > start_ms)
);

CREATE INDEX IF NOT EXISTS idx_izwa_passages_asset
  ON izwa_passages (asset_id, start_ms);
CREATE INDEX IF NOT EXISTS idx_izwa_passages_review
  ON izwa_passages (tenant, review_state, updated_at_ms DESC);

CREATE TABLE IF NOT EXISTS izwa_passage_revisions (
  passage_revision_id TEXT PRIMARY KEY,
  passage_id TEXT NOT NULL,
  revision_number INTEGER NOT NULL,
  machine_transcript TEXT NOT NULL,
  corrected_transcript TEXT,
  normalized_transcript TEXT,
  language_json TEXT NOT NULL DEFAULT '{}',
  meaning_json TEXT NOT NULL DEFAULT '{}',
  cultural_detail_json TEXT NOT NULL DEFAULT '{}',
  interpretation_json TEXT NOT NULL DEFAULT '{}',
  contributor_id TEXT,
  revision_reason TEXT NOT NULL,
  created_at_ms INTEGER NOT NULL,
  UNIQUE (passage_id, revision_number)
);

CREATE INDEX IF NOT EXISTS idx_izwa_passage_revisions_passage
  ON izwa_passage_revisions (passage_id, revision_number DESC);

CREATE TABLE IF NOT EXISTS izwa_model_runs (
  model_run_id TEXT PRIMARY KEY,
  job_key TEXT NOT NULL UNIQUE,
  passage_id TEXT NOT NULL,
  passage_revision_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  task TEXT NOT NULL,
  requested_model TEXT NOT NULL,
  resolved_model TEXT,
  rubric_version TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  request_json TEXT,
  response_json TEXT,
  probabilities_json TEXT,
  proposed_labels_json TEXT,
  usage_json TEXT,
  error_code TEXT,
  error_detail TEXT,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  created_at_ms INTEGER NOT NULL,
  started_at_ms INTEGER,
  completed_at_ms INTEGER,
  CHECK (status IN ('queued', 'running', 'succeeded', 'retry_pending', 'failed'))
);

CREATE INDEX IF NOT EXISTS idx_izwa_model_runs_revision
  ON izwa_model_runs (passage_revision_id, created_at_ms DESC);
CREATE INDEX IF NOT EXISTS idx_izwa_model_runs_status
  ON izwa_model_runs (status, created_at_ms);
