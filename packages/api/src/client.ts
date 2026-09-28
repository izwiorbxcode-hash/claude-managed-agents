import type { Hono } from "hono";
import type { Env, Schema } from "hono/types";
import { hc } from "hono/client";

/**
 * Typed Hono RPC client factory.
 *
 * Generic over the server's `AppType` so `packages/api` does not depend on `apps/api`
 * (avoiding a circular workspace dependency). Consumers instantiate with the app type:
 *
 *   import type { AppType } from "@unsung/api-worker/app"  // or from your server entry
 *   const client = createApiClient<AppType>("https://api.example.com")
 *
 * For non-RPC usage the client remains untyped if no generic is supplied.
 */

export type AnyHono = Hono<Env, Schema, string>;

// Explicit return type via `ReturnType` keeps declaration portable (avoids referencing private `Client` type)
export function createApiClient<T extends AnyHono = AnyHono>(
  baseUrl: string,
  fetchImpl: typeof fetch = fetch
): ReturnType<typeof hc<T>> {
  return hc<T>(baseUrl, { fetch: fetchImpl });
}

export type ApiClient<T extends AnyHono = AnyHono> = ReturnType<
  typeof createApiClient<T>
>;

/**
 * Convenience overload for consumers that already import the generated AppType.
 * Keeping this alias preserves ergonomic usage without coupling the package to apps/* .
 */
export type CreateApiClient = typeof createApiClient;
