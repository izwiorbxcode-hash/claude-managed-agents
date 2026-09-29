import type { QualityContract } from "./types.js";

const weights = { deterministic_validation: 0.35, domain_constraints: 0.2, evidence_coverage: 0.25, human_verification_history: 0.2, model_agreement: 0 };

export const CONTEXTUAL_MEANING_CONTRACT: QualityContract = {
  contractId: "contract_contextual_meaning_v1",
  export: { fields: ["sourceSegmentId", "languageTags", "varietyLabels", "phenomena", "context", "interpretations", "annotations", "taxonomyVersion"], format: "jsonl" },
  minComponents: [{ min: 1, name: "deterministic_validation" }, { min: 0.8, name: "evidence_coverage" }],
  name: "Contextual Meaning Contract",
  schema: {
    annotations: { required: true, type: "array" }, context: { required: true, type: "object" }, interpretations: { required: true, type: "array" },
    languageTags: { required: true, type: "array" }, phenomena: { required: true, type: "array" }, sourceSegmentId: { required: true, type: "string" },
    taxonomyVersion: { required: true, type: "string" }, varietyLabels: { required: true, type: "array" },
  },
  threshold: 0.85,
  validationRules: { annotations: "every selected module must pass its versioned schema", interpretations: "at least one interpretation must be human reviewed" },
  version: "v1",
  vertical: "contextual-meaning",
  weights,
};

export const SERVICE_CONVERSATION_CONTRACT: QualityContract = {
  contractId: "contract_service_conversation_v1",
  expertRequirement: { roles: ["community_speaker", "language_reviewer", "service_practitioner"] },
  export: { fields: ["sourceAssetId", "originalWords", "intent", "targetOutcome", "knownInformation", "ambiguity", "nextResponse", "acceptableResponses", "assumptionsToAvoid", "humanHandoff", "authorityEvidenceIds"], format: "jsonl" },
  minComponents: [{ min: 1, name: "deterministic_validation" }, { min: 1, name: "evidence_coverage" }],
  name: "Public Service Conversation Contract",
  schema: {
    acceptableResponses: { required: true, type: "array" }, ambiguity: { required: true, type: "array" }, assumptionsToAvoid: { required: true, type: "array" },
    authorityEvidenceIds: { required: true, type: "array" }, humanHandoff: { required: true, type: "object" }, intent: { required: true, type: "string" },
    knownInformation: { required: true, type: "object" }, nextResponse: { required: true, type: "string" }, originalWords: { required: true, type: "string" },
    sourceAssetId: { required: true, type: "string" }, targetOutcome: { required: true, type: "string" },
  },
  threshold: 0.9,
  validationRules: { authorityEvidenceIds: "current procedure claims require separately versioned authority evidence", nextResponse: "must be reviewed for language quality and administrative correctness" },
  version: "v1",
  vertical: "service-conversation",
  weights,
};

export const VOCABULARY_DEVELOPMENT_CONTRACT: QualityContract = {
  contractId: "contract_vocabulary_development_v1",
  export: { fields: ["expression", "language", "status", "meaning", "originLanguage", "pronunciation", "communityScope", "observedAt", "usageExamples", "evidenceIds", "adaptationNotes"], format: "jsonl" },
  minComponents: [{ min: 1, name: "deterministic_validation" }, { min: 0.8, name: "evidence_coverage" }],
  name: "Vocabulary Development Contract",
  schema: {
    communityScope: { required: true, type: "string" }, evidenceIds: { required: true, type: "array" }, expression: { required: true, type: "string" },
    language: { required: true, type: "string" }, meaning: { required: true, type: "string" }, observedAt: { required: true, type: "string" },
    status: { required: true, type: "string" }, usageExamples: { required: true, type: "array" },
  },
  threshold: 0.85,
  validationRules: { communityScope: "claims may not exceed their evidence community", status: "must distinguish attested, proposed, and observed adoption" },
  version: "v1",
  vertical: "vocabulary-development",
  weights,
};
