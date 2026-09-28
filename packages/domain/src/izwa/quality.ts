// The Verification and Quality Engine. A single LLM confidence score is
// not sufficient — IzwaAI computes a composite, defensible quality signal
// from many components and only crystallizes when the active data
// contract is satisfied. Exact weights are contract/vertical-specific and
// must be calibrated against labeled evaluation data.

import type {
  CompositeQuality,
  Proposal,
  QualityComponent,
  QualityContract,
  VecMatch,
} from "./types";

export interface QualityParams {
  proposals: Proposal[];
  contract: QualityContract;
  validation: { score: number; violations: string[] };
  anchors: VecMatch[];
  retrievalEvidence: VecMatch[];
  agreementVectors: number[][];
  domainCheck: { score: number; detail?: unknown };
  evaluatorPerformance: number; // 0..1 historical specialist accuracy
  humanVerificationHistory: number; // 0..1 similarity-weighted verified precedent
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length === 0 || b.length === 0 || a.length !== b.length) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

// Mean pairwise cosine similarity of the proposal embeddings. Low values
// mean the specialists genuinely disagreed — the strongest trigger for
// escalation, regardless of any single agent's reported confidence.
export function modelAgreement(vectors: number[][]): number {
  if (vectors.length < 2) return 0;
  let sum = 0;
  let pairs = 0;
  for (let i = 0; i < vectors.length; i++) {
    for (let j = i + 1; j < vectors.length; j++) {
      sum += cosineSimilarity(vectors[i], vectors[j]);
      pairs++;
    }
  }
  return pairs === 0 ? 0 : sum / pairs;
}

export function evidenceCoverage(proposals: Proposal[], evidence: VecMatch[]): number {
  if (evidence.length === 0) return 1;
  const cited = new Set<string>();
  for (const p of proposals) for (const id of p.evidenceIds) cited.add(id);
  let covered = 0;
  for (const e of evidence) if (cited.has(e.id)) covered++;
  return covered / evidence.length;
}

// Do the retrieved dialect anchors agree with the language/dialect the
// specialists proposed? A routing hit that contradicts every specialist
// is evidence of an out-of-distribution input.
export function retrievalConsistency(proposals: Proposal[], anchors: VecMatch[]): number {
  if (anchors.length === 0) return 1;
  const candidates = proposals.flatMap((p) => {
    const lang = p.payload?.language;
    const dial = p.payload?.dialect;
    return [typeof lang === "string" ? lang.toLowerCase() : null, typeof dial === "string" ? dial.toLowerCase() : null].filter(
      (x): x is string => Boolean(x),
    );
  });
  if (candidates.length === 0) return 0;
  let consistent = 0;
  for (const a of anchors) {
    const metaLang = a.metadata?.language ?? a.metadata?.label;
    const meta = typeof metaLang === "string" ? metaLang.toLowerCase() : "";
    if (candidates.includes(meta)) consistent++;
  }
  return consistent / anchors.length;
}

function weightedComponent(
  name: string,
  score: number,
  weight: number,
  detail: unknown,
): QualityComponent {
  return { name, score: Math.min(1, Math.max(0, score)), weight, detail };
}

export function evaluateQuality(params: QualityParams): CompositeQuality {
  const w = params.contract.weights;

  const components: QualityComponent[] = [
    weightedComponent("model_agreement", modelAgreement(params.agreementVectors), w.model_agreement ?? 0.2, {
      proposals: params.proposals.length,
    }),
    weightedComponent("deterministic_validation", params.validation.score, w.deterministic_validation ?? 0.2, {
      violations: params.validation.violations,
    }),
    weightedComponent("evidence_coverage", evidenceCoverage(params.proposals, params.retrievalEvidence), w.evidence_coverage ?? 0.15, {}),
    weightedComponent("retrieval_consistency", retrievalConsistency(params.proposals, params.anchors), w.retrieval_consistency ?? 0.1, {
      anchors: params.anchors.length,
    }),
    weightedComponent("evaluator_performance", params.evaluatorPerformance, w.evaluator_performance ?? 0.1, {}),
    weightedComponent("domain_constraints", params.domainCheck.score, w.domain_constraints ?? 0.05, params.domainCheck.detail),
    weightedComponent("human_verification_history", params.humanVerificationHistory, w.human_verification_history ?? 0.05, {}),
  ];

  const overall = components.reduce((acc, c) => acc + c.score * c.weight, 0);

  const unsatisfiedGates: string[] = [];
  for (const gate of params.contract.minComponents ?? []) {
    const comp = components.find((c) => c.name === gate.name);
    if (comp && comp.score < gate.min) unsatisfiedGates.push(gate.name);
  }

  return {
    overall,
    components,
    threshold: params.contract.threshold,
    satisfied: overall >= params.contract.threshold && unsatisfiedGates.length === 0,
    unsatisfiedGates,
  };
}
