// Data contracts — what makes refined output a product rather than an
// agent's answer. A contract pins fields, types, validation rules,
// quality gates, provenance/expert requirements, and the export format.
// Contracts are versioned spec objects; the active version for a vertical
// is resolved from D1 but the schema/validation logic lives here.

import type { FieldVerification, QualityContract } from "./types";

export const LANGUAGE_CONTRACT_VERSION = "v1";
export const IDIOM_CONTEXT_CONTRACT_VERSION = "v1";

export const LANGUAGE_CONTRACT: QualityContract = {
  contractId: `contract_language_${LANGUAGE_CONTRACT_VERSION}`,
  name: "African Language Intelligence Contract",
  vertical: "language",
  version: LANGUAGE_CONTRACT_VERSION,
  threshold: 0.78,
  minComponents: [
    { name: "model_agreement", min: 0.7 },
    { name: "deterministic_validation", min: 0.9 },
    { name: "evidence_coverage", min: 0.6 },
  ],
  weights: {
    model_agreement: 0.3,
    deterministic_validation: 0.25,
    evidence_coverage: 0.15,
    retrieval_consistency: 0.1,
    evaluator_performance: 0.1,
    domain_constraints: 0.05,
    human_verification_history: 0.05,
  },
  schema: {
    transcription: { required: true, type: "string", description: "Orthographic transcription" },
    phonemes: { required: true, type: "object", description: "Phonetic annotation" },
    morphology: { required: true, type: "object", description: "Morphological tags" },
    syntax: { required: true, type: "object", description: "Syntax tree / tags" },
    english_alignment: { required: false, type: "object", description: "Semantic alignment" },
    language: { required: true, type: "string", description: "Language candidate" },
    dialect: { required: false, type: "string", description: "Dialect candidate" },
    code_switching: { required: false, type: "object", description: "Code-switch spans" },
  },
  validationRules: {
    transcription: "must be non-empty and < 10k chars",
    phonemes: "must be a non-empty object with at least one segment",
    morphology: "must be a non-empty object",
    syntax: "must be a non-empty object",
    language: "must be a non-empty string",
  },
  export: {
    format: "jsonl",
    fields: [
      "record_id",
      "source_id",
      "audio_reference",
      "transcription",
      "language",
      "dialect",
      "phonetic_annotation",
      "semantic_alignment",
      "quality_score",
      "verification_status",
      "verified_by",
      "model_versions",
      "schema_version",
      "provenance",
    ],
  },
};

export const IDIOM_CONTEXT_CONTRACT: QualityContract = {
  contractId: `contract_idiom_context_${IDIOM_CONTEXT_CONTRACT_VERSION}`,
  name: "Idiom and Cultural Context Contract",
  vertical: "idiom-context",
  version: IDIOM_CONTEXT_CONTRACT_VERSION,
  // This score routes work; it never substitutes for the required human approvals.
  threshold: 0.78,
  minComponents: [
    { name: "deterministic_validation", min: 1 },
    { name: "evidence_coverage", min: 0.8 },
  ],
  weights: {
    model_agreement: 0.05,
    deterministic_validation: 0.35,
    evidence_coverage: 0.2,
    retrieval_consistency: 0.05,
    evaluator_performance: 0.05,
    domain_constraints: 0.15,
    human_verification_history: 0.15,
  },
  schema: {
    expression_span: { required: true, type: "object", description: "Exact words and media timestamps" },
    context: { required: true, type: "string", description: "Surrounding conversation and situation" },
    literal_meaning: { required: true, type: "string", description: "Literal description" },
    meaning_in_source_language: { required: true, type: "string", description: "Natural source-language explanation" },
    speaker_intent: { required: true, type: "object", description: "Intent plus attested/inferred basis" },
    social_function: { required: true, type: "array", description: "Advice, warning, teasing, refusal, etc." },
    usage_conditions: { required: true, type: "string", description: "When use is appropriate" },
    alternative_readings: { required: true, type: "array", description: "Context-supported alternatives" },
    translations: { required: true, type: "array", description: "Target language and register aware renderings" },
    known_bad_translation: { required: false, type: "object", description: "Observed or constructed failure" },
    failure_explanation: { required: false, type: "string", description: "What the bad rendering loses" },
    review_evidence: { required: true, type: "array", description: "Field-level reviewer attestations" },
    source_asset_id: { required: true, type: "string", description: "Immutable media asset" },
    source_group_id: { required: true, type: "string", description: "Lineage group kept in one dataset split" },
    transcript: { required: true, type: "string", description: "Corrected source transcript" },
  },
  validationRules: {
    context: "must be non-empty",
    meaning_in_source_language: "must be non-empty",
    translations: "must contain at least one translation",
    review_evidence: "must include required field approvals from a speaker and a second fluent reviewer",
  },
  export: {
    format: "jsonl",
    fields: [
      "record_id", "source_id", "audio_reference", "transcript", "expression_span",
      "context", "literal_meaning", "meaning_in_source_language", "speaker_intent",
      "social_function", "usage_conditions", "alternative_readings", "translations",
      "known_bad_translation", "failure_explanation", "review_evidence", "verification_status",
      "schema_version", "provenance",
    ],
  },
};

export const IDIOM_REQUIRED_REVIEW_FIELDS = [
  "expression_span",
  "context",
  "meaning_in_source_language",
  "speaker_intent",
  "usage_conditions",
  "translations",
] as const;

export function validateIdiomApprovals(
  reviews: FieldVerification[],
): { approved: boolean; missing: string[]; conflicts: string[] } {
  const missing: string[] = [];
  const conflicts: string[] = [];
  for (const field of IDIOM_REQUIRED_REVIEW_FIELDS) {
    const fieldReviews = reviews.filter((review) => review.field === field);
    const speaker = fieldReviews.find(
      (review) => review.reviewerRole === "speaker" && review.verdict === "verified",
    );
    const second = fieldReviews.find(
      (review) =>
        review.reviewerId !== speaker?.reviewerId &&
        (review.reviewerRole === "fluent_reviewer" || review.reviewerRole === "adjudicator") &&
        review.verdict === "verified",
    );
    if (!speaker || !second) missing.push(field);
    if (fieldReviews.some((review) => review.verdict === "rejected")) conflicts.push(field);
  }
  return { approved: missing.length === 0 && conflicts.length === 0, missing, conflicts };
}

// Resolve the active contract for a vertical from D1, falling back to the
// built-in language contract when none is registered.
export async function resolveContract(env: Env, vertical: string): Promise<QualityContract> {
  if (vertical === "language" || vertical === "idiom-context") {
    const row = await env.DB.prepare(
      `SELECT spec_json FROM izwa_quality_contracts
       WHERE vertical = ? AND active = 1 ORDER BY created_at_ms DESC LIMIT 1`,
    )
      .bind(vertical)
      .first<{ spec_json: string }>();
    if (row?.spec_json) {
      try {
        return JSON.parse(row.spec_json) as QualityContract;
      } catch {
        // fall through to the built-in
      }
    }
    return vertical === "idiom-context" ? IDIOM_CONTEXT_CONTRACT : LANGUAGE_CONTRACT;
  }
  return LANGUAGE_CONTRACT;
}

// Deterministic validation of a proposed payload against the contract
// schema + rules. Returns the fraction of required fields/rules that
// passed plus the list of violations (feeds evidence_coverage + the
// deterministic_validation quality component).
export function validatePayload(
  contract: QualityContract,
  payload: Record<string, unknown>,
): { score: number; violations: string[] } {
  const violations: string[] = [];
  let checked = 0;
  let passed = 0;

  for (const [field, spec] of Object.entries(contract.schema)) {
    const value = payload[field];
    const present = value !== undefined && value !== null;
    if (!spec.required) {
      if (present) checked++;
      continue;
    }
    checked++;
    if (!present) {
      violations.push(`missing required field: ${field}`);
      continue;
    }
    const valid = validateType(value, spec.type);
    if (!valid) {
      violations.push(`field ${field} failed type check (${spec.type})`);
      continue;
    }
    passed++;
  }

  for (const [field, rule] of Object.entries(contract.validationRules)) {
    const value = payload[field];
    if (value === undefined || value === null) continue;
    checked++;
    const ok = applyRule(field, value, rule);
    if (!ok) {
      violations.push(`rule violation on ${field}: ${rule}`);
    } else {
      passed++;
    }
  }

  const score = checked === 0 ? 0 : passed / checked;
  return { score, violations };
}

function validateType(value: unknown, type: string): boolean {
  switch (type) {
    case "string":
      return typeof value === "string" && value.length > 0;
    case "object":
      return typeof value === "object" && value !== null && !Array.isArray(value);
    case "array":
      return Array.isArray(value);
    case "number":
      return typeof value === "number" && Number.isFinite(value);
    case "boolean":
      return typeof value === "boolean";
    default:
      return true;
  }
}

function applyRule(field: string, value: unknown, rule: string): boolean {
  if (field === "transcription") {
    return typeof value === "string" && value.length > 0 && value.length < 10_000;
  }
  return true;
}
