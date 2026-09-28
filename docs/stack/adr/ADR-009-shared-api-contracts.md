# ADR-009: Shared API Contracts (Hono RPC)

## Status
Accepted

## Context
Expo and TanStack Start must call the Worker without duplicating types. Options: tRPC, Orval, Hono RPC. Nort uses tRPC today; spec mandates Hono RPC.

## Decision
Use **Hono RPC** (`hono/client` `hc<AppType>`) as contract:

- `apps/api/src/app.ts` exports `type AppType = typeof app`.
- `packages/api/src/client.ts` re-exports typed `createClient(baseUrl, fetch) => hc<AppType>`.
- `packages/validation` holds `zod` schemas used both by `zValidator` server-side and client forms.

## Consequences
- Client gets end-to-end type safety without codegen.
- `strict:true` required on Hono client.
- If Better Auth needs tRPC interop for some clients, keep tRPC as optional bridge — not default.

## Error Mapping
Domain errors → HTTP status via `httpStatus` field; client distinguishes via `status` and `code`.

## Alternatives
tRPC — more RPC features but couples to tRPC server; rejected as default.
OpenAPI + Orval — heavier, codegen step.
