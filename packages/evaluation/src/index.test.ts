import { describe, expect, it } from "vitest";
import {
  type BenchmarkGovernance,
  type BenchmarkItem,
  type CommunityEvaluation,
  type CommunityEvaluator,
  findSplitLeakage,
  scoreCommunityItem,
  validateBenchmarkItem,
  validateBenchmarkRelease,
} from "./index";

const governance: BenchmarkGovernance = {
  adjudicatorRequiredForConflict: true,
  minCommunityReviewers: 1,
  minIndependentReviewers: 2,
  minLanguageReviewers: 1,
  releaseThreshold: 0.75,
  requireSourceGroupIsolation: true,
};

const item: BenchmarkItem = {
  audioRef: "r2://benchmarks/speech-001.wav",
  id: "item_001",
  language: "ssw",
  prompt: "Explain the intended meaning and cultural context.",
  references: [
    {
      basis: "speaker_attested",
      dimension: "transcription",
      evidenceIds: ["audio_001"],
      text: "Corrected transcript",
    },
    {
      basis: "speaker_attested",
      dimension: "intended_meaning",
      evidenceIds: ["audio_001", "explanation_001"],
      text: "The speaker's intended warning",
    },
  ],
  requiredDimensions: ["transcription", "intended_meaning"],
  sourceGroupId: "source_speech_001",
  sourceType: "speech",
};

const evaluator = (
  id: string,
  roles: CommunityEvaluator["roles"]
): CommunityEvaluator => ({
  communityScopes: ["Eswatini"],
  id,
  languages: ["ssw"],
  roles,
});

const evaluation = (
  id: string,
  reviewer: CommunityEvaluator,
  transcriptionScore: number,
  meaningScore: number
): CommunityEvaluation => ({
  evaluator: reviewer,
  id,
  itemId: item.id,
  judgments: [
    {
      dimension: "transcription",
      evidenceIds: ["audio_001"],
      rationale: "The words and speaker boundaries match the audio.",
      score: transcriptionScore,
      verdict: "acceptable",
    },
    {
      dimension: "intended_meaning",
      evidenceIds: ["explanation_001"],
      rationale: "The answer preserves the attested warning.",
      score: meaningScore,
      verdict: "acceptable",
    },
  ],
  reviewedAtMs: 1,
});

describe("community benchmark items", () => {
  it("requires a community reference for every scored dimension", () => {
    expect(validateBenchmarkItem(item)).toEqual([]);
    expect(
      validateBenchmarkItem({
        ...item,
        references: item.references.slice(0, 1),
      })
    ).toContain("missing community reference for intended_meaning");
  });

  it("reaches complete verification after independent qualified review", () => {
    const result = scoreCommunityItem(
      item,
      [
        evaluation(
          "evaluation_1",
          evaluator("reviewer_1", ["community_reviewer"]),
          4,
          3
        ),
        evaluation(
          "evaluation_2",
          evaluator("reviewer_2", ["language_reviewer"]),
          4,
          4
        ),
      ],
      governance
    );

    expect(result.completion).toBe(1);
    expect(result.passed).toBe(true);
    expect(result.score).toBeCloseTo(0.9375);
    expect(result.dimensions[0]?.agreement).toBe(1);
  });

  it("does not confuse a high model-facing score with completed review", () => {
    const result = scoreCommunityItem(
      item,
      [
        evaluation(
          "evaluation_1",
          evaluator("reviewer_1", ["community_reviewer"]),
          4,
          4
        ),
      ],
      governance
    );

    expect(result.score).toBe(1);
    expect(result.passed).toBe(false);
    expect(result.reasons).toContain("insufficient independent reviewers");
    expect(result.reasons).toContain("insufficient language reviewers");
  });

  it("requires adjudication when qualified reviewers conflict", () => {
    const first = evaluation(
      "evaluation_1",
      evaluator("reviewer_1", ["community_reviewer"]),
      4,
      4
    );
    const second = evaluation(
      "evaluation_2",
      evaluator("reviewer_2", ["language_reviewer"]),
      4,
      1
    );
    const meaning = second.judgments.find(
      ({ dimension }) => dimension === "intended_meaning"
    );
    if (meaning) {
      meaning.verdict = "needs_correction";
    }

    const result = scoreCommunityItem(item, [first, second], governance);

    expect(result.completion).toBe(0.5);
    expect(result.passed).toBe(false);
    expect(result.reasons).toContain("verification is incomplete");
  });
});

describe("benchmark split isolation", () => {
  it("detects a source group crossing dataset splits", () => {
    expect(
      findSplitLeakage([
        {
          itemId: "item_1",
          sourceGroupId: "speech_1",
          split: "train",
        },
        {
          itemId: "item_2",
          sourceGroupId: "speech_1",
          split: "evaluation",
        },
        {
          itemId: "item_3",
          sourceGroupId: "speech_2",
          split: "evaluation",
        },
      ])
    ).toEqual(["speech_1"]);
  });
});

describe("benchmark release gate", () => {
  const passedItemResult = {
    completion: 1,
    dimensions: [],
    itemId: item.id,
    passed: true,
    reasons: [],
    score: 1,
  };

  const release = {
    baselineOutputsFrozen: true,
    benchmarkCardComplete: true,
    benchmarkId: "izwa-community-speech",
    benchmarkVersion: "v0.1",
    contributorPaymentsApproved: true,
    itemResults: [passedItemResult],
    items: [item],
    privacyReviewComplete: true,
    promptsFrozen: true,
    provenanceComplete: true,
    rightsClearedItemIds: [item.id],
    splitAssignments: [
      {
        itemId: item.id,
        sourceGroupId: item.sourceGroupId,
        split: "evaluation" as const,
      },
    ],
  };

  it("releases only when every programme requirement is complete", () => {
    const decision = validateBenchmarkRelease(release, governance);

    expect(decision.passed).toBe(true);
    expect(decision.verificationCompletion).toBe(1);
  });

  it("blocks release when payment, privacy, or rights are incomplete", () => {
    const decision = validateBenchmarkRelease(
      {
        ...release,
        contributorPaymentsApproved: false,
        privacyReviewComplete: false,
        rightsClearedItemIds: [],
      },
      governance
    );

    expect(decision.passed).toBe(false);
    expect(decision.reasons).toContain(
      "not every item is verified and rights-cleared"
    );
    expect(decision.reasons).toContain(
      "contributor and reviewer payments are not approved"
    );
    expect(decision.reasons).toContain("privacy review is incomplete");
  });
});
