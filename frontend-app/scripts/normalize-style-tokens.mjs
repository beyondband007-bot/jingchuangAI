import fs from "node:fs";
import path from "node:path";

const projectRoot = path.resolve(import.meta.dirname, "..");
const sourceRoot = path.join(projectRoot, "src");
const styleRoots = [
  sourceRoot,
  path.join(projectRoot, "public", "new_page"),
  path.resolve(projectRoot, "..", "new_page"),
  path.resolve(projectRoot, "..", "projects", "article-redesign"),
  path.resolve(projectRoot, "..", "static-workbench-package"),
  path.resolve(projectRoot, "..", "_tmp_voice_synthesis_ui"),
  path.resolve(projectRoot, "..", "tmp_viral_graphic_generator_ui"),
  path.resolve(projectRoot, "..", "tmp_voice_conversion_ui"),
].filter((dir) => fs.existsSync(dir));
const extensions = new Set([".css", ".scss", ".html"]);
const excludedFiles = new Set([
  path.join(sourceRoot, "styles", "tokens.css"),
  path.join(sourceRoot, "styles", "base.css"),
]);

const spaceTokens = new Map([
  [1, "--space-1px"],
  [2, "--space-2px"],
  [3, "--space-3px"],
  [4, "--space-0"],
  [5, "--space-5px"],
  [6, "--space-1"],
  [7, "--space-7px"],
  [8, "--space-2"],
  [9, "--space-9px"],
  [10, "--space-10px"],
  [11, "--space-11px"],
  [12, "--space-3"],
  [14, "--space-14px"],
  [16, "--space-4"],
  [18, "--space-18px"],
  [20, "--space-20px"],
  [22, "--space-22px"],
  [24, "--space-5"],
  [25, "--space-25px"],
  [26, "--space-26px"],
  [28, "--space-28px"],
  [32, "--space-6"],
  [34, "--space-34px"],
  [36, "--space-36px"],
  [40, "--space-7"],
  [42, "--space-42px"],
  [48, "--space-8"],
  [50, "--space-50px"],
  [56, "--space-56px"],
  [58, "--space-58px"],
  [64, "--space-64px"],
  [72, "--space-72px"],
  [76, "--space-76px"],
  [84, "--space-84px"],
  [108, "--space-108px"],
]);

function radiusToken(number) {
  if (number <= 7) return "--radius-xs";
  if (number <= 11) return "--radius-control";
  if (number <= 14) return "--radius-lg";
  if (number <= 18) return "--radius-xl";
  if (number <= 26) return "--radius-2xl";
  return "--radius-pill";
}

function walk(directory, files = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const filePath = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(filePath, files);
    else if (extensions.has(path.extname(entry.name))) files.push(filePath);
  }
  return files;
}

function replacePxWithSpaceToken(value) {
  return value.replace(/(-?\d+(?:\.\d+)?)px/g, (match, rawNumber) => {
    const token = spaceTokens.get(Number(rawNumber));
    return token ? `var(${token})` : match;
  });
}

let changedFiles = 0;
let replacedGapValues = 0;
let replacedRadiusValues = 0;
let removedDefaultWeights = 0;
let normalizedLightWeights = 0;

for (const styleRoot of styleRoots) {
  if (!fs.existsSync(styleRoot)) continue;
  for (const filePath of walk(styleRoot)) {
  if (excludedFiles.has(filePath)) continue;
  const original = fs.readFileSync(filePath, "utf8");
  let next = original;

  next = next.replace(
    /((?:--[\w-]*gap[\w-]*|gap|row-gap|column-gap)\s*:\s*)([^;{}]+)(;)/gi,
    (full, property, value, semicolon) => {
      const replaced = replacePxWithSpaceToken(value);
      if (replaced !== value) {
        replacedGapValues += (value.match(/-?\d+(?:\.\d+)?px/g) || []).length;
      }
      return `${property}${replaced}${semicolon}`;
    },
  );

  next = next.replace(
    /(border(?:-[a-z]+)?-radius\s*:\s*)([^;{}]+)(;)/gi,
    (full, property, value, semicolon) => {
      const replaced = value.replace(/(-?\d+(?:\.\d+)?)px/g, (match, rawNumber) => {
        const number = Number(rawNumber);
        if (number === 0) return "0";
        replacedRadiusValues += 1;
        return `var(${radiusToken(number)})`;
      });
      return `${property}${replaced}${semicolon}`;
    },
  );

  next = next.replace(/font-weight\s*:\s*(?:400|500)\s*(?:;|(?=}))/g, () => {
    removedDefaultWeights += 1;
    return "";
  });
  next = next.replace(/font-weight\s*:\s*(?:100|200|300)\s*(?:;|(?=}))/g, () => {
    normalizedLightWeights += 1;
    return "font-weight: var(--font-weight-light);";
  });
  next = next.replace(/font-weight\s*:\s*(?:600|700|800|900)\s*(?:;|(?=}))/g, "");

  if (next !== original) {
    fs.writeFileSync(filePath, next, "utf8");
    changedFiles += 1;
  }
  }
}

console.log(
  `Normalized ${changedFiles} stylesheets: ${replacedGapValues} gap values, ${replacedRadiusValues} radius values, ${removedDefaultWeights} default weights removed, ${normalizedLightWeights} light weights normalized.`,
);
