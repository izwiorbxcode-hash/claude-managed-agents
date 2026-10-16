import {
  TRANSCRIPT_ASSESSMENT_RUBRIC_VERSION,
  TRANSCRIPT_ASSESSMENT_TASK,
  type TranscriptAssessmentMessage,
  transcriptAssessmentJobKey,
} from "@unsung/domain";
import { Hono } from "hono";
import type { Env, Variables } from "../env.js";
import { DEFAULT_JEV_MODEL } from "../jobs/assess-transcript.js";

type JsonObject = Record<string, unknown>;

function objectBody(value: unknown): JsonObject | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonObject)
    : null;
}

function optionalString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export const annotationRoutes = new Hono<{
  Bindings: Env;
  Variables: Variables;
}>()
  .post("/api/izwa/assets/:assetId/passages", async (c) => {
    if (!c.env.JEV_ASSESSMENTS) {
      return c.json(
        {
          error: "assessment queue is not configured",
          success: false as const,
        },
        503
      );
    }
    const body = objectBody(await c.req.json().catch(() => null));
    const startMs = body?.startMs;
    const endMs = body?.endMs;
    const machineTranscript = optionalString(body?.machineTranscript);
    if (
      typeof startMs !== "number" ||
      !Number.isInteger(startMs) ||
      startMs < 0 ||
      typeof endMs !== "number" ||
      !Number.isInteger(endMs) ||
      endMs <= startMs ||
      !machineTranscript
    ) {
      return c.json(
        {
          error:
            "startMs, endMs, and machineTranscript are required; timestamps must be valid integers",
          success: false as const,
        },
        422
      );
    }

    const assetId = c.req.param("assetId");
    const asset = await c.env.DATABASE.prepare(
      "SELECT asset_id, tenant FROM izwa_assets WHERE asset_id=?1"
    )
      .bind(assetId)
      .first<{ asset_id: string; tenant: string }>();
    if (!asset) {
      return c.json(
        { error: "source asset not found", success: false as const },
        404
      );
    }

    const passageId = `passage_${crypto.randomUUID()}`;
    const revisionId = `passage_revision_${crypto.randomUUID()}`;
    const modelRunId = `model_run_${crypto.randomUUID()}`;
    const requestedModel = c.env.JEV_MODEL?.trim() || DEFAULT_JEV_MODEL;
    const jobKey = transcriptAssessmentJobKey(revisionId, requestedModel);
    const now = Date.now();
    await c.env.DATABASE.batch([
      c.env.DATABASE.prepare(
        `INSERT INTO izwa_passages
          (passage_id, asset_id, tenant, start_ms, end_ms, context_before,
           context_after, current_revision_id, created_at_ms, updated_at_ms)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?9)`
      ).bind(
        passageId,
        assetId,
        asset.tenant,
        startMs,
        endMs,
        optionalString(body?.contextBefore),
        optionalString(body?.contextAfter),
        revisionId,
        now
      ),
      c.env.DATABASE.prepare(
        `INSERT INTO izwa_passage_revisions
          (passage_revision_id, passage_id, revision_number, machine_transcript,
           contributor_id, revision_reason, created_at_ms)
         VALUES (?1, ?2, 1, ?3, ?4, 'machine_transcript_created', ?5)`
      ).bind(
        revisionId,
        passageId,
        machineTranscript,
        c.req.header("x-user-id")?.trim() || null,
        now
      ),
      c.env.DATABASE.prepare(
        `INSERT INTO izwa_model_runs
          (model_run_id, job_key, passage_id, passage_revision_id, provider,
           task, requested_model, rubric_version, status, created_at_ms)
         VALUES (?1, ?2, ?3, ?4, 'typesafe', ?5, ?6, ?7, 'queued', ?8)`
      ).bind(
        modelRunId,
        jobKey,
        passageId,
        revisionId,
        TRANSCRIPT_ASSESSMENT_TASK,
        requestedModel,
        TRANSCRIPT_ASSESSMENT_RUBRIC_VERSION,
        now
      ),
    ]);

    const message: TranscriptAssessmentMessage = {
      jobKey,
      passageId,
      passageRevisionId: revisionId,
      rubricVersion: TRANSCRIPT_ASSESSMENT_RUBRIC_VERSION,
      task: TRANSCRIPT_ASSESSMENT_TASK,
    };
    try {
      await c.env.JEV_ASSESSMENTS.send(message);
    } catch {
      await c.env.DATABASE.prepare(
        `UPDATE izwa_model_runs
            SET status='retry_pending', error_code='queue_publish_failed',
                error_detail='The assessment message could not be published.'
          WHERE job_key=?1`
      )
        .bind(jobKey)
        .run();
      return c.json(
        {
          data: { modelRunId, passageId, passageRevisionId: revisionId },
          error: "passage was saved but assessment dispatch must be retried",
          success: false as const,
        },
        503
      );
    }
    return c.json(
      {
        data: { modelRunId, passageId, passageRevisionId: revisionId },
        success: true as const,
      },
      202
    );
  })
  .get("/api/izwa/passages/:passageId/model-runs", async (c) => {
    const result = await c.env.DATABASE.prepare(
      `SELECT mr.model_run_id, mr.job_key, mr.passage_revision_id, mr.provider,
              mr.task, mr.requested_model, mr.resolved_model, mr.rubric_version,
              mr.status, mr.probabilities_json, mr.proposed_labels_json,
              mr.usage_json, mr.error_code, mr.error_detail, mr.attempt_count,
              mr.created_at_ms, mr.completed_at_ms,
              CASE WHEN p.current_revision_id = mr.passage_revision_id THEN 1 ELSE 0 END AS is_current_revision
         FROM izwa_model_runs mr
         JOIN izwa_passages p ON p.passage_id = mr.passage_id
        WHERE mr.passage_id=?1
        ORDER BY mr.created_at_ms DESC`
    )
      .bind(c.req.param("passageId"))
      .all();
    return c.json({ data: result.results ?? [], success: true as const });
  });
