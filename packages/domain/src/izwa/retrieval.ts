// Vectorize access layer. Two distinct uses of the index:
//   - routing: nearest dialect/anchor clusters for the input
//   - memory: human_anchor + semantic vectors upserted on resolution so
//     the vector space self-heals after expert corrections
// Metadata carries the `kind` so consumers can split routing anchors from
// semantic memory without server-side filters.

import type { VecMatch } from "./types";

export const ANCHOR_KIND = "dialect_anchor";
export const HUMAN_ANCHOR_KIND = "human_anchor";
export const SEMANTIC_KIND = "semantic";

export interface AnchorVector {
  id: string;
  values: number[];
  kind: typeof ANCHOR_KIND | typeof HUMAN_ANCHOR_KIND | typeof SEMANTIC_KIND;
  metadata?: Record<string, unknown>;
}

function toMatches(raw: Array<{ id: string; score: number; metadata?: unknown }>): VecMatch[] {
  return raw.map((m) => ({
    id: m.id,
    score: m.score,
    metadata: m.metadata && typeof m.metadata === "object" ? (m.metadata as Record<string, unknown>) : undefined,
  }));
}

// Nearest vectors in the index. Client-side kind filtering keeps the
// caller in control of what counts as a routing hit. The index may be
// unavailable (local dev, provisioning lag); degrade to no matches rather
// than killing the pipeline — the quality engine treats zero anchors /
// evidence as "no signal" (neutral), not as failure.
export async function queryNearest(
  env: Env,
  vector: number[],
  opts: { topK?: number; kinds?: string[] } = {},
): Promise<VecMatch[]> {
  const { topK = 5, kinds } = opts;
  try {
    const res = await env.IZWA_INDEX.query(vector, { topK, returnMetadata: "all" });
    let matches = toMatches(res.matches ?? []);
    if (kinds && kinds.length > 0) {
      matches = matches.filter((m) => {
        const kind = m.metadata?.kind;
        return typeof kind === "string" && kinds.includes(kind);
      });
    }
    return matches;
  } catch (error) {
    console.warn(`[izwa] vector query unavailable, degrading to no matches: ${error instanceof Error ? error.message : String(error)}`);
    return [];
  }
}

// Human-verified corrections become new anchors so the next similar input
// routes straight to the resolved cluster instead of re-entering the
// debate phase. Asynchronous on the Vectorize side; mutation id returned.
// Best-effort: a failed upsert must never break a resolution — self-healing
// is a latency/quality optimization, not a correctness dependency.
export async function upsertAnchor(env: Env, vector: AnchorVector): Promise<string> {
  try {
    const res = await env.IZWA_INDEX.upsert([
      {
        id: vector.id,
        values: vector.values,
        metadata: { kind: vector.kind, ...vector.metadata },
      },
    ]);
    const mutation = res as unknown as { mutationId?: string };
    return mutation.mutationId ?? "";
  } catch (error) {
    console.warn(`[izwa] vector upsert unavailable, skipping anchor ${vector.id}: ${error instanceof Error ? error.message : String(error)}`);
    return "";
  }
}

export async function upsertAnchors(env: Env, vectors: AnchorVector[]): Promise<string> {
  try {
    const res = await env.IZWA_INDEX.upsert(
      vectors.map((v) => ({
        id: v.id,
        values: v.values,
        metadata: { kind: v.kind, ...v.metadata },
      })),
    );
    const mutation = res as unknown as { mutationId?: string };
    return mutation.mutationId ?? "";
  } catch (error) {
    console.warn(`[izwa] vector upsert unavailable, skipping ${vectors.length} anchors: ${error instanceof Error ? error.message : String(error)}`);
    return "";
  }
}
