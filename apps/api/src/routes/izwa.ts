import { Hono } from "hono";
import { Izwa } from "@unsung/domain";
import { IZWA_LANGUAGES } from "@izwa/taxonomy";
import type { Env, Variables } from "../env.js";

const { LANGUAGE_CONTRACT } = Izwa;

// Izwa learned-data routes — v1 thin slice.
// Full refinery Hono app (workers/refinery/api.ts) mounts here in phase 2
// once D1/R2/Vectorize/AI bindings are merged into apps/api/wrangler.jsonc.
// This route proves monorepo wiring: apps/api → packages/domain + @izwa/*.
export const izwaRoutes = new Hono<{ Bindings: Env; Variables: Variables }>()
  .get("/api/izwa/health", (c) =>
    c.json({
      contract: LANGUAGE_CONTRACT.contractId,
      languages: IZWA_LANGUAGES.map((l) => l.code),
      ok: true,
      success: true as const,
      vertical: "language",
    })
  )
  .get("/api/izwa/contract", (c) =>
    c.json({ data: LANGUAGE_CONTRACT, success: true as const })
  )
  .get("/api/izwa/languages", (c) =>
    c.json({ data: IZWA_LANGUAGES, success: true as const })
  );
