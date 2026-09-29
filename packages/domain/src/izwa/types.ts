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

export type Vertical = "language" | "idiom-context";

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
  modality: Modality;
  languageHints: string[];
  scriptHints: string[];
  privacy: "public" | "sensitive";
  complexity: "low" | "medium" | "high";
  duplicateOf: string | null;
  qualityIndicators: Record<string, number | boolean | string>;
  textLength: number;
  estimatedDurationSec?: number;
}

// A vector-space hit returned by Vectorize. Used both for dialect
// scouting (routing) and evidence retrieval (context for specialists).
export interface VecMatch {
  id: string;
  score: number;
  metadata?: Record<string, unknown>;
}

// One specialist seat on the composed team. Independence is tracked
// explicitly: three identical calls to the same model with the same
// prompt are NOT three independent opinions, so each assignment declares
// exactly which dimensions differ.
export interface SpecialistAssignment {
  role: SpecialistRole;
  agentKey: string;
  promptVersion: string;
  modelId: string;
  independence: {
    model: string;
    prompt: string;
    tools: string[];
    representations: string[];
    evidenceIds: string[];
  };
}

export interface SpecialistTeam {
  vertical: Vertical;
  assignments: SpecialistAssignment[];
  retrievedEvidence: VecMatch[];
  anchors: VecMatch[];
}

// A single specialist's proposed result. `confidence` is advisory only —
// it feeds the composite quality engine, it is never treated as
// authoritative.
export interface Proposal {
  proposalId: string;
  taskId: string;
  specialistRole: SpecialistRole;
  agentKey: string;
  modelId: string;
  promptVersion: string;
  confidence: number;
  uncertainty: string[];
  payload: Record<string, unknown>;
  evidenceIds: string[];
}

export interface QualityComponent {
  name: string;
  score: number; // 0..1
  weight: number; // 0..1
  detail: unknown;
}

export interface CompositeQuality {
  overall: number; // weighted mean of components, 0..1
  components: QualityComponent[];
  threshold: number;
  satisfied: boolean;
  unsatisfiedGates: string[];
}

// A machine-readable data contract. A vertical pack ships one or more
// contracts; the refinery only crystallizes when the contract's gates are
// satisfied.
export interface QualityContract {
  contractId: string;
  name: string;
  vertical: Vertical;
  version: string;
  threshold: number;
  minComponents: { name: string; min: number }[];
  weights: Record<string, number>;
  schema: Record<string, { required?: boolean; type: string; description?: string }>;
  validationRules: Record<string, string>;
  expertRequirement?: { roles: string[]; languages?: string[] };
  export: { format: string; fields: string[] };
}

export type VerificationBasis = "observed" | "speaker_attested" | "reviewer_attested" | "inferred";

export interface IdiomTranslation {
  targetLanguage: string;
  text: string;
  register: string;
}

export interface FieldVerification {
  field: string;
  reviewerId: string;
  reviewerRole: "speaker" | "fluent_reviewer" | "adjudicator";
  verdict: "verified" | "rejected" | "alternative" | "insufficient_context";
  basis: VerificationBasis;
  evidenceIds: string[];
  reviewedAtMs: number;
}

export interface IdiomContextPayload {
  expression_span: { text: string; start_ms: number; end_ms: number };
  context: string;
  literal_meaning: string;
  meaning_in_source_language: string;
  speaker_intent: { value: string; basis: "speaker_attested" | "inferred" | "unknown" };
  social_function: string[];
  usage_conditions: string;
  alternative_readings: Array<{ reading: string; supporting_context: string }>;
  translations: IdiomTranslation[];
  known_bad_translation?: { text: string; provenance: "observed" | "constructed" };
  failure_explanation?: string;
  review_evidence: FieldVerification[];
  source_asset_id: string;
  source_group_id: string;
  transcript: string;
}

// Input envelope for the ingest endpoint.
export interface IngestInput {
  modality?: Modality;
  text?: string;
  audioKey?: string;
  audioDurationSec?: number;
  source?: string;
  tenant?: string;
  meta?: Record<string, unknown>;
  vertical?: Vertical;
}

export interface NegotiateInput {
  taskId: string;
  assetId: string;
  tenant: string;
  vertical: Vertical;
  text: string;
  contractId: string;
  team: SpecialistTeam;
}

export interface ResolveInput {
  taskId: string;
  escalationId: string;
  expertId: string;
  correction: Record<string, unknown>;
  resolutionText: string;
}
