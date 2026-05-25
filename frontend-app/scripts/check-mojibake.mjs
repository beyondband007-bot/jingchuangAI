import fs from "node:fs/promises";
import path from "node:path";

const rootDir = process.cwd();
const includeDirs = ["src", "public"];
const includeFiles = [".editorconfig", ".gitattributes", "package.json", "vite.config.js", "index.html"];
const textExtensions = new Set([
  ".js",
  ".jsx",
  ".ts",
  ".tsx",
  ".css",
  ".scss",
  ".html",
  ".json",
  ".md",
  ".yml",
  ".yaml"
]);

const suspiciousTokens = [
  "锟",
  "�",
  "鍙",
  "璇",
  "閫",
  "鎴",
  "寮",
  "绗",
  "鏁",
  "褰",
  "鐢",
  "浜",
  "姝",
  "鍚",
  "鍔",
  "浠",
  "鏈",
  "缁",
  "鍥",
  "鐗",
  "绱",
  "绔",
  "闈",
  "鐩",
  "璁",
  "鏉",
  "棰",
  "闊",
  "瑙"
];

function shouldScanFile(filePath) {
  const baseName = path.basename(filePath);
  if (includeFiles.includes(baseName)) return true;
  return textExtensions.has(path.extname(filePath).toLowerCase());
}

async function walk(dirPath, out) {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === "node_modules" || entry.name === "dist" || entry.name === ".git") continue;
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      await walk(fullPath, out);
      continue;
    }
    if (shouldScanFile(fullPath)) out.push(fullPath);
  }
}

function findIssues(content) {
  const lines = content.split(/\r?\n/);
  const issues = [];
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const matched = suspiciousTokens.filter((token) => line.includes(token));
    if (matched.length) {
      issues.push({
        lineNumber: index + 1,
        tokens: matched,
        preview: line.trim().slice(0, 160)
      });
    }
  }
  return issues;
}

async function main() {
  const files = [];
  for (const dir of includeDirs) {
    const fullDir = path.join(rootDir, dir);
    try {
      const stat = await fs.stat(fullDir);
      if (stat.isDirectory()) await walk(fullDir, files);
    } catch {
      // Ignore missing directories.
    }
  }

  for (const fileName of includeFiles) {
    const fullPath = path.join(rootDir, fileName);
    try {
      const stat = await fs.stat(fullPath);
      if (stat.isFile() && !files.includes(fullPath)) files.push(fullPath);
    } catch {
      // Ignore missing files.
    }
  }

  const failures = [];
  for (const filePath of files.sort()) {
    const content = await fs.readFile(filePath, "utf8");
    const issues = findIssues(content);
    if (issues.length) failures.push({ filePath, issues });
  }

  if (!failures.length) {
    console.log("No suspicious mojibake tokens found.");
    return;
  }

  console.error("Suspicious mojibake detected:");
  for (const failure of failures) {
    console.error(`- ${path.relative(rootDir, failure.filePath)}`);
    for (const issue of failure.issues.slice(0, 10)) {
      console.error(`  ${issue.lineNumber}: [${issue.tokens.join(", ")}] ${issue.preview}`);
    }
    if (failure.issues.length > 10) {
      console.error(`  ... ${failure.issues.length - 10} more lines`);
    }
  }

  process.exitCode = 1;
}

await main();
