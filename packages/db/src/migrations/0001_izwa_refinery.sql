-- IZWA refinery kernel schema.
--
-- The refinery turns raw, ambiguous input into verified, structured,
-- machine-learning-ready records while preserving a full provenance graph.
-- These tables form the deterministic transactional layer around the
-- probabilistic agent swarm. D1 is the control plane, not the
-- monetization layer: crystallized records get exported to R2 as
-- parquet/datasets and their vector representations live in Vectorize.

-- Immutable raw assets. Every input receives an id at ingest time; the
-- original artifact is never overwritten. Audio/document binaries live in
-- R2 (IZWA_ASSETS) keyed by asset_id; the row here is the metadata + hash.
CREATE TABLE IF NOT EXISTS izwa_assets (
  asset_id        TEXT PRIMARY KEY,
  modality        TEXT NOT NULL,             -- 'audio' | 'text' | 'document' | 'image' | 'video' | 'structured'
  tenant          TEXT NOT NULL DEFAULT 'default',
  source          TEXT,                      -- where the artifact came from (file name, URL, api)
  content_hash    TEXT NOT NULL,             -- sha256 of the original bytes — drives duplication detection
  size_bytes      INTEGER,
  mime_type       TEXT,
  text_content    TEXT,                      -- transcription / extracted text when available
  r2_key          TEXT,                      -- IZWA_ASSETS object key when the raw artifact is stored
  profile_json    TEXT NOT NULL,             -- data-profiling output (modality, language hints, privacy, complexity…)
  created_at_ms   INTEGER NOT NULL,
  meta_json       TEXT                       -- free-form ingest metadata (source org, licence, tags)
);

CREATE INDEX IF NOT EXISTS idx_izwa_assets_hash ON izwa_assets (content_hash);
CREATE INDEX IF NOT EXISTS izwa_assets_tenant_created ON izwa_assets (tenant, created_at_ms DESC);

-- Refinery runs. One task per asset per processing attempt. The task
-- carries the vertical pack, the composed specialist team, and the
-- decision state machine:
--   queued -> profiling -> routing -> analyzing -> evaluating
--          -> crystallized | escalated | failed
CREATE TABLE IF NOT EXISTS izwa_tasks (
  task_id              TEXT PRIMARY KEY,
  asset_id             TEXT NOT NULL,
  vertical             TEXT NOT NULL DEFAULT 'language',  -- refinery pack id
  tenant               TEXT NOT NULL DEFAULT 'default',
  status               TEXT NOT NULL DEFAULT 'queued',
  phase                TEXT NOT NULL DEFAULT 'queued',
  contract_id          TEXT,                             -- data contract applied
  team_json            TEXT,                             -- composed specialist assignments (router output)
  composite_quality_json TEXT,                           -- final composite quality signal
  decision_json        TEXT,                             -- crystallize/escalate decision + rationale
  error                TEXT,
  created_at_ms        INTEGER NOT NULL,
  updated_at_ms        INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_izwa_tasks_asset ON izwa_tasks (asset_id);
CREATE INDEX IF NOT EXISTS idx_izwa_tasks_status ON izwa_tasks (status, created_at_ms DESC);
CREATE INDEX IF NOT EXISTS idx_izwa_tasks_tenant_created ON izwa_tasks (tenant, created_at_ms DESC);

-- Specialist agent proposals. One row per agent per task. Each proposal
-- records the exact independence vector (model, prompt version, role,
-- evidence set) that produced it so the composite quality engine can tell
-- whether three proposals are genuinely three independent analyses.
CREATE TABLE IF NOT EXISTS izwa_proposals (
  proposal_id      TEXT PRIMARY KEY,
  task_id          TEXT NOT NULL,
  specialist_role  TEXT NOT NULL,            -- 'phonetics' | 'morphology' | 'syntax' | 'semantics' | 'dialect_variation' | 'code_switching' | 'translation'
  agent_key        TEXT NOT NULL,            -- DO name for the specialist agent
  model_id         TEXT NOT NULL,
  prompt_version   TEXT NOT NULL,
  independence_json TEXT NOT NULL,           -- {model, prompt, tools, representations, evidenceIds}
  payload_json     TEXT NOT NULL,            -- the proposed structured result
  confidence       REAL,                     -- agent-reported estimate (advisory only, not authoritative)
  uncertainty_json TEXT,                     -- reasons for uncertainty / gaps in evidence
  provenance_json  TEXT,                     -- evidence refs the proposal cited
  created_at_ms    INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_izwa_proposals_task ON izwa_proposals (task_id);
CREATE INDEX IF NOT EXISTS idx_izwa_proposals_role ON izwa_proposals (specialist_role, created_at_ms DESC);

-- Machine-readable data contracts. A contract is what makes the output a
-- product rather than "an agent's answer": it pins required/optional
-- fields, types, validation rules, quality gates, provenance and expert
-- requirements, export format and version. Contracts are versioned and
-- stored spec-first (JSON), with active pointer semantics.
CREATE TABLE IF NOT EXISTS izwa_quality_contracts (
  contract_id     TEXT PRIMARY KEY,
  vertical        TEXT NOT NULL,
  version         TEXT NOT NULL,
  name            TEXT NOT NULL,
  spec_json       TEXT NOT NULL,             -- full contract (fields, rules, thresholds, export contract)
  active          INTEGER NOT NULL DEFAULT 0,
  created_at_ms   INTEGER NOT NULL,
  UNIQUE (vertical, version)
);

CREATE INDEX IF NOT EXISTS idx_izwa_contracts_active ON izwa_quality_contracts (vertical, active);

-- Crystallized records — the verified, sellable product. Every record is
-- tied to a task, a contract, a composite quality signal, and optionally
-- a human verifier. Provenance for a record lives in izwa_provenance.
CREATE TABLE IF NOT EXISTS izwa_records (
  record_id        TEXT PRIMARY KEY,
  task_id          TEXT NOT NULL,
  contract_id      TEXT NOT NULL,
  vertical         TEXT NOT NULL,
  tenant           TEXT NOT NULL DEFAULT 'default',
  payload_json     TEXT NOT NULL,            -- the verified structured payload (phonemes, syntax tree, alignments…)
  quality_json     TEXT NOT NULL,            -- composite quality signal snapshot
  verification_status TEXT NOT NULL,         -- 'auto' | 'human_verified'
  verified_by      TEXT,                     -- expert id when human-verified
  model_versions_json TEXT,                  -- exact model/prompt versions that produced + validated this
  schema_version   TEXT NOT NULL,
  provenance_json  TEXT,                     -- condensed lineage (full events in izwa_provenance)
  created_at_ms    INTEGER NOT NULL,
  export_status    TEXT NOT NULL DEFAULT 'pending'  -- 'pending' | 'exported' | 'revoked'
);

CREATE INDEX IF NOT EXISTS idx_izwa_records_tenant_created ON izwa_records (tenant, created_at_ms DESC);
CREATE INDEX IF NOT EXISTS idx_izwa_records_task ON izwa_records (task_id);

-- Human-in-the-loop queue. When the quality contract is unsatisfied, the
-- coordinator halts, persists the debate, and routes the item to the
-- expert queue. Resolving an item writes a verified record, upserts a
-- human anchor into Vectorize (self-healing), and promotes the failure
-- into an evaluation case.
CREATE TABLE IF NOT EXISTS izwa_escalations (
  escalation_id    TEXT PRIMARY KEY,
  task_id          TEXT NOT NULL,
  asset_id         TEXT NOT NULL,
  tenant           TEXT NOT NULL DEFAULT 'default',
  status           TEXT NOT NULL DEFAULT 'open',   -- 'open' | 'claimed' | 'resolved' | 'rejected'
  reason_json      TEXT NOT NULL,                   -- why the contract failed (component scores, disagreement)
  debate_json      TEXT,                            -- serialized agent proposals + quality breakdown
  expert_id        TEXT,                            -- claimed by / resolved by
  resolution_json  TEXT,                            -- the human correction payload
  resolved_record_id TEXT,                          -- linked crystallized record
  created_at_ms    INTEGER NOT NULL,
  claimed_at_ms    INTEGER,
  resolved_at_ms   INTEGER
);

CREATE INDEX IF NOT EXISTS idx_izwa_escalations_status ON izwa_escalations (status, created_at_ms DESC);
CREATE INDEX IF NOT EXISTS idx_izwa_escalations_task ON izwa_escalations (task_id);

-- Expert memory: qualified humans for each task class, with historical
-- performance signals used by autonomous expert routing.
CREATE TABLE IF NOT EXISTS izwa_experts (
  expert_id     TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  roles_json    TEXT NOT NULL,               -- ['annotator', 'linguist', 'reviewer']
  languages_json TEXT NOT NULL,              -- languages/dialects qualified on
  task_classes_json TEXT NOT NULL,           -- task classes authorized for
  stats_json    TEXT NOT NULL DEFAULT '{}',  -- {resolved, agreements, avgTurnaroundMs, conflicts}
  active        INTEGER NOT NULL DEFAULT 1,
  created_at_ms INTEGER NOT NULL
);

-- Evaluation memory: first-class benchmark data. Every production
-- failure becomes a future evaluation/regression case (the flywheel).
CREATE TABLE IF NOT EXISTS izwa_eval_cases (
  eval_id        TEXT PRIMARY KEY,
  vertical       TEXT NOT NULL,
  kind           TEXT NOT NULL,              -- 'easy' | 'difficult' | 'adversarial' | 'regression' | 'disputed'
  source_task_id TEXT,
  input_json     TEXT NOT NULL,              -- the input that triggered the case
  expected_json  TEXT NOT NULL,              -- the verified/expected truth
  status         TEXT NOT NULL DEFAULT 'active',
  created_at_ms  INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_izwa_eval_vertical ON izwa_eval_cases (vertical, kind);

-- Generic memory store for the remaining memory kinds: episodic events,
-- policy memory, retrieval usage. Semantic memory lives in Vectorize;
-- evidence memory is izwa_assets + izwa_records; evaluation memory is
-- izwa_eval_cases; expert memory is izwa_experts.
CREATE TABLE IF NOT EXISTS izwa_memory (
  memory_id      TEXT PRIMARY KEY,
  kind           TEXT NOT NULL,              -- 'episodic' | 'policy' | 'evaluation' | 'retrieval' | 'expert'
  vertical       TEXT,
  tenant         TEXT NOT NULL DEFAULT 'default',
  ref_id         TEXT,                       -- related task/record/expert id
  content_json   TEXT NOT NULL,
  tags_json      TEXT NOT NULL DEFAULT '[]',
  created_at_ms  INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_izwa_memory_kind ON izwa_memory (kind, created_at_ms DESC);
CREATE INDEX IF NOT EXISTS idx_izwa_memory_ref ON izwa_memory (ref_id);

-- Provenance / lineage graph. One row per event in a record's life:
-- source artifact -> processing run -> proposals -> retrieved evidence ->
-- validation rules -> human intervention -> final version. Answers the
-- customer question "where did this value come from?"
CREATE TABLE IF NOT EXISTS izwa_provenance (
  provenance_id  TEXT PRIMARY KEY,
  record_id      TEXT,                       -- final record (may be empty until crystallized)
  task_id        TEXT NOT NULL,
  step           TEXT NOT NULL,              -- 'ingest' | 'profile' | 'route' | 'analyze' | 'retrieve' | 'validate' | 'escalate' | 'resolve' | 'crystallize'
  ref_type       TEXT NOT NULL,              -- 'asset' | 'task' | 'proposal' | 'vector' | 'rule' | 'model' | 'expert' | 'contract'
  ref_id         TEXT NOT NULL,
  detail_json    TEXT NOT NULL,
  created_at_ms  INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_izwa_provenance_record ON izwa_provenance (record_id, created_at_ms);
CREATE INDEX IF NOT EXISTS idx_izwa_provenance_task ON izwa_provenance (task_id, created_at_ms);

-- Version tracking: exact model ids, prompt versions, policy versions
-- that produced or validated data. Required for reproducibility claims.
CREATE TABLE IF NOT EXISTS izwa_versions (
  version_id     TEXT PRIMARY KEY,
  kind           TEXT NOT NULL,              -- 'model' | 'prompt' | 'policy' | 'contract'
  ref            TEXT NOT NULL,              -- model id / prompt key / contract id
  payload_json   TEXT NOT NULL,
  created_at_ms  INTEGER NOT NULL,
  UNIQUE (kind, ref)
);
