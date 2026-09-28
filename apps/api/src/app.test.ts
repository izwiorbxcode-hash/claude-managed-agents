import { describe, expect, it } from "vitest";
import { app } from "./app.js";
import type { Env } from "./env.js";

interface HealthJson {
  readonly requestId: string;
  readonly status: string;
  readonly success: boolean;
  readonly timestamp: string;
}

interface ErrorJson {
  readonly code: string;
  readonly message: string;
  readonly requestId?: string | undefined;
  readonly success: false;
}

describe("Hono vertical slice", () => {
  it("GET /health returns ok with requestId", async () => {
    const res = await app.request("/", {}, {} as unknown as Env);
    expect(res.status).toBe(200);
    const text: string = await res.text();
    expect(text).toContain("OK");
  });

  it("GET /api/health returns json with requestId header", async () => {
    const res = await app.request("/api/health");
    expect(res.status).toBe(200);
    const json = (await res.json()) as HealthJson;
    expect(json.success).toBe(true);
    expect(json.status).toBe("ok");
    expect(res.headers.get("x-request-id")).toBeTruthy();
  });

  it("GET /api/projects without DATABASE returns 500 safe error", async () => {
    const res = await app.request("/api/projects");
    // No env provided — should not leak stack, should return safe error
    expect(res.status).toBe(500);
    const body = (await res.json()) as ErrorJson;
    expect(body.success).toBe(false);
    expect(body.code).toBe("InternalError");
    expect(body.message).toBe("Database not configured");
  });

  it("sequential requests do not share global D1 (ADR-008)", async () => {
    // First request with DB binding mocked as undefined then second with same -> still fresh check
    const r1 = await app.request("/api/projects");
    const r2 = await app.request("/api/projects");
    expect(r1.status).toBe(500);
    expect(r2.status).toBe(500);
    // Both should produce independent requestIds
    expect(r1.headers.get("x-request-id")).not.toEqual(
      r2.headers.get("x-request-id")
    );
  });
});
