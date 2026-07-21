import { config } from "../config/index.js";

export const BILLING_RULES = Object.freeze({
  imagePointsPerItem: 30,
  videoPointsPerSecond: 120,
  voiceGenerationPoints: 2000,
  voiceConversionPoints: 2000,
  voicePointsPerSecond: 1,
  musicPointsPerSecond: 2,
  musicMinimumPoints: 30,
  transcribePointsPerSecond: 1,
  voiceClonePoints: 2000,
  articleTextPoints: 10,
  replicateImagePoints: 5,
  replicateVideoPoints: 10,
  textBasePoints: 2,
  textPointsPer1000Chars: 2,
  speechCharactersPerSecond: 4,
  defaultMusicSeconds: 30
});

function positiveNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

export function ceilSeconds(value, valueIsMilliseconds = false) {
  const raw = positiveNumber(value);
  return Math.max(0, Math.ceil(valueIsMilliseconds ? raw / 1000 : raw));
}

export function estimateSpeechSeconds(text) {
  const length = String(text || "").trim().length;
  return Math.max(1, Math.ceil(length / BILLING_RULES.speechCharactersPerSecond));
}

export function calculateImagePoints(count = 1) {
  return Math.max(1, Math.ceil(positiveNumber(count, 1))) * BILLING_RULES.imagePointsPerItem;
}

export function calculateVideoPoints(durationSeconds) {
  return ceilSeconds(durationSeconds) * BILLING_RULES.videoPointsPerSecond;
}

export function calculateVoicePoints({ durationSeconds, durationMs, text } = {}) {
  const seconds = durationMs
    ? ceilSeconds(durationMs, true)
    : ceilSeconds(durationSeconds || estimateSpeechSeconds(text));
  return Math.max(1, seconds * BILLING_RULES.voicePointsPerSecond);
}

export function calculateMusicPoints(durationSeconds) {
  const seconds = ceilSeconds(durationSeconds || BILLING_RULES.defaultMusicSeconds);
  return Math.max(BILLING_RULES.musicMinimumPoints, seconds * BILLING_RULES.musicPointsPerSecond);
}

export function calculateTranscribePoints({ durationSeconds, durationMs } = {}) {
  const seconds = durationMs ? ceilSeconds(durationMs, true) : ceilSeconds(durationSeconds);
  return Math.max(1, seconds * BILLING_RULES.transcribePointsPerSecond);
}

export function calculateTextPoints({ outputChars = 1000, conversationRound = 1 } = {}) {
  const chars = Math.max(1, Math.ceil(positiveNumber(outputChars, 1000)));
  const round = Math.max(1, Math.ceil(positiveNumber(conversationRound, 1)));
  const roundSurcharge = round >= 16 ? 5 : round >= 6 ? 2 : 0;
  return BILLING_RULES.textBasePoints
    + Math.ceil(chars / 1000) * BILLING_RULES.textPointsPer1000Chars
    + roundSurcharge;
}

function item(key, label, points, meta = {}) {
  return { key, label, points: Math.max(0, Math.ceil(Number(points) || 0)), ...meta };
}

export function calculateBillingQuote(feature, payload = {}) {
  const key = String(feature || "").trim();
  const items = [];
  const durationSeconds = positiveNumber(payload.durationSeconds || payload.duration);
  const durationMs = positiveNumber(payload.durationMs);
  const mediaKind = String(payload.kind || payload.mediaType || "image").toLowerCase();

  switch (key) {
    case "image":
      items.push(item("image", "生成图片", calculateImagePoints(payload.count || payload.imageCount || 1)));
      break;
    case "video":
    case "motion-transfer":
    case "face-swap":
      items.push(item("video", "生成视频", calculateVideoPoints(durationSeconds)));
      if (payload.generateImage) items.push(item("image", "生成首帧图片", calculateImagePoints(payload.imageCount || 1)));
      break;
    case "digital-human":
    case "image-digital-human":
      items.push(item("video", "数字人视频", calculateVideoPoints(durationSeconds)));
      if (!payload.uploadedAudio && payload.text) {
        items.push(item("voice", "AI 配音", calculateVoicePoints({ durationSeconds, durationMs, text: payload.text })));
      }
      if (payload.generatedText) {
        items.push(item("text", "AI 文案", calculateTextPoints({ outputChars: payload.outputChars || String(payload.text || "").length })));
      }
      break;
    case "chat":
      items.push(item("text", "AI 对话", calculateTextPoints(payload)));
      break;
    case "voice":
      items.push(item("voice", "语音合成", BILLING_RULES.voiceGenerationPoints));
      break;
    case "voice-clone":
      items.push(item("voice-clone", "新音色克隆", BILLING_RULES.voiceClonePoints));
      break;
    case "voice-convert":
      items.push(item("voice", "音色转换", BILLING_RULES.voiceConversionPoints));
      break;
    case "music":
      items.push(item("music", "AI 音乐", calculateMusicPoints(durationSeconds)));
      break;
    case "transcribe":
      items.push(item("transcribe", "语音转文字", calculateTranscribePoints({ durationSeconds, durationMs })));
      break;
    case "article":
      items.push(item("text", "爆款图文文案", BILLING_RULES.articleTextPoints));
      if (positiveNumber(payload.imageCount)) items.push(item("image", "文章配图", calculateImagePoints(payload.imageCount)));
      break;
    case "replicate":
      items.push(item("replicate", mediaKind === "video" ? "视频反推提示词" : "图片反推提示词",
        mediaKind === "video" ? BILLING_RULES.replicateVideoPoints : BILLING_RULES.replicateImagePoints));
      break;
    case "watermark":
      items.push(mediaKind === "video"
        ? item("video", "视频去水印", config.kie.watermarkVideoPoints || calculateVideoPoints(durationSeconds))
        : item("image", "图片去水印", config.kie.watermarkImagePoints || BILLING_RULES.imagePointsPerItem));
      break;
    case "enhance":
      items.push(item(mediaKind === "video" ? "video-enhance" : "image",
        mediaKind === "video" ? "视频画质提升" : "图片画质提升",
        mediaKind === "video" ? 0 : BILLING_RULES.imagePointsPerItem));
      break;
    case "remove-bg":
      items.push(item("image", "智能抠图", BILLING_RULES.imagePointsPerItem));
      break;
    case "video-dub": {
      const seconds = durationMs ? ceilSeconds(durationMs, true) : ceilSeconds(durationSeconds);
      items.push(item("text", "AI 配音稿", calculateTextPoints({ outputChars: payload.outputChars || Math.max(1, seconds * 4) })));
      items.push(item("voice", "AI 配音", calculateVoicePoints({ durationSeconds: seconds })));
      if (payload.bgmEnabled !== false) items.push(item("music", "AI 背景音乐", calculateMusicPoints(seconds)));
      break;
    }
    default:
      throw new Error(`unsupported billing feature: ${key}`);
  }

  return {
    feature: key,
    points: items.reduce((sum, entry) => sum + entry.points, 0),
    items,
    rulesVersion: "2026-06-24"
  };
}

export function getPublicBillingRules() {
  return {
    ...BILLING_RULES,
    watermarkImagePoints: config.kie.watermarkImagePoints,
    watermarkVideoPoints: config.kie.watermarkVideoPoints,
    rulesVersion: "2026-06-24"
  };
}
