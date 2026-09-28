# ADR-001: Bun Workspaces

## Status
Accepted

## Context
We need fast installs, reproducible lockfile, workspace protocol, and native Cloudflare Workers tooling. npm/pnpm both viable; team already standardized on Bun in Nort (see `nort/package.json:61` `bun@1.3.10`). Expo supports `bun create`, and `wrangler`/`drizzle-kit` work with Bun.

## Decision
Use **Bun workspaces** with `catalog:` for shared versions. `packageManager: bun@1.3.10` pinned at root. Scripts use `bun run` and `turbo`. No `pnpm` or `yarn`.

## Consequences
- Catalog ensures single source of truth for `effect`, `hono`, `drizzle-orm`, etc.
- Lockfile is `bun.lock` (not `pnpm-lock.yaml`) — diverge from Backpine's pnpm but matches Unsung's existing projects.
- CI must install Bun, not Node-only.

## Alternatives
pnpm — considered, rejected: would force migration of `nort` and lose catalog ergonomics team prefers.
