export function normalizePublicAvatars(list = []) {
  return (Array.isArray(list) ? list : []).map((item) => ({
    ...item,
    cover: item.cover || item.assetPath || item.imagePath || item.posterPath,
    poster:
      item.poster ||
      item.posterPath ||
      getPosterPath(item.cover || item.assetPath),
  }));
}

export function getPosterPath(value) {
  const source = String(value || "").split(/[?#]/)[0];
  const match = source.match(/^(.+)\/([^/]+)\.(mp4|webm|mov)$/i);
  if (!match) return "";
  return `${match[1]}/posters/${match[2]}.jpg`;
}

export function isVideoCover(value) {
  const source = String(value || "").split(/[?#]/)[0];
  return /\.(mp4|webm|mov)$/i.test(source);
}

export function resolveAvatarSelection(current, avatarData) {
  const publicList = normalizePublicAvatars(avatarData.public);
  const mineList = Array.isArray(avatarData.mine) ? avatarData.mine : [];
  const matched = current?.id
    ? [...publicList, ...mineList].find((item) => String(item.id) === String(current.id))
    : null;
  return matched || current || null;
}

export function estimateSpeechSeconds(text = "") {
  const trimmed = String(text || "").trim();
  if (!trimmed) return 0;
  return Math.max(1, Math.ceil(trimmed.length / 4));
}

export function formatVoiceDuration(seconds = 0) {
  const value = Number(seconds || 0);
  if (!value) return "0s";
  return `${value}s`;
}

export function formatSpeechDurationFromMs(durationMs = 0) {
  const seconds = Number(durationMs || 0) / 1000;
  if (!seconds) return "0s";
  const rounded = Math.round(seconds * 10) / 10;
  return Number.isInteger(rounded) ? `${rounded}s` : `${rounded.toFixed(1)}s`;
}

export const SCRIPT_MAX_LENGTH = 500;

/** 数字人视频生成当前已接入的音色（与历史配置一致） */
export const ENABLED_DIGITAL_HUMAN_VOICE_IDS = [
  "female-shaonv",
  "female-yujie",
  "female-tianmei",
  "female-qn-qingse",
  "female-chengshu",
  "presenter_female",
  "Chinese (Mandarin)_HK_Flight_Attendant",
  "moss_audio_ce44fc67-7ce3-11f0-8de5-96e35d26fb85",
  "moss_audio_aaa1346a-7ce7-11f0-8e61-2e6e3c7ee85d",
];

export const VOICE_UNAVAILABLE_HINT = "当前音色暂未开放";

export function isDigitalHumanVoiceEnabled(voiceId) {
  return ENABLED_DIGITAL_HUMAN_VOICE_IDS.includes(String(voiceId || ""));
}

export function pickEnabledVoiceId(voices = [], preferredId = "") {
  if (preferredId && isDigitalHumanVoiceEnabled(preferredId)) {
    return preferredId;
  }
  const enabledVoice = voices.find((voice) => isDigitalHumanVoiceEnabled(voice.id));
  return enabledVoice?.id || "";
}

export const SCRIPT_OPTIMIZE_TEMPLATES = [
  {
    id: "live-sales",
    title: "直播带货版",
    description: "增强感染力、增加引导下单话术、节奏轻快",
  },
  {
    id: "gentle",
    title: "温柔讲解版",
    description: "平缓柔和，适合科普、母婴、知识分享",
  },
  {
    id: "short-video",
    title: "精简短视频版",
    description: "压缩短句，适配 15 秒短视频，去除冗余文字",
  },
  {
    id: "business",
    title: "正式商务版",
    description: "严谨克制，企业宣讲、产品介绍专用",
  },
];

export function buildScriptOptimizePrompt(segment, template) {
  return `你是专业的数字人口播台词优化师。请把以下台词改写为「${template.title}」风格。
风格要求：${template.description}
规则：
1. 保持原意，不要编造不存在的产品信息
2. 只输出优化后的台词正文，不要标题、说明或引号
3. 使用中文

待优化台词：
${segment}`;
}

export function replaceScriptSegment(text, start, end, replacement) {
  const next = `${text.slice(0, start)}${replacement}${text.slice(end)}`;
  return next.slice(0, SCRIPT_MAX_LENGTH);
}

export const VIDEO_SPEC_OPTIONS = [
  { value: "9:16-720p-30", label: "9:16 - 720p - 30FPS" },
  { value: "16:9-720p-30", label: "16:9 - 720p - 30FPS" },
  { value: "1:1-720p-30", label: "1:1 - 720p - 30FPS" },
];

export const ASPECT_RATIO_OPTIONS = [
  { value: "all", label: "画面比例" },
  { value: "9:16", label: "9:16" },
  { value: "16:9", label: "16:9" },
  { value: "1:1", label: "1:1" },
];

export const FILL_MODE_OPTIONS = [
  { value: "cover", label: "充满画面" },
  { value: "contain", label: "完整显示" },
];

export function getVideoResolutionLabel(videoSpec = "") {
  const match = String(videoSpec).match(/(\d+p)/i);
  return match ? match[1].toLowerCase() : "720p";
}

const AVATAR_TAG_RULES = [
  { pattern: /科普|知识|健康|讲解/, label: "知识科普" },
  { pattern: /主播|带货|运营/, label: "直播带货" },
  { pattern: /财经|商务|高管|职场/, label: "商务宣讲" },
  { pattern: /文旅|旅行/, label: "生活分享" },
  { pattern: /时尚|美妆/, label: "时尚种草" },
  { pattern: /房地产|经纪人/, label: "房产经纪" },
];

const VOICE_MATCH_RULES = [
  {
    pattern: /科普|知识|健康|讲解/,
    voiceIds: ["female-qn-qingse", "audiobook_male_1", "moss_audio_aaa1346a-7ce7-11f0-8e61-2e6e3c7ee85d"],
    hint: "系统自动匹配适配科普人设音色",
  },
  {
    pattern: /主播|带货|运营|种草/,
    voiceIds: ["female-tianmei", "presenter_female"],
    hint: "系统自动匹配适配直播带货人设音色",
  },
  {
    pattern: /财经|商务|高管|企业|职场/,
    voiceIds: ["male-qn-jingying", "presenter_male", "female-chengshu"],
    hint: "系统自动匹配适配商务宣讲人设音色",
  },
  {
    pattern: /文旅|旅行|探店/,
    voiceIds: ["male-qn-daxuesheng", "Chinese (Mandarin)_HK_Flight_Attendant"],
    hint: "系统自动匹配适配生活分享人设音色",
  },
  {
    pattern: /男/,
    voiceIds: ["male-qn-qingse", "presenter_male", "male-qn-jingying"],
    hint: "系统自动匹配适配男声形象音色",
  },
];

export const VOICE_CATEGORIES = [
  { id: "all", label: "全部" },
  { id: "knowledge", label: "知识科普", pattern: /科普|讲解|知识|课程|纪录片|自然中文/ },
  { id: "life", label: "生活分享", pattern: /生活|探店|旅游|自然|年轻|开朗|甜美|阳光/ },
  { id: "host", label: "活动主持", pattern: /主持|活动|服务|亲切|专业女|女主播/ },
  { id: "news", label: "新闻播报", pattern: /新闻|播报|正式|政企|稳重|沉稳|专业男/ },
];

export function getAvatarTags(avatar) {
  const text = `${avatar?.name || ""} ${avatar?.description || ""}`;
  const tags = AVATAR_TAG_RULES.filter((rule) => rule.pattern.test(text)).map(
    (rule) => rule.label,
  );
  const language = String(avatar?.language || "").split("/")[0]?.trim();
  if (language && !tags.includes(language)) tags.push(language);
  return tags.length ? tags.slice(0, 2) : ["数字人"];
}

export function getAvatarCategoryLabel(avatar) {
  if (avatar?.category) return avatar.category;
  const tags = getAvatarTags(avatar);
  return tags[0] || "数字人";
}

export function filterReadyMineAvatars(list = []) {
  return (Array.isArray(list) ? list : []).filter((item) => {
    const status = String(item?.status || "ready").toLowerCase();
    return status === "ready" || status === "active";
  });
}

export function matchVoiceForAvatar(avatar, voices = []) {
  const enabledVoices = voices.filter((voice) => isDigitalHumanVoiceEnabled(voice.id));
  if (!enabledVoices.length) return null;
  const text = `${avatar?.name || ""} ${avatar?.description || ""}`;
  for (const rule of VOICE_MATCH_RULES) {
    if (!rule.pattern.test(text)) continue;
    const matched = enabledVoices.find((voice) => rule.voiceIds.includes(voice.id));
    if (matched) return matched;
  }
  return (
    enabledVoices.find((voice) => voice.id === "female-qn-qingse") || enabledVoices[0]
  );
}

export function getVoiceMatchHint(avatar) {
  const text = `${avatar?.name || ""} ${avatar?.description || ""}`;
  const rule = VOICE_MATCH_RULES.find((item) => item.pattern.test(text));
  return rule?.hint || "系统已根据形象特征自动推荐音色";
}

export function filterVoicesByCategory(voices = [], categoryId = "all") {
  if (categoryId === "all") return voices;
  const category = VOICE_CATEGORIES.find((item) => item.id === categoryId);
  if (!category?.pattern) return voices;
  return voices.filter((voice) =>
    category.pattern.test(`${voice.name || ""} ${voice.description || ""}`),
  );
}

export const VOICE_EMOTION_OPTIONS = ["中性", "高兴", "愤怒", "悲伤", "害怕", "厌恶", "惊讶"];

export const VOICE_EMOTION_VALUE_MAP = {
  中性: "",
  高兴: "happy",
  愤怒: "angry",
  悲伤: "sad",
  害怕: "fear",
  厌恶: "disgust",
  惊讶: "surprised",
};

export function getVoiceEmotionValue(emotionLabel = "中性") {
  return VOICE_EMOTION_VALUE_MAP[emotionLabel] || "";
}

export function getVoiceEmotionLabel(emotionValue = "") {
  if (!emotionValue) return "中性";
  const matched = Object.entries(VOICE_EMOTION_VALUE_MAP).find(
    ([, value]) => value === emotionValue,
  );
  return matched?.[0] || "中性";
}

export function taskToMineLibraryItem(task) {
  return {
    libraryId: `task-${task.id}`,
    sourceType: "task",
    task,
    id: task.avatarId,
    avatarId: task.avatarId,
    name: task.avatarName || "数字人形象",
    cover: task.thumbnailUrl || task.resultUrl || "",
    poster: task.thumbnailUrl || "",
    category: task.voiceName || "数字人形象",
    voiceId: task.voiceId,
    voiceSpeed: Number(task.speed) || 1,
    text: task.text || "",
    resultUrl: task.resultUrl || "",
  };
}

export function photoTaskToMineLibraryItem(task) {
  const voiceName = task.voiceName || "自定义人像";
  return {
    libraryId: `photo-task-${task.id}`,
    sourceType: "photo-task",
    task,
    id: `photo-task-${task.id}`,
    name: "照片数字人",
    cover: task.thumbnailUrl || task.resultUrl || task.portraitUrl || "",
    poster: task.thumbnailUrl || task.portraitUrl || "",
    category: voiceName,
    voiceId: task.voiceId,
    voiceSpeed: Number(task.speed) || 1,
    text: task.text || "",
    resultUrl: task.resultUrl || "",
    portraitUrl: task.portraitUrl || "",
  };
}

export function photoTaskToSelectedAvatar(item) {
  const task = item?.task || item;
  const portrait = task?.portraitUrl || item?.portraitUrl || "";
  const preview = portrait || task?.thumbnailUrl || task?.resultUrl || item?.cover || "";
  return {
    id: item?.libraryId || `photo-task-${task?.id}`,
    name: item?.name || "照片数字人",
    cover: preview,
    poster: task?.thumbnailUrl || portrait,
    language: "照片数字人",
    category: item?.category || task?.voiceName || "照片数字人",
    tags: ["照片数字人"],
    portraitUrl: portrait,
    isPhotoPortrait: true,
  };
}

export function getMineLibraryItems(photoTasks = []) {
  return (Array.isArray(photoTasks) ? photoTasks : [])
    .filter(
      (task) =>
        task?.status === "completed" &&
        (task.thumbnailUrl || task.resultUrl || task.portraitUrl),
    )
    .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")))
    .map(photoTaskToMineLibraryItem);
}

export function getDigitalHumanMineLibraryItems(tasks = [], mineAvatars = []) {
  const completedTasks = (Array.isArray(tasks) ? tasks : [])
    .filter(
      (task) =>
        task?.status === "completed" && (task.thumbnailUrl || task.resultUrl),
    )
    .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")))
    .map(taskToMineLibraryItem);

  const usedAvatarIds = new Set(
    completedTasks.map((item) => String(item.avatarId || "")).filter(Boolean),
  );

  const orphanAvatars = filterReadyMineAvatars(mineAvatars)
    .filter((avatar) => !usedAvatarIds.has(String(avatar.id)))
    .map((avatar) => ({
      ...avatar,
      libraryId: `avatar-${avatar.id}`,
      sourceType: "avatar",
    }));

  return [...completedTasks, ...orphanAvatars];
}

export const DHV2_DRAFTS_STORAGE_KEY = "dhv2-workspace-drafts";
export const DHV2_DRAFTS_MAX = 12;

export function loadWorkspaceDrafts() {
  try {
    const raw = localStorage.getItem(DHV2_DRAFTS_STORAGE_KEY);
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function persistWorkspaceDrafts(drafts = []) {
  try {
    localStorage.setItem(DHV2_DRAFTS_STORAGE_KEY, JSON.stringify(drafts));
  } catch {
    // ignore quota errors
  }
}

export function snapshotAvatar(avatar) {
  if (!avatar?.id) return null;
  return {
    id: avatar.id,
    name: avatar.name || "",
    cover: avatar.cover || "",
    poster: avatar.poster || "",
    tags: Array.isArray(avatar.tags) ? avatar.tags.slice(0, 4) : [],
    aspectRatio: avatar.aspectRatio || avatar.ratio || "",
  };
}

export function createWorkspaceDraft(snapshot) {
  return {
    id: `draft-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: Date.now(),
    ...snapshot,
  };
}

export function formatDraftTime(timestamp = Date.now()) {
  const date = new Date(timestamp);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${month}/${day} ${hours}:${minutes}`;
}

export function resolveAvatarFromDraft(draft, avatarData) {
  if (!draft) return null;
  const publicList = normalizePublicAvatars(avatarData?.public);
  const mineList = Array.isArray(avatarData?.mine) ? avatarData.mine : [];
  const matched = [...publicList, ...mineList].find(
    (item) => String(item.id) === String(draft.avatarId),
  );
  if (matched) return matched;
  if (draft.avatar?.id) {
    return {
      ...draft.avatar,
      cover: draft.avatar.cover || "",
      poster: draft.avatar.poster || "",
    };
  }
  return null;
}
