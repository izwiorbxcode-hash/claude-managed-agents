/**
 * Cloudflare helpers — Phase 6.
 * Typed utilities for Workers bindings. Mirrors Backpine's `@repo/cloudflare` pattern.
 */
import type { ExecutionContext } from "@cloudflare/workers-types";

export const placeholder = "cloudflare helpers Phase 6" as const;

export interface CloudflareRequestContext<Env> {
  readonly ctx: ExecutionContext;
  readonly env: Env;
  readonly request: Request;
}

export type CloudflareHandler<Env> = (
  req: Request,
  env: Env,
  ctx: ExecutionContext
) => Promise<Response>;

export const makeCloudflareHandler =
  <Env>(handler: CloudflareHandler<Env>): CloudflareHandler<Env> =>
  (req: Request, env: Env, ctx: ExecutionContext): Promise<Response> =>
    handler(req, env, ctx);

export const getBinding = <Env, K extends keyof Env>(
  env: Env,
  key: K
): Env[K] => env[key];
