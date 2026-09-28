# Auth (Better Auth)

Phase 2. Phase 1 ships a stub `AuthService` so the vertical slice compiles without Better Auth.

## Target

- email/password + optional social
- sessions, organizations, roles/permissions, admin
- Drizzle adapter, D1
- trusted origins, secure cookies

## Factory

`packages/auth/src/index.ts`:

```ts
import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
export const createAuth = (env: Env, db) => betterAuth({
  database: drizzleAdapter(db, { provider: "sqlite" }),
  secret: env.BETTER_AUTH_SECRET,
  trustedOrigins: [env.CORS_ORIGIN],
  plugins: [organization(), admin()],
  emailAndPassword: { enabled: true }
})
```

## Service Boundary

Domain never imports `better-auth`. App uses:

```ts
class AuthService extends Context.Tag("AuthService")<AuthService, {
  getSession(req: Request): Effect<Option<Session>, AuthError>
  requireUser(req: Request): Effect<User, AuthError>
}> {}
```

Hono mounts `app.on(["GET","POST"], "/api/auth/*", (c) => auth.handler(c.req.raw))`.

## Env

`BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `CORS_ORIGIN` — server-only.

## Migration

Better Auth CLI generates its D1 tables; keep them compatible with app migrations in `packages/db`.

Refs: https://better-auth.com/docs, https://better-auth.com/docs/adapters/drizzle, https://better-auth.com/docs/concepts/plugins
