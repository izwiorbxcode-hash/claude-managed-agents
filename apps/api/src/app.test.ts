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
  it("GET / identifies the Izwa learned-data API", async () => {
    const res = await app.request("/", {}, {} as unknown as Env);
    expect(res.status).toBe(200);
    const text: string = await res.text();
    expect(text).toContain("learned data infrastructure");
  });

  it("GET /api/health returns json with requestId header", async () => {
    const res = await app.request("/api/health");
    expect(res.status).toBe(200);
    const json = (await res.json()) as HealthJson;
    expect(json.success).toBe(true);
    expect(json.status).toBe("ok");
    expect(res.headers.get("x-request-id")).toBeTruthy();
  });

  it("GET /api/izwa exposes the Nguni-first API direction", async () => {
    const res = await app.request("/api/izwa");
    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      data: {
        focus: { languageFamily: string; languages: string[] };
        routes: Record<string, string>;
      };
      success: boolean;
    };
    expect(json.success).toBe(true);
    expect(json.data.focus.languageFamily).toBe("Nguni");
    expect(json.data.focus.languages).toEqual(["ss", "zu", "xh", "nr"]);
    expect(json.data.routes.capabilities).toBe("/api/izwa/capabilities");
  });

  it("GET /api/izwa/languages defaults to focus and labels research scope", async () => {
    const focused = await app.request("/api/izwa/languages");
    expect(focused.status).toBe(200);
    const focusJson = (await focused.json()) as {
      data: Array<{ branch: string }>;
      scope: string;
    };
    expect(focusJson.scope).toBe("focus");
    expect(focusJson.data).toHaveLength(4);
    expect(focusJson.data.every((language) => language.branch === "Nguni")).toBe(
      true
    );

    const research = await app.request("/api/izwa/languages?scope=research");
    expect(research.status).toBe(200);
    const researchJson = (await research.json()) as {
      data: unknown[];
      scope: string;
    };
    expect(researchJson.scope).toBe("research");
    expect(researchJson.data.length).toBeGreaterThan(4);
  });

  it("GET /api/izwa/capabilities separates foundations and proposed offers", async () => {
    const res = await app.request("/api/izwa/capabilities");
    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      data: Array<{ id: string; maturity: string }>;
    };
    expect(json.data).toContainEqual(
      expect.objectContaining({
        id: "dataset_licensing",
        maturity: "foundation",
      })
    );
    expect(json.data).toContainEqual(
      expect.objectContaining({ id: "hosted_api", maturity: "proposed" })
    );
  });

  it("GET /api/openapi.json documents the direction and product foundations", async () => {
    const res = await app.request("/api/openapi.json");
    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      info: { title: string };
      openapi: string;
      paths: Record<string, unknown>;
    };
    expect(json.openapi).toBe("3.1.0");
    expect(json.info.title).toBe("Izwa API");
    expect(json.paths).toHaveProperty("/api/izwa/direction");
    expect(json.paths).toHaveProperty("/api/izwa/datasets/{datasetId}/versions");
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
