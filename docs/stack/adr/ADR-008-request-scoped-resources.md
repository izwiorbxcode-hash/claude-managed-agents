# ADR-008: Request-Scoped Cloudflare Resources

## Status
Accepted — CRITICAL

## Context
Cloudflare Workers forbid sharing I/O objects across requests:
> `Cannot perform I/O on behalf of a different request.`

Backpine's investigation (`backpine/effect-worker`) proves memoized `Layer.effect(Database, makeDrizzle(env))` fails every other request. Layers are memoized at `ManagedRuntime` construction.

## Decision
Separate **application-lifetime** from **request-lifetime** objects.

- Application-lifetime (memoized): router config, schemas, stateless services, `Logger`.
- Request-lifetime (fresh per `fetch`): `env`, `ctx`, `D1`, `R2`, `session`, `DatabaseService`'s drizzle instance.

Pattern (Hono + Effect adaptation of Backpine):

```ts
// Outside Effect — per fetch
export default {
  async fetch(req: Request, env: Env, ctx: ExecutionContext) {
    return pipe(
      handleRequest(req),
      Effect.provideService(CloudflareEnv, env), // or FiberRef bridge
      Effect.provideService(ExecutionContextTag, ctx),
      // DatabaseService provided per-request inside handler/middleware
      Effect.runPromise
    )
  }
}

// Inside handler — per request
const makeRequestLayer = (env: Env) =>
  Layer.effect(DatabaseService, Effect.gen(function* () {
    const db = drizzle(env.DATABASE, { schema })
    return { db, query: ... }
  }))

app.get("/api/projects", async (c) => {
  const program = Effect.gen(function* () {
    const { db } = yield* DatabaseService
    return yield* listProjects(db)
  })
  const result = await Effect.runPromise(
    program.pipe(Effect.provide(makeRequestLayer(c.env)))
  )
})
```

For app needing `HttpApiMiddleware`-style grouping, we wrap with `Effect.scoped` and `Scope`.

## FiberRef Bridge
When middleware needs env before `Layer` is built, use `FiberRef` (`currentEnv`, `currentCtx`) set at entry, read inside middleware — identical to Backpine's bridge but consumed inside Hono's `c.env` path.

## Consequences
- No global `drizzle` singleton.
- Every handler that touches D1/R2 must create/provide request layer.
- Tests inject `DatabaseTestLive` via `Layer.succeed`, not env.

## Validation
If a handler forgets to provide `DatabaseService`, `yield* DatabaseService` fails type-check ( `R` channel unmet ). Integration test hits both requests sequentially to prove no cross-request I/O error.

## Reference
- https://github.com/backpine/effect-worker (HttpApiMiddleware section)
- https://github.com/backpine/effect-worker-mono (makeCloudflare + DatabaseMiddleware)
