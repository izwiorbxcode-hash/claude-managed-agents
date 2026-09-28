# Unsung Stack — Architecture

> See `docs/adr/` for decisions. This document describes the runtime architecture.

## Overview

```
                 UNSUNG STACK
                      │
           ┌──────────┴──────────┐
           │                     │
       Bun Workspace         Tooling / CI
           │
  ┌────────┼─────────┐
  ▼        ▼         ▼
Expo     TanStack    Admin
  │        │         │
  └────────┼─────────┘
           │
        Hono RPC
           │
           ▼
    ┌───────────────┐
    │    EFFECT     │
    │               │
    │ Domain        │
    │ Services      │
    │ Errors        │
    │ Concurrency   │
    └───────┬───────┘
            │
    ┌───────┼────────┬────────┐
    ▼       ▼        ▼        ▼
   D1       R2      Queue     DO
Drizzle   Storage   Workers  State
    │
    ▼
Better Auth
    │
    ▼
 Paystack (optional)
```

## Layer Responsibilities

| Layer | Responsibility | May depend on |
|-------|---------------|---------------|
| Bun | workspace, package management, scripts | — |
| Cloudflare Workers | runtime/infra bindings | — |
| Hono | HTTP transport, routing, middleware | — |
| Effect | application program layer, composition | Domain, Schema |
| Domain | business rules, branded types, errors | Effect (only for Schema/Error), no infra |
| Drizzle + D1/R2/Queues | persistence adapters | — |
| Better Auth | auth infra adapter | — |
| TanStack / Expo | client UI, RPC consumer | Contracts only |

## Dependency Rule (enforced)

```
domain -> (effect/schema only)
   ^
   |
application/services -> domain
   ^
   |
infrastructure (db, auth, billing, storage, cloudflare) -> application
   ^
   |
hono adapters -> application + infrastructure
   ^
   |
clients (web, mobile) -> contracts only (no server internals)
```

Domain MUST NOT import: cloudflare, hono, react, expo, drizzle, better-auth, paystack.

## Request Lifecycle — Critical

Cloudflare Worker bindings and I/O objects are **request-scoped** and must not be cached globally.

```
fetch(req, env, ctx)
  │
  ├─► FiberRef.set(env, ctx)  // bridge outside -> inside Effect
  │
  └─► ManagedRuntime.runPromise( Effect.gen { handler } )
        │
        ├─► Auth middleware (reads env.BETTER_AUTH_SECRET, verifies session)
        ├─► Database middleware (creates drizzle(env.DATABASE) per-request, Effect.scoped)
        ├─► Storage / Queue middlewares (optional, same pattern)
        │
        └─► Handler: yield* DatabaseService, yield* AuthService, yield* StorageService
             └─► pure domain logic

Scope closes → D1 connection / R2 client / scoped resources released.
Second request gets fresh instances.
```

We intentionally avoid `Layer` memoization for request-scoped resources. Follow Backpine's `effect-worker` lesson: **HttpApiMiddleware-style per-request Effect**, not memoized `Layer.effect`. In Unsung Stack we run Hono handlers via `Effect.provideService` per-request rather than global `ManagedRuntime.make(Layer)`.

See `docs/cloudflare.md` and ADR-008 for full rationale and the FiberRef bridge.

## Effect Mental Model

```ts
Effect<A, E, R>
// A = success
// E = typed failure (domain error union)
// R = required services (Database, Auth, ...)
```

- Typed errors extend `Data.TaggedError` with `httpStatus` annotation.
- Services are `Context.Tag` + `Layer`.
- Handlers are `Effect.gen` with `yield*`.
- Infrastructure failures map to typed errors, never leaked as 500 stack traces.

## API Transport

- Hono is the HTTP boundary. Handlers are thin: validate → run Effect → map error → response.
- `Hono RPC` (`hc<AppType>`) shares the typed contract between `apps/api` and `apps/web|mobile`.
- Shared schemas live in `packages/validation` and `packages/domain`; Hono uses `zValidator`.

Error taxonomy (client-distinguishable):

```
400 ValidationError
401 AuthenticationError
403 AuthorizationError
404 NotFoundError
409 ConflictError
402 PaymentError
429 RateLimitError
502 ExternalServiceError
500 InternalError  (redacted)
```

## Storage / Queue / DO / AI

All optional infrastructure behind Effect services:

```ts
Storage: { put, get, delete, head }
Queue:   { send, sendBatch }
Auth:    { getSession, requireUser, requireOrg, hasPermission }
Billing: { createCheckout, getSubscription, verifyWebhook, ... }
```

Provider never leaks to domain. See `docs/billing.md`, `docs/cloudflare.md`.

## Observability

- Per-request correlation ID (`x-request-id` header, falls back to `crypto.randomUUID()`).
- Structured logs via `Effect.log` + `Logger` service (never logs secrets).
- Timings: request, db, provider.

## Config

Typed config at `packages/config`, validated with `zod`/`Effect Schema`, split per env:

```
development | test | staging | production
```

`env` bindings are read once per request via FiberRef, not `process.env` scattered.

## Testing Strategy

- Domain: pure unit tests, no mocks.
- Services: mock `Layer` (e.g., `DatabaseTestLive` with in-memory D1).
- Handlers: `Effect.provide` test layers.
- Adapters: integration tests with `wrangler` / `miniflare`.

See `docs/testing.md`.

## Vertical Slice (Phase 1 proof)

```
Expo/Web --hc--> Hono GET /api/users/me
  -> validation -> Effect AuthService.getSession
  -> Effect DatabaseService.query -> Drizzle -> D1
  -> typed { user } -> Hono RPC -> TanStack Query -> UI

Create Project: POST /api/projects { name }
  -> validation (zod) -> Effect ProjectsService.create
  -> D1 insert -> typed Project -> 201
```

All later phases (Better Auth orgs, R2, Paystack, Queues, DO) must preserve this slice without breaking typed errors or request-scoping.

## Evolution

- Phase 1: Bun + TS + Effect + Hono + D1/Drizzle ✅ (this repo)
- Phase 2: Better Auth (email/pass, orgs, admin)
- Phase 3: Expo + TanStack Start + Hono RPC
- Phase 4: R2 Storage
- Phase 5: Paystack (optional)
- Phase 6: Queues
- Phase 7: DO / Workflows / AI
- Phase 8: Observability + hardening + CI
- Phase 9: create-unsung CLI
