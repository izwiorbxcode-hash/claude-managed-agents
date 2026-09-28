// Worker runtime globals for the Izwa domain kernel.
// The domain never imports infrastructure singletons; Env/D1 types describe
// the control-plane bindings threaded through function params (ADR-008).
// Canonical binding list lives in apps/api/wrangler.jsonc.

import type { D1Database } from "@cloudflare/workers-types";

declare global {
  interface Env {
    DB: D1Database;
    DATABASE?: D1Database;
    // Worker bindings are `any` by design here — the domain threads them
    // through params and the infrastructure layer narrows them (ADR-008).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    AI?: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    IZWA_INDEX?: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    IZWA_ASSETS?: any;
    SwarmCoordinator?: DurableObjectNamespace;
    SpecialistAgent?: DurableObjectNamespace;
    AgentSession?: DurableObjectNamespace;
    [key: string]: unknown;
  }

  // D1Database as a global type (legacy refinery code uses it unimported).
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  type D1Database = import("@cloudflare/workers-types").D1Database;
}

export {};
