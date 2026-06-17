import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const devProxyTarget =
  process.env.VITE_DEV_PROXY_TARGET || "http://127.0.0.1:3006";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "127.0.0.1",
    strictPort: true,
    watch: {
      awaitWriteFinish: {
        stabilityThreshold: 300,
        pollInterval: 100
      }
    },
    proxy: {
      "/api": {
        target: devProxyTarget,
        changeOrigin: true
      },
      "/media": {
        target: devProxyTarget,
        changeOrigin: true
      },
      "/health": {
        target: devProxyTarget,
        changeOrigin: true
      }
    }
  }
});
