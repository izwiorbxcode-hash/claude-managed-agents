# ADR-005: D1 + Drizzle

## Status
Accepted

## Context
Need type-safe SQLite with migrations, relations, and D1 binding support.

## Decision
Use **Drizzle ORM** (`drizzle-orm@0.45`) with **Cloudflare D1** (`drizzle-orm/d1`).

- `drizzle-kit` for `generate`/`migrate`.
- Schema in `packages/db/src/schema/*`.
- `createDb(d1)` factory, not global singleton.
- Better Auth schema kept compatible but isolated (`auth.schema.ts` separate from app schemas).

## Consequences
- Migrations are explicit `drizzle/*.sql`, reviewed before apply.
- `DATABASE` binding required at runtime (`env.DATABASE`).
- SQLite limitations: no enums, `text` with check, `integer` for timestamps.

## Workflow
```
bun db:generate  # drizzle-kit generate
bun db:migrate   # wrangler d1 migrations apply (local -> staging -> prod)
```
