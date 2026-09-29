// Shared IZWA refinery types. Kept in one module so the profiler, router,
// quality engine, coordinator, and API surface agree on shapes without
// drifting.

export type Modality =
  | "audio"
  | "text"
  | "document"
  | "image"
  | "video"
  | "structured";

export type Vertical =
  | "language"
  | "idiom-context"
  | "contextual-meaning"
  | "service-conversation"
  | "vocabulary-development";

export type SpecialistRole =
  | "phonetics"
  | "morphology"
  | "syntax"
  | "semantics"
  | "dialect_variation"
  | "code_switching"
  | "translation";

export type TaskStatus =
  | "queued"
  | "profiling"
  | "routing"
  | "analyzing"
  | "evaluating"
  | "crystallized"
  | "escalated"
  | "failed";

// Layer 2 output: everything the system can learn about an input *before*
// spending money on frontier models.
export interface AssetProfile {
  complexity: "low" | "medium" | "high";
  duplicateOf: string | null;
  estimatedDurationSec?: number;
  languageHints: string[];
  modality: Modality;
  privacy: "public" | "sensitive";
  qualityIndicators: Record<string, number | boolean | string>;
  scriptHints: string[];
  textLength: number;
}

// A vector-space hit returned by Vectorize. Used both for dialect
// scouting (routing) and evidence retrieval (context for specialists).
export interface VecMatch {
  id: string;
  metadata?: Record<string, unknown>;
  score: number;
}

// One specialist seat on the composed team. Independence is tracked
// explicitly: three identical calls to the same model with the same
// prompt are NOT three independent opinions, so each assignment declares
// exactly which dimensions differ.
export interface SpecialistAssignment {
  agentKey: string;
  independence: {
    model: string;
    prompt: string;
    tools: string[];
    representations: string[];
    evidenceIds: string[];
  };
  modelId: string;
  promptVersion: string;
  role: SpecialistRole;
}

export interface SpecialistTeam {
  anchors: VecMatch[];
  assignments: SpecialistAssignment[];
  retrievedEvidence: VecMatch[];
  vertical: Vertical;
}

// A single specialist's proposed result. `confidence` is advisory only —
// it feeds the composite quality engine, it is never treated as
// authoritative.
export interface Proposal {
  agentKey: string;
  confidence: number;
  evidenceIds: string[];
  modelId: string;
  payload: Record<string, unknown>;
  promptVersion: string;
  proposalId: string;
  specialistRole: SpecialistRole;
  taskId: string;
  uncertainty: string[];
}

export interface QualityComponent {
  detail: unknown;
  name: string;
  score: number; // 0..1
  weight: number; // 0..1
}

export interface CompositeQuality {
  components: QualityComponent[];
  overall: number; // weighted mean of components, 0..1
  satisfied: boolean;
  threshold: number;
  unsatisfiedGates: string[];
}

// A machine-readable data contract. A vertical pack ships one or more
// contracts; the refinery only crystallizes when the contract's gates are
// satisfied.
export interface QualityContract {
  contractId: string;
  expertRequirement?: { roles: string[]; languages?: string[] };
  export: { format: string; fields: string[] };
  minComponents: { name: string; min: number }[];
  name: string;
  schema: Record<
    string,
    { required?: boolean; type: string; description?: string }
  >;
  threshold: number;
  validationRules: Record<string, string>;
  version: string;
  vertical: Vertical;
  weights: Record<string, number>;
}

export type VerificationBasis =
  | "observed"
  | "speaker_attested"
  | "reviewer_attested"
  | "inferred";

export interface IdiomTranslation {
  register: string;
  targetLanguage: string;
  text: string;
}

export interface FieldVerification {
  basis: VerificationBasis;
  evidenceIds: string[];
  field: string;
  reviewedAtMs: number;
  reviewerId: string;
  reviewerRole: "speaker" | "fluent_reviewer" | "adjudicator";
  verdict: "verified" | "rejected" | "alternative" | "insufficient_context";
}

export interface IdiomContextPayload {
  alternative_readings: Array<{ reading: string; supporting_context: string }>;
  context: string;
  expression_span: { text: string; start_ms: number; end_ms: number };
  failure_explanation?: string;
  known_bad_translation?: {
    text: string;
    provenance: "observed" | "constructed";
  };
  literal_meaning: string;
  meaning_in_source_language: string;
  review_evidence: FieldVerification[];
  social_function: string[];
  source_asset_id: string;
  source_group_id: string;
  speaker_intent: {
    value: string;
    basis: "speaker_attested" | "inferred" | "unknown";
  };
  transcript: string;
  translations: IdiomTranslation[];
  usage_conditions: string;
}

// Input envelope for the ingest endpoint.
export interface IngestInput {
  audioDurationSec?: number;
  audioKey?: string;
  meta?: Record<string, unknown>;
  modality?: Modality;
  source?: string;
  tenant?: string;
  text?: string;
  vertical?: Vertical;
}

export interface NegotiateInput {
  assetId: string;
  contractId: string;
  taskId: string;
  team: SpecialistTeam;
  tenant: string;
  text: string;
  vertical: Vertical;
}

export interface ResolveInput {
  correction: Record<string, unknown>;
  escalationId: string;
  expertId: string;
  resolutionText: string;
  taskId: string;
}
