import { createHash } from "crypto";
import fs from "fs";
import path from "path";
import { config } from "../../config/index.js";

const TEMPLATE_ROOT = "爆款图文模板";
const TEMPLATE_VERSION = "2026-06-27";

export const ARTICLE_TEMPLATE_STYLE_FOLDERS = {
  fresh: "清新",
  cute: "可爱",
  minimal: "极简",
  bold: "大胆",
  handdrawn: "手绘",
  retro: "复古",
  notion: "Notion 风",
  blackboard: "黑板风"
};

const STYLE_PROMPT_HINTS = {
  fresh: "保持参考图的清新明亮、小红书种草感、柔和自然光、干净留白和轻量装饰。",
  cute: "保持参考图的可爱治愈、圆润视觉、贴纸感装饰和轻松亲和的配色。",
  minimal: "保持参考图的极简高级、克制排版、大面积留白和清晰信息层级。",
  bold: "保持参考图的大字报冲击力、高对比色块、醒目主体和强点击感。",
  handdrawn: "保持参考图的手绘笔记、轻插画元素、真实博主整理分享页质感。",
  retro: "保持参考图的复古胶片、暖色调、怀旧生活方式和轻颗粒质感。",
  notion: "保持参考图的 Notion 模块化信息卡片、简洁图标感和轻办公审美。",
  blackboard: "保持参考图的黑板粉笔、知识笔记排版和重点清晰的教学感。"
};

function publicAssetsRoot() {
  const configured = String(config.media.publicAssetsDir || "").trim();
  const candidates = [
    path.isAbsolute(configured) ? configured : path.resolve(process.cwd(), configured),
    path.resolve(process.cwd(), "frontend-app", "public"),
    path.resolve(process.cwd(), "..", "frontend-app", "public"),
    path.resolve(process.cwd(), "public")
  ].filter(Boolean);
  return (
    candidates.find((candidate) => fs.existsSync(path.join(candidate, "assets", TEMPLATE_ROOT))) ||
    candidates[0]
  );
}

function templateRootDir() {
  return path.join(publicAssetsRoot(), "assets", TEMPLATE_ROOT);
}

function encodeAssetPath(...parts) {
  return `/assets/${parts.map((part) => encodeURIComponent(part)).join("/")}`;
}

function makeTemplateId(visualStyle, filename) {
  const digest = createHash("sha1").update(`${visualStyle}:${filename}`).digest("hex").slice(0, 10);
  return `${visualStyle}-${digest}`;
}

function makeLegacyTemplateId(visualStyle, filename) {
  return `${visualStyle}-${filename}`;
}

function listTemplateFiles(folder) {
  const dir = path.join(templateRootDir(), folder);
  try {
    return fs
      .readdirSync(dir, { withFileTypes: true })
      .filter((entry) => entry.isFile() && /\.(png|jpe?g|webp)$/i.test(entry.name))
      .map((entry) => entry.name)
      .sort((a, b) => a.localeCompare(b, "zh-Hans-CN"));
  } catch {
    return [];
  }
}

export function listArticleStyleTemplates(visualStyle) {
  const styleEntries = visualStyle
    ? [[visualStyle, ARTICLE_TEMPLATE_STYLE_FOLDERS[visualStyle]]]
    : Object.entries(ARTICLE_TEMPLATE_STYLE_FOLDERS);

  return styleEntries.flatMap(([styleId, folder]) => {
    if (!folder) return [];
    return listTemplateFiles(folder).map((filename, index) => ({
      id: makeTemplateId(styleId, filename),
      legacyId: makeLegacyTemplateId(styleId, filename),
      version: TEMPLATE_VERSION,
      visualStyle: styleId,
      folder,
      filename,
      label: `${folder} ${index + 1}`,
      assetPath: encodeAssetPath(TEMPLATE_ROOT, folder, filename),
      filePath: path.join(templateRootDir(), folder, filename),
      ratio: "3:4",
      promptHints: STYLE_PROMPT_HINTS[styleId] || "",
      layoutHints:
        "以参考图为视觉模板，尽量保持构图、留白比例、主视觉区域、标题区域、色彩气质、卡片层级和装饰元素风格；替换为本次图文主题，不要复刻原图文字内容。",
      textPolicy:
        "优先生成无文字或极少文字底图；如必须出现文字，最多一个短标题。完整标题、正文和标签由前端或后处理渲染。"
    }));
  });
}

export function findArticleStyleTemplate({ templateId, visualStyle } = {}) {
  const normalizedId = String(templateId || "").trim();
  if (!normalizedId) return null;
  return (
    listArticleStyleTemplates(visualStyle).find(
      (template) => template.id === normalizedId || template.legacyId === normalizedId
    ) || null
  );
}

export function snapshotArticleStyleTemplate(template) {
  if (!template) return null;
  return {
    id: template.id,
    legacyId: template.legacyId,
    version: template.version,
    visualStyle: template.visualStyle,
    label: template.label,
    assetPath: template.assetPath,
    filename: template.filename,
    ratio: template.ratio,
    promptHints: template.promptHints,
    layoutHints: template.layoutHints,
    textPolicy: template.textPolicy
  };
}
