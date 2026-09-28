import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "tests/**/*.test.ts"],
    exclude: ["src/refinery/integration.test.ts", "**/node_modules/**", "**/dist/**"],
    globals: false,
  },
});
