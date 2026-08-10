import fs from "node:fs";
import path from "node:path";
import { gzipSync } from "node:zlib";

const projectRoot = path.resolve(import.meta.dirname, "..");
const outputRoot = path.join(projectRoot, "dist");
const manifestPath = path.join(outputRoot, ".vite", "manifest.json");
const maxInitialJavaScriptBytes = 200 * 1024;
const maxInitialCssBytes = 25 * 1024;
const maxInitialGzipJavaScriptBytes = 68 * 1024;
const maxInitialGzipCssBytes = 6 * 1024;

if (!fs.existsSync(manifestPath)) {
  console.error("Missing Vite manifest. Run `vite build` before checking bundles.");
  process.exit(1);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const entryKey =
  manifest["src/main.jsx"]
    ? "src/main.jsx"
    : Object.entries(manifest).find(([, item]) => item.isEntry)?.[0];
const entry = entryKey ? manifest[entryKey] : null;

if (!entry?.file) {
  console.error("No application entry was found in the Vite manifest.");
  process.exit(1);
}

function fileSize(relativePath) {
  const filePath = path.join(outputRoot, relativePath);
  return fs.existsSync(filePath) ? fs.statSync(filePath).size : 0;
}

function gzipFileSize(relativePath) {
  const filePath = path.join(outputRoot, relativePath);
  return fs.existsSync(filePath) ? gzipSync(fs.readFileSync(filePath)).length : 0;
}

const visitedChunks = new Set();
const initialJavaScriptFiles = new Set();
const initialCssFiles = new Set();

function collectInitialFiles(chunkKey) {
  if (!chunkKey || visitedChunks.has(chunkKey)) return;
  visitedChunks.add(chunkKey);
  const chunk = manifest[chunkKey];
  if (!chunk) return;
  if (chunk.file) initialJavaScriptFiles.add(chunk.file);
  for (const cssFile of chunk.css || []) initialCssFiles.add(cssFile);
  for (const importedChunk of chunk.imports || []) collectInitialFiles(importedChunk);
}

collectInitialFiles(entryKey);
const initialJavaScriptBytes = [...initialJavaScriptFiles].reduce(
  (total, relativePath) => total + fileSize(relativePath),
  0,
);
const initialCssBytes = [...initialCssFiles].reduce(
  (total, relativePath) => total + fileSize(relativePath),
  0,
);
const initialGzipJavaScriptBytes = [...initialJavaScriptFiles].reduce(
  (total, relativePath) => total + gzipFileSize(relativePath),
  0,
);
const initialGzipCssBytes = [...initialCssFiles].reduce(
  (total, relativePath) => total + gzipFileSize(relativePath),
  0,
);
const violations = [];

if (initialJavaScriptBytes > maxInitialJavaScriptBytes) {
  violations.push(
    `initial JavaScript is ${initialJavaScriptBytes} B (limit ${maxInitialJavaScriptBytes} B)`,
  );
}
if (initialCssBytes > maxInitialCssBytes) {
  violations.push(
    `initial CSS is ${initialCssBytes} B (limit ${maxInitialCssBytes} B)`,
  );
}
if (initialGzipJavaScriptBytes > maxInitialGzipJavaScriptBytes) {
  violations.push(
    `initial gzip JavaScript is ${initialGzipJavaScriptBytes} B (limit ${maxInitialGzipJavaScriptBytes} B)`,
  );
}
if (initialGzipCssBytes > maxInitialGzipCssBytes) {
  violations.push(
    `initial gzip CSS is ${initialGzipCssBytes} B (limit ${maxInitialGzipCssBytes} B)`,
  );
}

if (violations.length) {
  console.error("Initial bundle budget violations:");
  for (const violation of violations) console.error(`- ${violation}`);
  process.exit(1);
}

console.log(
  `Initial bundle budget passed (${initialJavaScriptBytes} B JS, ${initialCssBytes} B CSS; ${initialGzipJavaScriptBytes} B gzip JS, ${initialGzipCssBytes} B gzip CSS).`,
);
