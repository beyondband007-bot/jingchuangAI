import fs from "node:fs";
import path from "node:path";

const projectRoot = path.resolve(import.meta.dirname, "..");
const publicRoot = path.join(projectRoot, "public");
const warningLimitBytes = 1024 * 1024 * 1024;
const mediaExtensions = new Set([".mp4", ".webm", ".mov", ".m4v"]);

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const filePath = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(filePath) : [filePath];
  });
}

const files = fs.existsSync(publicRoot) ? walk(publicRoot) : [];
const assets = files.map((filePath) => ({
  path: path.relative(projectRoot, filePath),
  bytes: fs.statSync(filePath).size,
  isVideo: mediaExtensions.has(path.extname(filePath).toLowerCase()),
}));
const totalBytes = assets.reduce((sum, asset) => sum + asset.bytes, 0);
const videoBytes = assets
  .filter((asset) => asset.isVideo)
  .reduce((sum, asset) => sum + asset.bytes, 0);
const toMegabytes = (bytes) => (bytes / 1024 / 1024).toFixed(1);

console.log(
  `Static asset inventory: ${assets.length} files, ${toMegabytes(totalBytes)} MiB total; ${toMegabytes(videoBytes)} MiB video.`,
);

if (totalBytes > warningLimitBytes) {
  const message =
    "Static assets exceed 1 GiB. CDN migration is deferred; this check only reports size and never moves or deletes media.";
  if (process.env.STATIC_ASSET_BUDGET_STRICT === "1") {
    console.error(message);
    process.exit(1);
  }
  console.warn(`Warning: ${message}`);
}
