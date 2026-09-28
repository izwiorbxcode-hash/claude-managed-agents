# ADR-003: Hono as Transport

## Status
Accepted

## Context
Need HTTP on Cloudflare Workers. Options: `effect/unstable/httpapi`, Hono, tRPC. Backpine uses `effect/unstable/httpapi`; Nort uses Hono + tRPC. Spec mandates Hono and Hono RPC.

## Decision
Use **Hono** as HTTP transport and **Hono RPC** (`hc<AppType>`) for typed contracts.

- Hono routes are thin adapters: `validate -> run Effect -> map error -> json`.
- Shared schemas in `packages/validation` + `packages/domain`.
- `export type AppType = typeof app` for `hc`.

## Consequences
- We do **not** use `effect/unstable/httpapi` for routing; Effect lives behind Hono, not as router.
- Middleware still uses Effect (auth, db) but invoked per-request inside Hono handler, not as `HttpApiMiddleware`.

## Tradeoff vs Backpine
Backpine's `HttpApiMiddleware` gives per-route middleware typing. We achieve similar guarantee by composing Effect Layers per handler and testing that every DB-requiring route provides `DatabaseService`. Less compile-time guarantee per-route than HttpApi, but preserves Hono's ecosystem and Nort familiarity.

## Alternatives
tRPC — rejected (spec removes tRPC, Hono RPC is lighter and works with Expo).
effect/httpapi — rejected for now (unstable, couples routing to Effect).
