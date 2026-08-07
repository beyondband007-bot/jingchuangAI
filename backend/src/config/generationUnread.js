export const UNREAD_HISTORY_WINDOW_SIZE = 20;

export const KNOWN_GENERATION_UNREAD_SOURCE_TYPES = Object.freeze([
  "image",
  "video",
  "article",
  "digital-human",
  "image-digital-human",
  "motion",
  "face-swap",
  "watermark",
  "remove-bg",
  "enhance",
  "music",
  "voice",
  "voice-convert",
  "transcribe",
  "replicate",
  "video-dub",
  "infinite-canvas-image",
  "infinite-canvas-video",
]);

const knownSourceTypes = new Set(KNOWN_GENERATION_UNREAD_SOURCE_TYPES);
const utcIsoPattern = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?Z$/;

function parseUtcDate(value) {
  if (typeof value !== "string") return null;
  const match = utcIsoPattern.exec(value);
  if (!match) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const [, year, month, day, hour, minute, second, fraction = ""] = match;
  const expectedMilliseconds = Number(fraction.padEnd(3, "0") || 0);
  const isExactUtcDate = date.getUTCFullYear() === Number(year)
    && date.getUTCMonth() + 1 === Number(month)
    && date.getUTCDate() === Number(day)
    && date.getUTCHours() === Number(hour)
    && date.getUTCMinutes() === Number(minute)
    && date.getUTCSeconds() === Number(second)
    && date.getUTCMilliseconds() === expectedMilliseconds;
  return isExactUtcDate ? date : null;
}

function parseEnabledAtJson(value) {
  if (!String(value || "").trim()) return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

export function parseGenerationUnreadConfig(env = process.env) {
  const requestedSources = new Set(
    String(env.GENERATION_UNREAD_SOURCES || "")
      .split(",")
      .map((sourceType) => sourceType.trim())
      .filter((sourceType) => knownSourceTypes.has(sourceType)),
  );
  const enabledAtValues = parseEnabledAtJson(env.GENERATION_UNREAD_SOURCE_ENABLED_AT_JSON);
  const enabledSources = new Set();
  const sourceEnabledAt = new Map();

  requestedSources.forEach((sourceType) => {
    const enabledAt = parseUtcDate(enabledAtValues[sourceType]);
    if (!enabledAt) return;
    enabledSources.add(sourceType);
    sourceEnabledAt.set(sourceType, enabledAt);
  });

  return {
    enabledSources,
    sourceEnabledAt,
    historyWindowSize: UNREAD_HISTORY_WINDOW_SIZE,
  };
}
