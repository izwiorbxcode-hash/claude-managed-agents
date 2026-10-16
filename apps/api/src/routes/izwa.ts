import { IZWA_LANGUAGES, NGUNI_LANGUAGES } from "@izwa/taxonomy";
import { Izwa } from "@unsung/domain";
import { Hono } from "hono";
import type { Env, Variables } from "../env.js";

const {
  IZWA_COMPANY_DIRECTION,
  IZWA_OFFERINGS,
  IZWA_OPERATING_STAGES,
  LANGUAGE_CONTRACT,
} = Izwa;

const routes = {
  capabilities: "/api/izwa/capabilities",
  contract: "/api/izwa/contract",
  direction: "/api/izwa/direction",
  evaluations: "/api/izwa/evaluations",
  languages: "/api/izwa/languages",
} as const;

// Izwa learned-data routes — v1 thin slice.
// Full refinery Hono app (workers/refinery/api.ts) mounts here in phase 2
// once D1/R2/Vectorize/AI bindings are merged into apps/api/wrangler.jsonc.
// This route proves monorepo wiring: apps/api → packages/domain + @izwa/*.
export const izwaRoutes = new Hono<{ Bindings: Env; Variables: Variables }>()
  .get("/api/izwa", (c) =>
    c.json({
      data: {
        direction: IZWA_COMPANY_DIRECTION.positioning,
        focus: IZWA_COMPANY_DIRECTION.focus,
        routes,
      },
      success: true as const,
    })
  )
  .get("/api/izwa/health", (c) =>
    c.json({
      contract: LANGUAGE_CONTRACT.contractId,
      focusLanguages: NGUNI_LANGUAGES.map((language) => language.code),
      ok: true,
      success: true as const,
      vertical: "language",
    })
  )
  .get("/api/izwa/direction", (c) =>
    c.json({
      data: {
        ...IZWA_COMPANY_DIRECTION,
        operatingStages: IZWA_OPERATING_STAGES,
      },
      success: true as const,
    })
  )
  .get("/api/izwa/capabilities", (c) =>
    c.json({
      data: IZWA_OFFERINGS,
      note:
        "Foundation means supporting workflow code exists; it is not a released product or capability claim. Proposed offerings still require implementation and evidence.",
      success: true as const,
    })
  )
  .get("/api/izwa/contract", (c) =>
    c.json({ data: LANGUAGE_CONTRACT, success: true as const })
  )
  .get("/api/izwa/languages", (c) => {
    const scope = c.req.query("scope");
    if (scope && scope !== "focus" && scope !== "research") {
      return c.json(
        {
          error: "scope must be focus or research",
          success: false as const,
        },
        422
      );
    }
    const languages = scope === "research" ? IZWA_LANGUAGES : NGUNI_LANGUAGES;
    return c.json({
      data: languages,
      scope: scope === "research" ? "research" : "focus",
      success: true as const,
    });
  });
