import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dbCredentials: {
    url:
      process.env.DATABASE_URL ??
      "file:./.wrangler/state/v3/d1/miniflare-D1DatabaseObject/local.sqlite",
  },
  dialect: "sqlite",
  out: "./src/migrations",
  schema: "./src/schema/index.ts",
  strict: true,
  verbose: true,
});
