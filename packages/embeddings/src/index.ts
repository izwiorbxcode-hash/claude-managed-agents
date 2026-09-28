// @izwa/embeddings — representation interfaces + lineage.
// Vectors live in R2/Vectorize; D1 tracks lineage (vision doc §7, §11).

export interface Representation {
  id: string;
  dataUnitId: string;
  modelId: string;
  modelVersion: string;
  dimension: number;
  vectorLocation: string; // R2 key or Vectorize id
  checksum?: string;
  createdAtMs: number;
}

export interface RepresentationLineage {
  dataUnitId: string;
  versions: Representation[];
}
