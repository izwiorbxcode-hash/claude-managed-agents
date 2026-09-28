# ADR-010: Domain / Infrastructure Separation

## Status
Accepted

## Context
Without explicit boundaries, Hono, Drizzle, Better Auth leak into domain, coupling business rules to infra and blocking tests without Cloudflare.

## Decision
Enforce **hexagonal** separation:

- `packages/domain` — pure: branded types, `Effect Schema`, domain errors. MAY depend on `effect` for Schema/Error only. MUST NOT import `cloudflare`, `hono`, `drizzle`, `better-auth`, `paystack`, `react`, `expo`.
- `packages/db`, `packages/auth`, `packages/storage`, `packages/billing`, `packages/cloudflare` — infrastructure adapters implementing Effect `Services` that satisfy domain ports.
- `apps/api` — Hono adapters (thin).
- Clients — consume `packages/api` contracts, never server package internals.

Enforcement: `tooling/eslint` boundary rules + code review; `packages/domain/package.json` has zero infra deps.

## Consequences
- Domain tests run with `bun test` — no Workers.
- Swapping D1 → Postgres or Paystack → Stripe only touches infra packages.
- More files but clear ownership.
