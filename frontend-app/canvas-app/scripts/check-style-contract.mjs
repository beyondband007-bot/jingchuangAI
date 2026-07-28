import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const read = (relativePath) => readFileSync(resolve(root, relativePath), "utf8");
const assertions = [];

function assert(condition, message) {
  if (!condition) assertions.push(message);
}

const baseStyles = read("src/style.css");
const appHeader = read("src/components/AppHeader.vue");
const viteConfig = read("vite.config.js");
const canvasView = read("src/views/Canvas.vue");
const homeView = read("src/views/Home.vue");

assert(
  baseStyles.includes('@import "../../src/styles/tokens.css"'),
  "Canvas must import the shared main-app token source.",
);
assert(!/--accent-color:\s*#(?:22c55e|4ade80)/i.test(baseStyles), "Canvas must not restore the green default accent.");
assert(baseStyles.includes("@media (prefers-reduced-motion: reduce)"), "Canvas must protect reduced-motion users.");
assert(appHeader.includes("stores/theme"), "Canvas must expose its canvas-only theme toggle.");
assert(existsSync(resolve(root, "src/stores/theme.js")), "Canvas must retain its canvas-only theme store.");
assert(viteConfig.includes("manualChunks"), "Canvas production build must keep vendor chunks split.");
assert(canvasView.includes('aria-label="画布工具"'), "Canvas toolbar needs an accessible name.");
assert(canvasView.includes('role="status"'), "Canvas must announce save or generation state.");
assert(canvasView.includes('data-tooltip--left'), "Canvas toolbar tooltips must open toward the left.");
assert(!canvasView.includes(':title="tool.name"'), "Canvas toolbar must use the shared tooltip instead of native title attributes.");
assert(canvasView.includes(':disabled="isProcessing || !chatInput.trim()"'), "Canvas send action must be disabled for empty input.");
assert(homeView.includes(':disabled="!inputText.trim()"'), "Home create action must be disabled for empty input.");

if (assertions.length) {
  console.error("Canvas style contract failed:");
  for (const message of assertions) console.error(`- ${message}`);
  process.exit(1);
}

console.log("Canvas style contract passed (shared tokens, accessibility, motion, and bundle boundaries are protected).");
