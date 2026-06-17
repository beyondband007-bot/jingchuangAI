import { randomUUID } from "crypto";
import { getPool } from "../../db/pool.js";
import { createDeepSeekChatResponse } from "../../providers/deepseek/chat.js";
import { createHttpError } from "../../shared/http.js";
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

const wordCountGuides = {
  "短文案": "正文约 150-250 字，节奏紧凑，适合快速种草。",
  "适中": "正文约 350-550 字，信息完整，有体验和理由。",
  "长笔记": "正文约 700-1000 字，结构完整，含体验、卖点、适合人群和避坑提醒。"
};

const visualStylePrompts = {
  fresh: "清新明亮，小红书种草感，柔和自然光，干净留白",
  cute: "可爱治愈，柔软色块，亲和手账感，轻松活泼",
  minimal: "极简高级，低噪声背景，克制排版，产品主体清晰",
  bold: "大胆醒目，高对比商业视觉，强标题区，适合促销和爆品",
  handdrawn: "手绘笔记风，轻插画元素，像真实博主整理的分享页",
  retro: "复古胶片感，暖色调，怀旧生活方式氛围",
  notion: "Notion 风，模块化信息卡片，简洁图标感，轻办公审美",
  blackboard: "黑板风，粉笔质感，知识笔记排版，重点清晰"
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
    throw createHttpError("DeepSeek copy response missing body", 502);
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
  const keywords = normalizeText(base.keywords, 220);
  const common = [
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
    prompt: [...common, roleDirectives[item.role] || roleDirectives.cover].join("\n"),
    textPolicy: "minimal_text"
  };
}

export function buildImagePromptPlan({ copy, payload }) {
  const count = normalizeImageCount(payload.imageCount || payload.count || payload.imagePromptPlan?.count || 1);
  const ratio = normalizeText(payload.ratio || payload.imagePromptPlan?.ratio || "3:4", 20);
  const visualStyle = normalizeText(payload.visualStyle || payload.imagePromptPlan?.visualStyle || "fresh", 80);
  const base = {
    platform: normalizeText(payload.platform || "小红书种草", 80),
    topic: ensureTopic(payload),
    keywords: normalizeText(payload.keyword || payload.keywords, 300),
    ratio,
    visualStyle
  };
  const roles = imageRoleMap[count] || imageRoleMap[1];
  const segments = roles.map((item, idx) => buildImagePromptSegment({
    copy,
    base,
    item,
    index: idx + 1,
    total: count
  }));
  return { count, ratio, visualStyle, segments };
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

export async function createCopyDraft(payload) {
  const copyPrompt = buildCopyPrompt(payload);
  const model = await getDeepSeekCopyModel();
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
    throw createHttpError(`DeepSeek 文案生成失败：${error.message}`, error.status || 502);
  }
  const parsed = extractJsonObject(provider.text);
  if (!parsed) {
    throw createHttpError("DeepSeek copy response is not valid JSON", 502);
  }
  const copy = normalizeCopyDraft(parsed, copyPrompt);
  const imagePromptPlan = buildImagePromptPlan({ copy, payload: { ...payload, ...copyPrompt } });
  return { copy, imagePromptPlan };
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
  const shouldReusePromptPlan =
    payload.imagePromptPlan?.segments?.length &&
    Number(payload.imagePromptPlan.count || payload.imagePromptPlan.segments.length) === requestedCount &&
    (!payload.ratio || payload.imagePromptPlan.ratio === payload.ratio) &&
    (!payload.visualStyle || payload.imagePromptPlan.visualStyle === payload.visualStyle);
  const imagePromptPlan = shouldReusePromptPlan
    ? {
        ...payload.imagePromptPlan,
        count: requestedCount,
        segments: payload.imagePromptPlan.segments.slice(0, 4)
      }
    : buildImagePromptPlan({ copy, payload });
  const count = normalizeImageCount(imagePromptPlan.count || imagePromptPlan.segments.length);
  const segments = imagePromptPlan.segments.slice(0, count);
  const model = normalizeText(payload.model || "gpt_image_2", 80);
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
      imagePromptPlan: { ...imagePromptPlan, count, ratio, segments },
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
    const task = await createImageTask({
      prompt: segment.prompt,
      model,
      ratio,
      quality,
      count: 1,
      source: ARTICLE_SOURCE,
      threadId,
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
