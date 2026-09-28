import { Hono } from "hono";
import type { Env, Variables } from "../env.js";

export const healthRoutes = new Hono<{ Bindings: Env; Variables: Variables }>()
  .get("/health", (c) =>
    c.json({
      requestId: c.get("requestId"),
      status: "ok",
      success: true,
      timestamp: new Date().toISOString(),
    })
  )
  .get("/api/health", (c) =>
    c.json({
      requestId: c.get("requestId"),
      status: "ok",
      success: true,
      timestamp: new Date().toISOString(),
    })
  );
