import {
  findMusicTaskRow,
  saveMusicLyricsTimeline,
  updateMusicLyricsSyncStatus
} from "./music.repository.js";
import { execFile } from "child_process";
import { mkdtemp, readFile, rm, stat } from "fs/promises";
import os from "os";
import path from "path";
import { promisify } from "util";
import ffmpeg from "@ffmpeg-installer/ffmpeg";
import {
  createTencentAsrTask,
  waitForTencentAsrTask
} from "../../providers/tencent/asr.js";
import { config } from "../../config/index.js";
import { buildPublicMediaUrl } from "../../shared/publicMedia.js";
import { createHttpError } from "../../shared/http.js";
import {
  buildLyricsTimeline,
  extractTencentWords,
  parseLyricLines
} from "./lyricsTimeline.js";

const TENCENT_ASR_MAX_INLINE_AUDIO_BYTES = 5 * 1024 * 1024;
const execFileAsync = promisify(execFile);

function safeJson(value, fallback = null) {
  if (!value) return fallback;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function resolveLocalMediaPath(localUrl = "") {
  const mediaPath = String(localUrl || "")
    .trim()
    .replace(/^\/?media\/?/, "")
    .replace(/^\/+/, "");

  if (!mediaPath || /^https?:\/\//i.test(mediaPath)) return "";
  return path.resolve(process.cwd(), config.media.storageDir, mediaPath);
}

async function readAsBase64AudioInput(filePath) {
  const audioBuffer = await readFile(filePath);
  return {
    audioData: audioBuffer.toString("base64"),
    audioDataLen: audioBuffer.length
  };
}

async function compressAudioForTencentAsr(filePath) {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "jingchuang-asr-"));
  const outputPath = path.join(tempDir, "audio-asr.mp3");

  try {
    await execFileAsync(ffmpeg.path, [
      "-y",
      "-i", filePath,
      "-vn",
      "-ac", "1",
      "-ar", "16000",
      "-b:a", "32k",
      outputPath
    ]);

    const compressedStat = await stat(outputPath);
    if (compressedStat.size > TENCENT_ASR_MAX_INLINE_AUDIO_BYTES) {
      throw createHttpError(
        "compressed music audio is still larger than 5MB; configure a real public audio URL for Tencent ASR",
        400
      );
    }

    return await readAsBase64AudioInput(outputPath);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

async function buildTencentAsrAudioInput(audioUrl) {
  if (/^https?:\/\//i.test(String(audioUrl || ""))) {
    return { audioUrl };
  }

  const localPath = resolveLocalMediaPath(audioUrl);
  if (localPath) {
    try {
      const fileStat = await stat(localPath);
      if (fileStat.size <= TENCENT_ASR_MAX_INLINE_AUDIO_BYTES) {
        return readAsBase64AudioInput(localPath);
      }
      return compressAudioForTencentAsr(localPath);
    } catch (error) {
      if (error?.status) throw error;
      throw createHttpError("music audio file not found locally; please regenerate the music or restore the audio file", 404);
    }
  }

  return { audioUrl: buildPublicMediaUrl(audioUrl) };
}

export async function syncMusicLyrics(taskId, userId, { force = false } = {}) {
  const row = await findMusicTaskRow({ id: taskId, userId });
  if (!row) throw createHttpError("music task not found", 404);
  if (!row.audio_url) throw createHttpError("music audio is missing", 400);
  if (!String(row.lyrics || "").trim()) throw createHttpError("lyrics is missing", 400);

  const existingTimeline = safeJson(row.lyrics_timeline, []);

  if (row.lyrics_sync_status === "processing") {
    return {
      lyricsTimeline: existingTimeline,
      lyricsSyncStatus: "processing",
      lyricsSyncError: row.lyrics_sync_error || ""
    };
  }

  if (
    !force &&
    row.lyrics_sync_status === "completed" &&
    Array.isArray(existingTimeline) &&
    existingTimeline.length > 0
  ) {
    return {
      lyricsTimeline: existingTimeline,
      lyricsSyncStatus: "completed",
      lyricsSyncError: ""
    };
  }

  await updateMusicLyricsSyncStatus(taskId, { status: "processing" });

  try {
    const audioInput = await buildTencentAsrAudioInput(row.audio_url);
    const created = await createTencentAsrTask(audioInput);
    const asrTaskId = created?.Data?.TaskId || created?.TaskId;
    if (!asrTaskId) {
      const error = new Error("Tencent ASR response missing TaskId");
      error.body = created;
      throw error;
    }

    const result = await waitForTencentAsrTask(asrTaskId);
    const words = extractTencentWords(result);
    const lyricLines = parseLyricLines(row.lyrics);
    const timeline = buildLyricsTimeline({
      lyricLines,
      words,
      durationMs: row.duration_ms || 0
    });

    await saveMusicLyricsTimeline(taskId, timeline);
    return {
      lyricsTimeline: timeline,
      lyricsSyncStatus: "completed",
      lyricsSyncError: ""
    };
  } catch (error) {
    await updateMusicLyricsSyncStatus(taskId, {
      status: "failed",
      errorMessage: error.message || "lyrics sync failed"
    });
    throw error;
  }
}
