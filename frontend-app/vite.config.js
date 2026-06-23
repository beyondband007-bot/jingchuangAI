import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { mediaProxyPlugin } from "./viteMediaProxyPlugin.js";

const proxyTarget = process.env.VITE_DEV_PROXY_TARGET || "http://127.0.0.1:3010";

export default defineConfig({
  plugins: [react(), mediaProxyPlugin()],
  build: {
    // 临时关闭清空输出目录，因为旧 CSS 文件被其他进程锁定无法删除。
    // 清理 dist/assets 下的旧文件后可恢复为 true。
    emptyOutDir: false,
  },
  server: {
    proxy: {
      "/api": {
        target: proxyTarget,
        changeOrigin: true
      },
      "/media": {
        target: proxyTarget,
        changeOrigin: true
      }
    }
  }
});
