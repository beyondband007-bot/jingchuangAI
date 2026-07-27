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
const rootEnvPath = resolve(process.cwd(), "../.env");
const devPort =
  Number(process.env.FRONTEND_DEV_PORT || 0) ||
  readPortFromEnvFile(rootEnvPath, "FRONTEND_DEV_PORT");

export default defineConfig({
  plugins: [react(), mediaProxyPlugin()],
  build: {
    // 临时关闭清空输出目录，因为旧 CSS 文件被其他进程锁定无法删除。
    // 清理 dist/assets 下的旧文件后可恢复为 true。
    // Hashed assets are immutable in nginx. Clean stale chunks before each build.
    emptyOutDir: true,
    manifest: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          if (id.includes("@arco-design")) return "arco-ui";
          if (id.includes("lucide-react")) return "icons";
          if (
            id.includes("react-markdown") ||
            id.includes("remark-gfm") ||
            id.includes("remark-parse") ||
            id.includes("remark-rehype") ||
            id.includes("unified") ||
            id.includes("micromark") ||
            id.includes("mdast-") ||
            id.includes("hast-") ||
            id.includes("vfile")
          ) {
            return "markdown-renderer";
          }
          if (
            id.includes(`${"node_modules"}/react/`) ||
            id.includes(`${"node_modules"}/react-dom/`) ||
            id.includes(`${"node_modules"}/scheduler/`)
          ) {
            return "react-runtime";
          }
          return undefined;
        },
      },
    },
  },
  server: {
    ...(devPort ? { port: devPort, strictPort: true } : {}),
    // Dynamic feature modules are frequently refreshed during HMR. Avoid
    // browser disk-cache 304 failures that can leave a lazy import unavailable.
    headers: {
      "Cache-Control": "no-store",
    },
    proxy: {
      "/canvas-app": {
        target: "http://127.0.0.1:5176",
        changeOrigin: true,
        ws: true
      },
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
