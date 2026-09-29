import { describe, expect, it } from "vitest";
import { IDIOM_CONTEXT_CONTRACT, LANGUAGE_CONTRACT, validateIdiomApprovals, validateIdiomPayload, validatePayload } from "./contracts";
import { contentHash, isIzwaId, newId } from "./ids";
import { parseJsonObject } from "./models";
import { profileInput } from "./profile";
import { cosineSimilarity, evaluateQuality, modelAgreement, retrievalConsistency, type QualityParams } from "./quality";
import { composeTeam } from "./router";
import type { AssetProfile, Proposal, SpecialistTeam } from "./types";

function proposal(role: Proposal["specialistRole"], payload: Record<string, unknown>, confidence: number): Proposal {
  return {
    proposalId: newId("proposal_"),
    taskId: newId("task_"),
    specialistRole: role,
    agentKey: `language:${role}`,
    modelId: "test-model",
    promptVersion: `${role}:v1:0`,
    confidence,
    uncertainty: [],
    payload,
    evidenceIds: [],
  };
}

describe("izwa ids", () => {
  it("generates prefixed ids and validates them", () => {
    const task = newId("task_");
    expect(task.startsWith("task_")).toBe(true);
    expect(isIzwaId(task, "task_")).toBe(true);
    expect(isIzwaId("not-an-id", "task_")).toBe(false);
    expect(isIzwaId(newId("asset_"), "record_")).toBe(false);
  });

  it("contentHash is stable and differs across inputs", async () => {
    const a = await contentHash(new TextEncoder().encode("jambo rafiki"));
    const b = await contentHash(new TextEncoder().encode("jambo rafiki"));
    const c = await contentHash(new TextEncoder().encode("karibu tena"));
    expect(a).toBe(b);
    expect(a).not.toBe(c);
  });
});

describe("izwa profile", () => {
  it("flags language hints, privacy, and modality", () => {
    const p = profileInput({ text: "Sawubona umuntu kukhona nje 0800 123 456" });
    expect(p.modality).toBe("text");
    expect(p.languageHints).toContain("zulu");
    expect(p.privacy).toBe("sensitive");
    expect(p.textLength).toBeGreaterThan(0);
  });

  it("treats audio-only inputs as audio modality", () => {
    const p = profileInput({ modality: "audio", audioDurationSec: 42 });
    expect(p.modality).toBe("audio");
    expect(p.estimatedDurationSec).toBe(42);
    expect(p.qualityIndicators.hasNumericTokens).toBe(false);
  });

  it("estimates high complexity for code-switching long inputs", () => {
    const text = `${"Sawubona hakuna asante karibu rafiki ndio. ".repeat(60)}`;
    const p = profileInput({ text });
    expect(p.complexity).toBe("high");
  });
});

describe("izwa contracts", () => {
  it("accepts a valid payload and rejects a missing required field", () => {
    const ok = validatePayload(LANGUAGE_CONTRACT, {
      transcription: "Hello",
      phonemes: { seg: 1 },
      morphology: { m: 1 },
      syntax: { s: 1 },
      language: "zulu",
    });
    expect(ok.score).toBe(1);

    const bad = validatePayload(LANGUAGE_CONTRACT, {
      transcription: "Hello",
      phonemes: { seg: 1 },
      morphology: {},
      syntax: {},
    });
    expect(bad.violations.some((v) => v.includes("language"))).toBe(true);
    expect(bad.score).toBeLessThan(1);
  });
});

describe("idiom context contract", () => {
  const payload = {
    expression_span: { text: "inkunzi isematholeni", start_ms: 1200, end_ms: 2800 },
    context: "An elder encourages young people during a community meeting.",
    literal_meaning: "The bull is among the calves.",
    meaning_in_source_language: "Ikusasa lesizwe lisentsheni.",
    speaker_intent: { value: "encouragement", basis: "speaker_attested" },
    social_function: ["advice", "encouragement"],
    usage_conditions: "Used to emphasize the future role of younger people.",
    alternative_readings: [],
    translations: [{ targetLanguage: "English", text: "The future lies with the youth.", register: "neutral" }],
    review_evidence: [],
    source_asset_id: "asset_1",
    source_group_id: "source_1",
    transcript: "inkunzi isematholeni",
  };

  it("validates the cultural meaning payload, not only linguistic structure", () => {
    expect(validatePayload(IDIOM_CONTEXT_CONTRACT, payload).violations).toEqual([]);
    expect(validateIdiomPayload(payload)).toEqual([]);
    expect(validateIdiomPayload({ ...payload, speaker_intent: { value: "guess" } })).toContain(
      "speaker_intent requires value and an explicit basis",
    );
  });

  it("requires two distinct humans to approve every trust-critical field", () => {
    const fields = ["expression_span", "context", "meaning_in_source_language", "speaker_intent", "usage_conditions", "translations"];
    const reviews = fields.flatMap((field) => [
      { field, reviewerId: "speaker-1", reviewerRole: "speaker" as const, verdict: "verified" as const, basis: "speaker_attested" as const, evidenceIds: ["asset_1"], reviewedAtMs: 1 },
      { field, reviewerId: "reviewer-2", reviewerRole: "fluent_reviewer" as const, verdict: "verified" as const, basis: "reviewer_attested" as const, evidenceIds: ["asset_1"], reviewedAtMs: 2 },
    ]);
    expect(validateIdiomApprovals(reviews).approved).toBe(true);
    expect(validateIdiomApprovals(reviews.filter((review) => review.field !== "translations")).missing).toContain("translations");
  });
});

describe("izwa quality engine", () => {
  it("cosineSimilarity returns 1 for identical vectors and 0 for orthogonal", () => {
    expect(cosineSimilarity([1, 0], [1, 0])).toBeCloseTo(1);
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0);
  });

  it("modelAgreement drops as embeddings diverge", () => {
    expect(modelAgreement([[1, 0, 0], [1, 0, 0], [1, 0, 0]])).toBeCloseTo(1);
    expect(modelAgreement([[1, 0, 0], [0, 1, 0], [0, 0, 1]])).toBeCloseTo(0);
  });

  it("crystallizes when the contract is satisfied and escalates when not", () => {
    const proposals = [proposal("morphology", { language: "zulu", transcription: "a", phonemes: { p: 1 }, morphology: { m: 1 }, syntax: { s: 1 } }, 0.9)];
    const base: QualityParams = {
      proposals,
      contract: LANGUAGE_CONTRACT,
      validation: { score: 1, violations: [] },
      anchors: [],
      retrievalEvidence: [],
      agreementVectors: [[1, 0], [1, 0]],
      domainCheck: { score: 1, detail: {} },
      evaluatorPerformance: 0.9,
      humanVerificationHistory: 0.9,
    };
    const satisfied = evaluateQuality(base);
    expect(satisfied.satisfied).toBe(true);
    expect(satisfied.overall).toBeGreaterThanOrEqual(satisfied.threshold);

    const unsatisfied = evaluateQuality({
      ...base,
      validation: { score: 0, violations: ["missing language"] },
      agreementVectors: [[1, 0], [0, 1]],
      domainCheck: { score: 0, detail: { reason: "no language candidate" } },
      evaluatorPerformance: 0.2,
      humanVerificationHistory: 0,
    });
    expect(unsatisfied.satisfied).toBe(false);
    expect(unsatisfied.unsatisfiedGates).toContain("deterministic_validation");
  });

  it("retrievalConsistency rewards anchors that agree with proposals", () => {
    const props = [proposal("dialect_variation", { language: "zulu" }, 0.8)];
    expect(retrievalConsistency(props, [{ id: "a", score: 0.9, metadata: { language: "zulu" } }])).toBe(1);
    expect(retrievalConsistency(props, [{ id: "a", score: 0.9, metadata: { language: "swahili" } }])).toBe(0);
  });
});

describe("izwa router", () => {
  const baseEnv = { IZWA_TEXT_MODEL: "test-model" } as unknown as Env;
  const profile = (modality: "audio" | "text", complexity: "low" | "high"): AssetProfile => ({
    modality,
    languageHints: ["zulu"],
    scriptHints: ["latin"],
    privacy: "public",
    complexity,
    duplicateOf: null,
    qualityIndicators: {},
    textLength: 100,
  });

  it("composes the full team for complex audio and reduces for low text", () => {
    const audioTeam: SpecialistTeam = composeTeam({ vertical: "language", text: "x", profile: profile("audio", "high"), anchors: [], evidence: [], env: baseEnv });
    expect(audioTeam.assignments.map((a) => a.role)).toContain("phonetics");

    const textTeam: SpecialistTeam = composeTeam({ vertical: "language", text: "x", profile: profile("text", "low"), anchors: [], evidence: [], env: baseEnv });
    expect(textTeam.assignments.map((a) => a.role)).not.toContain("phonetics");
    expect(textTeam.assignments.length).toBeLessThan(audioTeam.assignments.length);
  });

  it("assigns distinct prompt versions (independence vectors)", () => {
    const team: SpecialistTeam = composeTeam({ vertical: "language", text: "x", profile: profile("text", "high"), anchors: [], evidence: [], env: baseEnv });
    const versions = team.assignments.map((a) => a.promptVersion);
    expect(new Set(versions).size).toBe(versions.length);
  });
});

describe("izwa models JSON parsing", () => {
  it("extracts a JSON object from model output with fences", () => {
    const out = parseJsonObject('```json\n{"result": {"language": "zulu"}, "confidence": 0.8}\n```');
    expect(out?.result).toEqual({ language: "zulu" });
  });

  it("returns null for unparseable output", () => {
    expect(parseJsonObject("I cannot comply.")).toBeNull();
  });
});
