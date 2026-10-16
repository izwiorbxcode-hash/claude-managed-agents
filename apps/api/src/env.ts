import type {
  D1Database,
  DurableObjectNamespace,
  Fetcher,
  KVNamespace,
  Queue,
  R2Bucket,
} from "@cloudflare/workers-types";

export interface Env {
  AgentSession?: DurableObjectNamespace;
  AI?: unknown;
  ASSETS?: Fetcher;
  BETTER_AUTH_SECRET?: string;
  BETTER_AUTH_URL?: string;
  CORS_ORIGIN?: string;
  DATABASE: D1Database;
  // Izwa learned-data bindings (phase 2: full refinery mount)
  IZWA_ASSETS?: R2Bucket;
  IZWA_DEV_AUTH?: string;
  IZWA_INDEX?: unknown;
  JEV_ASSESSMENTS?: Queue<import("@unsung/domain").TranscriptAssessmentMessage>;
  JEV_MODEL?: string;
  KV?: KVNamespace;
  PAYSTACK_PUBLIC_KEY?: string;
  PAYSTACK_SECRET_KEY?: string;
  R2_BUCKET?: R2Bucket;
  REVIEW_AUTH_SECRET?: string;
  SpecialistAgent?: DurableObjectNamespace;
  SwarmCoordinator?: DurableObjectNamespace;
  TYPESAFE_API_KEY?: string;
}

export interface Variables {
  requestId: string;
  // Phase 2: session, auth
}

export type { ExecutionContext } from "@cloudflare/workers-types";
