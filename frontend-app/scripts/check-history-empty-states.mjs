import fs from "node:fs";
import path from "node:path";

const projectRoot = path.resolve(import.meta.dirname, "..");
const featureRoot = path.join(projectRoot, "src", "features");
const historyRecordPattern = /(?:暂无|正在加载)[^"'`\n]{0,16}记录/g;

function walk(directory, files = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const filePath = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(filePath, files);
    else if (entry.isFile() && path.extname(filePath) === ".jsx") files.push(filePath);
  }
  return files;
}

const violations = walk(featureRoot).flatMap((filePath) => {
  const source = fs.readFileSync(filePath, "utf8");
  const recordTitles = [...source.matchAll(historyRecordPattern)];
  if (!recordTitles.length || source.includes("HistoryEmptyState")) return [];
  return [{
    file: path.relative(projectRoot, filePath).replaceAll(path.sep, "/"),
    titles: recordTitles.map((match) => match[0]).join("、"),
  }];
});

if (violations.length) {
  console.error("History/record empty states must use HistoryEmptyState:");
  console.table(violations);
  process.exitCode = 1;
} else {
  console.log("History empty-state check passed (record titles use HistoryEmptyState).");
}
