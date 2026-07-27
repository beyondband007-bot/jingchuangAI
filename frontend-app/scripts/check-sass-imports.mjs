import fs from "node:fs";
import path from "node:path";

const projectRoot = path.resolve(import.meta.dirname, "..");
const sourceRoot = path.join(projectRoot, "src");
const importPattern = /@import\s+["']([^"']+)["']/g;

function walk(directory, files = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const filePath = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(filePath, files);
    else if (entry.isFile() && path.extname(filePath) === ".scss") files.push(filePath);
  }
  return files;
}

const violations = walk(sourceRoot).flatMap((filePath) => {
  const source = fs.readFileSync(filePath, "utf8");
  return [...source.matchAll(importPattern)]
    .filter((match) => !match[1].endsWith(".css"))
    .map((match) => ({
      file: path.relative(projectRoot, filePath).replaceAll(path.sep, "/"),
      import: match[1],
    }));
});

if (violations.length) {
  console.error("Sass @import is deprecated. Use @use or meta.load-css for local Sass modules:");
  console.table(violations);
  process.exitCode = 1;
} else {
  console.log("Sass import check passed (no local Sass @import declarations).");
}
