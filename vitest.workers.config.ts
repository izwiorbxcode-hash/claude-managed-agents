// Separate vitest config for the workerd-backed integration tests. Run
// with: `bunx vitest run --config vitest.workers.config.ts`. The default
// `vitest.config.ts` (node environment) intentionally excludes the
// integration suite, which needs the Workers runtime.
import { defineWorkersConfig } from "@cloudflare/vitest-pool-workers/config";

export default defineWorkersConfig({
  test: {
    include: ["src/refinery/integration.test.ts"],
    poolOptions: {
      workers: {
        singleWorker: true,
        // Share one D1/R2 environment across all tests in this file (the
        // pool defaults to per-test isolated storage, which would erase
        // records between tests and break the end-to-end flow).
        isolatedStorage: false,
        wrangler: { configPath: "./wrangler.test.jsonc" },
      },
    },
  },
});
