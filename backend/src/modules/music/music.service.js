import { randomUUID } from "crypto";
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
  listMusicTaskRows
} from "./music.repository.js";
import { formatBeijingDateTime } from "../../shared/time.js";

function normalizeString(value) {
  return String(value || "").trim();
}

function mapMusicTask(row) {
  return {
    id: row.id,
    prompt: row.prompt,
    lyrics: row.lyrics || "",
    model: row.model,
    isInstrumental: Boolean(row.is_instrumental),
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
    createdAt: formatBeijingDateTime(row.created_at)
  };
}

function assertPrompt(prompt) {
  const trimmed = normalizeString(prompt);
  if (!trimmed) throw createHttpError("prompt is required", 400);
  if (trimmed.length > 2000)
    throw createHttpError("prompt must be 2000 characters or fewer", 400);
  return trimmed;
}

function assertLyrics(lyrics, isInstrumental) {
  const trimmed = normalizeString(lyrics);
  if (isInstrumental) return trimmed;
  if (!trimmed) throw createHttpError("lyrics is required for non-instrumental music", 400);
  if (trimmed.length > 3500)
    throw createHttpError("lyrics must be 3500 characters or fewer", 400);
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

function cleanGenerationError(error) {
  const message = String(error?.message || "音乐生成失败，请稍后重试");
  if (/<html|504 Gateway Time-out|Gateway Time-out|nginx/i.test(message)) {
    return "MiniMax 音乐生成服务暂时超时，请稍后重试";
  }
  return message;
}

async function runMusicGeneration(taskId, { prompt, lyrics, model, isInstrumental, lyricsOptimizer }) {
  try {
    const result = await generateMinimaxMusic({
      prompt,
      lyrics,
      model,
      isInstrumental,
      lyricsOptimizer
    });

    const savedAudio = await saveMusicAudio({ taskId, audioBuffer: result.audioBuffer });
    await completeMusicTaskRow({
      id: taskId,
      audioUrl: savedAudio.publicPath,
      durationMs: result.durationMs,
      sampleRate: result.sampleRate,
      channel: result.channel,
      bitrate: result.bitrate,
      musicSize: result.musicSize,
      traceId: result.traceId
    });
  } catch (error) {
    await failMusicTaskRow(taskId, cleanGenerationError(error));
  }
}

export async function generateMusic(payload, userId) {
  const prompt = assertPrompt(payload.prompt);
  const isInstrumental = Boolean(payload.isInstrumental);
  const lyrics = assertLyrics(payload.lyrics, isInstrumental);
  const model = normalizeString(payload.model) || "music-2.6-free";
  const lyricsOptimizer = Boolean(payload.lyricsOptimizer);
  const taskId = `music-${Date.now()}-${randomUUID().slice(0, 8)}`;

  await createMusicTaskRow({
    id: taskId,
    userId,
    prompt,
    lyrics,
    model,
    isInstrumental
  });

  runMusicGeneration(taskId, { prompt, lyrics, model, isInstrumental, lyricsOptimizer }).catch((error) => {
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
    traceId: "",
    status: "processing",
    error: "",
    createdAt: formatBeijingDateTime()
  };
}
