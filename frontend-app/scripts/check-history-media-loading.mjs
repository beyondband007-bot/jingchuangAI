import fs from "node:fs";
import path from "node:path";

const projectRoot = path.resolve(import.meta.dirname, "..");
const historyMediaComponents = [
  "src/features/article/ArticleHistoryGrid.jsx",
  "src/features/image/imageSharedUi.jsx",
  "src/features/music/MusicRecentGrid.jsx",
];
const failures = [];

for (const relativePath of historyMediaComponents) {
  const source = fs.readFileSync(path.join(projectRoot, relativePath), "utf8");
  if (!source.includes('loading="lazy"')) {
    failures.push(`${relativePath} must lazy-load history media.`);
  }
  if (!source.includes('decoding="async"')) {
    failures.push(`${relativePath} must decode history images asynchronously.`);
  }
}

if (failures.length) {
  console.error("History media-loading check failed:\n- " + failures.join("\n- "));
  process.exit(1);
}

console.log(`History media-loading check passed (${historyMediaComponents.length} grids protected).`);
