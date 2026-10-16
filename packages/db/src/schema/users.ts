import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

/**
 * Minimal Better Auth–compatible users table.
 * Keep separate from app domain tables; Better Auth CLI may generate additional columns.
 * This file ensures Phase 1 typechecks and Phase 2 can merge Better Auth schema without conflict.
 */
export const users = sqliteTable("user", {
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" })
    .notNull()
    .default(false),
  id: text("id").primaryKey(),
  image: text("image"),
  name: text("name").notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const sessions = sqliteTable("session", {
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  id: text("id").primaryKey(),
  ipAddress: text("ip_address"),
  token: text("token").notNull().unique(),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
});

export const accounts = sqliteTable("account", {
  accessToken: text("access_token"),
  accessTokenExpiresAt: integer("access_token_expires_at", {
    mode: "timestamp",
  }),
  accountId: text("account_id").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  id: text("id").primaryKey(),
  idToken: text("id_token"),
  // Better Auth 1.7 requires `issuer` and keys the unique index on
  // (issuer, accountId). For the credential provider it is the provider id.
  issuer: text("issuer").notNull(),
  password: text("password"),
  providerId: text("provider_id").notNull(),
  refreshToken: text("refresh_token"),
  refreshTokenExpiresAt: integer("refresh_token_expires_at", {
    mode: "timestamp",
  }),
  scope: text("scope"),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
}, (table) => [
  index("account_issuer_account_id_unique").on(table.issuer, table.accountId),
  index("account_user_id_idx").on(table.userId),
]);

/**
 * Better Auth's `verification` table. Stores email-verification and
 * password-reset tokens; rows are keyed by the opaque identifier handed to
 * the recipient and carry no foreign key, so they expire by age alone.
 */
export const verifications = sqliteTable("verification", {
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  identifier: text("identifier").notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  value: text("value").notNull(),
});
