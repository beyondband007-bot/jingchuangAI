import fs from "node:fs";
import path from "node:path";

const projectRoot = path.resolve(import.meta.dirname, "..");
const sourceRoot = path.join(projectRoot, "src");
const styleExtensions = new Set([".css", ".scss"]);
const crossFileGuards = new Set([
  "src/styles/components.css",
]);
const expectations = [
  {
    file: "src/features/assets/assetsBase.css",
    selectors: [".is-spinning"],
  },
  {
    file: "src/features/article/articleWorkbenchBase.css",
    selectors: [".article-generating-state svg"],
  },
  {
    file: "src/features/chat/chatConversationCanvas.css",
    selectors: [".chat-waiting-title svg", ".chat-waiting-card span"],
  },
  {
    file: "src/features/chat/chatMessages.css",
    selectors: [".chat-message-bubble.is-loading svg"],
  },
  {
    file: "src/features/digital-human-hub/digitalHumanHistory.css",
    selectors: [".dh-history-card__spinner"],
  },
  {
    file: "src/features/digital-human-v2/digitalHumanPreview.css",
    selectors: [".dhv2-spinner"],
  },
  {
    file: "src/features/music/musicImmersive.css",
    selectors: [".music-immersive__glow", ".music-immersive__wave-track"],
  },
  {
    file: "src/features/image/imageSharedUi.css",
    selectors: [".image-preload-skeleton", ".image-preload-skeleton svg"],
  },
  {
    file: "src/features/face-swap/FaceSwapWorkbench.css",
    selectors: [
      ".face-swap-workbench__upload-spinner",
      ".face-swap-workbench__start-button .lucide-loader-2",
    ],
  },
  {
    file: "src/features/music/musicGenerating.css",
    selectors: [".music-gen-waiting-step-ring"],
  },
  {
    file: "src/features/music/musicHistory.css",
    selectors: [".music-lyrics-sync-spinner"],
  },
  {
    file: "src/features/watermark/watermark.css",
    selectors: [".watermark-uploading svg"],
  },
  {
    file: "src/features/photo-digital-human-v2/photoDigitalHumanV2.css",
    selectors: [".pdhv2-spinner"],
  },
  {
    file: "src/features/video/videoCards.css",
    selectors: [".video-result-card.status-processing .video-placeholder svg"],
  },
];

const failures = [];

function walk(directory, files = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const filePath = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(filePath, files);
    else if (styleExtensions.has(path.extname(entry.name))) files.push(filePath);
  }
  return files;
}

for (const expectation of expectations) {
  const absolutePath = path.join(projectRoot, expectation.file);
  const source = fs.readFileSync(absolutePath, "utf8");
  const mediaStart = source.lastIndexOf("@media (prefers-reduced-motion: reduce)");

  if (mediaStart < 0) {
    failures.push(`${expectation.file} has no reduced-motion rule.`);
    continue;
  }

  const reducedMotionBlock = source.slice(mediaStart);
  for (const selector of expectation.selectors) {
    if (!reducedMotionBlock.includes(selector)) {
      failures.push(`${expectation.file} does not reduce motion for ${selector}.`);
    }
  }
  if (!/animation\s*:\s*none\s*;/.test(reducedMotionBlock)) {
    failures.push(`${expectation.file} does not disable its selected animation.`);
  }
}

for (const absolutePath of walk(sourceRoot)) {
  const relativePath = path.relative(projectRoot, absolutePath).replaceAll(path.sep, "/");
  if (crossFileGuards.has(relativePath)) continue;

  const source = fs.readFileSync(absolutePath, "utf8");
  const hasMotion = /animation\s*:\s*(?!none\b)[^;]+;/i.test(source);
  if (hasMotion && !source.includes("@media (prefers-reduced-motion: reduce)")) {
    failures.push(`${relativePath} contains animation without a reduced-motion rule.`);
  }
}

if (failures.length) {
  console.error("Reduced-motion check failed:\n- " + failures.join("\n- "));
  process.exit(1);
}

console.log(
  `Reduced-motion check passed (${expectations.length} explicit feature styles protected; every animated stylesheet has coverage).`,
);
