// @izwa/evaluation — benchmarks, runs, quality gates.
// Evaluation is a first-class asset (vision doc §6-7, §21).

export interface Benchmark {
  id: string;
  name: string;
  vertical: string;
  version: string;
}

export interface EvaluationRun {
  id: string;
  benchmarkId: string;
  modelId: string;
  modelVersion: string;
  datasetVersionId: string;
  metricsJson: string;
  createdAtMs: number;
}

export interface QualityGate {
  name: string;
  min: number;
  weight: number;
}
