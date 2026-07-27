import fs from "node:fs";
import path from "node:path";

const projectRoot = path.resolve(import.meta.dirname, "..");
const sourceRoot = path.join(projectRoot, "src");
const styleExtensions = new Set([".css", ".scss"]);
const baseline = {
  rawSelectorOccurrences: 445,
  rawColorDeclarations: 4007,
  oversizedFiles: 0,
};
const maxStyleFileLines = 2300;
const dynamicProperties = new Set([
  "--particle-drift",
  "--prompt-ratio-preview-height",
  "--prompt-ratio-preview-width",
  "--template-preview-aspect",
  "--video-inspiration-aspect",
  "--waterfall-columns",
]);
const forbiddenGlobalClassSelectors = [
  "send-button",
  "upload-clear-button",
];
const globalStylePrivateSelectorPolicy = new Map([
  [
    "src/styles/components.css",
    ["article-", "chat-", "dhv2-", "music-", "fm-assets", "image-", "video-", "face-swap-"],
  ],
  [
    "src/layouts/appShellFeature.css",
    ["article-", "chat-", "dhv2-", "music-", "fm-assets", "image-", "video-", "face-swap-"],
  ],
]);
const violations = [];

function walk(directory, files = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const filePath = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(filePath, files);
    else if (styleExtensions.has(path.extname(entry.name))) files.push(filePath);
  }
  return files;
}

function lineAt(source, index) {
  return source.slice(0, index).split(/\r\n|\r|\n/).length;
}

function collectSelectors(source, counts) {
  const pattern = /(^|})\s*([^{}@][^{}]*)\{/g;
  let match;
  while ((match = pattern.exec(source))) {
    const selector = match[2].replace(/\s+/g, " ").trim();
    if (!selector || selector.includes("%") || selector === "from" || selector === "to") continue;
    counts.set(selector, (counts.get(selector) || 0) + 1);
  }
}

function validateForbiddenGlobalClassSelectors(source, relativePath) {
  for (const className of forbiddenGlobalClassSelectors) {
    const pattern = new RegExp(
      `(^|[\\s,{])\\.${className}(?=[\\s:,{.#\\[]|$)`,
      "gm",
    );
    for (const match of source.matchAll(pattern)) {
      violations.push(
        `${relativePath}:${lineAt(source, match.index)} uses deprecated global .${className}; prefix it with its UI scope`,
      );
    }
  }
}

function validateGlobalStylePrivateSelectors(source, relativePath) {
  const prefixes = globalStylePrivateSelectorPolicy.get(
    relativePath.replaceAll(path.sep, "/"),
  );
  if (!prefixes) return;

  for (const prefix of prefixes) {
    const pattern = new RegExp(`\\.${prefix.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")}[\\w-]*`, "g");
    for (const match of source.matchAll(pattern)) {
      violations.push(
        `${relativePath}:${lineAt(source, match.index)} keeps feature-private selector ${match[0]} in a global style file`,
      );
    }
  }
}

function validateBraceBalance(source, relativePath) {
  const openings = [];
  let quote = null;
  let inComment = false;

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    const next = source[index + 1];

    if (inComment) {
      if (character === "*" && next === "/") {
        inComment = false;
        index += 1;
      }
      continue;
    }
    if (!quote && character === "/" && next === "*") {
      inComment = true;
      index += 1;
      continue;
    }
    if (quote) {
      if (character === "\\") {
        index += 1;
      } else if (character === quote) {
        quote = null;
      }
      continue;
    }
    if (character === "'" || character === '"') {
      quote = character;
    } else if (character === "{") {
      openings.push(index);
    } else if (character === "}") {
      const opening = openings.pop();
      if (typeof opening === "undefined") {
        violations.push(`${relativePath}:${lineAt(source, index)} has an unexpected }`);
        return;
      }
    }
  }

  if (openings.length) {
    const opening = openings.at(-1);
    violations.push(`${relativePath}:${lineAt(source, opening)} has an unclosed {`);
  }
}

const styleFiles = walk(sourceRoot);
const declaredProperties = new Set();
const propertyUses = [];
let rawColorDeclarations = 0;
let oversizedFiles = 0;
const selectorCounts = new Map();

for (const filePath of styleFiles) {
  const source = fs.readFileSync(filePath, "utf8");
  const relativePath = path.relative(projectRoot, filePath);
  validateBraceBalance(source, relativePath);
  validateForbiddenGlobalClassSelectors(source, relativePath);
  validateGlobalStylePrivateSelectors(source, relativePath);
  collectSelectors(source, selectorCounts);
  rawColorDeclarations += (source.match(/#[0-9a-fA-F]{3,8}\b|rgba?\(/g) || []).length;
  if (source.split(/\r\n|\r|\n/).length > maxStyleFileLines) {
    oversizedFiles += 1;
  }

  for (const match of source.matchAll(/(--[\w-]+)\s*:/g)) {
    declaredProperties.add(match[1]);
  }
  for (const match of source.matchAll(/var\(\s*(--[\w-]+)([^)]*)\)/g)) {
    propertyUses.push({
      property: match[1],
      hasFallback: match[2].includes(","),
      file: relativePath,
      line: lineAt(source, match.index),
    });
  }
  for (const match of source.matchAll(/!important/g)) {
    violations.push(`${relativePath}:${lineAt(source, match.index)} uses !important`);
  }
}

const rawSelectorOccurrences = [...selectorCounts.values()].filter(
  (count) => count > 1,
).length;

for (const use of propertyUses) {
  if (
    !declaredProperties.has(use.property) &&
    !use.hasFallback &&
    !dynamicProperties.has(use.property)
  ) {
    violations.push(`${use.file}:${use.line} uses unresolved ${use.property}`);
  }
}

if (rawSelectorOccurrences > baseline.rawSelectorOccurrences) {
  violations.push(
    `raw selector occurrences increased from ${baseline.rawSelectorOccurrences} to ${rawSelectorOccurrences}`,
  );
}
if (rawColorDeclarations > baseline.rawColorDeclarations) {
  violations.push(
    `raw color declarations increased from ${baseline.rawColorDeclarations} to ${rawColorDeclarations}`,
  );
}
if (oversizedFiles > baseline.oversizedFiles) {
  violations.push(
    `style files over ${maxStyleFileLines} lines increased from ${baseline.oversizedFiles} to ${oversizedFiles}`,
  );
}

if (violations.length) {
  console.error("Style system violations:");
  for (const violation of violations) console.error(`- ${violation}`);
  process.exit(1);
}

console.log(
  `Style system check passed (${styleFiles.length} stylesheets, ${declaredProperties.size} tokens, ${rawSelectorOccurrences} raw selector occurrences).`,
);
