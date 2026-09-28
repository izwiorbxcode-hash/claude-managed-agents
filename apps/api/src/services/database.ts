import type { D1Database } from "@cloudflare/workers-types";
import { createDb, type DrizzleDb } from "@unsung/db";
import { Context, Layer } from "effect";

export class DatabaseService extends Context.Tag("DatabaseService")<
  DatabaseService,
  { readonly db: DrizzleDb }
>() {}

/**
 * Create a request-scoped layer. DO NOT memoize globally — D1 binding is per-request.
 * See ADR-008 and Backpine effect-worker.
 */
export const makeDatabaseLayer = (
  d1: D1Database
): Layer.Layer<DatabaseService> => {
  const db = createDb(d1);
  return Layer.succeed(DatabaseService, { db });
};

// Test helper — in-memory mock
export const makeDatabaseTestLayer = (
  mockDb: DrizzleDb
): Layer.Layer<DatabaseService> =>
  Layer.succeed(DatabaseService, { db: mockDb });
