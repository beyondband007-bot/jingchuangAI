import fs from "node:fs";
import path from "node:path";
import { analyzeImageWithMinimax } from "../providers/minimax/vision.js";

const projectRoot = path.resolve(process.cwd(), "..");
const mainFile = path.join(projectRoot, "frontend-app", "src", "main.jsx");
const outputFile = path.join(
  projectRoot,
  "frontend-app",
  "src",
  "data",
  "imageInspirationPrompts.json"
);
const caseDirectory = path.join(
  projectRoot,
  "frontend-app",
  "public",
  "重构",
  "案例"
);
const concurrency = Math.max(1, Number(process.env.PROMPT_CONCURRENCY || 2));
const manualOverrides = {
  "46.jpg": {
    prompt:
      "近景侧面人物肖像，戴半透明兜帽与科技感口罩，面部被遮挡，灰白防护外套表面流动着青蓝色数字纹路，人物低头望向右侧，背景为密集的未来城市与高层建筑，冷灰和青蓝配色，柔和雾光，浅景深，写实科幻概念艺术，安静、疏离而神秘的氛围",
    description:
      "一位戴兜帽和口罩的人物侧身站在未来城市前，防护外套与面部周围带有青蓝色数字纹理，背景建筑密集并被雾气弱化。",
    style: "写实科幻概念艺术",
    mood: "安静、疏离、神秘",
    tags: ["兜帽人物", "科技口罩", "未来城市", "数字纹理", "冷色调"],
    model: "manual-visual-review"
  }
};

function readCaseFiles() {
  const source = fs.readFileSync(mainFile, "utf8");
  const block = source.match(
    /const caseImageFiles = \[([\s\S]*?)\];\s*const wideInspirationFiles/
  )?.[1];
  if (!block) throw new Error("Unable to locate caseImageFiles in main.jsx");

  return Array.from(block.matchAll(/"([^"]+\.(?:jpg|jpeg|png|webp))"/gi)).map(
    (match) => match[1]
  );
}

function readExistingResults() {
  if (!fs.existsSync(outputFile)) return {};
  return JSON.parse(fs.readFileSync(outputFile, "utf8"));
}

function saveResults(results) {
  fs.mkdirSync(path.dirname(outputFile), { recursive: true });
  const ordered = Object.fromEntries(
    Object.entries(results)
      .map(([file, value]) => [file, normalizeResult(value)])
      .sort(([left], [right]) =>
        left.localeCompare(right, "zh-CN", { numeric: true })
      )
  );
  fs.writeFileSync(outputFile, `${JSON.stringify(ordered, null, 2)}\n`, "utf8");
}

function stripPromptNarration(value) {
  return String(value || "")
    .trim()
    .replace(
      /^(?:这张|这幅|该)?(?:图片|图像|画面|图中|图片中|画面中)(?:主要)?(?:描绘|描述|展示|展现|呈现|讲述|表现)(?:了|的是|出)?[：:，,\s]*/u,
      ""
    )
    .replace(
      /^(?:这张|这幅|该)?(?:图片|图像|画面|图中|图片中|画面中)(?:是|为)[：:，,\s]*/u,
      ""
    )
    .trim();
}

function normalizeResult(value = {}) {
  const rawPrompt = String(value.prompt || "")
    .trim()
    .replace(/[，。；;]+$/u, "");
  const description = stripPromptNarration(value.description || rawPrompt);
  const style = String(value.style || "")
    .replace(/^(视觉风格|风格)[:：]\s*/u, "")
    .trim()
    .slice(0, 80);
  const mood = String(value.mood || "")
    .replace(/^(氛围|情绪)[:：]\s*/u, "")
    .trim()
    .slice(0, 80);
  const tags = Array.isArray(value.tags)
    ? value.tags.map((tag) => String(tag).trim()).filter(Boolean).slice(0, 8)
    : [];
  const prompt =
    description.replace(/[，。；;]+$/u, "") ||
    stripPromptNarration(rawPrompt);
  const additions = [];

  if (style && !prompt.includes(style)) additions.push(`视觉风格：${style}`);
  if (mood && !prompt.includes(mood)) additions.push(`氛围：${mood}`);
  const combined = [prompt, ...additions].filter(Boolean).join("，");
  if (combined.length < 80 && tags.length) {
    additions.push(`画面元素：${tags.join("、")}`);
  }
  if (
    [prompt, ...additions].filter(Boolean).join("，").length < 80 &&
    rawPrompt &&
    rawPrompt !== prompt &&
    !prompt.includes(rawPrompt)
  ) {
    additions.push(rawPrompt);
  }

  const detailedPrompt = [prompt, ...additions]
    .filter(Boolean)
    .join("，")
    .replace(/[。；;]+，/gu, "，")
    .slice(0, 260);

  return {
    ...value,
    prompt: detailedPrompt,
    description,
    style,
    mood,
    tags
  };
}

async function analyzeFile(file, index, total) {
  const imagePath = path.join(caseDirectory, file);
  if (!fs.existsSync(imagePath)) {
    throw new Error(`Missing inspiration image: ${imagePath}`);
  }

  const result = await analyzeImageWithMinimax({
    imageBase64: fs.readFileSync(imagePath).toString("base64"),
    mimeType: "image/jpeg"
  });

  return {
    file,
    index,
    total,
    value: {
      prompt: String(result.prompt || "").trim(),
      description: String(result.description || "").trim(),
      style: String(result.style || "").trim(),
      mood: String(result.mood || "").trim(),
      tags: Array.isArray(result.tags) ? result.tags : [],
      model: result.model || ""
    }
  };
}

async function main() {
  const files = readCaseFiles();
  const results = {
    ...readExistingResults(),
    ...manualOverrides
  };
  saveResults(results);
  const pending = files.filter((file) => !results[file]?.prompt);

  console.log(
    `Inspiration prompt generation: ${files.length - pending.length}/${files.length} complete, ${pending.length} pending, concurrency ${concurrency}`
  );

  let cursor = 0;
  let completed = files.length - pending.length;
  const failures = [];

  async function worker() {
    while (cursor < pending.length) {
      const current = cursor;
      cursor += 1;
      const file = pending[current];
      try {
        const analyzed = await analyzeFile(file, completed + 1, files.length);
        results[analyzed.file] = analyzed.value;
        completed += 1;
        saveResults(results);
        console.log(
          `[${completed}/${files.length}] ${file}: ${analyzed.value.prompt.slice(0, 70)}`
        );
      } catch (error) {
        failures.push({
          file,
          message: String(error?.message || error)
        });
        console.error(`[failed] ${file}: ${String(error?.message || error)}`);
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, pending.length || 1) }, () =>
      worker()
    )
  );

  console.log(`Wrote ${files.length} prompts to ${outputFile}`);
  if (failures.length) {
    console.error(`Failed files: ${JSON.stringify(failures)}`);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
