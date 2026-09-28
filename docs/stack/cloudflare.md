# Cloudflare

## Best Practices (must)

- Use bindings directly (`env.DATABASE`, `env.R2_BUCKET`) — do not call Cloudflare REST APIs from Workers.
- Never share I/O across requests (see ADR-008).
- Separate app-lifetime vs request-lifetime objects.
- Use `wrangler types` for `Env`.

## Bindings (Phase 1)

`apps/api/wrangler.jsonc`:

```jsonc
{
  "name": "unsung-api",
  "main": "src/index.ts",
  "compatibility_date": "2026-09-01",
  "d1_databases": [{ "binding": "DATABASE", "database_name": "unsung-db", "database_id": "local" }],
  "vars": { "BETTER_AUTH_SECRET": "dev-only" }
}
```

Local D1: `wrangler d1 create unsung-db --local` → copy `database_id`. Or use `DATABASE_URL` for drizzle-kit outside Workers.

## Request Bridge

`packages/effect/src/fiberRef.ts` exposes `currentEnv`/`currentCtx` FiberRefs for middleware that needs env before Layer is built (Backpine pattern). Hono handlers also have `c.env` — prefer passing `c.env` explicitly and using per-request Layer.

## Storage (Phase 4)

`packages/storage/src/service.ts` → `R2` via `env.R2_BUCKET`. Interface `{ put, get, delete, head, createPresignedUrl }`.

## Queues / Workflows (Phase 6)

`queue: makeQueueHandler({ schema, handler })` — batch-scoped DB connection, ack/retry.

## IaC

Phase 1: `wrangler.jsonc` only. Phase 8: `alchemy` (`packages/infra/alchemy.run.ts`) provisions D1, R2, KV.

Refs:

- https://developers.cloudflare.com/workers/best-practices/workers-best-practices/
- https://developers.cloudflare.com/workers/platform/storage-options/
- https://developers.cloudflare.com/r2/api/workers/workers-api-reference/
- https://developers.cloudflare.com/workers/platform/infrastructure-as-code/
