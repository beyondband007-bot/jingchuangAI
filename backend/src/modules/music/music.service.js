import { randomUUID } from "crypto";
import { stat, unlink } from "fs/promises";
import { generateKieMusic } from "../../providers/kie/musicGeneration.js";
import { createHttpError } from "../../shared/http.js";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { config } from "../../config/index.js";
import {
  completeMusicTaskRow,
  createMusicTaskRow,
  failMusicTaskRow,
  findMusicTaskRow,
  listMusicTaskRows,
  deleteMusicTaskRow,
  updateMusicTaskAudioMeta,
  updateMusicTaskCoverUrl,
  updateMusicTaskTitle
} from "./music.repository.js";
import { formatBeijingDateTime } from "../../shared/time.js";
import { compressMusicAudioFile, MUSIC_COMPRESS_THRESHOLD_BYTES } from "./musicAudio.js";
import { syncMusicLyrics } from "./lyricsSync.service.js";
import { calculateMusicPoints } from "../../shared/billingRules.js";
import { chargeCredits, refundChargedCredits } from "../../shared/billingCharge.js";

function normalizeString(value) {
  return String(value || "").trim();
}

export function resolveMusicGenerationModel(_requestedModel) {
  // Keep this explicit compatibility boundary while old browser bundles still
  // submit MiniMax model names. New work always uses the server-side KIE model.
  return config.kie.musicModel;
}

function safeJson(value, fallback = null) {
  if (!value) return fallback;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function mapMusicTask(row) {
  return {
    id: row.id,
    prompt: row.prompt,
    title: row.title || "",
    coverUrl: row.cover_url || "",
    lyrics: row.lyrics || "",
    model: row.model,
    isInstrumental: row.is_instrumental === 1 || row.is_instrumental === true,
    audioUrl: row.audio_url,
    durationMs: row.duration_ms || 0,
    sampleRate: row.sample_rate || 0,
    channel: row.channel || 0,
    bitrate: row.bitrate || 0,
    musicSize: row.music_size || 0,
    traceId: row.trace_id || "",
    favorite: Boolean(row.favorite),
    status: row.status || (row.audio_url ? "completed" : "processing"),
    error: row.error_message || "",
    lyricsTimeline: safeJson(row.lyrics_timeline, []),
    lyricsSyncStatus: row.lyrics_sync_status || "none",
    lyricsSyncError: row.lyrics_sync_error || "",
    createdAt: formatBeijingDateTime(row.created_at)
  };
}

function assertPrompt(prompt) {
  const trimmed = normalizeString(prompt);
  if (!trimmed) throw createHttpError("请输入提示词", 400);
  if (trimmed.length > 1000)
    throw createHttpError("提示词长度不能超过 1000 个字符", 400);
  return trimmed;
}

function assertLyrics(lyrics, isInstrumental) {
  const trimmed = normalizeString(lyrics);
  if (isInstrumental) return trimmed;
  if (!trimmed) throw createHttpError("非纯音乐需要填写歌词", 400);
  if (trimmed.length > 3500)
    throw createHttpError("歌词长度不能超过 3500 个字符", 400);
  return trimmed;
}

async function saveMusicAudio({ taskId, audioBuffer }) {
  const audioDir = path.resolve(process.cwd(), config.media.storageDir, "music", "audio");
  await mkdir(audioDir, { recursive: true });
  const fileName = `${taskId}.mp3`;
  const filePath = path.join(audioDir, fileName);
  await writeFile(filePath, audioBuffer);

  return {
    fileName,
    filePath,
    publicPath: `/media/music/audio/${fileName}`,
    mimeType: "audio/mpeg"
  };
}

const COVER_MIME_EXT = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif"
};

function parseCoverDataUrl(value) {
  const trimmed = normalizeString(value);
  const match = /^data:(image\/(?:jpeg|png|webp|gif));base64,([A-Za-z0-9+/=\s]+)$/i.exec(trimmed);
  if (!match) return null;
  const mimeType = match[1].toLowerCase();
  const buffer = Buffer.from(match[2].replace(/\s/g, ""), "base64");
  if (!buffer.length) return null;
  return { mimeType, buffer };
}

function assertTitle(title) {
  const trimmed = normalizeString(title);
  if (!trimmed) return "";
  if (trimmed.length > 20) throw createHttpError("歌曲名称不能超过 20 个字符", 400);
  return trimmed;
}

function assertRequiredTitle(title) {
  const trimmed = assertTitle(title);
  if (!trimmed) throw createHttpError("请输入歌曲名称", 400);
  return trimmed;
}

async function saveMusicCover({ taskId, cover }) {
  const parsed = parseCoverDataUrl(cover);
  if (!parsed) {
    throw createHttpError("封面图片格式不支持，请上传 JPG / PNG / WebP 图片", 400);
  }
  if (parsed.buffer.length > 5 * 1024 * 1024) {
    throw createHttpError("封面图片大小不能超过 5MB", 400);
  }

  const ext = COVER_MIME_EXT[parsed.mimeType] || ".jpg";
  const coverDir = path.resolve(process.cwd(), config.media.storageDir, "music", "covers");
  await mkdir(coverDir, { recursive: true });
  const fileName = `${taskId}${ext}`;
  const filePath = path.join(coverDir, fileName);
  await writeFile(filePath, parsed.buffer);

  return {
    filePath,
    publicPath: `/media/music/covers/${fileName}`
  };
}

async function unlinkMusicCoverFile(coverUrl) {
  const normalized = String(coverUrl || "").trim();
  if (!normalized) return;

  const coverDir = path.resolve(
    process.cwd(),
    config.media.storageDir,
    "music",
    "covers",
  );
  const fileName = path.basename(normalized);
  const filePath = path.resolve(coverDir, fileName);
  const relativePath = path.relative(coverDir, filePath);
  if (
    fileName &&
    !relativePath.startsWith("..") &&
    !path.isAbsolute(relativePath)
  ) {
    await unlink(filePath).catch(() => {});
  }
}

export function getConfig() {
  return {
    models: [
      { value: config.kie.musicModel, label: `KIE Suno ${config.kie.musicModel.replaceAll("_", ".")}` }
    ],
    enabled: config.kie.musicEnabled && Boolean(config.kie.apiKey),
    maxPromptLength: 1000,
    maxLyricsLength: 3500,
    audioSettings: {
      sampleRate: 44100,
      bitrate: 256000,
      format: "mp3"
    }
  };
}

export async function getRecentMusic(userId) {
  const rows = await listMusicTaskRows({ userId });
  return rows.map(mapMusicTask);
}

export async function getMusicTask(id, userId) {
  const row = await findMusicTaskRow({ id, userId });
  return row ? mapMusicTask(row) : null;
}

export async function deleteMusicTask(id, userId) {
  const existing = await findMusicTaskRow({ id, userId });
  if (!existing) {
    throw createHttpError("音乐任务不存在", 404);
  }

  const result = await deleteMusicTaskRow(id, userId);
  const audioUrl = String(existing.audio_url || "").trim();
  if (audioUrl) {
    const audioDir = path.resolve(
      process.cwd(),
      config.media.storageDir,
      "music",
      "audio",
    );
    const fileName = path.basename(audioUrl);
    const filePath = path.resolve(audioDir, fileName);
    const relativePath = path.relative(audioDir, filePath);
    if (
      fileName &&
      !relativePath.startsWith("..") &&
      !path.isAbsolute(relativePath)
    ) {
      await unlink(filePath).catch(() => {});
    }
  }

  const coverUrl = String(existing.cover_url || "").trim();
  if (coverUrl) {
    await unlinkMusicCoverFile(coverUrl);
  }

  return result;
}

export async function updateMusicTaskCover(id, userId, payload = {}) {
  const existing = await findMusicTaskRow({ id, userId });
  if (!existing) {
    throw createHttpError("音乐任务不存在", 404);
  }

  const coverPayload = normalizeString(payload.cover);
  if (!coverPayload) {
    throw createHttpError("请上传封面图片", 400);
  }

  const savedCover = await saveMusicCover({ taskId: id, cover: coverPayload });
  const previousCoverUrl = String(existing.cover_url || "").trim();
  if (previousCoverUrl && previousCoverUrl !== savedCover.publicPath) {
    await unlinkMusicCoverFile(previousCoverUrl);
  }

  await updateMusicTaskCoverUrl(id, savedCover.publicPath);

  return mapMusicTask({
    ...existing,
    cover_url: savedCover.publicPath
  });
}

export async function updateMusicTaskName(id, userId, payload = {}) {
  const existing = await findMusicTaskRow({ id, userId });
  if (!existing) {
    throw createHttpError("音乐任务不存在", 404);
  }

  const title = assertRequiredTitle(payload.title);
  await updateMusicTaskTitle(id, userId, title);

  return mapMusicTask({
    ...existing,
    title
  });
}

function cleanGenerationError(error) {
  const message = String(error?.message || "音乐生成失败，请稍后重试");
  if (/<html|504 Gateway Time-out|Gateway Time-out|nginx/i.test(message)) {
    return "KIE 音乐生成服务暂时超时，请稍后重试";
  }
  return message;
}

async function runMusicGeneration(
  taskId,
  userId,
  { prompt, title, lyrics, model, isInstrumental, lyricsOptimizer, costPoints }
) {
  try {
    const result = await generateKieMusic({
      prompt,
      title,
      lyrics,
      model,
      isInstrumental,
      lyricsOptimizer
    });

    const savedAudio = await saveMusicAudio({ taskId, audioBuffer: result.audioBuffer });
    let musicSize = Number(result.musicSize || result.audioBuffer?.length || 0);
    let bitrate = result.bitrate;

    const fileStat = await stat(savedAudio.filePath);
    musicSize = fileStat.size;

    if (musicSize > MUSIC_COMPRESS_THRESHOLD_BYTES) {
      const compressed = await compressMusicAudioFile(savedAudio.filePath);
      musicSize = compressed.size;
      bitrate = compressed.bitrate;
      await updateMusicTaskAudioMeta(taskId, { musicSize, bitrate });
    }

    await completeMusicTaskRow({
      id: taskId,
      audioUrl: savedAudio.publicPath,
      durationMs: result.durationMs,
      sampleRate: result.sampleRate,
      channel: result.channel,
      bitrate,
      musicSize,
      traceId: result.traceId
    });

    if (!isInstrumental && String(lyrics || "").trim()) {
      try {
        await syncMusicLyrics(taskId, userId);
      } catch (error) {
        console.error("auto lyrics sync failed:", error);
      }
    }
  } catch (error) {
    console.error("music generation task failed", {
      taskId,
      userId,
      message: error.message,
      traceId: error.traceId || ""
    });
    await failMusicTaskRow(taskId, cleanGenerationError(error));
    await refundChargedCredits({ userId, taskId, amount: costPoints, memo: "music generation refund" });
  }
}

export async function generateMusic(payload, userId) {
  if (!config.kie.musicEnabled || !config.kie.apiKey) {
    throw createHttpError("AI 音乐服务正在维护中，暂不支持创建新任务", 503);
  }
  const prompt = assertPrompt(payload.prompt);
  const title = assertRequiredTitle(payload.title);
  const isInstrumental = Boolean(payload.isInstrumental);
  const lyricsOptimizer = Boolean(payload.lyricsOptimizer);
  const lyrics = lyricsOptimizer && !isInstrumental && !normalizeString(payload.lyrics)
    ? ""
    : assertLyrics(payload.lyrics, isInstrumental);
  // The server owns model selection. This deliberately maps legacy client
  // values such as music-3.0-free to the active KIE Suno configuration.
  const model = resolveMusicGenerationModel(payload.model);
  const taskId = `music-${Date.now()}-${randomUUID().slice(0, 8)}`;
  const costPoints = calculateMusicPoints();
  const coverPayload = normalizeString(payload.cover);
  if (coverPayload) {
    const parsedCover = parseCoverDataUrl(coverPayload);
    if (!parsedCover) {
      throw createHttpError("封面图片格式不支持，请上传 JPG / PNG / WebP 图片", 400);
    }
    if (parsedCover.buffer.length > 5 * 1024 * 1024) {
      throw createHttpError("封面图片大小不能超过 5MB", 400);
    }
  }
  await chargeCredits({ userId, taskId, amount: costPoints, memo: "music generation debit" });

  let coverUrl = "";
  try {
    if (normalizeString(payload.cover)) {
      const savedCover = await saveMusicCover({ taskId, cover: coverPayload });
      coverUrl = savedCover.publicPath;
    }

    await createMusicTaskRow({
      id: taskId,
      userId,
      prompt,
      title,
      coverUrl,
      lyrics,
      model,
      isInstrumental
    });
  } catch (error) {
    await refundChargedCredits({ userId, taskId, amount: costPoints, memo: "music generation refund" });
    if (coverUrl) {
      const coverDir = path.resolve(process.cwd(), config.media.storageDir, "music", "covers");
      await unlink(path.join(coverDir, path.basename(coverUrl))).catch(() => {});
    }
    throw error;
  }

  runMusicGeneration(taskId, userId, {
    prompt,
    title,
    lyrics,
    model,
    isInstrumental,
    lyricsOptimizer,
    costPoints
  }).catch((error) => {
    console.error("background music generation failed:", error);
  });

  return {
    id: taskId,
    prompt,
    title,
    coverUrl,
    lyrics,
    model,
    isInstrumental,
    audioUrl: "",
    durationMs: 0,
    points: costPoints,
    price: `${costPoints} 积分`,
    traceId: "",
    status: "processing",
    error: "",
    createdAt: formatBeijingDateTime()
  };
}
