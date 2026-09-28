import type { ExecutionContext } from "@cloudflare/workers-types";
import { app } from "./app.js";
import type { Env } from "./env.js";

/**
 * Cloudflare Worker entry.
 * Note: no global D1, no global `createAuth` — all request-scoped via `c.env` (ADR-008).
 */
export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    return app.fetch(request, env, ctx);
  },
};

// Re-export for Hono RPC and tests
export type { AppType } from "./app.js";
export { app };
