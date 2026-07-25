import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";

const roots = ["src", "public/new_page"];
const styleExtensions = new Set([".css", ".scss", ".html"]);
const allowedWidths = new Set(["375", "768", "1024", "1440", "1920"]);

async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) return collectFiles(path);
      return styleExtensions.has(entry.name.slice(entry.name.lastIndexOf(".")))
        ? [path]
        : [];
    }),
  );
  return nested.flat();
}

const files = (await Promise.all(roots.map(collectFiles))).flat();
const violations = [];

for (const file of files) {
  const source = await readFile(file, "utf8");
  for (const mediaMatch of source.matchAll(/@media(?<condition>[^\{]+)\{/g)) {
    for (const widthMatch of mediaMatch.groups.condition.matchAll(
      /(?:min|max)(?:-device)?-width\s*:\s*(?<width>\d+)px/g,
    )) {
      const width = widthMatch.groups.width;
      if (!allowedWidths.has(width)) {
        const line = source.slice(0, mediaMatch.index).split("\n").length;
        violations.push(`${relative(process.cwd(), file)}:${line} uses ${width}px`);
      }
    }
  }
}

if (violations.length) {
  console.error("Non-standard @media width breakpoints found:");
  console.error(violations.join("\n"));
  process.exit(1);
}

console.log("Media breakpoint check passed (375, 768, 1024, 1440, 1920 only).");
