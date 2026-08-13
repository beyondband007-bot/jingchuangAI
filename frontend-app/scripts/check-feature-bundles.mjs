import fs from "node:fs";
import path from "node:path";
import { gzipSync } from "node:zlib";

const projectRoot = path.resolve(import.meta.dirname, "..");
const outputRoot = path.join(projectRoot, "dist");
const manifestPath = path.join(outputRoot, ".vite", "manifest.json");

const budgets = [
  { name: "article", source: "src/features/article/ArticleGenerationView.jsx", js: 80, css: 180 },
  { name: "chat", source: "src/features/chat/ChatGenerationView.jsx", js: 30, css: 60 },
  // The video entry intentionally shares generation, inspiration and media-stage CSS.
  // Keep a budget here rather than forcing those shared rules into duplicate chunks.
  { name: "video", source: "src/features/video/VideoGenerationView.jsx", js: 50, css: 48 },
  { name: "workbench shell", filePrefix: "ImageFeaturePage-", js: 52, css: 210 },
  { name: "inspiration catalog", source: "src/data/faceminiData.js", js: 270, css: 0 },
  { name: "Arco UI shared chunk", filePrefix: "arco-ui-", js: 270, css: 0 },
  { name: "Markdown renderer", filePrefix: "markdown-renderer-", js: 160, css: 0 },
];

if (!fs.existsSync(manifestPath)) {
  console.error("Missing Vite manifest. Run `vite build` before checking feature bundles.");
  process.exit(1);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const fileSize = (relativePath) =>
  fs.statSync(path.join(outputRoot, relativePath)).size;
const gzipSize = (relativePath) =>
  gzipSync(fs.readFileSync(path.join(outputRoot, relativePath))).length;
const toKilobytes = (bytes) => (bytes / 1024).toFixed(1);

function findChunk(budget) {
  if (budget.source && manifest[budget.source]) return manifest[budget.source];
  if (budget.filePrefix) {
    return Object.values(manifest).find((chunk) =>
      path.basename(chunk.file || "").startsWith(budget.filePrefix) &&
      chunk.file.endsWith(".js"),
    );
  }
  return null;
}

const violations = [];
for (const budget of budgets) {
  const chunk = findChunk(budget);
  if (!chunk?.file) {
    violations.push(`${budget.name}: chunk not found in manifest`);
    continue;
  }

  const jsBytes = fileSize(chunk.file);
  const cssBytes = (chunk.css || []).reduce((sum, file) => sum + fileSize(file), 0);
  const jsLimit = budget.js * 1024;
  const cssLimit = budget.css * 1024;
  console.log(
    `${budget.name}: ${toKilobytes(jsBytes)} KiB JS (${toKilobytes(gzipSize(chunk.file))} KiB gzip), ${toKilobytes(cssBytes)} KiB CSS.`,
  );
  if (jsBytes > jsLimit) violations.push(`${budget.name}: JS exceeds ${budget.js} KiB`);
  if (cssBytes > cssLimit) violations.push(`${budget.name}: CSS exceeds ${budget.css} KiB`);
}

if (violations.length) {
  console.error("Feature bundle budget violations:");
  violations.forEach((violation) => console.error(`- ${violation}`));
  process.exit(1);
}
