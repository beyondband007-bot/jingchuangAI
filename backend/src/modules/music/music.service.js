import { randomUUID } from "crypto";
import { stat, unlink } from "fs/promises";
import { generateMinimaxMusic } from "../../providers/minimax/musicGeneration.js";
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
  updateMusicTaskAudioMeta
} from "./music.repository.js";
import { formatBeijingDateTime } from "../../shared/time.js";
import { compressMusicAudioFile, MUSIC_COMPRESS_THRESHOLD_BYTES } from "./musicAudio.js";
import { syncMusicLyrics } from "./lyricsSync.service.js";
import { calculateMusicPoints } from "../../shared/billingRules.js";
import { chargeCredits, refundChargedCredits } from "../../shared/billingCharge.js";

function normalizeString(value) {
  return String(value || "").trim();
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
  if (trimmed.length > 2000)
    throw createHttpError("提示词长度不能超过 2000 个字符", 400);
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

export function getConfig() {
  return {
    models: [
      { value: "music-2.6-free", label: "Music 2.6 Free" },
      { value: "music-2.6", label: "Music 2.6" }
    ],
    maxPromptLength: 2000,
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

  return result;
}

function cleanGenerationError(error) {
  const message = String(error?.message || "音乐生成失败，请稍后重试");
  if (/<html|504 Gateway Time-out|Gateway Time-out|nginx/i.test(message)) {
    return "MiniMax 音乐生成服务暂时超时，请稍后重试";
  }
  return message;
}

async function runMusicGeneration(
  taskId,
  userId,
  { prompt, lyrics, model, isInstrumental, lyricsOptimizer, costPoints }
) {
  try {
    const result = await generateMinimaxMusic({
      prompt,
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
    await failMusicTaskRow(taskId, cleanGenerationError(error));
    await refundChargedCredits({ userId, taskId, amount: costPoints, memo: "music generation refund" });
  }
}

export async function generateMusic(payload, userId) {
  const prompt = assertPrompt(payload.prompt);
  const isInstrumental = Boolean(payload.isInstrumental);
  const lyrics = assertLyrics(payload.lyrics, isInstrumental);
  const model = normalizeString(payload.model) || "music-2.6-free";
  const lyricsOptimizer = Boolean(payload.lyricsOptimizer);
  const taskId = `music-${Date.now()}-${randomUUID().slice(0, 8)}`;
  const costPoints = calculateMusicPoints(payload.durationSeconds);
  await chargeCredits({ userId, taskId, amount: costPoints, memo: "music generation debit" });

  try {
    await createMusicTaskRow({
      id: taskId,
      userId,
      prompt,
      lyrics,
      model,
      isInstrumental
    });
  } catch (error) {
    await refundChargedCredits({ userId, taskId, amount: costPoints, memo: "music generation refund" });
    throw error;
  }

  runMusicGeneration(taskId, userId, {
    prompt,
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
