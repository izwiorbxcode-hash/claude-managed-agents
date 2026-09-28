import type { D1Database } from "@cloudflare/workers-types";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema/index.js";

export type DrizzleDb = DrizzleD1Database<typeof schema>;

/**
 * Create a Drizzle D1 client per request. DO NOT memoize globally — D1 binding is request-scoped.
 * See ADR-008.
 */
export const createDb = (d1: D1Database): DrizzleDb => drizzle(d1, { schema });

export { schema };
