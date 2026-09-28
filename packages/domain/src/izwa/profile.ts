// Layer 2 — Data Profiling. Everything here is cheap and deterministic;
// no frontier-model spend. The profiler decides what the pipeline can
// know about an input up front (modality, language hints, privacy,
// complexity, duplication) so the router can avoid blindly throwing it at
// an expensive swarm.

import type { AssetProfile, Modality } from "./types";

// Small heuristic word banks for common African languages. These are
// routing *hints* only — evidence, never truth. Dialects form continua
// and code-switching is the norm, so a hint simply biases the router
// toward including the relevant specialist seats.
const LANGUAGE_HINTS: Record<string, string[]> = {
  swahili: ["hakuna", "karibu", "jambo", "rafiki", "ndio", "asante", "tuna"],
  yoruba: ["ẹ", "ọ", "ó", "ní", "à", "bá", "mo", "nílẹ̀"],
  hausa: ["ina", "gida", "mu", "da", "aka", "wani", "yana"],
  igbo: ["nke", "na", "maka", "anya", "azu", "ka", "mgbe"],
  zulu: ["ngiyakuthanda", "sawubona", "umuntu", "kukhona", "nje", "kodwa"],
  xhosa: ["molo", "ndiyakuthanda", "khona", "ukuba", "phandle"],
  amharic: ["አሁን", "እንዴት", "ሰላም", "እኔ", "አይደለም", "እህ"],
  twi: ["me", "wo", "da", "mepa", "akwaaba", "ɔbaa"],
  kinyarwanda: ["muraho", "ndabikora", "uyu", "abo", "bite"],
  somali: ["salaan", "ma", "waxaa", "dhaqan", "weligaa"],
};

const SCRIPT_HINTS: Record<string, RegExp> = {
  latin: /[A-Za-z]/,
  arabic: /[\u0600-\u06FF]/,
  ethiopic: /[\u1200-\u137F]/,
  devanagari: /[\u0900-\u097F]/,
};

// Best-effort language guess from the heuristic word banks. Evidence, not
// truth — used by the demo-mode specialist mock and the router's domain
// check. Returns null when nothing matches.
export function guessLanguage(text: string): string | null {
  const lower = text.toLowerCase();
  let best: string | null = null;
  let bestHits = 0;
  for (const [lang, words] of Object.entries(LANGUAGE_HINTS)) {
    const hits = words.filter((w) => lower.includes(w)).length;
    if (hits > bestHits) {
      bestHits = hits;
      best = lang;
    }
  }
  return bestHits > 0 ? best : null;
}

const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;
const PHONE_RE = /(?:\+?\d{1,3}[\s-]?)?\(?\d{2,4}\)?[\s-]?\d{3}[\s-]?\d{3,4}/;

export interface ProfileInput {
  text?: string;
  modality?: Modality;
  audioDurationSec?: number;
  textHash?: string;
}

function detectScripts(text: string): string[] {
  const hits: string[] = [];
  for (const [name, re] of Object.entries(SCRIPT_HINTS)) {
    if (re.test(text)) hits.push(name);
  }
  return hits;
}

function detectLanguages(text: string): string[] {
  const lower = text.toLowerCase();
  const hits: string[] = [];
  for (const [lang, words] of Object.entries(LANGUAGE_HINTS)) {
    const matches = words.filter((w) => lower.includes(w));
    if (matches.length > 0) hits.push(lang);
  }
  return hits;
}

function estimateComplexity(text: string, modality: Modality, hints: string[]): AssetProfile["complexity"] {
  if (text.length === 0) return "medium";
  const codeSwitch = hints.length > 1;
  const long = text.length > 1200;
  const hasAudio = modality === "audio" || modality === "video";
  if (codeSwitch && (long || hasAudio)) return "high";
  if (codeSwitch || long) return "medium";
  return "low";
}

export function profileInput(input: ProfileInput): AssetProfile {
  const text = input.text?.trim() ?? "";
  const modality: Modality = input.modality ?? (text.length > 0 ? "text" : "audio");
  const scripts = detectScripts(text);
  const languages = detectLanguages(text);
  const hasAudio = modality === "audio" || modality === "video";

  const qualityIndicators: Record<string, number | boolean | string> = {
    hasPunctuation: /[.!?،؟。]/.test(text),
    hasCapitalization: /[A-Z][a-z]{2,}/.test(text),
    lengthChars: text.length,
    scriptCount: scripts.length,
    languageHintCount: languages.length,
    hasNumericTokens: /\d/.test(text),
  };

  const privacy: AssetProfile["privacy"] =
    EMAIL_RE.test(text) || PHONE_RE.test(text) ? "sensitive" : "public";

  return {
    modality,
    languageHints: languages,
    scriptHints: scripts,
    privacy,
    complexity: estimateComplexity(text, modality, languages),
    duplicateOf: input.textHash ?? null,
    qualityIndicators,
    textLength: text.length,
    estimatedDurationSec: input.audioDurationSec,
  };
}
