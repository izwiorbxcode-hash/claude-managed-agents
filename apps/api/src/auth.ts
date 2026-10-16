import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { createDb, schema } from "@unsung/db";
import { betterAuth } from "better-auth";
import type { Env } from "./env.js";

/**
 * Better Auth instance, built per request from the request-scoped D1 binding.
 *
 * ADR-008: the D1 binding is request-scoped, so the database client must be
 * created per request rather than memoized at module scope. Everything else
 * (secret, base URL, trusted origins) comes from the environment.
 *
 * The schema mapping is required because the Drizzle exports are plural
 * (`users`, `sessions`, `accounts`) while the underlying tables are singular
 * (`user`, `session`, `account`). Better Auth addresses models by name, so
 * without this map it looks for a non-existent `users` table.
 */
export function createAuth(env: Env) {
  const db = createDb(env.DATABASE);
  return betterAuth({
    advanced: {
      useSecureCookies: true,
    },
    appName: "IzwaAI",
    database: drizzleAdapter(db, {
      provider: "sqlite",
      schema: {
        ...schema,
        account: schema.accounts,
        session: schema.sessions,
        user: schema.users,
        verification: schema.verifications,
      },
    }),
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 12,
    },
    session: {
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60 * 24,
    },
    // Only the deployed origin may post credentials. Leaving this unset would
    // let any site drive sign-in against this worker.
    trustedOrigins: [env.BETTER_AUTH_URL].filter((origin): origin is string =>
      Boolean(origin)
    ),
  });
}

export type Auth = ReturnType<typeof createAuth>;
export type AuthSession = Auth["$Infer"]["Session"];
