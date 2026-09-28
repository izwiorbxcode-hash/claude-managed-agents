// Ambient types for the workerd-backed integration suite
// (src/refinery/integration.test.ts). It imports `cloudflare:test` and
// `?raw` SQL modules, neither of which resolve in the plain Node tsconfig.

/// <reference types="@cloudflare/vitest-pool-workers" />

declare module "cloudflare:test" {
  interface ProvidedEnv extends Env {}
}

declare module "*.sql?raw" {
  const sql: string;
  export default sql;
}
