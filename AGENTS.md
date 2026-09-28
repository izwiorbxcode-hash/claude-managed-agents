# Cloudflare Workers

STOP. Your knowledge of Cloudflare Workers APIs and limits may be outdated. Always retrieve current documentation before any Workers, KV, R2, D1, Durable Objects, Queues, Vectorize, AI, or Agents SDK task.

## Docs

- https://developers.cloudflare.com/workers/
- MCP: `https://docs.mcp.cloudflare.com/mcp`

For all limits and quotas, retrieve from the product's `/platform/limits/` page. eg. `/workers/platform/limits`

## Monorepo (Bun + Turborepo, Unsung Stack template)

Canonical vision: `docs/vision.md`. Stack docs: `docs/stack/`.
Izwa domain: `packages/domain/src/izwa` · taxonomy/datasets/evaluation/embeddings/annotation in `packages/*`.
API worker: `apps/api` (Hono + Effect, `apps/api/wrangler.jsonc` bindings). Web: `apps/web`.
Legacy sandbox worker (`wrangler.jsonc`, `migrations/`, `tests/`, `Dockerfile`) is archived under `legacy/sandbox/` — do not extend it.

| Command | Purpose |
|---------|---------|
| `bun install` | Install all workspaces |
| `bun run dev` | Turbo: run all `dev` tasks |
| `bun run dev:api` | API worker only (`wrangler dev`, apps/api) |
| `bun run typecheck` | `turbo run check-types` across workspaces |
| `bun run build` | `turbo run build` + web SPA to `./public` |
| `bun run test` | `turbo run test` across workspaces |
| `bunx wrangler dev --cwd apps/api` | Local API dev |
| `bunx wrangler deploy --cwd apps/api` | Deploy API worker |
| `bunx wrangler types --cwd apps/api` | Generate worker types |

Run `wrangler types` after changing bindings in `apps/api/wrangler.jsonc`.
D1 migrations live in `packages/db/src/migrations` (wired via `migrations_dir`).

## Cloudflare Workers

STOP. Your knowledge of Cloudflare Workers APIs and limits may be outdated. Always retrieve current documentation before any Workers, KV, R2, D1, Durable Objects, Queues, Vectorize, AI, or Agents SDK task.

## Node.js Compatibility

https://developers.cloudflare.com/workers/runtime-apis/nodejs/

## Errors

- **Error 1102** (CPU/Memory exceeded): Retrieve limits from `/workers/platform/limits/`
- **All errors**: https://developers.cloudflare.com/workers/observability/errors/

## Product Docs

Retrieve API references and limits from:
`/kv/` · `/r2/` · `/d1/` · `/durable-objects/` · `/workers-ai/` · `/agents/` · `/sandbox/` · `/containers/`
