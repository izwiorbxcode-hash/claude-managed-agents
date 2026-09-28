# Effect Guidelines (Unsung Stack)

Effect v4 is the application layer. Hono is transport only.

## Core Types

```ts
Effect<A, E, R>
A = success, E = typed failure, R = services
```

## Services

```ts
import { Context, Effect, Layer } from "effect"

export class DatabaseService extends Context.Tag("DatabaseService")<
  DatabaseService, { readonly db: DrizzleDb; readonly query: ... }
>() {}

export const DatabaseLive = Layer.effect(DatabaseService, Effect.gen(...))
export const DatabaseTestLive = Layer.succeed(DatabaseService, mock)
```

## Programs

```ts
export const listProjects = Effect.gen(function* () {
  const { db } = yield* DatabaseService
  const rows = yield* Effect.tryPromise({
    try: () => db.select().from(projects),
    catch: (e) => new DatabaseError({ cause: e })
  })
  return rows
})
```

## Errors

Extend `Data.TaggedError` with `httpStatus`:

```ts
import { Data } from "effect"
export class NotFoundError extends Data.TaggedError("NotFoundError")<{
  message: string; httpStatus: 404
}> {}
```

Map in Hono handlers — never leak stack.

## Request Scoping

Never memoize D1/R2. Provide per-request:

```ts
const handler = async (c) => {
  const program = Effect.gen(function* () {
    const { db } = yield* DatabaseService
    return yield* listProjects(db)
  }).pipe(Effect.provide(makeRequestLayer(c.env)))
  const result = await Effect.runPromise(program)
  return c.json(result)
}
```

See ADR-008 and `packages/effect/src/fiberRef.ts`.

## When NOT to use Effect

Pure domain helpers (`formatCurrency`, `validateEmail`) stay plain functions. Use Effect where it solves retries, resource safety, typed errors, or concurrency.

## Testing

```ts
import { Effect, Layer } from "effect"
const TestLayer = Layer.succeed(DatabaseService, mockDb)
await Effect.runPromise(program.pipe(Effect.provide(TestLayer)))
```

## References

- https://effect.website/docs/v4/onboarding
- Backpine effect-worker: HttpApiMiddleware pattern (we adapt to Hono)
