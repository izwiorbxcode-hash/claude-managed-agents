// Text embedding via Workers AI. The index dimensions must match the
// model output (768 for @cf/baai/bge-base-en-v1.5).

export const EMBED_MODEL = "@cf/baai/bge-base-en-v1.5";
export const EMBED_DIMENSIONS = 768;

interface EmbeddingOutput {
  shape?: number[];
  data?: Array<{ embedding?: number[] } | number[]>;
}

// Deterministic feature-hashed pseudo-embedding used when IZWA_MOCK is set
// (local dev / demo mode, no Workers AI needed). Words hash to +/-1 slots so
// overlapping vocabulary yields non-trivial cosine similarity — enough for
// the quality engine's model-agreement signal to be meaningful.
export function mockEmbedding(text: string): number[] {
  const dim = EMBED_DIMENSIONS;
  const vec = new Array<number>(dim).fill(0);
  const words = text.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  for (const w of words) {
    let h = 2166136261;
    for (let i = 0; i < w.length; i++) {
      h = ((h ^ w.charCodeAt(i)) * 16777619) >>> 0;
    }
    const idx = h % dim;
    vec[idx] += (h >> 1) % 2 === 0 ? 1 : -1;
  }
  return vec;
}

export async function embedTexts(env: Env, texts: string[]): Promise<number[][]> {
  if (env.IZWA_MOCK) {
    return texts.map((t) => mockEmbedding(t));
  }
  const clean = texts.map((t) => (t?.trim() ? t : " "));
  const result = (await env.AI.run(EMBED_MODEL, { text: clean })) as unknown as EmbeddingOutput;
  const data = result.data ?? [];
  return data.map((d) => {
    if (Array.isArray(d)) return d as number[];
    if (d && Array.isArray(d.embedding)) return d.embedding as number[];
    return [];
  });
}

export async function embedText(env: Env, text: string): Promise<number[]> {
  const [vector] = await embedTexts(env, [text]);
  return vector;
}
