import type { TranscriptAssessmentMessage } from "@unsung/domain";
import { app } from "./app.js";
import type { Env, ExecutionContext } from "./env.js";
import {
  assessTranscript,
  recordAssessmentFailure,
} from "./jobs/assess-transcript.js";

/**
 * Cloudflare Worker entry.
 * Note: no global D1, no global `createAuth` — all request-scoped via `c.env` (ADR-008).
 */
export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    return await app.fetch(request, env, ctx);
  },
  async queue(
    batch: MessageBatch<TranscriptAssessmentMessage>,
    env: Env
  ): Promise<void> {
    await Promise.all(
      batch.messages.map(async (message) => {
        try {
          await assessTranscript(env, message.body);
          message.ack();
        } catch (error) {
          const retryable = await recordAssessmentFailure(
            env,
            message.body.jobKey,
            error
          );
          if (retryable) {
            message.retry({ delaySeconds: 30 });
          } else {
            message.ack();
          }
        }
      })
    );
  },
} satisfies ExportedHandler<Env, TranscriptAssessmentMessage>;
