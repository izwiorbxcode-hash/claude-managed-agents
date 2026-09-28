// Model client — the probabilistic reasoning seam. Everything above this
// layer is deterministic; everything here is explicitly probabilistic and
// treated as advisory. Provider-agnostic by design: the default backend
// is Workers AI (zero extra config), and the env seam
// (env.IZWA_TEXT_MODEL) lets a deployment point specialist seats at a
// different model without touching the refinery logic.

import type { Proposal, SpecialistAssignment } from "./types";
import { newId } from "./ids";
import { guessLanguage } from "./profile";

export interface SpecialistPrompt {
  role: string;
  text: string;
  evidence: string[];
  contractFields: string[];
}

function buildSystemPrompt(prompt: SpecialistPrompt): string {
  return [
    "You are a specialist analyst in an autonomous data refinery.",
    `Role: ${prompt.role}.`,
    "Analyse the input strictly within your specialty.",
    "Return ONLY a single JSON object, no prose, no markdown fences.",
    "If evidence is insufficient, say so in the uncertainty field instead of inventing it.",
    `Returned JSON must have this shape: { "result": { ... fields you are confident about }, "confidence": 0.0-1.0, "uncertainty": ["..."], "evidence": ["..."] }`,
    `The output contract includes these fields: ${prompt.contractFields.join(", ")}.`,
    `Retrieved evidence ids you may cite: ${prompt.evidence.join(", ") || "none"}.`,
  ].join("\n");
}

function userPrompt(prompt: SpecialistPrompt): string {
  return `INPUT:\n${prompt.text}\n\nEVIDENCE CONTEXT:\n${JSON.stringify(prompt.evidence)}\n\nProduce your JSON analysis.`;
}

export async function runSpecialist(
  env: Env,
  assignment: SpecialistAssignment,
  input: { taskId: string; text: string; contractFields: string[] },
): Promise<Proposal> {
  const modelId = assignment.modelId || (env.IZWA_TEXT_MODEL as string | undefined) || "";
  if (env.IZWA_MOCK) {
    return mockSpecialist(assignment, input, modelId);
  }
  const system = buildSystemPrompt({
    role: assignment.role,
    text: input.text,
    evidence: assignment.independence.evidenceIds,
    contractFields: input.contractFields,
  });
  const user = userPrompt({
    role: assignment.role,
    text: input.text,
    evidence: assignment.independence.evidenceIds,
    contractFields: input.contractFields,
  });

  const raw = await env.AI.run(modelId, { prompt: `${system}\n\n${user}` });

  const content = typeof raw === "string" ? raw : String((raw as { response?: string })?.response ?? "");
  const parsed = parseJsonObject(content);

  const result: Record<string, unknown> =
    parsed?.result && typeof parsed.result === "object" && parsed.result !== null
      ? (parsed.result as Record<string, unknown>)
      : {};
  const confidence = clamp01(typeof parsed?.confidence === "number" ? parsed.confidence : 0);
  const uncertainty = Array.isArray(parsed?.uncertainty)
    ? parsed.uncertainty.map(String)
    : content.length === 0
      ? ["model returned empty output"]
      : [];

  return {
    proposalId: newId("proposal_"),
    taskId: input.taskId,
    specialistRole: assignment.role,
    agentKey: assignment.agentKey,
    modelId,
    promptVersion: assignment.promptVersion,
    confidence,
    uncertainty,
    payload: result,
    evidenceIds: assignment.independence.evidenceIds,
  };
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

// Deterministic demo-mode specialist. Mirrors the shape of real model
// output so the whole refinery pipeline runs locally without Workers AI.
// Inputs containing a "?" (or uncertain/ambiguous wording) produce
// low-confidence output with a missing `language` field — deliberately
// triggering the quality contract failure so the HITL escalation path can
// be exercised end-to-end.
export function mockSpecialist(
  assignment: SpecialistAssignment,
  input: { taskId: string; text: string; contractFields: string[] },
  modelId: string,
): Proposal {
  const text = input.text;
  const escalate = text.includes("?") || /uncertain|ambiguous|unknown/i.test(text);
  const language = guessLanguage(text) ?? (escalate ? "" : "unknown");

  const base: Record<string, unknown> = {
    transcription: text.slice(0, 500),
    language,
    phonemes: { segments: [`${language || "?"}`, text.slice(0, 3)] },
    morphology: { roots: [text.split(/\s+/)[0] ?? ""], affixes: [] },
    syntax: { clauses: 1, structure: "declarative" },
    english_alignment: { gloss: escalate ? null : `(mock) ${text}` },
  };

  const specialty: Record<string, unknown> = {
    phonetics: { ipa: `[mock-ipa:${assignment.role}]`, stress: 1 },
    morphology: { morphemes: [`${text.split(/\s+/)[0] ?? ""}+PRES`], analysis: "mock" },
    syntax: { tree: { root: text.split(/\s+/)[0] ?? "", children: [] } },
    semantics: { alignments: [{ src: text.slice(0, 20), tgt: "(mock)" }] },
    dialect_variation: { cluster: language || "unclassified", confidence: escalate ? 0.1 : 0.85 },
    code_switching: { spans: escalate ? [] : [{ start: 0, end: 4, language: language || "?" }] },
    translation: { text: "(mock)", notes: [] },
  };

  const payload = escalate ? { ...base, language: "" } : { ...base, ...(specialty[assignment.role] ?? {}) };

  return {
    proposalId: newId("proposal_"),
    taskId: input.taskId,
    specialistRole: assignment.role,
    agentKey: assignment.agentKey,
    modelId,
    promptVersion: assignment.promptVersion,
    confidence: escalate ? 0.15 : 0.88,
    uncertainty: escalate
      ? ["demo-mode: input signals ambiguity — recommending human review"]
      : [],
    payload,
    evidenceIds: assignment.independence.evidenceIds,
  };
}

// Lenient JSON extraction: strips markdown fences and finds the first
// balanced object. Returns null when the model produced no parseable JSON.
export function parseJsonObject(text: string): Record<string, unknown> | null {
  const stripped = text.replace(/```(?:json)?/gi, "").trim();
  const start = stripped.indexOf("{");
  if (start === -1) return null;
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < stripped.length; i++) {
    const ch = stripped[i];
    if (inString) {
      if (escape) escape = false;
      else if (ch === "\\") escape = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) {
        try {
          return JSON.parse(stripped.slice(start, i + 1)) as Record<string, unknown>;
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}
