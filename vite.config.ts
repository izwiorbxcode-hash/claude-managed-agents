import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

// Vite builds apps/web into ./public, served by the Worker via static
// assets. The /api/* paths are intercepted by the Worker
// (see apps/api/wrangler.jsonc → assets.run_worker_first).
// TODO(phase-3): move to TanStack Start in apps/web with its own
// vite.config; this root config is the legacy SPA bridge.
export default defineConfig({
  root: path.resolve(__dirname, "apps/web"),
  publicDir: path.resolve(__dirname, "apps/web/static"),
  build: {
    outDir: path.resolve(__dirname, "public"),
    emptyOutDir: true,
    sourcemap: true,
  },
  plugins: [react()],
  server: {
    port: 5173,
    // Markdown docs live at <repo-root>/docs/*.md and are imported into the
    // dashboard via ?raw. Vite's dev server otherwise sandboxes file reads
    // to the project root (frontend/), so explicitly allow the parent.
    fs: {
      allow: [path.resolve(__dirname)],
    },
    proxy: {
      "/api": "http://localhost:8787",
      "/webhooks": "http://localhost:8787",
      "/ws": {
        target: "ws://localhost:8787",
        ws: true,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "apps/web/src"),
    },
  },
});
