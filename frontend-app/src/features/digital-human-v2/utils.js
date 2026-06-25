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

export const SCRIPT_MAX_LENGTH = 500;

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

export function matchVoiceForAvatar(avatar, voices = []) {
  if (!voices.length) return null;
  const text = `${avatar?.name || ""} ${avatar?.description || ""}`;
  for (const rule of VOICE_MATCH_RULES) {
    if (!rule.pattern.test(text)) continue;
    const matched = voices.find((voice) => rule.voiceIds.includes(voice.id));
    if (matched) return matched;
  }
  return voices.find((voice) => voice.id === "female-qn-qingse") || voices[0];
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
