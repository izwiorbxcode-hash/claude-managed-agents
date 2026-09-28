// Layer 4 — Agent Router. Dynamically composes a specialist team for the
// input instead of maintaining a huge population of permanently-active
// agents. The team is task-specific and each seat declares its
// independence vector so the quality engine can tell real disagreement
// from three identical calls.

import type { AssetProfile, SpecialistRole, SpecialistTeam, SpecialistAssignment, VecMatch } from "./types";

// Default reasoning model for specialist seats. Overridable per-seat by
// env.IZWA_TEXT_MODEL; a deployment with an Anthropic key can swap in a
// frontier model via the models layer.
export const DEFAULT_SPECIALIST_MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";

export const ALL_ROLES: SpecialistRole[] = [
  "phonetics",
  "morphology",
  "syntax",
  "semantics",
  "dialect_variation",
  "code_switching",
  "translation",
];

// Which roles need audio evidence vs. which can run on text alone.
const ROLE_REQUIRES_AUDIO: Record<SpecialistRole, boolean> = {
  phonetics: true,
  morphology: false,
  syntax: false,
  semantics: false,
  dialect_variation: false,
  code_switching: false,
  translation: false,
};

// Each role gets a distinct prompt variant so same-model seats still
// produce genuinely different analyses.
const ROLE_PROMPT: Record<SpecialistRole, string> = {
  phonetics: "phonetic annotator (IPA) — segment by segment",
  morphology: "morphological tagger — morpheme boundaries + tags",
  syntax: "syntax tree builder — constituent structure",
  semantics: "semantic aligner — meaning units + English alignment",
  dialect_variation: "dialect analyst — variant attribution across the continuum",
  code_switching: "code-switching spotter — language boundary spans",
  translation: "translator — faithful gloss + register notes",
};

export interface RouterContext {
  vertical: string;
  text: string;
  profile: AssetProfile;
  anchors: VecMatch[];
  evidence: VecMatch[];
  env: Env;
}

// Assign each specialist seat a distinct slice of the retrieved evidence
// so independent analyses rest on partially-different evidence sets.
function sliceEvidence(evidence: VecMatch[], role: SpecialistRole, index: number, total: number): string[] {
  if (evidence.length === 0) return [];
  const per = Math.max(1, Math.floor(evidence.length / total));
  const start = (index * per) % evidence.length;
  const chosen: string[] = [];
  for (let i = 0; i < per; i++) {
    const hit = evidence[(start + i) % evidence.length];
    if (hit && !chosen.includes(hit.id)) chosen.push(hit.id);
  }
  return chosen;
}

export function composeTeam(ctx: RouterContext): SpecialistTeam {
  const { profile, anchors, evidence, env } = ctx;
  const modelId = (env.IZWA_TEXT_MODEL as string | undefined) || DEFAULT_SPECIALIST_MODEL;

  const roles: SpecialistRole[] = [...ALL_ROLES];
  const filtered = roles.filter((r) => {
    if (ROLE_REQUIRES_AUDIO[r]) return profile.modality === "audio" || profile.modality === "video";
    return true;
  });

  // Adaptive compute: low-complexity text-only input doesn't need the
  // full seven-seat swarm — keep the seats that matter and rely on the
  // quality engine to escalate when they disagree.
  const reduced =
    profile.complexity === "low" && profile.modality === "text"
      ? filtered.filter((r) => ["morphology", "semantics", "dialect_variation"].includes(r))
      : filtered;

  const assignments: SpecialistAssignment[] = reduced.map((role, index) => {
    const evidenceIds = sliceEvidence(evidence, role, index, Math.max(1, reduced.length));
    return {
      role,
      agentKey: `${ctx.vertical}:${role}`,
      promptVersion: `${role}:v1:${index}`,
      modelId,
      independence: {
        model: modelId,
        prompt: ROLE_PROMPT[role],
        tools: ["embedding_retrieval", "deterministic_validation"],
        representations: [role === "phonetics" ? "ipa" : "text"],
        evidenceIds,
      },
    };
  });

  return {
    vertical: ctx.vertical as SpecialistTeam["vertical"],
    assignments,
    retrievedEvidence: evidence,
    anchors,
  };
}
