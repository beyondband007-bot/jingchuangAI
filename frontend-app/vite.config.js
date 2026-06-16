import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const devProxyTarget =
  process.env.VITE_DEV_PROXY_TARGET || "http://127.0.0.1:8088";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "127.0.0.1",
    strictPort: true,
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
