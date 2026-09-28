// Full-pipeline integration tests running in workerd via
// @cloudflare/vitest-pool-workers (see vitest.workers.config.ts). Real
// D1 (migrations applied), Vectorize emulation, R2 emulation and the
// actual SwarmCoordinator / SpecialistAgent DO classes — only the AI
// calls are faked (IZWA_MOCK), so the entire
// ingest → profile → route → negotiate → crystallize/escalate → resolve
// → export loop is exercised against the production code paths.

import { beforeAll, describe, expect, it } from "vitest";
import { env, SELF } from "cloudflare:test";
// Vite `?raw` imports inline the SQL at transform time (in Node), so the
// schema never needs to be read from disk inside workerd. The real
// migration files stay the source of truth.
import sql0001 from "../../migrations/0001_init.sql?raw";
import sql0002 from "../../migrations/0002_izwa_refinery.sql?raw";

const BASE = "http://izwa-test";

// miniflare's D1 `exec()` rejects comment-only fragments, so strip `--`
// line comments and run each real statement via prepare().run().
async function applySql(sql: string): Promise<void> {
  const statements = sql
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("--"))
    .join("\n")
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  for (const statement of statements) {
    await env.DB.prepare(statement).run();
  }
}

function body(path: string, data: unknown): Promise<Response> {
  return SELF.fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(data),
  });
}

function get(path: string): Promise<Response> {
  return SELF.fetch(`${BASE}${path}`);
}

describe("izwa refinery end-to-end", () => {
  beforeAll(async () => {
    await applySql(sql0001);
    await applySql(sql0002);
    const res = await body("/api/izwa/seed", {});
    if (res.status !== 200) {
      console.log("[seed] status", res.status, "body", await res.text());
    }
    expect(res.status).toBe(200);
  });

  it("crystallizes a clear Zulu utterance into an auditable record", async () => {
    const res = await body("/api/izwa/ingest", {
      text: "Sawubona umuntu kukhona nje kodwa ngiyakuthanda",
      tenant: "itest",
    });
    expect(res.status).toBe(200);
    const result = (await res.json()) as {
      status: string;
      taskId: string;
      recordId?: string;
      quality?: { overall: number };
    };
    expect(result.status).toBe("crystallized");
    expect(result.recordId).toBeTruthy();
    expect(result.quality?.overall ?? 0).toBeGreaterThanOrEqual(0.78);

    const detail = (await get(`/api/izwa/records/${result.recordId}`).then((r) => r.json())) as {
      record: { verificationStatus: string; payloadJson: string };
      lineage: unknown[];
    };
    expect(detail.record.verificationStatus).toBe("auto");
    expect(detail.lineage.length).toBeGreaterThan(0);
    expect(JSON.parse(detail.record.payloadJson).language).toBe("zulu");

    const taskDetail = (await get(`/api/izwa/tasks/${result.taskId}`).then((r) => r.json())) as {
      proposals: unknown[];
    };
    expect(taskDetail.proposals.length).toBeGreaterThan(0);
  });

  it("escalates ambiguous input to HITL and resolves into a verified record", async () => {
    const res = await body("/api/izwa/ingest", {
      text: "Sawubona? umuntu kukhona nje kodwa?",
      tenant: "itest",
    });
    expect(res.status).toBe(200);
    const result = (await res.json()) as {
      status: string;
      taskId: string;
      escalationId?: string;
    };
    expect(result.status).toBe("escalated");
    expect(result.escalationId).toBeTruthy();

    const queue = (await get("/api/izwa/escalations").then((r) => r.json())) as { items: unknown[] };
    expect(queue.items.length).toBeGreaterThanOrEqual(1);

    const resolveRes = await body("/api/izwa/resolve", {
      taskId: result.taskId,
      escalationId: result.escalationId,
      expertId: "exp_seed_zulu",
      resolutionText: "Sawubona umuntu kukhona nje kodwa ngiyakuthanda.",
      correction: {
        language: "zulu",
        transcription: "Sawubona umuntu kukhona nje kodwa ngiyakuthanda.",
      },
    });
    expect(resolveRes.status).toBe(200);
    const resolved = (await resolveRes.json()) as { status: string; recordId?: string };
    expect(resolved.status).toBe("crystallized");
    expect(resolved.recordId).toBeTruthy();

    const detail = (await get(`/api/izwa/records/${resolved.recordId}`).then((r) => r.json())) as {
      record: { verificationStatus: string; verifiedBy: string | null };
    };
    expect(detail.record.verificationStatus).toBe("human_verified");
    expect(detail.record.verifiedBy).toBe("exp_seed_zulu");
  });

  it("exports crystallized records to R2 as a JSONL dataset with manifest", async () => {
    const res = await body("/api/izwa/export", { tenant: "itest" });
    expect(res.status).toBe(200);
    const result = (await res.json()) as { jsonlKey: string; manifestKey: string; recordCount: number };
    expect(result.recordCount).toBeGreaterThan(0);

    const obj = await env.IZWA_ASSETS.get(result.jsonlKey);
    expect(obj).not.toBeNull();
    const text = await obj!.text();
    expect(text).toContain("record_id");

    const manifest = await env.IZWA_ASSETS.get(result.manifestKey);
    expect(manifest).not.toBeNull();
    const parsed = JSON.parse(await manifest!.text()) as { recordCount: number; fields: string[] };
    expect(parsed.fields).toContain("model_versions");
  });
});
