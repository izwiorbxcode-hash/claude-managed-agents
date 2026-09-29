import type {
  D1Database,
  DurableObjectNamespace,
  ExecutionContext,
  Fetcher,
  KVNamespace,
  R2Bucket,
} from "@cloudflare/workers-types";

export interface Env {
  ASSETS?: Fetcher;
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL: string;
  CORS_ORIGIN?: string;
  DATABASE: D1Database;
  KV?: KVNamespace;
  PAYSTACK_PUBLIC_KEY?: string;
  PAYSTACK_SECRET_KEY?: string;
  REVIEW_AUTH_SECRET?: string;
  IZWA_DEV_AUTH?: string;
  R2_BUCKET?: R2Bucket;
  // Izwa learned-data bindings (phase 2: full refinery mount)
  IZWA_ASSETS?: R2Bucket;
  IZWA_INDEX?: unknown;
  AI?: unknown;
  SwarmCoordinator?: DurableObjectNamespace;
  SpecialistAgent?: DurableObjectNamespace;
  AgentSession?: DurableObjectNamespace;
}

export type Variables = {
  requestId: string;
  // Phase 2: session, auth
};

export type { ExecutionContext };
