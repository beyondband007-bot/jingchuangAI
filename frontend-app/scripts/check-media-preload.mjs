import fs from "node:fs";
import path from "node:path";

const projectRoot = path.resolve(import.meta.dirname, "..");
const sourceRoot = path.join(projectRoot, "src");
const sourceExtensions = new Set([".js", ".jsx"]);
const failures = [];

function walk(directory, files = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const filePath = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(filePath, files);
    else if (sourceExtensions.has(path.extname(entry.name))) files.push(filePath);
  }
  return files;
}

function lineAt(source, index) {
  return source.slice(0, index).split(/\r\n|\r|\n/).length;
}

for (const filePath of walk(sourceRoot)) {
  const source = fs.readFileSync(filePath, "utf8");
  const relativePath = path.relative(projectRoot, filePath);
  const mediaTags = source.matchAll(/<(video|audio)\b[^>]*>/gs);

  for (const match of mediaTags) {
    const tag = match[0];
    if (/\bautoPlay\b/.test(tag) || /\bpreload\s*=/.test(tag)) continue;
    failures.push(
      `${relativePath}:${lineAt(source, match.index)} renders <${match[1]}> without preload; use metadata or none unless playback must start immediately.`,
    );
  }
}

if (failures.length) {
  console.error("Media preload check failed:\n- " + failures.join("\n- "));
  process.exit(1);
}

console.log("Media preload check passed (all non-autoplay media declares a loading strategy).");
