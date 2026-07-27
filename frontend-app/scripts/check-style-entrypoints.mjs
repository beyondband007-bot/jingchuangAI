import fs from "node:fs";
import path from "node:path";

const projectRoot = path.resolve(import.meta.dirname, "..");
const pageEntrypoints = [
  "src/features/article/ArticleGenerationView.jsx",
  "src/features/chat/ChatGenerationView.jsx",
  "src/features/digital-human-v2/DigitalHumanV2View.jsx",
  "src/features/music/MusicGenerationView.jsx",
  "src/features/assets/AssetsPage.jsx",
  "src/features/image/ImageGenerationView.jsx",
  "src/features/face-swap/FaceSwapWorkbench.jsx",
];
const styleImportPattern =
  /^\s*import\s+["'][^"']+\.(?:css|scss)["'];?\s*$/gm;
const violations = [];

for (const relativePath of pageEntrypoints) {
  const filePath = path.join(projectRoot, relativePath);
  const imports = fs.readFileSync(filePath, "utf8").match(styleImportPattern) || [];
  if (imports.length !== 1) {
    violations.push(`${relativePath} must import exactly one feature style entrypoint; found ${imports.length}`);
  }
}

if (violations.length) {
  console.error("Style entrypoint violations:");
  for (const violation of violations) console.error(`- ${violation}`);
  process.exit(1);
}

console.log(`Style entrypoint check passed (${pageEntrypoints.length} high-fan-out pages use one style entrypoint).`);
