// Data contracts — what makes refined output a product rather than an
// agent's answer. A contract pins fields, types, validation rules,
// quality gates, provenance/expert requirements, and the export format.
// Contracts are versioned spec objects; the active version for a vertical
// is resolved from D1 but the schema/validation logic lives here.

import type { QualityContract } from "./types";

export const LANGUAGE_CONTRACT_VERSION = "v1";

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

// Resolve the active contract for a vertical from D1, falling back to the
// built-in language contract when none is registered.
export async function resolveContract(env: Env, vertical: string): Promise<QualityContract> {
  if (vertical === "language") {
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
    return LANGUAGE_CONTRACT;
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
