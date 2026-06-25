import react from "@vitejs/plugin-react";
import { existsSync, readFileSync } from "fs";
import { resolve } from "path";
import { defineConfig } from "vite";
import { mediaProxyPlugin } from "./viteMediaProxyPlugin.js";

function readEnvValue(filePath, key) {
  if (!existsSync(filePath)) return null;
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = readFileSync(filePath, "utf8").match(new RegExp(`^${escapedKey}=(.*)\\s*$`, "m"));
  return match ? match[1].trim() : null;
}

function readPortFromEnvFile(filePath, key) {
  const value = readEnvValue(filePath, key);
  return value && /^\d+$/.test(value) ? Number(value) : null;
}

function resolveDevProxyTarget() {
  if (process.env.VITE_DEV_PROXY_TARGET?.trim()) {
    return process.env.VITE_DEV_PROXY_TARGET.trim();
  }

  const rootEnvPath = resolve(process.cwd(), "../.env");
  const rootProxyTarget = readEnvValue(rootEnvPath, "VITE_DEV_PROXY_TARGET");
  if (rootProxyTarget) return rootProxyTarget;

  const port =
    readPortFromEnvFile(rootEnvPath, "BACKEND_DEV_PORT") ||
    Number(process.env.BACKEND_DEV_PORT || 0) ||
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
