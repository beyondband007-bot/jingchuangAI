import fs from "node:fs";
import path from "node:path";

const projectRoot = path.resolve(import.meta.dirname, "..");
const sourceRoot = path.join(projectRoot, "src");
const styleExtensions = new Set([".css", ".scss"]);
const sourceExtensions = new Set([".js", ".jsx"]);

function walk(directory, extensions, files = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const filePath = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(filePath, extensions, files);
    else if (extensions.has(path.extname(entry.name))) files.push(filePath);
  }
  return files;
}

const sourceText = walk(sourceRoot, sourceExtensions)
  .map((filePath) => fs.readFileSync(filePath, "utf8"))
  .join("\n");
const candidatesByFile = [];

for (const filePath of walk(sourceRoot, styleExtensions)) {
  const stylesheet = fs.readFileSync(filePath, "utf8");
  const classNames = new Set(
    [...stylesheet.matchAll(/\.([_a-zA-Z][\w-]*)/g)].map((match) => match[1]),
  );
  const candidates = [...classNames]
    .filter((className) => !sourceText.includes(className))
    .sort();

  if (candidates.length) {
    candidatesByFile.push({
      file: path.relative(projectRoot, filePath).replaceAll(path.sep, "/"),
      candidates,
    });
  }
}

const candidateCount = candidatesByFile.reduce(
  (sum, item) => sum + item.candidates.length,
  0,
);

console.log(
  `CSS selector audit found ${candidateCount} candidate classes across ${candidatesByFile.length} stylesheets.`,
);
for (const { file, candidates } of candidatesByFile) {
  console.log(`\n${file}`);
  console.log(candidates.join(", "));
}
