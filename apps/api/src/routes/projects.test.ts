import type { DrizzleDb, ProjectRow } from "@unsung/db";
import { Effect, Layer } from "effect";
import { describe, expect, it } from "vitest";
import { DatabaseService } from "../services/database.js";
import {
  createProjectProgram,
  listProjectsProgram,
} from "../services/projects.js";

const makeMockDb = (): DrizzleDb => {
  const rows: ProjectRow[] = [];
  return {
    insert: (..._args: unknown[]) => ({
      values: async (row: ProjectRow): Promise<void> => {
        if (rows.some((r: ProjectRow) => r.slug === row.slug)) {
          throw new Error("UNIQUE constraint failed: projects.slug");
        }
        rows.push(row);
      },
    }),
    select: (..._args: unknown[]) => ({
      from: (..._args2: unknown[]) => ({
        orderBy: async (..._args3: unknown[]): Promise<readonly ProjectRow[]> =>
          rows,
        where: (..._args3: unknown[]) => ({
          limit: async (..._args4: unknown[]): Promise<readonly ProjectRow[]> =>
            rows.slice(0, 1),
        }),
      }),
    }),
  } as unknown as DrizzleDb;
};

// Basic Effect test without Hono
describe("projects service", () => {
  it("lists projects via Effect", async () => {
    const mockDb = makeMockDb();
    const layer = Layer.succeed(DatabaseService, { db: mockDb });
    const result = await Effect.runPromise(
      listProjectsProgram.pipe(Effect.provide(layer))
    );
    expect(Array.isArray(result)).toBe(true);
  });

  it("creates project via Effect", async () => {
    const mockDb = makeMockDb();
    const layer = Layer.succeed(DatabaseService, { db: mockDb });
    const row = await Effect.runPromise(
      createProjectProgram({ name: "My Project", ownerId: "user_123" }).pipe(
        Effect.provide(layer)
      )
    );
    expect(row.name).toBe("My Project");
    expect(row.slug).toBe("my-project");
  });

  it("fails on short name", async () => {
    const mockDb = makeMockDb();
    const layer = Layer.succeed(DatabaseService, { db: mockDb });
    const result = await Effect.runPromiseExit(
      createProjectProgram({ name: "x", ownerId: "user_123" }).pipe(
        Effect.provide(layer)
      )
    );
    expect(result._tag).toBe("Failure");
  });
});
