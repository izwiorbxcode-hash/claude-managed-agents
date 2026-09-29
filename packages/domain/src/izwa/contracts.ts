// Data contracts — what makes refined output a product rather than an
// agent's answer. A contract pins fields, types, validation rules,
// quality gates, provenance/expert requirements, and the export format.
// Contracts are versioned spec objects; the active version for a vertical
// is resolved from D1 but the schema/validation logic lives here.

import type { FieldVerification, QualityContract } from "./types";
import { CONTEXTUAL_MEANING_CONTRACT, SERVICE_CONVERSATION_CONTRACT, VOCABULARY_DEVELOPMENT_CONTRACT } from "./context-contracts";

export const LANGUAGE_CONTRACT_VERSION = "v1";
export const IDIOM_CONTEXT_CONTRACT_VERSION = "v1";

export const LANGUAGE_CONTRACT: QualityContract = {
  contractId: `contract_language_${LANGUAGE_CONTRACT_VERSION}`,
  export: {
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
    format: "jsonl",
  },
  minComponents: [
    { min: 0.7, name: "model_agreement" },
    { min: 0.9, name: "deterministic_validation" },
    { min: 0.6, name: "evidence_coverage" },
  ],
  name: "African Language Intelligence Contract",
  schema: {
    code_switching: {
      description: "Code-switch spans",
      required: false,
      type: "object",
    },
    dialect: {
      description: "Dialect candidate",
      required: false,
      type: "string",
    },
    english_alignment: {
      description: "Semantic alignment",
      required: false,
      type: "object",
    },
    language: {
      description: "Language candidate",
      required: true,
      type: "string",
    },
    morphology: {
      description: "Morphological tags",
      required: true,
      type: "object",
    },
    phonemes: {
      description: "Phonetic annotation",
      required: true,
      type: "object",
    },
    syntax: {
      description: "Syntax tree / tags",
      required: true,
      type: "object",
    },
    transcription: {
      description: "Orthographic transcription",
      required: true,
      type: "string",
    },
  },
  threshold: 0.78,
  validationRules: {
    language: "must be a non-empty string",
    morphology: "must be a non-empty object",
    phonemes: "must be a non-empty object with at least one segment",
    syntax: "must be a non-empty object",
    transcription: "must be non-empty and < 10k chars",
  },
  version: LANGUAGE_CONTRACT_VERSION,
  vertical: "language",
  weights: {
    deterministic_validation: 0.25,
    domain_constraints: 0.05,
    evaluator_performance: 0.1,
    evidence_coverage: 0.15,
    human_verification_history: 0.05,
    model_agreement: 0.3,
    retrieval_consistency: 0.1,
  },
};

export const IDIOM_CONTEXT_CONTRACT: QualityContract = {
  contractId: `contract_idiom_context_${IDIOM_CONTEXT_CONTRACT_VERSION}`,
  export: {
    fields: [
      "record_id",
      "source_id",
      "audio_reference",
      "transcript",
      "expression_span",
      "context",
      "literal_meaning",
      "meaning_in_source_language",
      "speaker_intent",
      "social_function",
      "usage_conditions",
      "alternative_readings",
      "translations",
      "known_bad_translation",
      "failure_explanation",
      "review_evidence",
      "verification_status",
      "schema_version",
      "provenance",
    ],
    format: "jsonl",
  },
  minComponents: [
    { min: 1, name: "deterministic_validation" },
    { min: 0.8, name: "evidence_coverage" },
  ],
  name: "Idiom and Cultural Context Contract",
  schema: {
    alternative_readings: {
      description: "Context-supported alternatives",
      required: true,
      type: "array",
    },
    context: {
      description: "Surrounding conversation and situation",
      required: true,
      type: "string",
    },
    expression_span: {
      description: "Exact words and media timestamps",
      required: true,
      type: "object",
    },
    failure_explanation: {
      description: "What the bad rendering loses",
      required: false,
      type: "string",
    },
    known_bad_translation: {
      description: "Observed or constructed failure",
      required: false,
      type: "object",
    },
    literal_meaning: {
      description: "Literal description",
      required: true,
      type: "string",
    },
    meaning_in_source_language: {
      description: "Natural source-language explanation",
      required: true,
      type: "string",
    },
    review_evidence: {
      description: "Field-level reviewer attestations",
      required: true,
      type: "array",
    },
    social_function: {
      description: "Advice, warning, teasing, refusal, etc.",
      required: true,
      type: "array",
    },
    source_asset_id: {
      description: "Immutable media asset",
      required: true,
      type: "string",
    },
    source_group_id: {
      description: "Lineage group kept in one dataset split",
      required: true,
      type: "string",
    },
    speaker_intent: {
      description: "Intent plus attested/inferred basis",
      required: true,
      type: "object",
    },
    transcript: {
      description: "Corrected source transcript",
      required: true,
      type: "string",
    },
    translations: {
      description: "Target language and register aware renderings",
      required: true,
      type: "array",
    },
    usage_conditions: {
      description: "When use is appropriate",
      required: true,
      type: "string",
    },
  },
  // This score routes work; it never substitutes for the required human approvals.
  threshold: 0.78,
  validationRules: {
    context: "must be non-empty",
    meaning_in_source_language: "must be non-empty",
    review_evidence:
      "must include required field approvals from a speaker and a second fluent reviewer",
    translations: "must contain at least one translation",
  },
  version: IDIOM_CONTEXT_CONTRACT_VERSION,
  vertical: "idiom-context",
  weights: {
    deterministic_validation: 0.35,
    domain_constraints: 0.15,
    evaluator_performance: 0.05,
    evidence_coverage: 0.2,
    human_verification_history: 0.15,
    model_agreement: 0.05,
    retrieval_consistency: 0.05,
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

export function validateIdiomApprovals(reviews: FieldVerification[]): {
  approved: boolean;
  missing: string[];
  conflicts: string[];
} {
  const missing: string[] = [];
  const conflicts: string[] = [];
  for (const field of IDIOM_REQUIRED_REVIEW_FIELDS) {
    const fieldReviews = reviews.filter((review) => review.field === field);
    const speaker = fieldReviews.find(
      (review) =>
        review.reviewerRole === "speaker" && review.verdict === "verified"
    );
    const second = fieldReviews.find(
      (review) =>
        review.reviewerId !== speaker?.reviewerId &&
        (review.reviewerRole === "fluent_reviewer" ||
          review.reviewerRole === "adjudicator") &&
        review.verdict === "verified"
    );
    if (!(speaker && second)) {
      missing.push(field);
    }
    if (fieldReviews.some((review) => review.verdict === "rejected")) {
      conflicts.push(field);
    }
  }
  return {
    approved: missing.length === 0 && conflicts.length === 0,
    conflicts,
    missing,
  };
}

export function validateIdiomPayload(
  payload: Record<string, unknown>
): string[] {
  const violations = validatePayload(
    IDIOM_CONTEXT_CONTRACT,
    payload
  ).violations;
  const span = payload.expression_span as Record<string, unknown> | undefined;
  if (!span || typeof span.text !== "string" || span.text.trim().length === 0) {
    violations.push("expression_span.text must be non-empty");
  }
  if (
    !span ||
    typeof span.start_ms !== "number" ||
    typeof span.end_ms !== "number" ||
    span.start_ms < 0 ||
    span.end_ms < span.start_ms
  ) {
    violations.push(
      "expression_span timestamps must be ordered non-negative milliseconds"
    );
  }
  const intent = payload.speaker_intent as Record<string, unknown> | undefined;
  if (
    !intent ||
    typeof intent.value !== "string" ||
    !["speaker_attested", "inferred", "unknown"].includes(String(intent.basis))
  ) {
    violations.push("speaker_intent requires value and an explicit basis");
  }
  const translations = payload.translations;
  if (
    !Array.isArray(translations) ||
    translations.length === 0 ||
    translations.some((entry) => {
      const translation = entry as Record<string, unknown>;
      return (
        !translation ||
        typeof translation.text !== "string" ||
        !translation.text.trim() ||
        typeof translation.targetLanguage !== "string" ||
        !translation.targetLanguage.trim() ||
        typeof translation.register !== "string" ||
        !translation.register.trim()
      );
    })
  ) {
    violations.push("translations require text, targetLanguage, and register");
  }
  if (
    payload.known_bad_translation &&
    (typeof payload.failure_explanation !== "string" ||
      !payload.failure_explanation.trim())
  ) {
    violations.push(
      "failure_explanation is required with known_bad_translation"
    );
  }
  return [...new Set(violations)];
}

// Resolve the active contract for a vertical from D1, falling back to the
// built-in language contract when none is registered.
export async function resolveContract(
  env: Env,
  vertical: string
): Promise<QualityContract> {
  const builtIns: Record<string, QualityContract> = {
    language: LANGUAGE_CONTRACT,
    "idiom-context": IDIOM_CONTEXT_CONTRACT,
    "contextual-meaning": CONTEXTUAL_MEANING_CONTRACT,
    "service-conversation": SERVICE_CONVERSATION_CONTRACT,
    "vocabulary-development": VOCABULARY_DEVELOPMENT_CONTRACT,
  };
  if (builtIns[vertical]) {
    const row = await env.DB.prepare(
      `SELECT spec_json FROM izwa_quality_contracts
       WHERE vertical = ? AND active = 1 ORDER BY created_at_ms DESC LIMIT 1`
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
    return builtIns[vertical];
  }
  return LANGUAGE_CONTRACT;
}

// Deterministic validation of a proposed payload against the contract
// schema + rules. Returns the fraction of required fields/rules that
// passed plus the list of violations (feeds evidence_coverage + the
// deterministic_validation quality component).
export function validatePayload(
  contract: QualityContract,
  payload: Record<string, unknown>
): { score: number; violations: string[] } {
  const violations: string[] = [];
  let checked = 0;
  let passed = 0;

  for (const [field, spec] of Object.entries(contract.schema)) {
    const value = payload[field];
    const present = value !== undefined && value !== null;
    if (!spec.required) {
      if (present) {
        checked++;
      }
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
    if (value === undefined || value === null) {
      continue;
    }
    checked++;
    const ok = applyRule(field, value, rule);
    if (ok) {
      passed++;
    } else {
      violations.push(`rule violation on ${field}: ${rule}`);
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
      return (
        typeof value === "object" && value !== null && !Array.isArray(value)
      );
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
    return (
      typeof value === "string" && value.length > 0 && value.length < 10_000
    );
  }
  return true;
}
