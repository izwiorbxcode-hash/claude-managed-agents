import type { ProjectRow } from "@unsung/db";
import { createProject, listProjects, slugify } from "@unsung/db";
import { type DomainError, ValidationError } from "@unsung/domain";
import { Effect } from "effect";
import { DatabaseService } from "./database.js";

export const listProjectsProgram: Effect.Effect<
  readonly ProjectRow[],
  DomainError,
  DatabaseService
> = Effect.gen(function* () {
  const { db } = yield* DatabaseService;
  const rows: readonly ProjectRow[] = yield* listProjects(db);
  return rows;
});

export interface CreateProjectProgramInput {
  readonly description?: string | undefined;
  readonly name: string;
  readonly ownerId: string;
}

export const createProjectProgram = (
  input: CreateProjectProgramInput
): Effect.Effect<ProjectRow, DomainError, DatabaseService> =>
  Effect.gen(function* () {
    if (!input.name || input.name.trim().length < 2) {
      return yield* Effect.fail(
        new ValidationError({
          httpStatus: 400,
          message: "Name must be at least 2 characters",
        })
      );
    }
    const slug: string = slugify(input.name);
    if (!slug) {
      return yield* Effect.fail(
        new ValidationError({
          httpStatus: 400,
          message: "Invalid name for slug",
        })
      );
    }
    const id: string = crypto.randomUUID();
    const { db } = yield* DatabaseService;
    const row: ProjectRow = yield* createProject(db, {
      description: input.description?.trim(),
      id,
      name: input.name.trim(),
      ownerId: input.ownerId,
      slug,
    });
    return row;
  });
