import { randomUUID } from "crypto";
import { config } from "../../config/index.js";
import { preprocessMinimaxMusicCover } from "../../providers/minimax/musicCover.js";
import { cloneMinimaxVoice, uploadMinimaxVoiceFile } from "../../providers/minimax/voiceClone.js";
import { saveMinimaxSpeechAudio, synthesizeMinimaxSpeech } from "../../providers/minimax/tts.js";
import { createHttpError } from "../../shared/http.js";
import { createVoiceConvertTaskRow, listVoiceConvertTaskRows } from "./voiceConvert.repository.js";
import { formatBeijingDateTime } from "../../shared/time.js";

const maxTargetAudioBytes = 20 * 1024 * 1024;
const maxSourceAudioBytes = 50 * 1024 * 1024;
const allowedTargetMimeTypes = new Set(["audio/mpeg", "audio/mp3", "audio/mp4", "audio/mp4a-latm", "audio/x-m4a", "audio/wav", "audio/x-wav"]);
const allowedTargetExtensions = new Set([".mp3", ".m4a", ".wav"]);
const allowedSourceMimeTypes = new Set([
  ...allowedTargetMimeTypes,
  "audio/flac",
  "audio/x-flac",
  "audio/webm",
  "video/webm"
]);
const allowedSourceExtensions = new Set([".mp3", ".m4a", ".wav", ".flac", ".webm"]);
const convertedVoices = [];

function getExt(fileName = "") {
  const match = String(fileName).toLowerCase().match(/\.[a-z0-9]+$/);
  return match ? match[0] : "";
}

function normalizeDurationMs(value) {
  const duration = Number(value);
  return Number.isFinite(duration) && duration > 0 ? duration : 0;
}

function assertTargetAudioFile(file) {
  if (!file) throw createHttpError("target audio file is required", 400);
  if (file.size > maxTargetAudioBytes) throw createHttpError("target audio file must be 20MB or smaller", 400);

  const mimeType = String(file.mimetype || "").toLowerCase();
  const ext = getExt(file.originalname);
  if (!allowedTargetMimeTypes.has(mimeType) && !allowedTargetExtensions.has(ext)) {
    throw createHttpError("target audio file must be mp3, m4a, or wav", 400);
  }
}

function assertSourceAudioFile(file) {
  if (!file) throw createHttpError("sourceAudio file is required", 400);
  if (file.size > maxSourceAudioBytes) throw createHttpError("source audio file must be 50MB or smaller", 400);

  const mimeType = String(file.mimetype || "").toLowerCase();
  const ext = getExt(file.originalname);
  if (!allowedSourceMimeTypes.has(mimeType) && !allowedSourceExtensions.has(ext)) {
    throw createHttpError("source audio file must be mp3, m4a, wav, flac, or webm", 400);
  }
}

function assertTargetDuration(durationMs) {
  const duration = normalizeDurationMs(durationMs);
  if (!duration) return;
  if (duration < 10000 || duration > 5 * 60 * 1000) {
    throw createHttpError("target audio must be between 10 seconds and 5 minutes", 400);
  }
}

function normalizeVoiceId(value = "") {
  const voiceId = String(value || "").trim();
  if (!/^[A-Za-z][A-Za-z0-9_-]{7,255}$/.test(voiceId)) {
    throw createHttpError("voiceId must start with a letter and be 8-256 characters of letters, numbers, - or _", 400);
  }
  return voiceId;
}

function normalizeNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function clampNumber(value, fallback, min, max) {
  const number = normalizeNumber(value, fallback);
  return Math.min(max, Math.max(min, number));
}

function cleanFormattedLyrics(value) {
  return String(value || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !/^\[[^[\]]+\]$/.test(line))
    .map((line) => line.replace(/^\[[^\]]+\]\s*/, "").trim())
    .map((line) => line.replace(/<#[\d.]+#>/g, "").trim())
    .filter(Boolean);
}

function getSegmentTimeMs(segment, key) {
  const value = segment?.[key] ?? segment?.[`${key}_time`] ?? segment?.[`${key}Time`];
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return number > 1000 ? Math.round(number) : Math.round(number * 1000);
}

function normalizeStructureSegments(structureResult) {
  const candidates = Array.isArray(structureResult)
    ? structureResult
    : Array.isArray(structureResult?.segments)
      ? structureResult.segments
      : Array.isArray(structureResult?.structure)
        ? structureResult.structure
        : [];

  return candidates
    .map((segment) => ({
      label: String(segment?.type || segment?.name || segment?.label || segment?.section || "").toLowerCase(),
      startMs: getSegmentTimeMs(segment, "start"),
      endMs: getSegmentTimeMs(segment, "end")
    }))
    .filter((segment) => segment.endMs > segment.startMs)
    .sort((a, b) => a.startMs - b.startMs);
}

function isNonVocalSegment(segment) {
  return /silence|intro|outro|instrument|inst|empty|blank/.test(segment.label);
}

function makePauseMarker(ms) {
  const seconds = Math.min(8, Math.max(0.2, ms / 1000));
  return `<#${Number(seconds.toFixed(1))}#>`;
}

function getGapAfterSegment(segments, segmentIndex) {
  const current = segments[segmentIndex];
  const nextVocalIndex = segments.findIndex((segment, index) => index > segmentIndex && !isNonVocalSegment(segment));
  if (!current || nextVocalIndex < 0) return 0;
  return Math.max(0, segments[nextVocalIndex].startMs - current.endMs);
}

function distributeLines(lines, groupCount) {
  if (groupCount <= 1) return [lines];
  const groups = [];
  let cursor = 0;
  for (let index = 0; index < groupCount; index += 1) {
    const remainingLines = lines.length - cursor;
    const remainingGroups = groupCount - index;
    const size = Math.max(1, Math.ceil(remainingLines / remainingGroups));
    groups.push(lines.slice(cursor, cursor + size));
    cursor += size;
  }
  return groups.filter((group) => group.length);
}

function buildRhythmicText({ lines, structureResult }) {
  const segments = normalizeStructureSegments(structureResult);
  const vocalSegments = segments.filter((segment) => !isNonVocalSegment(segment));
  if (!vocalSegments.length) {
    return {
      text: lines.join("\n<#0.4#>\n"),
      segmentCount: segments.length,
      pauseCount: Math.max(0, lines.length - 1)
    };
  }

  const groups = distributeLines(lines, Math.min(lines.length, vocalSegments.length));
  const parts = [];
  let pauseCount = 0;

  groups.forEach((group, index) => {
    if (index > 0) {
      const previousIndex = segments.indexOf(vocalSegments[index - 1]);
      parts.push(makePauseMarker(getGapAfterSegment(segments, previousIndex) || 400));
      pauseCount += 1;
    }
    parts.push(group.join("\n<#0.35#>\n"));
    pauseCount += Math.max(0, group.length - 1);
  });

  return {
    text: parts.join("\n"),
    segmentCount: segments.length,
    pauseCount
  };
}

function registerConvertedVoice({ voiceId, name, demoAudio }) {
  const voice = {
    id: voiceId,
    name: name || `转换音色 ${convertedVoices.length + 1}`,
    description: "MiniMax 音色转换目标音色",
    provider: "minimax",
    source: "voice-convert",
    demoAudio: demoAudio || "",
    createdAt: formatBeijingDateTime()
  };

  const existingIndex = convertedVoices.findIndex((item) => item.id === voice.id);
  if (existingIndex >= 0) convertedVoices.splice(existingIndex, 1, voice);
  convertedVoices.unshift(voice);
  return voice;
}

function parseJson(value, fallback) {
  if (!value) return fallback;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function mapVoiceConvertTask(row) {
  return {
    id: row.id,
    title: row.title,
    voiceId: row.voice_id || "",
    voiceName: row.voice_name || "目标音色",
    sourceFileName: row.source_file_name || "",
    audioUrl: row.audio_url,
    durationMs: row.duration_ms || 0,
    sourceDurationMs: row.source_duration_ms || 0,
    mimeType: row.mime_type || "",
    rhythmMeta: parseJson(row.rhythm_meta, null),
    favorite: Boolean(row.favorite),
    createdAt: formatBeijingDateTime(row.created_at)
  };
}

export async function listTasks(userId) {
  const rows = await listVoiceConvertTaskRows({ userId });
  return rows.map(mapVoiceConvertTask);
}

async function createTargetVoiceClone({ cloneAudioFileId, voiceId, previewText, model, name }) {
  const result = await cloneMinimaxVoice({
    cloneAudioFileId,
    voiceId,
    previewText,
    model
  });

  return {
    voice: registerConvertedVoice({ voiceId, name, demoAudio: result.demoAudio }),
    demoAudio: result.demoAudio
  };
}

export async function uploadTargetAudio({ file, durationMs }) {
  assertTargetAudioFile(file);
  assertTargetDuration(durationMs);

  const result = await uploadMinimaxVoiceFile({
    buffer: file.buffer,
    fileName: file.originalname,
    mimeType: file.mimetype,
    purpose: "voice_clone"
  });

  return {
    ...result,
    durationMs: normalizeDurationMs(durationMs),
    localName: file.originalname,
    mimeType: file.mimetype,
    size: file.size
  };
}

export async function convert(payload, file, userId) {
  assertSourceAudioFile(file);

  const sourceDurationMs = normalizeDurationMs(payload.sourceDurationMs);
  if (sourceDurationMs && (sourceDurationMs < 6000 || sourceDurationMs > 6 * 60 * 1000)) {
    throw createHttpError("source audio must be between 6 seconds and 6 minutes", 400);
  }

  const preprocess = await preprocessMinimaxMusicCover({ audioBuffer: file.buffer });
  const lines = cleanFormattedLyrics(preprocess.formattedLyrics);
  if (!lines.length) {
    throw createHttpError("MiniMax could not extract readable text from the source audio", 422);
  }

  const rhythm = buildRhythmicText({ lines, structureResult: preprocess.structureResult });
  if (rhythm.text.length > 10000) {
    throw createHttpError("extracted source text is too long for MiniMax TTS", 400);
  }

  const cloneAudioFileId = String(payload.cloneAudioFileId || payload.file_id || "").trim();
  const providedVoiceId = String(payload.voiceId || payload.voice_id || "").trim();
  const model = String(payload.model || config.minimax.ttsModel || "").trim();
  const name = String(payload.name || "").trim();

  let voice = providedVoiceId ? convertedVoices.find((item) => item.id === providedVoiceId) || null : null;
  let voiceId = providedVoiceId;
  let demoAudio = "";
  if (!voiceId) {
    if (!cloneAudioFileId) throw createHttpError("cloneAudioFileId or voiceId is required", 400);
    voiceId = normalizeVoiceId(payload.generatedVoiceId || payload.newVoiceId || `VoiceConvert_${Date.now()}_${randomUUID().slice(0, 8)}`);
    const clone = await createTargetVoiceClone({
      cloneAudioFileId,
      voiceId,
      previewText: lines.join(" ").slice(0, 240),
      model,
      name: name || file.originalname?.replace(/\.[^.]+$/, "") || "转换音色"
    });
    voice = clone.voice;
    demoAudio = clone.demoAudio;
  }

  const requestedSpeed = clampNumber(payload.speed, 1, 0.5, 2);
  const targetDurationMs = preprocess.audioDurationMs || sourceDurationMs;
  const speechInput = {
    text: rhythm.text,
    voiceId,
    speed: requestedSpeed,
    volume: normalizeNumber(payload.volume, 1),
    pitch: normalizeNumber(payload.pitch, 0)
  };

  let speech = await synthesizeMinimaxSpeech(speechInput);
  let finalSpeed = requestedSpeed;
  if (targetDurationMs && speech.durationMs) {
    const diffRatio = Math.abs(speech.durationMs - targetDurationMs) / targetDurationMs;
    if (diffRatio > 0.18) {
      finalSpeed = clampNumber(requestedSpeed * (speech.durationMs / targetDurationMs), requestedSpeed, 0.5, 2);
      if (Math.abs(finalSpeed - requestedSpeed) > 0.03) {
        speech = await synthesizeMinimaxSpeech({ ...speechInput, speed: finalSpeed });
      }
    }
  }

  const taskId = `voice-convert-${Date.now()}-${randomUUID().slice(0, 8)}`;
  const savedAudio = await saveMinimaxSpeechAudio({
    taskId,
    audioBuffer: speech.audioBuffer,
    featureDir: "voice-convert"
  });

  const resultVoice = voice || { id: voiceId, name: "目标音色", provider: "minimax", source: "voice-convert" };
  const rhythmMeta = {
    lineCount: lines.length,
    segmentCount: rhythm.segmentCount,
    pauseCount: rhythm.pauseCount,
    requestedSpeed,
    finalSpeed,
    adjusted: Math.abs(finalSpeed - requestedSpeed) > 0.03,
    coverFeatureId: preprocess.coverFeatureId,
    traceId: preprocess.traceId
  };
  const result = {
    id: taskId,
    voice: resultVoice,
    demoAudio,
    audioBase64: speech.audioBase64,
    audioDataUrl: `data:${speech.mimeType};base64,${speech.audioBase64}`,
    audioUrl: savedAudio.publicPath,
    durationMs: speech.durationMs,
    sourceDurationMs: targetDurationMs || sourceDurationMs,
    mimeType: speech.mimeType,
    rhythmMeta,
    createdAt: formatBeijingDateTime()
  };

  await createVoiceConvertTaskRow({
    id: taskId,
    userId,
    title: file.originalname ? file.originalname.replace(/\.[^.]+$/, "") : "音色转换结果",
    voiceId: resultVoice.id,
    voiceName: resultVoice.name,
    sourceFileName: file.originalname || "",
    audioUrl: savedAudio.publicPath,
    durationMs: speech.durationMs,
    sourceDurationMs: result.sourceDurationMs,
    mimeType: speech.mimeType,
    rhythmMeta
  });

  return result;
}
