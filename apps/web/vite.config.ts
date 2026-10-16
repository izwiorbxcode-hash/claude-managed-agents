import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const repositoryRoot = path.resolve(import.meta.dirname, "../..");

export default defineConfig({
  build: {
    emptyOutDir: true,
    outDir: "dist",
    sourcemap: true,
  },
  plugins: [react()],
  publicDir: "static",
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src/src"),
    },
  },
  server: {
    fs: {
      allow: [repositoryRoot],
    },
    port: 5173,
    proxy: {
      "/api": "http://localhost:8787",
      "/webhooks": "http://localhost:8787",
      "/ws": {
        target: "ws://localhost:8787",
        ws: true,
      },
    },
  },
});
