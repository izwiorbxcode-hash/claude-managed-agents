# IzwaAI Developer Guide

## Prerequisites

- Bun 1.3 or newer (the repository pins its package manager in `package.json`)
- A Cloudflare account and Wrangler login for Worker development or deployment
- Python/GPU tooling only when working inside `ml/`

## First run

```sh
bun install
cp .env.example .env
bun run typecheck
bun run test
```

Start the API and web app in separate terminals:

```sh
bun run dev:api
bun run dev:web
```

The API listens on `http://localhost:8787`; Vite listens on `http://localhost:5173` and proxies `/api`, `/webhooks`, and `/ws` to the API.

## Common commands

| Command | Purpose |
|---|---|
| `bun run dev` | Run all package development tasks through Turbo |
| `bun run build` | Build every package according to the dependency graph |
| `bun run build:web` | Build only `@izwa/web` into `apps/web/dist` |
| `bun run typecheck` | Type-check all workspaces |
| `bun run test` | Run workspace tests |
| `bun run lint` | Run Ultracite/Biome checks |
| `bun run db:migrate` | Apply canonical API D1 migrations locally |
| `bun run cf-typegen` | Regenerate API Worker binding types |

Run `bunx wrangler types --cwd apps/api` after changing bindings in `apps/api/wrangler.jsonc`.

## Idiom production path

1. Upload consented `audio/*` bytes to `PUT /api/izwa/media/:key` with `x-izwa-consent`.
2. Call `POST /api/izwa/media/:assetId/transcribe` for timestamped Workers AI transcription.
3. Mark the expression and context with `POST /api/izwa/idioms/tasks`.
4. Complete speaker and independent fluent reviews at `/idiom-review`.
5. Create a dataset, then publish an immutable version using one of the supported product projections.

Reviewer identity currently comes from `x-user-id` while the Better Auth integration remains a scaffold. Do not expose mutation routes publicly until authenticated sessions and role checks replace this development identity seam.

## Adding a feature

1. Put business rules and schemas in `packages/domain` or the relevant `@izwa/*` package.
2. Add an infrastructure adapter in `packages/db`, `packages/storage`, or `packages/cloudflare`.
3. Compose it per request in `apps/api`; never keep Cloudflare I/O objects in module-global state.
4. Expose a narrow Hono route and a shared client contract.
5. Add UI behavior to the appropriate app.
6. Test pure domain logic first, then adapters and Worker integration.
7. Update the relevant document and an ADR when the architectural decision is durable.

## Adding documentation

Markdown source lives in `docs/`. To show a page inside the web app, import it and add its metadata to `apps/web/src/src/views/docs/registry.ts`. The registry order controls the sidebar and previous/next navigation.

## Known transition

This repository evolved from a Cloudflare Claude Managed Agents template. The maintained system lives under `apps/`, `packages/`, and `workers/`; the old implementation is archived at `legacy/sandbox/`. Do not add new product behavior to root legacy files.
