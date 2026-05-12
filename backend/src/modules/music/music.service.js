import { randomUUID } from "crypto";
import { generateMinimaxMusic } from "../../providers/minimax/musicGeneration.js";
import { createHttpError } from "../../shared/http.js";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { config } from "../../config/index.js";

const recentMusic = [];

function normalizeString(value) {
  return String(value || "").trim();
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

export function getRecentMusic() {
  return recentMusic.slice();
}

export async function generateMusic(payload) {
  const prompt = assertPrompt(payload.prompt);
  const isInstrumental = Boolean(payload.isInstrumental);
  const lyrics = assertLyrics(payload.lyrics, isInstrumental);
  const model = normalizeString(payload.model) || "music-2.6-free";
  const lyricsOptimizer = Boolean(payload.lyricsOptimizer);

  const result = await generateMinimaxMusic({
    prompt,
    lyrics,
    model,
    isInstrumental,
    lyricsOptimizer
  });

  const taskId = `music-${Date.now()}-${randomUUID().slice(0, 8)}`;
  const savedAudio = await saveMusicAudio({ taskId, audioBuffer: result.audioBuffer });

  const music = {
    id: taskId,
    prompt,
    lyrics,
    model,
    isInstrumental,
    audioUrl: savedAudio.publicPath,
    durationMs: result.durationMs,
    sampleRate: result.sampleRate,
    channel: result.channel,
    bitrate: result.bitrate,
    musicSize: result.musicSize,
    traceId: result.traceId,
    createdAt: new Date().toLocaleString("zh-CN", { hour12: false })
  };

  recentMusic.unshift(music);
  if (recentMusic.length > 50) {
    recentMusic.pop();
  }

  return music;
}
