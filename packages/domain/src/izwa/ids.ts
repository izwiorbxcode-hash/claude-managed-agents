// IZWA identifier shapes + generators. All ids carry a typed prefix so
// any subsystem can validate a reference before touching the database.

export const PREFIXES = [
  "asset_",
  "task_",
  "proposal_",
  "record_",
  "escalation_",
  "contract_",
  "eval_",
  "exp_",
  "mem_",
  "prov_",
  "ver_",
] as const;

export type IzwaIdPrefix = (typeof PREFIXES)[number];

export function newId(prefix: IzwaIdPrefix): string {
  return `${prefix}${crypto.randomUUID()}`;
}

const REGEX: Record<IzwaIdPrefix, RegExp> = {
  asset_: /^asset_[^/]+$/,
  task_: /^task_[^/]+$/,
  proposal_: /^proposal_[^/]+$/,
  record_: /^record_[^/]+$/,
  escalation_: /^escalation_[^/]+$/,
  contract_: /^contract_[^/]+$/,
  eval_: /^eval_[^/]+$/,
  exp_: /^exp_[^/]+$/,
  mem_: /^mem_[^/]+$/,
  prov_: /^prov_[^/]+$/,
  ver_: /^ver_[^/]+$/,
};

export function isIzwaId(id: unknown, prefix: IzwaIdPrefix): id is string {
  return typeof id === "string" && REGEX[prefix].test(id);
}

// Stable sha256 of the canonical input bytes. Used for deduplication:
// identical raw material collides on the same asset hash regardless of
// which tenant/org uploaded it.
export async function contentHash(bytes: Uint8Array): Promise<string> {
  const view = bytes as unknown as Uint8Array<ArrayBuffer>;
  const digest = await crypto.subtle.digest("SHA-256", view);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
