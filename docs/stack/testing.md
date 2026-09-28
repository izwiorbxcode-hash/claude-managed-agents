# Testing

## Goals

Unit + integration + API + webhook + E2E (where warranted). Domain tests need no infra.

## Tools

- `vitest` + `@effect/vitest`
- `wrangler` / `miniflare` for Worker integration
- mock Layers for services

## Patterns

```ts
// Mock Layer
const MockDb = Layer.succeed(DatabaseService, { db: mockDrizzle })

// Run program under test layer
const result = await Effect.runPromise(
  listProjects.pipe(Effect.provide(MockDb))
)
expect(result).toEqual([...])
```

## Where

- `packages/domain` — pure unit tests.
- `packages/db` — repository tests with local D1 (`wrangler d1 execute --local`).
- `apps/api` — API tests: start `wrangler dev`, `hc<AppType>` call, assert status + typed error.
- `packages/billing` — webhook HMAC tests, idempotency.

## Phase 1

`apps/api/src/routes/projects.test.ts` exercises `list`/`create` via `Effect` + mock `DatabaseService`. D1 integration test uses `better-sqlite3` local.

Run: `bun test`.
