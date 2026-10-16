import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { createAuth } from "./auth.js";
import type { Env, Variables } from "./env.js";
import { requestIdMiddleware } from "./middleware/request-id.js";
import { annotationRoutes } from "./routes/annotations.js";
import { healthRoutes } from "./routes/health.js";
import { idiomRoutes } from "./routes/idioms.js";
import { izwaRoutes } from "./routes/izwa.js";
import { openapiRoutes } from "./routes/openapi.js";
import { projectsRoutes } from "./routes/projects.js";

export const createApp = () => {
  const app = new Hono<{ Bindings: Env; Variables: Variables }>();

  app.use(logger());
  app.use("*", requestIdMiddleware);

  // CORS — permissive for monorepo local dev; lock down in production via CORS_ORIGIN
  app.use(
    "/api/*",
    cors({
      allowHeaders: [
        "Content-Type",
        "Authorization",
        "x-user-id",
        "x-request-id",
      ],
      allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      credentials: true,
      maxAge: 86_400,
      origin: (origin, c) => {
        const configured = c.env?.CORS_ORIGIN?.trim();
        if (configured) {
          return origin === configured ? origin : configured;
        }
        return origin;
      },
    })
  );

  // Better Auth owns every /api/auth/* path. Mounted before the feature routes
  // so no domain route can shadow it, and before any session middleware.
  app.on(["GET", "POST", "OPTIONS"], "/api/auth/*", (c) =>
    createAuth(c.env).handler(c.req.raw)
  );

  app.route("/", healthRoutes);
  app.route("/", projectsRoutes);
  app.route("/", izwaRoutes);
  app.route("/", openapiRoutes);
  app.route("/", annotationRoutes);
  app.route("/", idiomRoutes);

  app.get("/", (c) => c.text("Izwa API — learned data infrastructure"));

  app.notFound((c) =>
    c.json(
      {
        code: "NotFoundError" as const,
        message: "Route not found",
        requestId: c.get("requestId"),
        success: false as const,
      },
      404
    )
  );

  app.onError((err, c) => {
    console.error("[unsung-api] unhandled", err);
    return c.json(
      {
        code: "InternalError" as const,
        message: "Internal Server Error",
        requestId: c.get("requestId"),
        success: false as const,
      },
      500
    );
  });

  return app;
};

export const app = createApp();

// Hono RPC — export type for `hc<AppType>` in web/mobile/integration tests
export type AppType = typeof app;
