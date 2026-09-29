import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import type { Env, Variables } from "./env.js";
import { requestIdMiddleware } from "./middleware/requestId.js";
import { healthRoutes } from "./routes/health.js";
import { izwaRoutes } from "./routes/izwa.js";
import { idiomRoutes } from "./routes/idioms.js";
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

  // Phase 2: mount Better Auth handler at /api/auth/* before session middleware
  // app.on(["GET","POST","OPTIONS"], "/api/auth/*", (c) => createAuth(c.env, c.req.raw).handler(c.req.raw))

  app.route("/", healthRoutes);
  app.route("/", projectsRoutes);
  app.route("/", izwaRoutes);
  app.route("/", idiomRoutes);

  app.get("/", (c) => c.text("IzwaAI API — OK"));

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
