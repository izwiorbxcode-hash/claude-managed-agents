export type PhenomenonLabel =
  | "idiom" | "proverb" | "humour" | "wordplay" | "slang" | "sarcasm"
  | "irony" | "teasing" | "indirect_request" | "indirect_refusal" | "respect"
  | "praise" | "euphemism" | "code_switching" | "song" | "chant"
  | "oral_storytelling" | "literal_conversation";

export type AnnotationModuleKind =
  | "humour-v1" | "figurative-v1" | "slang-v1" | "pragmatics-v1"
  | "performance-v1" | "translation-v1";

export interface AnnotationModule {
  evidenceIds: string[];
  kind: AnnotationModuleKind;
  payload: Record<string, unknown>;
  schemaVersion: string;
  status: "proposed" | "reviewed" | "disputed";
}

export interface MeaningRecord {
  annotations: AnnotationModule[];
  context: { audience?: string; followingSegmentIds: string[]; observedAt?: string; place?: string; precedingSegmentIds: string[]; situation?: string };
  id: string;
  interpretations: Array<{ communicativePurpose?: string; explanation: string; explanationLanguage: string; literalReading?: string; status: "proposed" | "reviewed" | "disputed"; supportingEvidenceIds: string[] }>;
  languageTags: string[];
  phenomena: Array<{ evidenceIds: string[]; label: PhenomenonLabel | string; span?: { end: number; start: number } }>;
  sourceSegmentId: string;
  taxonomyVersion: string;
  varietyLabels: string[];
}

export interface ServiceConversationRecord {
  acceptableResponses: string[];
  ambiguity: string[];
  assumptionsToAvoid: string[];
  authorityEvidenceIds: string[];
  humanHandoff: { reason?: string; required: boolean };
  intent: string;
  knownInformation: Record<string, unknown>;
  nextResponse: string;
  originalWords: string;
  sourceAssetId: string;
  targetOutcome: string;
}

export interface ProcedureEvidence {
  authority: string;
  effectiveFrom: string;
  effectiveTo?: string;
  jurisdiction: string;
  sourceUrl: string;
  verifiedAt: string;
}

export type VocabularyStatus = "attested" | "proposed" | "observed_adoption";
export interface VocabularyRecord {
  adaptationNotes?: string;
  communityScope: string;
  evidenceIds: string[];
  expression: string;
  language: string;
  meaning: string;
  observedAt: string;
  originLanguage?: string;
  pronunciation?: string;
  status: VocabularyStatus;
  usageExamples: string[];
}

export interface CoverageCell {
  consentedContributorGroup?: string;
  count: number;
  languageVariety: string;
  serviceSituation?: string;
  speechCondition?: string;
}

export type CommerceResourceType = "dataset_version" | "dataset_collection" | "project" | "deployment";
export interface Entitlement {
  commercialContractId: string;
  customerOrgId: string;
  endsAt?: string;
  id: string;
  permission: "download" | "receive_updates" | "operate";
  resourceId: string;
  resourceType: CommerceResourceType;
  startsAt: string;
  status: "active" | "suspended" | "revoked";
}

export interface CommercialRights {
  derivativeModels: boolean;
  exclusivity: "none" | "field" | "territory" | "full";
  permittedUses: string[];
  redistribution: boolean;
  training: boolean;
}
