-- Broader contextual-language production, public-service grounding,
-- vocabulary development, coverage planning, and commercial delivery.

CREATE TABLE IF NOT EXISTS izwa_meaning_records (
  meaning_record_id TEXT PRIMARY KEY, source_segment_id TEXT NOT NULL,
  language_tags_json TEXT NOT NULL, variety_labels_json TEXT NOT NULL,
  phenomena_json TEXT NOT NULL, context_json TEXT NOT NULL,
  interpretations_json TEXT NOT NULL, taxonomy_version TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'review', created_at_ms INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS izwa_annotation_modules (
  annotation_module_id TEXT PRIMARY KEY, meaning_record_id TEXT NOT NULL,
  kind TEXT NOT NULL, schema_version TEXT NOT NULL, payload_json TEXT NOT NULL,
  evidence_ids_json TEXT NOT NULL, status TEXT NOT NULL, created_at_ms INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_izwa_modules_record ON izwa_annotation_modules(meaning_record_id, kind);

CREATE TABLE IF NOT EXISTS izwa_procedure_evidence (
  procedure_evidence_id TEXT PRIMARY KEY, authority TEXT NOT NULL,
  jurisdiction TEXT NOT NULL, source_url TEXT NOT NULL, effective_from TEXT NOT NULL,
  effective_to TEXT, content_hash TEXT NOT NULL, snapshot_r2_key TEXT,
  verified_at TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'active', created_at_ms INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_izwa_procedure_current ON izwa_procedure_evidence(jurisdiction, status, effective_from);

CREATE TABLE IF NOT EXISTS izwa_service_conversations (
  service_record_id TEXT PRIMARY KEY, record_id TEXT NOT NULL, service_journey TEXT NOT NULL,
  payload_json TEXT NOT NULL, speaker_review_id TEXT NOT NULL,
  language_review_id TEXT NOT NULL, practitioner_review_id TEXT NOT NULL,
  outcome_understood INTEGER, response_understood INTEGER, next_step_correct INTEGER,
  handoff_available INTEGER, created_at_ms INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS izwa_vocabulary_records (
  vocabulary_record_id TEXT PRIMARY KEY, expression TEXT NOT NULL, language TEXT NOT NULL,
  status TEXT NOT NULL, origin_language TEXT, meaning TEXT NOT NULL, pronunciation TEXT,
  community_scope TEXT NOT NULL, observed_at TEXT NOT NULL, usage_examples_json TEXT NOT NULL,
  evidence_ids_json TEXT NOT NULL, adaptation_notes TEXT, created_at_ms INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_izwa_vocabulary_discovery ON izwa_vocabulary_records(language, status, expression);

CREATE TABLE IF NOT EXISTS izwa_coverage_cells (
  coverage_cell_id TEXT PRIMARY KEY, tenant TEXT NOT NULL, language_variety TEXT NOT NULL,
  service_situation TEXT, speech_condition TEXT, contributor_group TEXT,
  record_count INTEGER NOT NULL DEFAULT 0, target_count INTEGER NOT NULL DEFAULT 0,
  updated_at_ms INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_izwa_coverage_gap ON izwa_coverage_cells(tenant, record_count, target_count);

CREATE TABLE IF NOT EXISTS izwa_collection_assignments (
  assignment_id TEXT PRIMARY KEY, tenant TEXT NOT NULL, coverage_cell_id TEXT NOT NULL,
  title TEXT NOT NULL, instructions_json TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'open',
  target_count INTEGER NOT NULL, accepted_count INTEGER NOT NULL DEFAULT 0,
  created_at_ms INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS izwa_dataset_editions (
  edition_id TEXT PRIMARY KEY, dataset_id TEXT NOT NULL, slug TEXT NOT NULL, name TEXT NOT NULL,
  selection_json TEXT NOT NULL, contract_id TEXT NOT NULL, created_at_ms INTEGER NOT NULL,
  UNIQUE(dataset_id, slug)
);

CREATE TABLE IF NOT EXISTS izwa_customer_orgs (
  customer_org_id TEXT PRIMARY KEY, name TEXT NOT NULL, billing_email TEXT,
  status TEXT NOT NULL DEFAULT 'active', created_at_ms INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS izwa_products (
  product_id TEXT PRIMARY KEY, kind TEXT NOT NULL, resource_type TEXT NOT NULL,
  resource_id TEXT NOT NULL, name TEXT NOT NULL, description TEXT,
  status TEXT NOT NULL DEFAULT 'draft', created_at_ms INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS izwa_offers (
  offer_id TEXT PRIMARY KEY, product_id TEXT NOT NULL, currency TEXT NOT NULL,
  amount_minor INTEGER NOT NULL, billing_method TEXT NOT NULL,
  scope_json TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1, created_at_ms INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS izwa_license_templates (
  license_template_id TEXT PRIMARY KEY, name TEXT NOT NULL, version TEXT NOT NULL,
  rights_json TEXT NOT NULL, terms_r2_key TEXT NOT NULL, content_hash TEXT NOT NULL,
  created_at_ms INTEGER NOT NULL, UNIQUE(name, version)
);

CREATE TABLE IF NOT EXISTS izwa_commercial_contracts (
  commercial_contract_id TEXT PRIMARY KEY, customer_org_id TEXT NOT NULL,
  license_template_id TEXT NOT NULL, accepted_version TEXT NOT NULL,
  rights_json TEXT NOT NULL, obligations_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', starts_at TEXT, ends_at TEXT,
  accepted_at TEXT, created_at_ms INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS izwa_orders (
  order_id TEXT PRIMARY KEY, customer_org_id TEXT NOT NULL, currency TEXT NOT NULL,
  total_minor INTEGER NOT NULL, payment_status TEXT NOT NULL DEFAULT 'pending',
  fulfillment_status TEXT NOT NULL DEFAULT 'pending', external_reference TEXT,
  created_at_ms INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS izwa_order_items (
  order_item_id TEXT PRIMARY KEY, order_id TEXT NOT NULL, offer_id TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1, amount_minor INTEGER NOT NULL,
  resource_snapshot_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS izwa_subscriptions (
  subscription_id TEXT PRIMARY KEY, order_id TEXT NOT NULL, customer_org_id TEXT NOT NULL,
  product_id TEXT NOT NULL, status TEXT NOT NULL, starts_at TEXT NOT NULL,
  current_period_end TEXT NOT NULL, cancelled_at TEXT
);

CREATE TABLE IF NOT EXISTS izwa_entitlements (
  entitlement_id TEXT PRIMARY KEY, customer_org_id TEXT NOT NULL,
  commercial_contract_id TEXT NOT NULL, resource_type TEXT NOT NULL,
  resource_id TEXT NOT NULL, permission TEXT NOT NULL, starts_at TEXT NOT NULL,
  ends_at TEXT, status TEXT NOT NULL DEFAULT 'active', created_at_ms INTEGER NOT NULL,
  UNIQUE(customer_org_id, commercial_contract_id, resource_type, resource_id, permission)
);
CREATE INDEX IF NOT EXISTS idx_izwa_entitlement_check ON izwa_entitlements(customer_org_id, resource_type, resource_id, permission, status);

CREATE TABLE IF NOT EXISTS izwa_commercial_projects (
  commercial_project_id TEXT PRIMARY KEY, customer_org_id TEXT NOT NULL,
  commercial_contract_id TEXT NOT NULL, kind TEXT NOT NULL, requirements_json TEXT NOT NULL,
  reuse_permission TEXT NOT NULL DEFAULT 'private_only', status TEXT NOT NULL DEFAULT 'planned',
  budget_minor INTEGER, currency TEXT, created_at_ms INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS izwa_project_milestones (
  milestone_id TEXT PRIMARY KEY, commercial_project_id TEXT NOT NULL, name TEXT NOT NULL,
  acceptance_json TEXT NOT NULL, amount_minor INTEGER, status TEXT NOT NULL DEFAULT 'planned',
  accepted_at TEXT, created_at_ms INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS izwa_deliveries (
  delivery_id TEXT PRIMARY KEY, customer_org_id TEXT NOT NULL, entitlement_id TEXT NOT NULL,
  resource_type TEXT NOT NULL, resource_id TEXT NOT NULL, artifact_key TEXT NOT NULL,
  delivered_by TEXT NOT NULL, delivered_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS izwa_payment_events (
  payment_event_id TEXT PRIMARY KEY, provider TEXT NOT NULL, provider_event_id TEXT NOT NULL,
  event_type TEXT NOT NULL, payload_hash TEXT NOT NULL, payload_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'recorded', received_at_ms INTEGER NOT NULL,
  UNIQUE(provider, provider_event_id)
);

CREATE TABLE IF NOT EXISTS izwa_fulfillment_outbox (
  outbox_id TEXT PRIMARY KEY, aggregate_type TEXT NOT NULL, aggregate_id TEXT NOT NULL,
  event_type TEXT NOT NULL, payload_json TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending',
  attempts INTEGER NOT NULL DEFAULT 0, available_at_ms INTEGER NOT NULL,
  created_at_ms INTEGER NOT NULL, UNIQUE(aggregate_type, aggregate_id, event_type)
);
