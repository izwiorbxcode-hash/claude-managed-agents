import { ConflictError, DatabaseError, NotFoundError } from "@unsung/domain";
import { eq } from "drizzle-orm";
import { Effect } from "effect";
import type { DrizzleDb } from "../client.js";
import type { ProjectRow } from "../schema/projects.js";
import { projects } from "../schema/projects.js";

export const listProjects = (
  db: DrizzleDb
): Effect.Effect<readonly ProjectRow[], DatabaseError> =>
  Effect.tryPromise({
    catch: (cause: unknown) =>
      new DatabaseError({
        cause,
        httpStatus: 500,
        message: "Failed to list projects",
      }),
    try: async () => {
      const rows: readonly ProjectRow[] = await db
        .select()
        .from(projects)
        .orderBy(projects.createdAt);
      return rows;
    },
  });

export const getProjectById = (
  db: DrizzleDb,
  id: string
): Effect.Effect<ProjectRow, DatabaseError | NotFoundError> =>
  Effect.gen(function* () {
    const rows: readonly ProjectRow[] = yield* Effect.tryPromise({
      catch: (cause: unknown) =>
        new DatabaseError({
          cause,
          httpStatus: 500,
          message: "Failed to fetch project",
        }),
      try: (): Promise<readonly ProjectRow[]> =>
        db.select().from(projects).where(eq(projects.id, id)).limit(1),
    });
    const row: ProjectRow | undefined = rows[0];
    if (row === undefined) {
      return yield* Effect.fail(
        new NotFoundError({
          httpStatus: 404,
          message: `Project ${id} not found`,
        })
      );
    }
    return row;
  });

export const getProjectBySlug = (
  db: DrizzleDb,
  slug: string
): Effect.Effect<ProjectRow, DatabaseError | NotFoundError> =>
  Effect.gen(function* () {
    const rows: readonly ProjectRow[] = yield* Effect.tryPromise({
      catch: (cause: unknown) =>
        new DatabaseError({
          cause,
          httpStatus: 500,
          message: "Failed to fetch project",
        }),
      try: (): Promise<readonly ProjectRow[]> =>
        db.select().from(projects).where(eq(projects.slug, slug)).limit(1),
    });
    const row: ProjectRow | undefined = rows[0];
    if (row === undefined) {
      return yield* Effect.fail(
        new NotFoundError({
          httpStatus: 404,
          message: `Project ${slug} not found`,
        })
      );
    }
    return row;
  });

export interface CreateProjectDbInput {
  readonly description?: string | undefined;
  readonly id: string;
  readonly name: string;
  readonly ownerId: string;
  readonly slug: string;
}

export const createProject = (
  db: DrizzleDb,
  input: CreateProjectDbInput
): Effect.Effect<ProjectRow, DatabaseError | ConflictError> =>
  Effect.tryPromise({
    catch: (cause: unknown): DatabaseError | ConflictError => {
      const msg = String(cause);
      if (msg.includes("UNIQUE constraint")) {
        return new ConflictError({
          httpStatus: 409,
          message: "Project slug already exists",
        });
      }
      return new DatabaseError({
        cause,
        httpStatus: 500,
        message: "Failed to create project",
      });
    },
    try: async (): Promise<ProjectRow> => {
      const now = new Date();
      const row: ProjectRow = {
        createdAt: now,
        description: input.description ?? null,
        id: input.id,
        name: input.name,
        ownerId: input.ownerId,
        slug: input.slug,
        status: "draft",
        updatedAt: now,
      };
      await db.insert(projects).values(row);
      return row;
    },
  });

export const slugify = (name: string): string =>
  name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
