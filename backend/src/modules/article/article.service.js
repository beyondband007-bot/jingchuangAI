import { randomUUID } from "crypto";
import { getPool } from "../../db/pool.js";
import { createDeepSeekChatResponse } from "../../providers/deepseek/chat.js";
import { uploadFileToKie } from "../../providers/kie/upload.js";
import { createHttpError } from "../../shared/http.js";
import { BILLING_RULES } from "../../shared/billingRules.js";
import { chargeCredits, refundChargedCredits } from "../../shared/billingCharge.js";
import { findChatModel } from "../chat/chat.repository.js";
import {
  createTask as createImageTask,
  deleteTask as deleteImageTask,
  getModels as getImageModels,
  getTask as getImageTask,
  listTasks as listImageTasks,
  toggleFavorite as toggleImageFavorite
} from "../image/image.service.js";
import {
  findArticleStyleTemplate,
  snapshotArticleStyleTemplate
} from "./article.templates.js";
import {
  createArticlePackage,
  deleteArticlePackageRow,
  findArticlePackageRow,
  listArticlePackageRows,
  toggleArticlePackageFavorite,
  updateArticlePackageStatus,
  updateArticlePackageTaskIds
} from "./article.repository.js";

const ARTICLE_SOURCE = "article";
const ARTICLE_PROMPT_MARKER = "爆款图文设计";
const DEFAULT_COPY_MODEL = "deepseek-v4-pro";
const allowedImageCounts = new Set([1, 2, 3, 4]);
const validPackageStatuses = new Set(["pending", "processing", "partial_completed", "completed", "failed"]);

function getTemplateIdFromPayload(payload = {}) {
  return normalizeText(
    payload.templateId ||
      payload.styleTemplateId ||
      payload.selectedTemplateId ||
      payload.template?.id ||
      payload.imagePromptPlan?.template?.id ||
      payload.imagePromptPlan?.template?.legacyId,
    240
  );
}

function getTemplateForPayload(payload = {}) {
  const templateId = getTemplateIdFromPayload(payload);
  if (!templateId) return null;
  return findArticleStyleTemplate({
    templateId,
    visualStyle: normalizeText(payload.visualStyle || payload.imagePromptPlan?.visualStyle, 80)
  });
}

function mimeTypeFromTemplate(template) {
  const ext = String(template?.filename || "").split(".").pop()?.toLowerCase();
  if (ext === "png") return "image/png";
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  return "image/webp";
}

function getUserReferenceImageUrl(payload = {}) {
  return getUserReferenceImageUrls(payload)[0] || "";
}

function normalizeReferenceAsset(asset = {}) {
  const referenceImageUrl = normalizeText(asset.referenceImageUrl || asset.url, 1000);
  if (!referenceImageUrl) return null;
  return {
    referenceImageUrl,
    originalName: normalizeText(asset.originalName || asset.name, 160),
    mimeType: normalizeText(asset.mimeType, 80),
    size: Number(asset.size || 0) || null
  };
}

function getReferenceAssetCandidates(payload = {}) {
  return [
    ...(Array.isArray(payload.referenceAssets) ? payload.referenceAssets : []),
    payload.referenceAsset,
    ...(Array.isArray(payload.imagePromptPlan?.referenceAssets) ? payload.imagePromptPlan.referenceAssets : []),
    payload.imagePromptPlan?.referenceAsset,
    payload.referenceImageUrl ? { referenceImageUrl: payload.referenceImageUrl } : null,
    payload.imagePromptPlan?.referenceImageUrl ? { referenceImageUrl: payload.imagePromptPlan.referenceImageUrl } : null
  ].filter(Boolean);
}

function snapshotReferenceAssets(payload = {}) {
  const assets = getReferenceAssetCandidates(payload)
    .map(normalizeReferenceAsset)
    .filter(Boolean);
  const seen = new Set();
  return assets.filter((asset) => {
    if (seen.has(asset.referenceImageUrl)) return false;
    seen.add(asset.referenceImageUrl);
    return true;
  }).slice(0, 6);
}

function getUserReferenceImageUrls(payload = {}) {
  return snapshotReferenceAssets(payload).map((asset) => asset.referenceImageUrl);
}

function snapshotReferenceAsset(payload = {}) {
  return snapshotReferenceAssets(payload)[0] || null;
}

const wordCountGuides = {
  "短文案": "正文约 150-250 字，节奏紧凑，适合快速种草。",
  "适中": "正文约 350-550 字，信息完整，有体验和理由。",
  "长笔记": "正文约 700-1000 字，结构完整，含体验、卖点、适合人群和避坑提醒。"
};

const visualStylePrompts = {
  fresh: "清新明亮，小红书种草感，柔和自然光，干净留白",
  cute: "可爱治愈风，马卡龙粉蓝绿配色，圆润泡泡字标题，粗描边相框与贴纸装饰，云朵星星爱心元素，手账拼图排版，轻松活泼亲和，适合日常碎片、穿搭 OOTD、护肤打卡、学习记录",
  minimal: "极简高级风，大面积留白，黑白灰或低饱和纯色底，克制无衬线排版，少量文字层级清晰，细线图标点缀，无复杂装饰与贴纸，适合慢生活金句、穿搭 OOTD、周末探店、书单清单",
  bold: "大胆醒目风，高饱和霓虹撞色，强对比暗底亮字，超大粗体标题与发光描边，人物主体突出，贴纸便利贴/霓虹框/粉末粒子点缀，适合打卡宣言、活出色彩、首饰种草、夜景氛围大片",
  handdrawn: "手绘笔记风，轻插画元素，像真实博主整理的分享页",
  retro: "复古胶片感，暖色调，怀旧生活方式氛围",
  notion: "Notion 风，模块化信息卡片，简洁图标感，轻办公审美",
  blackboard: "黑板风，粉笔质感，知识笔记排版，重点清晰"
};

const contentTypePrompts = {
  "xiaohongshu-cover": "小红书封面，首图强吸引力，主体明确，适合封面点击",
  "knowledge-card": "知识卡片，重点清晰，信息层级明确，适合收藏学习",
  "quote-poster": "金句海报，情绪氛围突出，画面有记忆点",
  tutorial: "步骤教程图，流程感清楚，适合展示操作步骤和方法",
  "product-card": "产品卖点图，突出产品优势和使用价值，适合电商种草",
  comparison: "对比分析图，强调差异和选择理由，画面结构有对照感"
};

const layoutStylePrompts = {
  balanced: "均衡布局，主体、留白和信息区比例稳定",
  spacious: "留白布局，画面干净、呼吸感强，少量重点信息",
  dense: "密集布局，信息承载更强但保持可读性，适合多卖点表达",
  list: "列表布局，用清晰分组呈现要点，适合清单和攻略",
  contrast: "对比布局，左右或上下形成鲜明差异，适合前后/优劣对比",
  flow: "流程布局，按步骤或动线组织画面，适合教程和方法说明"
};

const imageRoleMap = {
  1: [{ role: "cover", title: "封面主视觉" }],
  2: [
    { role: "cover", title: "封面主视觉" },
    { role: "selling-point", title: "核心卖点/使用场景" }
  ],
  3: [
    { role: "cover", title: "封面主视觉" },
    { role: "detail", title: "产品细节/质感" },
    { role: "scenario", title: "人群/场景体验" }
  ],
  4: [
    { role: "cover", title: "封面主视觉" },
    { role: "detail", title: "产品细节" },
    { role: "scenario", title: "生活方式场景" },
    { role: "summary", title: "总结氛围/收藏引导" }
  ]
};

function parseJson(value, fallback) {
  if (!value) return fallback;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function normalizeText(value, max = 1000) {
  return String(value || "").trim().slice(0, max);
}

function normalizeTags(value) {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeText(item, 24)).filter(Boolean).slice(0, 6);
  }
  return normalizeText(value, 200)
    .split(/[,，#\s]+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 6);
}

function normalizeImageCount(value) {
  const count = Number(value || 1);
  if (!allowedImageCounts.has(count)) {
    throw createHttpError("imageCount must be 1, 2, 3 or 4", 400);
  }
  return count;
}

function ensureTopic(payload) {
  const topic = normalizeText(payload?.topic, 500);
  if (!topic) {
    throw createHttpError("topic is required", 400);
  }
  return topic;
}

function extractJsonObject(text) {
  const raw = String(text || "").trim();
  if (!raw) return null;
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1].trim() : raw;
  try {
    return JSON.parse(candidate);
  } catch {
    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(candidate.slice(start, end + 1));
    }
  }
  return null;
}

function buildCopyPrompt(payload) {
  const topic = ensureTopic(payload);
  const platform = normalizeText(payload.platform || "小红书种草", 80);
  const copyTemplate = normalizeText(payload.copyTemplate || "完整图文模板", 80);
  const wordCount = normalizeText(payload.wordCount || "适中", 40);
  const tone = normalizeText(payload.tone || payload.copyExpectation || "种草口语风", 80);
  const keywords = normalizeText(payload.keyword || payload.keywords, 300);
  const imageCount = normalizeImageCount(payload.imageCount || payload.count || 1);

  return {
    topic,
    platform,
    copyTemplate,
    wordCount,
    tone,
    keywords,
    imageCount,
    prompt: [
      "你是小红书爆款图文文案策划，请基于用户信息生成一套可直接发布的中文图文草案。",
      "只返回严格 JSON，不要 Markdown，不要解释。",
      "JSON 结构必须为：{\"title\":\"\",\"body\":\"\",\"tags\":[\"\"]}。",
      `平台/场景：${platform}`,
      `文案模板：${copyTemplate}`,
      `期望字数：${wordCount}。${wordCountGuides[wordCount] || wordCountGuides["适中"]}`,
      `文案预期/语气：${tone}`,
      `创作主题：${topic}`,
      `商品卖点关键词：${keywords || "用户未填写，请从主题里提炼卖点"}`,
      `后续会生成 ${imageCount} 张配图，正文不要写成图片提示词。`,
      "要求：标题有点击欲但不夸大；正文真实、有使用感、有适合人群/卖点/避坑提醒；标签 3-6 个；禁止医疗疗效、虚假承诺和绝对化表达。"
    ].join("\n")
  };
}

function normalizeCopyDraft(value, fallbackPayload) {
  const title = normalizeText(value?.title, 120) || `${fallbackPayload.topic.slice(0, 26)}，真实好用的种草分享`;
  const body = normalizeText(value?.body, 4000);
  if (!body) {
    throw createHttpError("Facemini copy response missing body", 502);
  }
  const tags = normalizeTags(value?.tags?.length ? value.tags : fallbackPayload.keywords || fallbackPayload.topic);
  return { title, body, tags };
}

function shortTitle(title) {
  return normalizeText(title, 22);
}

function buildImagePromptSegment({ copy, base, item, index, total }) {
  const tags = normalizeTags(copy.tags).map((tag) => `#${tag}`).join(" ");
  const visualStyle = visualStylePrompts[base.visualStyle] || normalizeText(base.visualStyle, 80) || visualStylePrompts.fresh;
  const contentType = contentTypePrompts[base.contentType] || normalizeText(base.contentType, 80) || contentTypePrompts["xiaohongshu-cover"];
  const layoutStyle = layoutStylePrompts[base.layoutStyle] || normalizeText(base.layoutStyle, 80) || layoutStylePrompts.balanced;
  const keywords = normalizeText(base.keywords, 220);
  const template = base.template;
  const referenceAssets = base.referenceAssets || [];
  const referenceAssetNames = referenceAssets.map((asset) => asset.originalName).filter(Boolean).join("、");
  const common = [
    `内容类型：${contentType}`,
    `布局方式：${layoutStyle}`,
    template ? `参考模板：${template.label || template.id}。${template.layoutHints || ""}` : "",
    template ? `模板风格约束：${template.promptHints || ""}` : "",
    template ? `模板文字约束：${template.textPolicy || ""}` : "",
    referenceAssets.length ? `用户上传了 ${referenceAssets.length} 张参考素材：最终图片必须清晰包含这些参考素材中的主体元素，不允许忽略、不允许只借用风格；可以重构场景和版式，但上传素材主体必须作为画面核心元素出现。` : "",
    referenceAssetNames ? `参考素材文件名：${referenceAssetNames}` : "",
    `${ARTICLE_PROMPT_MARKER}，${base.platform}，第 ${index}/${total} 张图，${item.title}。`,
    `主题：${base.topic}`,
    `核心卖点关键词：${keywords || "围绕标题和正文提炼商品卖点"}`,
    `标题参考：${shortTitle(copy.title)}`,
    `标签参考：${tags}`,
    `视觉画风：${visualStyle}`,
    `尺寸比例：${base.ratio}`,
    "图片文字硬约束：优先生成无文字画面；如必须出现文字，最多 1 个短标题或 0-2 个短标签，每段不超过 6 个中文字。",
    "禁止大段正文、卖点列表、复杂长文排版、密集小字、角标堆叠、满屏文字、二维码、水印、无关品牌标志、乱码、错别字。",
    "不要把正文、标签列表或完整卖点塞进图片；完整标题、正文和标签永远由前端 HTML 展示。",
    "保持同一套产品形象、色彩气质和版式语言，适合与同一篇图文成套发布。"
  ];
  const roleDirectives = {
    cover: "画面职责：首图封面，主体明确，画面尽量少字，最多保留一个短标题。",
    "selling-point": "画面职责：核心卖点或使用场景，用产品和场景表达价值，文字尽量不出现。",
    detail: "画面职责：产品细节、材质、质感或关键功能特写，避免文字说明。",
    scenario: "画面职责：目标人群或生活方式使用场景，氛围自然，强调代入感和适用场景。",
    summary: "画面职责：收尾氛围或收藏引导，像图文最后一页，最多 1 个短引导词。"
  };

  return {
    index,
    role: item.role,
    title: item.title,
    prompt: [...common, roleDirectives[item.role] || roleDirectives.cover].filter(Boolean).join("\n"),
    textPolicy: "minimal_text"
  };
}

export function buildImagePromptPlan({ copy, payload }) {
  const count = normalizeImageCount(payload.imageCount || payload.count || payload.imagePromptPlan?.count || 1);
  const ratio = normalizeText(payload.ratio || payload.imagePromptPlan?.ratio || "3:4", 20);
  const visualStyle = normalizeText(payload.visualStyle || payload.imagePromptPlan?.visualStyle || "fresh", 80);
  const contentType = normalizeText(payload.contentType || payload.imagePromptPlan?.contentType || "xiaohongshu-cover", 80);
  const layoutStyle = normalizeText(payload.layoutStyle || payload.imagePromptPlan?.layoutStyle || "balanced", 80);
  const template = snapshotArticleStyleTemplate(getTemplateForPayload(payload));
  const referenceAssets = snapshotReferenceAssets(payload);
  const base = {
    platform: normalizeText(payload.platform || "小红书种草", 80),
    topic: ensureTopic(payload),
    keywords: normalizeText(payload.keyword || payload.keywords, 300),
    ratio,
    visualStyle,
    contentType,
    layoutStyle,
    template,
    referenceAssets
  };
  const roles = imageRoleMap[count] || imageRoleMap[1];
  const segments = roles.map((item, idx) => buildImagePromptSegment({
    copy,
    base,
    item,
    index: idx + 1,
    total: count
  }));
  return {
    count,
    ratio,
    visualStyle,
    contentType,
    layoutStyle,
    template,
    referenceAsset: referenceAssets[0] || null,
    referenceAssets,
    segments
  };
}

async function uploadTemplateReferenceImage(template) {
  if (!template?.filePath) return "";
  const upload = await uploadFileToKie({
    filePath: template.filePath,
    fileName: template.filename || "article-template.webp",
    mimeType: mimeTypeFromTemplate(template),
    uploadPath: "article-templates"
  });
  return upload.url || "";
}

async function getDeepSeekCopyModel() {
  const model = await findChatModel(getPool(), DEFAULT_COPY_MODEL);
  if (model) return model;
  return {
    provider_type: "deepseek",
    provider_model: DEFAULT_COPY_MODEL,
    model_key: DEFAULT_COPY_MODEL
  };
}

function isArticleTask(task) {
  return (
    task?.source === ARTICLE_SOURCE ||
    task?.prompt?.includes(ARTICLE_PROMPT_MARKER)
  )
}

function ensureArticleSource(task) {
  return task ? { ...task, source: ARTICLE_SOURCE } : task;
}

function taskIdsFromPackage(row) {
  return parseJson(row.image_task_ids_json, []).map((id) => Number(id)).filter((id) => Number.isFinite(id));
}

function derivePackageStatus(tasks) {
  if (!tasks.length) return "pending";
  const completed = tasks.filter((task) => task.status === "completed").length;
  const failed = tasks.filter((task) => task.status === "failed").length;
  if (completed === tasks.length) return "completed";
  if (failed === tasks.length) return "failed";
  if (completed > 0 || failed > 0) return "partial_completed";
  if (tasks.some((task) => task.status === "processing")) return "processing";
  return "pending";
}

function mapPackage(row, tasks = []) {
  const tags = parseJson(row.tags_json, []);
  const imagePromptPlan = parseJson(row.image_prompt_plan_json, null);
  const segments = imagePromptPlan?.segments || [];
  const imageTasks = tasks.map((task, index) => {
    const segment = segments[index] || {};
    return {
      ...task,
      index: segment.index || index + 1,
      role: segment.role || "image",
      segmentTitle: segment.title || `配图 ${index + 1}`,
      prompt: task.prompt || segment.prompt || "",
      imageUrl: task.imageUrl || task.image || null
    };
  });
  const images = imageTasks.map((task) => task.imageUrl || task.image).filter(Boolean);
  const status = validPackageStatuses.has(row.status) ? row.status : derivePackageStatus(imageTasks);
  const points = imageTasks.reduce((sum, task) => sum + Number(task.points || 0), 0);
  return {
    id: `package-${row.id}`,
    packageId: row.id,
    threadId: row.thread_id,
    source: ARTICLE_SOURCE,
    type: "package",
    copy: { title: row.title, body: row.body, tags },
    title: row.title,
    body: row.body,
    tags,
    imagePromptPlan,
    imageTasks,
    images,
    image: images[0] || null,
    imageUrl: images[0] || null,
    model: row.model_key,
    modelKey: row.model_key,
    ratio: row.ratio,
    quality: row.quality,
    count: segments.length || imageTasks.length || 1,
    time: row.created_at,
    status,
    grid: true,
    favorite: Boolean(row.favorite),
    points,
    price: points ? `${points} 积分` : null,
    error: imageTasks.find((task) => task.error)?.error || null
  };
}

async function hydratePackage(row, userId) {
  const taskIds = taskIdsFromPackage(row);
  const tasks = [];
  for (const id of taskIds) {
    const task = await getImageTask(id, userId);
    if (task) tasks.push(ensureArticleSource(task));
  }
  const status = derivePackageStatus(tasks);
  if (status !== row.status) {
    await updateArticlePackageStatus(row.id, status).catch(() => {});
    row.status = status;
  }
  return mapPackage(row, tasks);
}

export async function getModels() {
  return getImageModels();
}

export async function createCopyDraft(payload, userId) {
  const copyPrompt = buildCopyPrompt(payload);
  const model = await getDeepSeekCopyModel();
  const taskId = `article-copy-${Date.now()}-${randomUUID().slice(0, 8)}`;
  const costPoints = BILLING_RULES.articleTextPoints;
  await chargeCredits({ userId, taskId, amount: costPoints, memo: "article copy debit" });
  let provider;
  try {
    provider = await createDeepSeekChatResponse({
      model,
      messages: [
        { role: "system", content: "你只输出用户要求的严格 JSON。" },
        { role: "user", content: copyPrompt.prompt }
      ],
      reasoningEffort: "none"
    });
  } catch (error) {
    await refundChargedCredits({ userId, taskId, amount: costPoints, memo: "article copy refund" });
    throw createHttpError(`Facemini 文案生成失败：${error.message}`, error.status || 502);
  }
  const parsed = extractJsonObject(provider.text);
  if (!parsed) {
    await refundChargedCredits({ userId, taskId, amount: costPoints, memo: "article copy invalid response refund" });
    throw createHttpError("Facemini copy response is not valid JSON", 502);
  }
  const copy = normalizeCopyDraft(parsed, copyPrompt);
  const imagePromptPlan = buildImagePromptPlan({ copy, payload: { ...payload, ...copyPrompt } });
  return { copy, imagePromptPlan, points: costPoints, price: `${costPoints} 积分` };
}

export async function listTasks({ userId, filter = "all" } = {}) {
  const [packages, tasks] = await Promise.all([
    listArticlePackageRows({ userId, filter }),
    listImageTasks({ userId, filter, source: ARTICLE_SOURCE })
  ]);
  const packageItems = [];
  const packageTaskIds = new Set();
  for (const row of packages) {
    taskIdsFromPackage(row).forEach((id) => packageTaskIds.add(id));
    packageItems.push(await hydratePackage(row, userId));
  }
  const legacyItems = tasks
    .filter(isArticleTask)
    .filter((task) => !packageTaskIds.has(Number(task.id)))
    .map(ensureArticleSource);
  return [...packageItems, ...legacyItems];
}

export async function getTask(id, userId) {
  const task = await getImageTask(id, userId)
  return isArticleTask(task) ? ensureArticleSource(task) : null
}

export async function createTask(payload, userId) {
  const task = await createImageTask({
    ...payload,
    source: ARTICLE_SOURCE
  }, userId);
  return ensureArticleSource(task);
}

export async function createPackage(payload, userId) {
  const copy = normalizeCopyDraft(payload.copy, {
    topic: normalizeText(payload.topic || payload.copy?.title, 120),
    keywords: payload.keywords || payload.keyword
  });
  const requestedCount = normalizeImageCount(payload.imageCount || payload.count || payload.imagePromptPlan?.count || 1);
  const requestedTemplateId = getTemplateIdFromPayload(payload);
  const planTemplateId = getTemplateIdFromPayload({ imagePromptPlan: payload.imagePromptPlan });
  const shouldReusePromptPlan =
    payload.imagePromptPlan?.segments?.length &&
    Number(payload.imagePromptPlan.count || payload.imagePromptPlan.segments.length) === requestedCount &&
    (!payload.ratio || payload.imagePromptPlan.ratio === payload.ratio) &&
    (!payload.visualStyle || payload.imagePromptPlan.visualStyle === payload.visualStyle) &&
    (!payload.contentType || payload.imagePromptPlan.contentType === payload.contentType) &&
    (!payload.layoutStyle || payload.imagePromptPlan.layoutStyle === payload.layoutStyle) &&
    (!requestedTemplateId || requestedTemplateId === planTemplateId);
  const imagePromptPlan = shouldReusePromptPlan
    ? {
        ...payload.imagePromptPlan,
        count: requestedCount,
        segments: payload.imagePromptPlan.segments.slice(0, 4)
      }
    : buildImagePromptPlan({ copy, payload });
  const count = normalizeImageCount(imagePromptPlan.count || imagePromptPlan.segments.length);
  const segments = imagePromptPlan.segments.slice(0, count);
  const selectedTemplate = getTemplateForPayload({ ...payload, imagePromptPlan });
  if ((requestedTemplateId || planTemplateId) && !selectedTemplate) {
    throw createHttpError("selected article style template not found", 400);
  }
  const model = normalizeText(payload.model || "gpt_image_2", 80);
  const templateReferenceImageUrl = selectedTemplate
    ? await uploadTemplateReferenceImage(selectedTemplate)
    : "";
  const finalImagePromptPlan = {
    ...imagePromptPlan,
    count,
    segments,
    template: imagePromptPlan.template || snapshotArticleStyleTemplate(selectedTemplate),
    referenceAsset: imagePromptPlan.referenceAsset || snapshotReferenceAsset(payload),
    referenceAssets: imagePromptPlan.referenceAssets || snapshotReferenceAssets(payload)
  };
  const ratio = normalizeText(payload.ratio || imagePromptPlan.ratio || "3:4", 20);
  const quality = normalizeText(payload.quality || "2K", 20);
  const threadId = normalizeText(payload.threadId, 80) || `article-${Date.now()}-${randomUUID().slice(0, 8)}`;

  const connection = await getPool().getConnection();
  let packageId;
  try {
    await connection.beginTransaction();
    packageId = await createArticlePackage(connection, {
      userId,
      threadId,
      title: copy.title,
      body: copy.body,
      tags: copy.tags,
      imagePromptPlan: { ...finalImagePromptPlan, ratio },
      modelKey: model,
      ratio,
      quality
    });
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  const taskIds = [];
  for (const segment of segments) {
    const taskReferenceImageUrls = [
      ...getUserReferenceImageUrls({ ...payload, imagePromptPlan: finalImagePromptPlan }),
      templateReferenceImageUrl
    ].filter(Boolean);
    const task = await createImageTask({
      prompt: segment.prompt,
      model,
      ratio,
      quality,
      count: 1,
      source: ARTICLE_SOURCE,
      threadId,
      referenceImageUrl: taskReferenceImageUrls[0] || "",
      referenceImageUrls: taskReferenceImageUrls,
      contextTaskIds: taskIds
    }, userId);
    taskIds.push(task.id);
  }

  const updateConnection = await getPool().getConnection();
  try {
    await updateConnection.beginTransaction();
    await updateArticlePackageTaskIds(updateConnection, packageId, taskIds);
    await updateConnection.commit();
  } catch (error) {
    await updateConnection.rollback();
    throw error;
  } finally {
    updateConnection.release();
  }

  return getPackage(packageId, userId);
}

export async function getPackage(id, userId) {
  const packageId = String(id || "").replace(/^package-/, "");
  const row = await findArticlePackageRow(packageId, userId);
  return row ? hydratePackage(row, userId) : null;
}

export async function toggleFavorite(id, userId) {
  const packageMatch = String(id || "").match(/^package-(\d+)$/);
  if (packageMatch) {
    await toggleArticlePackageFavorite(packageMatch[1], userId);
    return getPackage(packageMatch[1], userId);
  }
  const task = await getTask(id, userId);
  if (!task) return null;
  return ensureArticleSource(await toggleImageFavorite(id, userId));
}

export async function deleteTask(id, userId) {
  const packageMatch = String(id || "").match(/^package-(\d+)$/);
  if (packageMatch) {
    const existing = await getPackage(packageMatch[1], userId);
    if (existing?.imageTasks?.length) {
      await Promise.all(existing.imageTasks.map((task) => deleteImageTask(task.id, userId).catch(() => null)));
    }
    return deleteArticlePackageRow(packageMatch[1], userId);
  }
  const task = await getTask(id, userId);
  if (!task) return { ok: false };
  return deleteImageTask(id, userId);
}
