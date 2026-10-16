// @izwa/evaluation — community-grounded benchmarks, runs, and release gates.

export const COMMUNITY_RUBRIC_MIN = 0;
export const COMMUNITY_RUBRIC_MAX = 4;

export const evaluationDimensions = [
  "transcription",
  "literal_meaning",
  "intended_meaning",
  "cultural_context",
  "social_function",
  "performance_cues",
  "uncertainty_handling",
] as const;

export type EvaluationDimension = (typeof evaluationDimensions)[number];

export type EvaluatorRole =
  | "speaker"
  | "source_author"
  | "community_reviewer"
  | "language_reviewer"
  | "domain_reviewer"
  | "adjudicator";

export type ReviewVerdict =
  | "acceptable"
  | "needs_correction"
  | "valid_alternative"
  | "insufficient_context";

export interface Benchmark {
  id: string;
  name: string;
  version: string;
  vertical: string;
}

export interface CommunityBenchmark extends Benchmark {
  governance: BenchmarkGovernance;
  languages: string[];
  requiredDimensions: EvaluationDimension[];
  sourceTypes: string[];
}

export interface BenchmarkGovernance {
  adjudicatorRequiredForConflict: boolean;
  minCommunityReviewers: number;
  minIndependentReviewers: number;
  minLanguageReviewers: number;
  releaseThreshold: number;
  requireSourceGroupIsolation: boolean;
}

export interface CommunityReference {
  basis:
    | "speaker_attested"
    | "community_attested"
    | "source_evidence"
    | "reviewer_inferred";
  communityScope?: string;
  dimension: EvaluationDimension;
  evidenceIds: string[];
  text: string;
}

export interface BenchmarkItem {
  audioRef: string;
  id: string;
  language: string;
  languageVariety?: string;
  prompt: string;
  references: CommunityReference[];
  requiredDimensions: EvaluationDimension[];
  sourceGroupId: string;
  sourceType: string;
}

export interface CommunityEvaluator {
  communityScopes: string[];
  id: string;
  languages: string[];
  roles: EvaluatorRole[];
}

export interface DimensionJudgment {
  dimension: EvaluationDimension;
  evidenceIds: string[];
  rationale: string;
  score: number;
  uncertainty?: string;
  verdict: ReviewVerdict;
}

export interface CommunityEvaluation {
  evaluator: CommunityEvaluator;
  id: string;
  itemId: string;
  judgments: DimensionJudgment[];
  reviewedAtMs: number;
}

export interface EvaluationRun {
  benchmarkId: string;
  createdAtMs: number;
  datasetVersionId: string;
  id: string;
  metricsJson: string;
  modelId: string;
  modelVersion: string;
}

export interface QualityGate {
  min: number;
  name: string;
  weight: number;
}

export interface DimensionResult {
  agreement: number;
  dimension: EvaluationDimension;
  judgmentCount: number;
  normalizedScore: number;
  score: number;
  unresolved: boolean;
}

export interface CommunityItemResult {
  completion: number;
  dimensions: DimensionResult[];
  itemId: string;
  passed: boolean;
  reasons: string[];
  score: number;
}

export interface SplitAssignment {
  itemId: string;
  sourceGroupId: string;
  split: "train" | "development" | "evaluation";
}

export interface BenchmarkReleaseCandidate {
  baselineOutputsFrozen: boolean;
  benchmarkCardComplete: boolean;
  benchmarkId: string;
  benchmarkVersion: string;
  contributorPaymentsApproved: boolean;
  itemResults: CommunityItemResult[];
  items: BenchmarkItem[];
  privacyReviewComplete: boolean;
  promptsFrozen: boolean;
  provenanceComplete: boolean;
  rightsClearedItemIds: string[];
  splitAssignments: SplitAssignment[];
}

export interface BenchmarkReleaseDecision {
  passed: boolean;
  reasons: string[];
  verificationCompletion: number;
}

const average = (values: number[]): number => {
  if (values.length === 0) {
    return 0;
  }
  return values.reduce((total, value) => total + value, 0) / values.length;
};

const unique = <Value>(values: Value[]): Value[] => [...new Set(values)];

const median = (values: number[]): number => {
  if (values.length === 0) {
    return 0;
  }
  const ordered = [...values].sort((left, right) => left - right);
  const middle = Math.floor(ordered.length / 2);
  const upper = ordered[middle] ?? 0;
  if (ordered.length % 2 === 1) {
    return upper;
  }
  return ((ordered[middle - 1] ?? upper) + upper) / 2;
};

const normalizedAgreement = (scores: number[]): number => {
  if (scores.length < 2) {
    return 0;
  }
  const pairwiseDistances: number[] = [];
  for (const [index, left] of scores.entries()) {
    for (const right of scores.slice(index + 1)) {
      pairwiseDistances.push(Math.abs(left - right) / COMMUNITY_RUBRIC_MAX);
    }
  }
  return 1 - average(pairwiseDistances);
};

const validatesJudgment = (judgment: DimensionJudgment): boolean =>
  Number.isFinite(judgment.score) &&
  judgment.score >= COMMUNITY_RUBRIC_MIN &&
  judgment.score <= COMMUNITY_RUBRIC_MAX &&
  judgment.rationale.trim().length > 0;

const hasConflict = (judgments: DimensionJudgment[]): boolean => {
  const decisiveVerdicts = unique(
    judgments
      .map(({ verdict }) => verdict)
      .filter(
        (verdict) => verdict === "acceptable" || verdict === "needs_correction"
      )
  );
  return decisiveVerdicts.length > 1;
};

export const validateBenchmarkItem = (item: BenchmarkItem): string[] => {
  const violations: string[] = [];
  if (item.audioRef.trim().length === 0) {
    violations.push("audioRef is required");
  }
  if (item.language.trim().length === 0) {
    violations.push("language is required");
  }
  if (item.sourceGroupId.trim().length === 0) {
    violations.push("sourceGroupId is required");
  }
  const referenceDimensions = new Set(
    item.references.map(({ dimension }) => dimension)
  );
  for (const dimension of item.requiredDimensions) {
    if (!referenceDimensions.has(dimension)) {
      violations.push(`missing community reference for ${dimension}`);
    }
  }
  return violations;
};

export const findSplitLeakage = (assignments: SplitAssignment[]): string[] => {
  const splitsBySource = new Map<string, Set<SplitAssignment["split"]>>();
  for (const { sourceGroupId, split } of assignments) {
    const splits = splitsBySource.get(sourceGroupId) ?? new Set();
    splits.add(split);
    splitsBySource.set(sourceGroupId, splits);
  }
  return [...splitsBySource.entries()]
    .filter(([, splits]) => splits.size > 1)
    .map(([sourceGroupId]) => sourceGroupId)
    .sort((left, right) => left.localeCompare(right));
};

export const validateBenchmarkRelease = (
  candidate: BenchmarkReleaseCandidate,
  governance: BenchmarkGovernance
): BenchmarkReleaseDecision => {
  const reasons: string[] = [];
  const resultByItem = new Map(
    candidate.itemResults.map((result) => [result.itemId, result])
  );
  const rightsClearedItemIds = new Set(candidate.rightsClearedItemIds);
  const releasableItemCount = candidate.items.filter((item) => {
    const result = resultByItem.get(item.id);
    return (
      validateBenchmarkItem(item).length === 0 &&
      result?.passed === true &&
      result.completion === 1 &&
      rightsClearedItemIds.has(item.id)
    );
  }).length;
  const verificationCompletion =
    candidate.items.length === 0
      ? 0
      : releasableItemCount / candidate.items.length;

  if (candidate.items.length === 0) {
    reasons.push("release contains no benchmark items");
  }
  if (verificationCompletion < 1) {
    reasons.push("not every item is verified and rights-cleared");
  }
  if (
    governance.requireSourceGroupIsolation &&
    findSplitLeakage(candidate.splitAssignments).length > 0
  ) {
    reasons.push("source groups cross dataset splits");
  }
  if (!candidate.promptsFrozen) {
    reasons.push("evaluation prompts are not frozen");
  }
  if (!candidate.baselineOutputsFrozen) {
    reasons.push("baseline outputs are not frozen");
  }
  if (!candidate.provenanceComplete) {
    reasons.push("provenance is incomplete");
  }
  if (!candidate.contributorPaymentsApproved) {
    reasons.push("contributor and reviewer payments are not approved");
  }
  if (!candidate.privacyReviewComplete) {
    reasons.push("privacy review is incomplete");
  }
  if (!candidate.benchmarkCardComplete) {
    reasons.push("benchmark card is incomplete");
  }

  return {
    passed: reasons.length === 0,
    reasons,
    verificationCompletion,
  };
};

export const scoreCommunityItem = (
  item: BenchmarkItem,
  evaluations: CommunityEvaluation[],
  governance: BenchmarkGovernance
): CommunityItemResult => {
  const itemEvaluations = evaluations.filter(
    ({ itemId }) => itemId === item.id
  );
  const evaluatorIds = unique(
    itemEvaluations.map(({ evaluator }) => evaluator.id)
  );
  const communityReviewerIds = unique(
    itemEvaluations
      .filter(({ evaluator }) => evaluator.roles.includes("community_reviewer"))
      .map(({ evaluator }) => evaluator.id)
  );
  const languageReviewerIds = unique(
    itemEvaluations
      .filter(({ evaluator }) => evaluator.roles.includes("language_reviewer"))
      .map(({ evaluator }) => evaluator.id)
  );
  const dimensions: DimensionResult[] = item.requiredDimensions.map(
    (dimension) => {
      const dimensionJudgments = itemEvaluations
        .flatMap((evaluation) => evaluation.judgments)
        .filter(
          (judgment) =>
            judgment.dimension === dimension && validatesJudgment(judgment)
        );
      const scores = dimensionJudgments.map((judgment) => judgment.score);
      const conflict = hasConflict(dimensionJudgments);
      const hasAdjudication = itemEvaluations.some(
        ({ evaluator, judgments: evaluatorJudgments }) =>
          evaluator.roles.includes("adjudicator") &&
          evaluatorJudgments.some(
            (judgment) => judgment.dimension === dimension
          )
      );
      const unresolved =
        dimensionJudgments.some(
          ({ verdict }) => verdict === "insufficient_context"
        ) ||
        (governance.adjudicatorRequiredForConflict &&
          conflict &&
          !hasAdjudication);
      const score = median(scores);
      return {
        agreement: normalizedAgreement(scores),
        dimension,
        judgmentCount: dimensionJudgments.length,
        normalizedScore: score / COMMUNITY_RUBRIC_MAX,
        score,
        unresolved,
      };
    }
  );
  const completedDimensions = dimensions.filter(
    ({ judgmentCount, unresolved }) => judgmentCount > 0 && !unresolved
  ).length;
  const completion =
    item.requiredDimensions.length === 0
      ? 0
      : completedDimensions / item.requiredDimensions.length;
  const score = average(
    dimensions.map(({ normalizedScore }) => normalizedScore)
  );
  const reasons: string[] = [];

  if (evaluatorIds.length < governance.minIndependentReviewers) {
    reasons.push("insufficient independent reviewers");
  }
  if (communityReviewerIds.length < governance.minCommunityReviewers) {
    reasons.push("insufficient community reviewers");
  }
  if (languageReviewerIds.length < governance.minLanguageReviewers) {
    reasons.push("insufficient language reviewers");
  }
  if (completion < 1) {
    reasons.push("verification is incomplete");
  }
  if (score < governance.releaseThreshold) {
    reasons.push("score is below the release threshold");
  }

  return {
    completion,
    dimensions,
    itemId: item.id,
    passed: reasons.length === 0,
    reasons,
    score,
  };
};
