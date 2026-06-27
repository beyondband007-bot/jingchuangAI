import manifest from "./articleStyleTemplateManifest.json";

const STYLE_TEMPLATE_BASE = "/assets/爆款图文模板";

/** visualStyle id → 爆款图文模板文件夹名 */
export const VISUAL_STYLE_FOLDER = {
  fresh: "清新",
  cute: "可爱",
  minimal: "极简",
  bold: "大胆",
  handdrawn: "手绘",
  retro: "复古",
  notion: "Notion 风",
  blackboard: "黑板风",
};

export function buildStyleTemplateUrl(folder, filename) {
  return `${STYLE_TEMPLATE_BASE}/${encodeURIComponent(folder)}/${encodeURIComponent(filename)}`;
}

export function getStyleTemplateFiles(visualStyleId) {
  const folder = VISUAL_STYLE_FOLDER[visualStyleId];
  if (!folder) return [];
  return manifest[folder] || [];
}

export function getVisualStyleThumb(visualStyleId) {
  const files = getStyleTemplateFiles(visualStyleId);
  const folder = VISUAL_STYLE_FOLDER[visualStyleId];
  if (!folder || !files.length) return "";
  return buildStyleTemplateUrl(folder, files[0]);
}

export function pickRandomStyleTemplates(visualStyleId, count = 6) {
  const folder = VISUAL_STYLE_FOLDER[visualStyleId];
  const files = getStyleTemplateFiles(visualStyleId);
  if (!folder || !files.length) return [];

  const shuffled = [...files].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, files.length)).map((filename) => ({
    id: `${visualStyleId}-${filename}`,
    label: "",
    image: buildStyleTemplateUrl(folder, filename),
  }));
}

export const visualStyles = [
  { id: "fresh", label: "清新" },
  { id: "cute", label: "可爱" },
  { id: "minimal", label: "极简" },
  { id: "bold", label: "大胆" },
  { id: "handdrawn", label: "手绘笔记" },
  { id: "retro", label: "复古" },
  { id: "notion", label: "Notion 风" },
  { id: "blackboard", label: "黑板风" },
].map((item) => ({
  ...item,
  image: getVisualStyleThumb(item.id),
}));
