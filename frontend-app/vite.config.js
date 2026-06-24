import react from "@vitejs/plugin-react";
import { existsSync, readFileSync } from "fs";
import { resolve } from "path";
import { defineConfig } from "vite";
import { mediaProxyPlugin } from "./viteMediaProxyPlugin.js";

function readPortFromEnvFile(filePath) {
  if (!existsSync(filePath)) return null;
  const match = readFileSync(filePath, "utf8").match(/^PORT=(\d+)\s*$/m);
  return match ? Number(match[1]) : null;
}

function resolveDevProxyTarget() {
  if (process.env.VITE_DEV_PROXY_TARGET?.trim()) {
    return process.env.VITE_DEV_PROXY_TARGET.trim();
  }

  const port =
    readPortFromEnvFile(resolve(process.cwd(), "../backend/.env")) ||
    readPortFromEnvFile(resolve(process.cwd(), "../.env")) ||
    Number(process.env.PORT || 0) ||
    3006;

  return `http://127.0.0.1:${port}`;
}

const proxyTarget = resolveDevProxyTarget();

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
