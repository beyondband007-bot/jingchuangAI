import fs from "node:fs";
import path from "node:path";

const projectRoot = path.resolve(import.meta.dirname, "..");
const sourceRoot = path.join(projectRoot, "src");
const styleExtensions = new Set([".css", ".scss"]);
const transitionPattern = /(?:legacy|override|compat(?:ibility)?|temporary)/i;

function walk(directory, files = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const filePath = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(filePath, files);
    else if (styleExtensions.has(path.extname(entry.name))) files.push(filePath);
  }
  return files;
}

const candidates = walk(sourceRoot)
  .map((filePath) => ({
    path: path.relative(projectRoot, filePath).replaceAll(path.sep, "/"),
    bytes: fs.statSync(filePath).size,
    matches: transitionPattern.test(path.basename(filePath)),
  }))
  .filter((entry) => entry.matches)
  .sort((left, right) => left.path.localeCompare(right.path));

console.log("Style transition inventory (report only; no files are changed)");
console.table(
  candidates.map((entry) => ({
    path: entry.path,
    sizeKiB: (entry.bytes / 1024).toFixed(1),
  })),
);
console.log(
  `${candidates.length} transition-named stylesheets. Rename or merge a file only after its import order and visual regression coverage are confirmed.`,
);
