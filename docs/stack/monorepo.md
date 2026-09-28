# Monorepo

Bun workspaces + Turbo + catalog.

## Workspaces

`package.json:workspaces.packages = ["apps/*","packages/*","tooling/*"]`.

Add a workspace:

```json
{ "name": "@unsung/new-package", "version": "0.1.0" }
```

Reference via `workspace:*` and `catalog:` for shared deps.

## Turbo

`turbo.json` pipelines `build` (`^build`), `check-types`, `test` with `^` deps. No `dev` cache.

Run filtered:

```bash
turbo run build --filter=@unsung/api
bun run dev:api
```

## Dependency Boundaries

`domain` must not import `cloudflare`, `hono`, `react`, `expo`, `drizzle`, `better-auth`, `paystack`. Enforced by lint and review.

Clients import only `packages/api` + `packages/validation` + `packages/domain` types — never `apps/api` internals.
