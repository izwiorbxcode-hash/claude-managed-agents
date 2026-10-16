# Izwa developer guide

## Prerequisites

- Bun matching the root `packageManager` field
- Wrangler authenticated to the intended Cloudflare account
- Access to configured remote resources for deployment or remote integration
  testing

## Install and verify

```sh
bun install
bun run typecheck
bun run test
bun run build
```

The monorepo uses Turborepo. Run a focused app when possible during iteration:

```sh
bun run dev:api
bun run dev:web
bun --cwd apps/api test
bun --cwd apps/api run check-types
```

## Local full-stack development

The API Worker is canonical. It owns `/api/*` and can serve the built SPA from
`apps/web/dist`.

```sh
bun run build:web
bunx wrangler dev --cwd apps/api
```

For faster UI iteration, run the Vite app separately. Its development proxy
forwards API calls to the local API process.

```sh
bun run dev:api
bun run dev:web
```

## Repository rules

- Put Izwa domain logic in `packages/domain/src/izwa` or the relevant
  specialised package.
- Keep request parsing and HTTP status selection in `apps/api`.
- Keep D1 migrations in `packages/db/src/migrations`.
- Keep original assets immutable; write derivatives under distinct keys.
- Make background jobs idempotent and reference immutable input versions.
- Treat model confidence as routing evidence, never human verification.
- Do not add new features to `legacy/sandbox`.

## Adding an API feature

1. Define or reuse a domain contract.
2. Add persistence through the canonical D1 schema and migration when needed.
3. Add the Hono route under `apps/api/src/routes`.
4. Return a structured success or error response with an appropriate status.
5. Add route tests using `app.request()`.
6. Add the endpoint to `apps/api/src/routes/openapi.ts`.
7. Update the web client only after the server contract is stable.
8. Run API tests, workspace type checks, and the production build.

After changing `apps/api/wrangler.jsonc` bindings, regenerate types:

```sh
bunx wrangler types --cwd apps/api
```

## Current learned-data path

The implemented thin slice includes:

1. uploading a permitted audio source;
2. creating a draft transcript;
3. preserving transcript corrections;
4. creating passages and model-assessment jobs;
5. collecting meaning annotations and reviews;
6. creating protected evaluation cases;
7. creating dataset containers; and
8. constructing an immutable dataset version from eligible records.

The current idiom/context routes are one vertical slice. New language tasks
should extend the general LDU model rather than copying an idiom-specific silo.

## Database changes

Generate and inspect migrations before applying them. Local and remote targets
are separate operations.

```sh
bun run db:generate
bun run db:migrate
bunx wrangler d1 migrations apply izwa-db --remote --cwd apps/api
```

Never assume an application deployment applied D1 migrations.

## Validation before deployment

```sh
bun --cwd apps/api run build
bun --cwd apps/api test
bun run typecheck
bun run build
```

Then deploy and verify at least:

- `/`
- `/api/health`
- `/api/izwa`
- `/api/izwa/languages`
- `/api/izwa/capabilities`
- `/api/openapi.json`
- `/redoc`

## Documentation changes

Company direction changes begin in `docs/vision.md`. Product implications go
in `docs/product-guide.md` and `docs/mission-commerce.md`. Runtime ownership
belongs in `docs/system-map.md`; commands and release steps belong here or in
`docs/web-deployment.md`.

Do not duplicate the entire vision into every file. Link to the authoritative
document and document only the local concern.

