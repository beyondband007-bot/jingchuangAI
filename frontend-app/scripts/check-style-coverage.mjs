import fs from "node:fs";
import path from "node:path";

const projectRoot = path.resolve(import.meta.dirname, "..");
const sourceRoot = path.join(projectRoot, "src");
const entryPath = path.join(sourceRoot, "main.jsx");
const styleExtensions = new Set([".css", ".scss"]);
const sourceExtensions = new Set([".js", ".jsx", ".css", ".scss"]);
const violations = [];

function walk(directory, files = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const filePath = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(filePath, files);
    else if (entry.isFile() && sourceExtensions.has(path.extname(entry.name))) {
      files.push(filePath);
    }
  }
  return files;
}

function resolveImport(fromFile, specifier) {
  if (!specifier.startsWith(".")) return null;
  const candidate = path.resolve(path.dirname(fromFile), specifier);
  const extensions = ["", ".css", ".scss", ".js", ".jsx"];
  for (const extension of extensions) {
    const resolved = `${candidate}${extension}`;
    if (fs.existsSync(resolved) && fs.statSync(resolved).isFile()) return resolved;
  }
  return null;
}

const files = walk(sourceRoot);
const importsByFile = new Map();
const stylesheetDependencyPattern =
  /@(?:import|use)\s+["']([^"']+)["']/g;
const stylesheetLoadCssPattern =
  /\bmeta\.load-css\(\s*["']([^"']+)["']/g;
const staticImportPattern = /^\s*import\s+(?:.+?\s+from\s+)?["']([^"']+)["'];?/gm;
const dynamicImportPattern = /\bimport\(\s*["']([^"']+)["']\s*\)/g;

for (const filePath of files) {
  const imports = new Set();
  const source = fs.readFileSync(filePath, "utf8");
  for (const pattern of [
    stylesheetDependencyPattern,
    stylesheetLoadCssPattern,
    staticImportPattern,
    dynamicImportPattern,
  ]) {
    for (const match of source.matchAll(pattern)) {
      const resolved = resolveImport(filePath, match[1]);
      if (resolved) imports.add(resolved);
    }
  }
  importsByFile.set(filePath, imports);
}

const referenced = new Set(
  [...importsByFile.values()].flatMap((imports) => [...imports]),
);

const styleFiles = files.filter((filePath) =>
  styleExtensions.has(path.extname(filePath)),
);
const orphanedStyles = styleFiles.filter((filePath) => !referenced.has(filePath));

for (const filePath of orphanedStyles) {
  violations.push(
    `${path.relative(projectRoot, filePath)} has no source import`,
  );
}

const legacyStyles = styleFiles.filter(
  (filePath) =>
    styleExtensions.has(path.extname(filePath)) &&
    /(?:^|[\\/])(?:legacy|articleLegacy)/i.test(path.basename(filePath)),
);

for (const filePath of legacyStyles) {
  if (!referenced.has(filePath)) {
    violations.push(
      `${path.relative(projectRoot, filePath)} is not imported by an owning module`,
    );
  }
}

const entryImports = importsByFile.get(entryPath) || new Set();
for (const importedPath of entryImports) {
  if (
    styleExtensions.has(path.extname(importedPath)) &&
    importedPath.includes(`${path.sep}features${path.sep}`)
  ) {
    violations.push(
      `src/main.jsx must not load feature CSS directly: ${path.relative(projectRoot, importedPath)}`,
    );
  }
}

if (violations.length) {
  console.error("Style coverage violations:");
  for (const violation of violations) console.error(`- ${violation}`);
  process.exit(1);
}

console.log(
  `Style coverage check passed (${styleFiles.length} styles source-referenced; ${legacyStyles.length} legacy styles imported by their owning modules).`,
);
