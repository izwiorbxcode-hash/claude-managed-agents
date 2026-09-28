# ADR-004: Cloudflare as Infrastructure

## Status
Accepted

## Context
Clients need low-latency global edge, cheap SQLite, object storage, queues. Platform must run on Workers, not Node.

## Decision
**Cloudflare Workers** as primary runtime/infrastructure:

- Bindings accessed directly via `env.*` (not REST APIs) per Cloudflare best practices.
- D1, R2, Queues, KV, DO, Workflows as adapters behind Effect services.
- `wrangler` for `dev`/`deploy`/`types`.

See https://developers.cloudflare.com/workers/best-practices/workers-best-practices/

## Consequences
- No Node `fs`/`net` reliance in workers.
- Local dev requires `wrangler dev` / `miniflare`.
- D1 is SQLite (not Postgres) — queries must be SQLite-compatible.

## IaC
Phase 8 introduces `alchemy` or `wrangler` + `terraform` as in `nort/packages/infra`. Phase 1 uses `wrangler.jsonc` only.
