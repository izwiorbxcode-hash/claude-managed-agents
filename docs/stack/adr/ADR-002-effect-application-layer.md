# ADR-002: Effect as Application Layer

## Status
Accepted

## Context
Hono handlers mix validation, auth, DB, and branching; errors are untyped; retries/timeouts are ad-hoc. AI-generated code benefits from compiler-visible failures/dependencies.

## Decision
Adopt **Effect v4** (`effect@4.0.0-rc.112`) as the application/program layer:

- `Effect<A, E, R>` for every use-case.
- `Context.Tag` + `Layer` for services.
- `Effect.gen` + `yield*`.
- Typed domain errors (`Data.TaggedError`).
- `Effect.scoped` for per-request resources.
- No ceremony: if a function is pure and needs no service, keep it plain TS.

Reference: https://effect.website/docs/v4/onboarding and Backpine `effect-worker`/`effect-worker-mono`.

## Consequences
- Learning curve; require `effect` training and the curated skill.
- Adds `effect` as mandatory dependency in `domain` (only for Schema/Error), `app services`, `infra adapters`.
- Testability improves via mock Layers.

## Non-goals
Do not wrap every trivial helper in Effect. Do not expose Effect to frontend (RPC boundary hides it).
