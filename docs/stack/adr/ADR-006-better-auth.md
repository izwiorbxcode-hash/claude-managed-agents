# ADR-006: Better Auth

## Status
Accepted (Phase 2, scaffolded now)

## Context
Auth must support email/pass, social, sessions, organizations, admin, trusted origins. Options: Auth.js, Lucia, Better Auth. Nort already uses Better Auth 1.7.1.

## Decision
**Better Auth** with Drizzle adapter as standard.

- `packages/auth` owns `createAuth(env)` factory.
- Plugins: `organization`, `admin` (core); `paystack` optional (ADR-007).
- Auth exposed to app layer via `AuthService : { getSession, requireUser, requireOrg, hasPermission }` — domain never imports `better-auth`.

## Consequences
- Auth schema generated via Better Auth CLI must stay compatible with Drizzle.
- Secrets (`BETTER_AUTH_SECRET`) stay server-side; never in shared packages.
- Session verification is per-request (reads `env`, `request.headers`).

## Deferred
Phase 1 ships placeholder `AuthService` stub; full Better Auth wiring lands Phase 2.
