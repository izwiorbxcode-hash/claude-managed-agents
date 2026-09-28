import { zValidator } from "@hono/zod-validator";
import { getProjectById } from "@unsung/db";
import { createProjectSchema } from "@unsung/validation";
import { Effect, Either } from "effect";
import { Hono } from "hono";
import type { Env, Variables } from "../env.js";
import { jsonError, jsonSuccess } from "../lib/errors.js";
import { DatabaseService, makeDatabaseLayer } from "../services/database.js";
import {
  createProjectProgram,
  listProjectsProgram,
} from "../services/projects.js";

export const projectsRoutes = new Hono<{
  Bindings: Env;
  Variables: Variables;
}>()
  .get("/api/projects", async (c) => {
    const requestId: string = c.get("requestId");
    // Protect: no global D1 — create per request (ADR-008)
    if (!c.env?.DATABASE) {
      return c.json(
        {
          code: "InternalError" as const,
          message: "Database not configured",
          requestId,
          success: false as const,
        },
        500
      );
    }
    const database = c.env.DATABASE;
    const layer = makeDatabaseLayer(database);
    const program = listProjectsProgram.pipe(Effect.provide(layer));

    const either = await Effect.runPromise(Effect.either(program));
    if (Either.isLeft(either)) {
      return jsonError(c, either.left, requestId);
    }
    return c.json(
      { data: { projects: either.right }, success: true as const },
      200
    );
  })
  .post("/api/projects", zValidator("json", createProjectSchema), async (c) => {
    const requestId: string = c.get("requestId");
    if (!c.env?.DATABASE) {
      return c.json(
        {
          code: "InternalError" as const,
          message: "Database not configured",
          requestId,
          success: false as const,
        },
        500
      );
    }
    const body: { name: string; description?: string | undefined } =
      c.req.valid("json");

    // Phase 1 auth stub: ownerId from header `x-user-id` or fallback `demo-owner`
    // Phase 2 will replace with `yield* AuthService.requireUser(c.req.raw)` inside Effect.
    const ownerId: string = c.req.header("x-user-id") ?? "demo-owner";

    const database = c.env.DATABASE;
    const layer = makeDatabaseLayer(database);
    const program = createProjectProgram({
      description: body.description,
      name: body.name,
      ownerId,
    }).pipe(Effect.provide(layer));

    const either = await Effect.runPromise(Effect.either(program));
    if (Either.isLeft(either)) {
      return jsonError(c, either.left, requestId);
    }
    return c.json({ data: either.right, success: true as const }, 201);
  })
  .get("/api/projects/:id", async (c) => {
    const requestId: string = c.get("requestId");
    if (!c.env?.DATABASE) {
      return c.json(
        {
          code: "InternalError" as const,
          message: "Database not configured",
          requestId,
          success: false as const,
        },
        500
      );
    }
    const id: string = c.req.param("id");
    const database = c.env.DATABASE;
    const layer = makeDatabaseLayer(database);
    const program = Effect.gen(function* () {
      const { db } = yield* DatabaseService;
      return yield* getProjectById(db, id);
    }).pipe(Effect.provide(layer));

    const either = await Effect.runPromise(Effect.either(program));
    if (Either.isLeft(either)) {
      return jsonError(c, either.left, requestId);
    }
    return jsonSuccess(c, either.right);
  });
