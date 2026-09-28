// @izwa/datasets — dataset / dataset-version / data-unit schemas.
// D1 holds metadata; R2 holds immutable artifacts (vision doc §4, §20).

export interface Dataset {
  id: string;
  slug: string;
  name: string;
  description?: string;
  tenant: string;
  license?: string;
  createdAtMs: number;
}

export interface DatasetVersion {
  id: string;
  datasetId: string;
  version: string; // immutable, e.g. "v1.0" — never silently mutate
  r2Prefix: string; // e.g. "datasets/nguni-corpus/v1.0/"
  createdAtMs: number;
}

// Learned Data Unit — the atomic object (vision doc §6).
export interface LearnedDataUnit {
  id: string;
  datasetVersionId: string;
  rawRef: string; // R2 key for immutable raw bytes
  taxonomyJson?: string; // serialized TaxonomyContext (@izwa/taxonomy)
  createdAtMs: number;
}

export interface ProvenanceEvent {
  id: string;
  dataUnitId: string;
  step: string;
  refType: string;
  refId: string;
  detailJson: string;
  createdAtMs: number;
}
