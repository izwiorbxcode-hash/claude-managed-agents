import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const repositoryRoot = path.resolve(__dirname, "../..");

export default defineConfig({
  publicDir: "static",
  build: {
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: true,
  },
  plugins: [react()],
  server: {
    port: 5173,
    fs: {
      allow: [repositoryRoot],
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
      "@": path.resolve(__dirname, "src/src"),
    },
  },
});
