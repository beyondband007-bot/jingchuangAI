import fs from "node:fs";
import path from "node:path";

const projectRoot = path.resolve(import.meta.dirname, "..");
const basePath = path.join(projectRoot, "src", "styles", "base.css");
const source = fs.readFileSync(basePath, "utf8");
const requiredTokens = [
  "input:not([type=\"checkbox\"]):not([type=\"radio\"]):not(\n    [type=\"range\"]\n  ):focus-visible",
  "textarea:focus-visible",
  "select:focus-visible",
  "button:focus-visible",
  "outline: 2px solid var(--brand-primary);",
  "box-shadow: var(--focus-ring);",
];

const missing = requiredTokens.filter((token) => !source.includes(token));
if (missing.length) {
  console.error(
    "Focus-visible check failed:\n- " +
      missing.map((token) => `base.css is missing ${token}`).join("\n- "),
  );
  process.exit(1);
}

console.log("Focus-visible check passed (keyboard focus indicators are defined globally).");
