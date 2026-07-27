import fs from "node:fs";
import path from "node:path";
import postcss from "postcss";

const projectRoot = path.resolve(import.meta.dirname, "..");
const workspaceRoot = path.resolve(projectRoot, "..");
const scanRoots = [
  { name: "frontend", dir: path.join(projectRoot, "src") },
  { name: "backend", dir: path.join(workspaceRoot, "backend", "src") },
].filter((root) => fs.existsSync(root.dir));
const textExtensions = new Set([".js", ".jsx", ".css", ".scss"]);
const darkTokenPattern =
  /#050505|#111118|#11121a|#0c0e22|color-scheme:\s*dark|rgba\(\s*19\s*,\s*20\s*,\s*21/gi;
const cssImportPattern = /^import\s+["'][^"']+\.(?:css|scss)["'];/gm;
const backendDuplicationPattern =
  /\b(?:multer|refund|credits?|points?|poll|status|favorite|delete|upload|provider|timeout)\b/gi;
const forbiddenFeatureStyleImports = new Set([
  "../watermark/watermark.css",
  "../voice-synthesis-ui/voiceSynthesisWorkbenchCard.css",
]);
const globalEntryPath = path.join(projectRoot, "src", "main.jsx");
const maxDuplicateSelectors = 45;
const maxStyleFileLines = 800;
const reportDuplicateDetails = process.argv.includes("--duplicate-details");

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(fullPath);
    if (!entry.isFile()) return [];
    return textExtensions.has(path.extname(entry.name)) ? [fullPath] : [];
  });
}

function readText(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function countLines(text) {
  if (!text) return 0;
  return text.split(/\r\n|\r|\n/).length;
}

function relative(filePath) {
  return path.relative(workspaceRoot, filePath).replaceAll(path.sep, "/");
}

function countCssSelectors(text, { isScss = false } = {}) {
  return getDuplicateCssSelectors(text, { isScss }).length;
}

function getDuplicateCssSelectors(text, { isScss = false } = {}) {
  const selectorCounts = new Map();
  let root;
  try {
    root = postcss.parse(text);
  } catch {
    return [];
  }

  root.walkRules((rule) => {
    const selector = rule.selector.replace(/\s+/g, " ").trim();
    if (!selector || selector.includes("%") || selector.startsWith("&") || !/[.#[:]/.test(selector)) return;

    const context = [];
    for (let parent = rule.parent; parent; parent = parent.parent) {
      // PostCSS's default parser retains nested SCSS rules as child rules. Their
      // selector is incomplete without the parent selector, so counting it as a
      // standalone duplicate produces a false positive.
      if (isScss && parent.type === "rule") return;
      if (parent.type === "atrule" && /keyframes$/i.test(parent.name)) return;
      if (parent.type === "atrule" && /^(?:media|container|scope|supports)$/i.test(parent.name)) {
        context.unshift(`@${parent.name} ${parent.params}`.replace(/\s+/g, " ").trim());
      }
    }
    const key = `${context.join(" | ")}::${selector}`;
    selectorCounts.set(key, (selectorCounts.get(key) || 0) + 1);
  });
  return [...selectorCounts.entries()]
    .filter(([, count]) => count > 1)
    .map(([selector]) => selector);
}

const files = scanRoots.flatMap((root) =>
  walk(root.dir).map((filePath) => ({ root: root.name, filePath })),
);
const fileStats = files
  .map(({ root, filePath }) => {
    const text = readText(filePath);
    return {
      root,
      path: relative(filePath),
      lines: countLines(text),
      important: (text.match(new RegExp("!" + "important", "g")) || []).length,
      darkTokens: (text.match(darkTokenPattern) || []).length,
      cssImports: (text.match(cssImportPattern) || []).length,
      contextualDuplicateSelectors: /\.(?:css|scss)$/.test(filePath)
        ? countCssSelectors(text, { isScss: path.extname(filePath) === ".scss" })
        : 0,
      backendDuplicationHints:
        root === "backend"
          ? (text.match(backendDuplicationPattern) || []).length
          : 0,
    };
  })
  .sort((a, b) => b.lines - a.lines);

const totals = fileStats.reduce(
  (sum, item) => ({
    files: sum.files + 1,
    lines: sum.lines + item.lines,
    important: sum.important + item.important,
    darkTokens: sum.darkTokens + item.darkTokens,
    cssImports: sum.cssImports + item.cssImports,
    contextualDuplicateSelectors:
      sum.contextualDuplicateSelectors + item.contextualDuplicateSelectors,
    backendDuplicationHints:
      sum.backendDuplicationHints + item.backendDuplicationHints,
  }),
  {
    files: 0,
    lines: 0,
    important: 0,
    darkTokens: 0,
    cssImports: 0,
    contextualDuplicateSelectors: 0,
    backendDuplicationHints: 0,
  },
);

const focusedFiles = [
  "frontend-app/src/main.jsx",
  "frontend-app/src/styles.scss",
]
  .map((target) => fileStats.find((item) => item.path === target))
  .filter(Boolean);
const byRoot = scanRoots.map((root) => {
  const items = fileStats.filter((item) => item.root === root.name);
  return items.reduce(
    (sum, item) => ({
      root: root.name,
      files: sum.files + 1,
      lines: sum.lines + item.lines,
      important: sum.important + item.important,
      darkTokens: sum.darkTokens + item.darkTokens,
      cssImports: sum.cssImports + item.cssImports,
      contextualDuplicateSelectors:
        sum.contextualDuplicateSelectors + item.contextualDuplicateSelectors,
      backendDuplicationHints:
        sum.backendDuplicationHints + item.backendDuplicationHints,
    }),
    {
      root: root.name,
      files: 0,
      lines: 0,
      important: 0,
      darkTokens: 0,
      cssImports: 0,
      contextualDuplicateSelectors: 0,
      backendDuplicationHints: 0,
    },
  );
});
const backendHotspots = fileStats
  .filter((item) => item.root === "backend" && item.backendDuplicationHints > 0)
  .sort(
    (a, b) =>
      b.backendDuplicationHints - a.backendDuplicationHints || b.lines - a.lines,
  );
const forbiddenStyleImportViolations = files
  .filter(
    ({ root, filePath }) =>
      root === "frontend" && [".js", ".jsx"].includes(path.extname(filePath)),
  )
  .flatMap(({ filePath }) => {
    const text = readText(filePath);
    const imports = [...text.matchAll(cssImportPattern)].map((match) =>
      match[0].replace(/^import\s+["']|["'];$/g, ""),
    );
    return imports
      .filter((styleImport) => forbiddenFeatureStyleImports.has(styleImport))
      .map((styleImport) => ({
        file: relative(filePath),
        import: styleImport,
      }));
  });
const oversizedStyleFiles = fileStats.filter(
  (item) =>
    item.root === "frontend" &&
    /\.(?:css|scss)$/.test(item.path) &&
    item.lines > maxStyleFileLines,
);
const globalEntryFeatureStyleImports = fs.existsSync(globalEntryPath)
  ? [...readText(globalEntryPath).matchAll(cssImportPattern)]
      .map((match) => match[0].replace(/^import\s+["']|["'];$/g, ""))
      .filter((styleImport) => styleImport.includes("/features/"))
  : [];

console.log("Redundancy baseline");
console.table([totals]);
console.log("By root");
console.table(byRoot);
console.log("Largest files");
console.table(fileStats.slice(0, 15));
console.log("Focus files");
console.table(focusedFiles);
console.log("Backend duplication hotspots");
console.table(backendHotspots.slice(0, 15));
console.log("Oversized style files (migration candidates)");
console.table(oversizedStyleFiles.map(({ path, lines }) => ({ path, lines })));

if (reportDuplicateDetails) {
  console.log("Duplicate selector details");
  console.table(
    fileStats
      .filter(
        (item) =>
          item.root === "frontend" && item.contextualDuplicateSelectors > 0,
      )
      .flatMap(({ path: filePath }) => {
        const selectors = getDuplicateCssSelectors(
          readText(path.join(workspaceRoot, filePath)),
          { isScss: path.extname(filePath) === ".scss" },
        );
        return selectors.map((selector) => ({ path: filePath, selector }));
      }),
  );
}

if (totals.contextualDuplicateSelectors > maxDuplicateSelectors) {
  console.error(
    `Contextual duplicate selector threshold exceeded: ${totals.contextualDuplicateSelectors} > ${maxDuplicateSelectors}.`,
  );
  process.exitCode = 1;
}

if (oversizedStyleFiles.length) {
  console.error(`Style file size threshold exceeded: ${maxStyleFileLines} lines maximum.`);
  process.exitCode = 1;
}

if (forbiddenStyleImportViolations.length) {
  console.error("Forbidden cross-feature style imports detected:");
  console.table(forbiddenStyleImportViolations);
  process.exitCode = 1;
}

if (globalEntryFeatureStyleImports.length) {
  console.error("Feature styles must not be loaded from src/main.jsx:");
  console.table(globalEntryFeatureStyleImports.map((styleImport) => ({ styleImport })));
  process.exitCode = 1;
}
