import fs from "node:fs";
import path from "node:path";

const projectRoot = path.resolve(import.meta.dirname, "..");
const workspaceRoot = path.resolve(projectRoot, "..");
const assetsRoot = path.join(projectRoot, "public", "assets");
const sourceRoots = [
  path.join(projectRoot, "src"),
  path.join(projectRoot, "public"),
  path.join(workspaceRoot, "backend", "src"),
];
const sourceExtensions = new Set([".js", ".jsx", ".css", ".scss", ".html", ".json"]);
const assetExtensions = new Set([
  ".avif",
  ".gif",
  ".jpeg",
  ".jpg",
  ".mp4",
  ".png",
  ".svg",
  ".webm",
  ".webp",
]);

function walk(directory, predicate, files = []) {
  if (!fs.existsSync(directory)) return files;
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const filePath = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(filePath, predicate, files);
    else if (entry.isFile() && predicate(filePath)) files.push(filePath);
  }
  return files;
}

const source = sourceRoots
  .flatMap((root) => walk(root, (filePath) => sourceExtensions.has(path.extname(filePath))))
  .map((filePath) => fs.readFileSync(filePath, "utf8"))
  .join("\n");
const dynamicAssetRoots = [
  ...source.matchAll(/assets\/([a-zA-Z0-9_-]+)\//g),
].map((match) => `/assets/${match[1]}/`);
const uniqueDynamicAssetRoots = [...new Set(dynamicAssetRoots)];
const assets = walk(assetsRoot, (filePath) => assetExtensions.has(path.extname(filePath)));

function countOccurrences(haystack, needle) {
  if (!needle) return 0;
  let count = 0;
  let offset = 0;
  while (true) {
    const index = haystack.indexOf(needle, offset);
    if (index < 0) return count;
    count += 1;
    offset = index + needle.length;
  }
}

const candidates = assets.map((filePath) => {
  const publicPath = `/${path.relative(path.join(projectRoot, "public"), filePath).replaceAll(path.sep, "/")}`;
  const stats = fs.statSync(filePath);
  const referenceCount = countOccurrences(source, publicPath);
  const directlyReferenced = referenceCount > 0;
  const dynamicRoot = uniqueDynamicAssetRoots.find((root) => publicPath.startsWith(root));
  return {
    path: publicPath,
    extension: path.extname(filePath).toLowerCase(),
    bytes: stats.size,
    lastModified: stats.mtime.toISOString(),
    referenceCount,
    referenceType: directlyReferenced
      ? "direct"
      : dynamicRoot
        ? "dynamic"
        : "unreferenced",
  };
});
const totals = candidates.reduce(
  (summary, asset) => {
    summary.files += 1;
    summary.bytes += asset.bytes;
    if (asset.referenceType === "direct") {
      summary.directFiles += 1;
      summary.directBytes += asset.bytes;
    } else if (asset.referenceType === "dynamic") {
      summary.dynamicFiles += 1;
      summary.dynamicBytes += asset.bytes;
    } else {
      summary.unreferencedFiles += 1;
      summary.unreferencedBytes += asset.bytes;
    }
    return summary;
  },
  {
    files: 0,
    bytes: 0,
    directFiles: 0,
    directBytes: 0,
    dynamicFiles: 0,
    dynamicBytes: 0,
    unreferencedFiles: 0,
    unreferencedBytes: 0,
  },
);
const toMiB = (bytes) => `${(bytes / 1024 / 1024).toFixed(1)} MiB`;
const byExtension = [...candidates.reduce((groups, asset) => {
  const group = groups.get(asset.extension) || {
    extension: asset.extension,
    files: 0,
    bytes: 0,
    directReferences: 0,
  };
  group.files += 1;
  group.bytes += asset.bytes;
  group.directReferences += asset.referenceCount;
  groups.set(asset.extension, group);
  return groups;
}, new Map()).values()]
  .sort((left, right) => right.bytes - left.bytes)
  .map((group) => ({
    extension: group.extension,
    files: group.files,
    total: toMiB(group.bytes),
    directReferences: group.directReferences,
  }));

const videoFormatGroups = [...candidates
  .filter((asset) => asset.extension === ".webm" || asset.extension === ".mp4")
  .reduce((groups, asset) => {
    const stem = asset.path.slice(0, -asset.extension.length);
    const group = groups.get(stem) || { stem, webm: null, mp4: null };
    group[asset.extension.slice(1)] = asset;
    groups.set(stem, group);
    return groups;
  }, new Map()).values()];
const webmMp4Pairs = videoFormatGroups.filter((group) => group.webm && group.mp4);
const webmOnlyVideos = videoFormatGroups.filter((group) => group.webm && !group.mp4);
const mp4OnlyVideos = videoFormatGroups.filter((group) => group.mp4 && !group.webm);

console.log("Static asset source-reference audit (report only)");
console.table([
  {
    files: totals.files,
    total: toMiB(totals.bytes),
    directFiles: totals.directFiles,
    direct: toMiB(totals.directBytes),
    dynamicDirectoryFiles: totals.dynamicFiles,
    dynamicDirectory: toMiB(totals.dynamicBytes),
    sourceUnreferencedFiles: totals.unreferencedFiles,
    sourceUnreferenced: toMiB(totals.unreferencedBytes),
  },
]);
console.log(
  "Dynamic asset roots (directory-level references; inspect before deletion):",
  uniqueDynamicAssetRoots.join(", ") || "none",
);
console.log("Static asset inventory by file type");
console.table(byExtension);
console.log("WebM/MP4 inventory (report only; current delivery remains direct static loading)");
console.table([
  {
    webmPrimaryWithMp4Fallback: webmMp4Pairs.length,
    webmOnly: webmOnlyVideos.length,
    mp4Only: mp4OnlyVideos.length,
  },
]);
console.log("Same-stem WebM primary / MP4 fallback pairs (future OSS migration candidates)");
console.table(
  webmMp4Pairs.slice(0, 25).map((group) => ({
    stem: group.stem,
    webm: toMiB(group.webm.bytes),
    mp4: toMiB(group.mp4.bytes),
    total: toMiB(group.webm.bytes + group.mp4.bytes),
  })),
);
console.log("Largest source-unreferenced candidates (backend and deployment references must still be checked before deletion)");
console.table(
  candidates
    .filter((asset) => asset.referenceType === "unreferenced")
    .sort((left, right) => right.bytes - left.bytes)
    .slice(0, 25)
    .map((asset) => ({
      path: asset.path,
      type: asset.extension,
      size: toMiB(asset.bytes),
      lastModified: asset.lastModified,
    })),
);
