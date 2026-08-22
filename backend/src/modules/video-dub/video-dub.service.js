import { randomUUID } from "crypto";
import { mkdir, writeFile, unlink } from "fs/promises";
import path from "path";
import { config } from "../../config/index.js";
import { createHttpError } from "../../shared/http.js";
import { analyzeFramesWithQwen } from "../../providers/qwen/video.js";
import { extractKeyFrames, composeFinalVideo, getVideoDuration } from "../../providers/ffmpeg/video.js";
import { synthesizeMinimaxSpeech } from "../../providers/minimax/tts.js";
import { generateKieMusic } from "../../providers/kie/musicGeneration.js";
import { calculateBillingQuote } from "../../shared/billingRules.js";
import { chargeCredits, refundChargedCredits } from "../../shared/billingCharge.js";
import {
  createVideoDubTask,
  deleteVideoDubTask,
  findVideoDubTask,
  listVideoDubTasks,
  updateVideoDubTask
} from "./video-dub.repository.js";

const maxVideoBytes = 2 * 1024 * 1024 * 1024; // 2GB per Qwen limit
const allowedVideoTypes = new Set([
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-msvideo"
]);
const allowedVideoExts = new Set([".mp4", ".webm", ".mov", ".avi"]);

const storageBase = path.resolve(process.cwd(), config.media.storageDir, "video-dub");

const minimaxTtsEmotions = new Set(["happy", "sad", "angry", "fearful", "disgusted", "surprised", "calm"]);

function getExt(fileName = "") {
  const match = String(fileName).toLowerCase().match(/\.[a-z0-9]+$/);
  return match ? match[0] : "";
}

function assertVideoFile(file) {
  if (!file) throw createHttpError("请上传视频文件", 400);
  if (file.size > maxVideoBytes) {
    throw createHttpError("视频文件需小于 2GB", 400);
  }

  const mimeType = String(file.mimetype || "").toLowerCase();
  const ext = getExt(file.originalname);
  if (!allowedVideoTypes.has(mimeType) && !allowedVideoExts.has(ext)) {
    throw createHttpError("视频文件需为 mp4、webm、mov 或 avi 格式", 400);
  }
}

function normalizeTtsEmotion(emotion) {
  const value = String(emotion || "").trim();
  return minimaxTtsEmotions.has(value) ? value : "";
}

function buildFrameAnalysisPrompt(durationSeconds) {
  const seconds = Math.max(1, Math.round(Number(durationSeconds) || 0));
  const maxChineseChars = Math.max(18, Math.floor(seconds * 4.2));
  return `Analyze these video frames and return JSON only.
The "text" field must be a complete Chinese voiceover script that can be spoken in about ${seconds} seconds.
Keep "text" concise, no more than ${maxChineseChars} Chinese characters, and avoid long pauses or scene-by-scene overexplaining.
{
  "text": "Chinese voiceover script matched to the video duration",
  "style": "overall style",
  "mood": "emotional tone",
  "genre": "recommended instrumental background music genre",
  "emotion_tag": "choose one: happy, sad, angry, calm, fluent, neutral, surprised, fearful"
}`;
}

function buildStoragePaths(taskId) {
  return {
    uploadsDir: path.join(storageBase, "uploads"),
    framesDir: path.join(storageBase, "frames", taskId),
    voiceDir: path.join(storageBase, "voice", taskId),
    bgmDir: path.join(storageBase, "bgm", taskId),
    resultsDir: path.join(storageBase, "results", taskId)
  };
}

function buildFrameUrl(taskId, frameName = "frame_001.jpg") {
  return `/media/video-dub/frames/${taskId}/${frameName}`;
}

export function getConfig() {
  return {
    maxBytes: maxVideoBytes,
    formats: ["mp4", "webm", "mov", "avi"],
    emotions: ["happy", "sad", "angry", "calm", "fluent", "neutral", "surprised", "fearful", "disgusted"],
    defaultBgmVolume: 0.25,
    maxBgmVolume: 0.35,
    stages: [
      "uploaded",
      "queued",
      "extracting_frames",
      "analyzing_video",
      "generating_script",
      "generating_voice",
      "generating_bgm",
      "composing_video",
      "completed",
      "failed"
    ]
  };
}

async function saveTask(task) {
  await updateVideoDubTask(task);
}

export async function uploadVideo({ file, userId }) {
  assertVideoFile(file);

  const taskId = `video-dub-${Date.now()}-${randomUUID().slice(0, 8)}`;
  const paths = buildStoragePaths(taskId);
  await mkdir(paths.uploadsDir, { recursive: true });

  const ext = getExt(file.originalname) || ".mp4";
  const fileName = `${taskId}${ext}`;
  const filePath = path.join(paths.uploadsDir, fileName);
  await writeFile(filePath, file.buffer);

  const task = {
    id: taskId,
    status: "uploaded",
    stage: "uploaded",
    sourceAssetId: taskId,
    sourceUrl: `/media/video-dub/uploads/${fileName}`,
    sourceFileName: file.originalname,
    filePath,
    fileSize: file.size,
    mimeType: file.mimetype,
    analysis: null,
    dubbing: null,
    bgm: null,
    result: null,
    error: null,
    userId
  };

  await createVideoDubTask(task);
  return task;
}

export async function createTask({ sourceAssetId, voiceId, language, bgmEnabled, bgmVolume, qwenMode, userId }) {
  const task = await findVideoDubTask({ id: sourceAssetId, userId });
  if (!task) {
    throw createHttpError("源素材不存在，请重新上传", 404);
  }

  if (task.status !== "uploaded" && task.status !== "failed") {
    throw createHttpError("已有进行中的任务", 409);
  }

  // Validate API keys before starting
  if (!config.qwen.apiKey) {
    throw createHttpError("Qwen API 未配置，请联系管理员", 500);
  }
  if (!config.minimax.apiKey) {
    throw createHttpError("MiniMax API 未配置，请联系管理员", 500);
  }
  if (bgmEnabled !== false && (!config.kie.musicEnabled || !config.kie.apiKey)) {
    throw createHttpError("AI 背景音乐服务正在维护中，请关闭背景音乐后重试", 503);
  }

  const sourceDurationSeconds = await getVideoDuration(task.filePath);
  const quote = calculateBillingQuote("video-dub", {
    durationSeconds: sourceDurationSeconds,
    bgmEnabled: bgmEnabled !== false
  });
  await chargeCredits({ userId, taskId: task.id, amount: quote.points, memo: "video dubbing debit" });

  task.status = "queued";
  task.stage = "queued";
  task.voiceId = voiceId || "male-qn-qingse";
  task.language = language || "zh";
  task.bgmEnabled = bgmEnabled !== false;
  task.bgmVolume = Math.min(0.35, Math.max(0.1, Number(bgmVolume) || 0.25));
  task.qwenMode = qwenMode || "auto";
  task.error = null;
  task.userId = userId;
  task.costPoints = quote.points;
  task.billing = quote;
  task.sourceDurationSeconds = sourceDurationSeconds;
  await saveTask(task);

  // Kick off async pipeline
  processPipeline(task).catch((err) => {
    console.error(`[VideoDub ${task.id}] Pipeline failed:`, err);
    task.status = "failed";
    task.stage = "failed";
    task.error = err.message || "Video dubbing pipeline failed";
    saveTask(task).catch((saveError) =>
      console.error(`[VideoDub ${task.id}] Could not save failed task:`, saveError)
    );
    refundChargedCredits({
      userId: task.userId,
      taskId: task.id,
      amount: task.costPoints,
      memo: "video dubbing failure refund"
    }).catch((refundError) => console.error(`[VideoDub ${task.id}] Refund failed:`, refundError));
    task.error = err.message || "处理流程失败";
  });

  return task;
}

async function processPipeline(task) {
  const paths = buildStoragePaths(task.id);
  await mkdir(paths.framesDir, { recursive: true });
  await mkdir(paths.voiceDir, { recursive: true });
  await mkdir(paths.bgmDir, { recursive: true });
  await mkdir(paths.resultsDir, { recursive: true });
  const sourceDurationSeconds = task.sourceDurationSeconds || await getVideoDuration(task.filePath);

  // Step 1: Extract frames (Phase 3: FFmpeg required)
  task.stage = "extracting_frames";
  task.status = "extracting_frames";
  await saveTask(task);
  let framesBase64 = [];
  try {
    framesBase64 = await extractVideoFrames(task.filePath, paths.framesDir);
    task.thumbnailUrl = buildFrameUrl(task.id);
    await saveTask(task);
  } catch (frameError) {
    console.error(`[VideoDub ${task.id}] Frame extraction failed:`, frameError.message);
    throw new Error(`视频抽帧失败：${frameError.message}`);
  }
  if (framesBase64.length === 0) {
    throw new Error("视频抽帧功能未实现（需要 FFmpeg）");
  }

  // Step 2: Analyze with Qwen
  task.stage = "analyzing_video";
  task.status = "analyzing_video";
  await saveTask(task);
  let analysis;
  try {
    analysis = await analyzeFramesWithQwen({
      framesBase64,
      prompt: buildFrameAnalysisPrompt(sourceDurationSeconds)
    });
  } catch (qwenError) {
    console.error(`[VideoDub ${task.id}] Qwen analysis failed:`, qwenError.message);
    throw new Error(`视频分析失败：${qwenError.message}`);
  }

  task.analysis = {
    text: analysis.text,
    style: analysis.style,
    mood: analysis.mood,
    genre: analysis.genre,
    emotionTag: analysis.emotionTag,
    targetDurationMs: Math.round(sourceDurationSeconds * 1000)
  };
  await saveTask(task);

  // Step 3: Generate voice with MiniMax TTS
  task.stage = "generating_voice";
  task.status = "generating_voice";
  await saveTask(task);
  const ttsEmotion = normalizeTtsEmotion(analysis.emotionTag);
  const ttsResult = await synthesizeMinimaxSpeech({
    text: analysis.text,
    voiceId: task.voiceId,
    speed: mapEmotionToSpeed(analysis.emotionTag),
    emotion: ttsEmotion
  });

  const voiceFileName = `${task.id}-voice.mp3`;
  const voiceFilePath = path.join(paths.voiceDir, voiceFileName);
  await writeFile(voiceFilePath, ttsResult.audioBuffer);

  task.dubbing = {
    voiceId: task.voiceId,
    emotion: analysis.emotionTag,
    speed: mapEmotionToSpeed(analysis.emotionTag),
    audioUrl: `/media/video-dub/voice/${task.id}/${voiceFileName}`,
    durationMs: ttsResult.durationMs
  };
  await saveTask(task);

  // Step 4: Generate BGM with KIE Suno
  if (task.bgmEnabled) {
    task.stage = "generating_bgm";
    task.status = "generating_bgm";
    await saveTask(task);
    const bgmPrompt = buildBgmPrompt(analysis);

    const musicResult = await generateKieMusic({
      prompt: bgmPrompt,
      title: `${analysis.genre || "Video"} BGM`.slice(0, 80),
      model: config.kie.musicModel,
      isInstrumental: true,
      durationSeconds: sourceDurationSeconds
    });

    const bgmFileName = `${task.id}-bgm.mp3`;
    const bgmFilePath = path.join(paths.bgmDir, bgmFileName);
    await writeFile(bgmFilePath, musicResult.audioBuffer);

    task.bgm = {
      audioUrl: `/media/video-dub/bgm/${task.id}/${bgmFileName}`,
      prompt: bgmPrompt,
      durationMs: musicResult.durationMs
    };
    await saveTask(task);
  }

  // Step 5: Compose final video with FFmpeg
  task.stage = "composing_video";
  task.status = "composing_video";
  await saveTask(task);

  const resultFileName = `${task.id}-dubbed.mp4`;
  const resultFilePath = path.join(paths.resultsDir, resultFileName);

  const composeInfo = await composeFinalVideo({
    videoPath: task.filePath,
    voicePath: path.join(paths.voiceDir, `${task.id}-voice.mp3`),
    bgmPath: task.bgmEnabled ? path.join(paths.bgmDir, `${task.id}-bgm.mp3`) : null,
    bgmVolume: task.bgmVolume,
    outputPath: resultFilePath
  });
  task.dubbing.voiceTempo = composeInfo.voiceTempo;
  task.dubbing.finalDurationMs = Math.round(composeInfo.videoDuration * 1000);

  task.status = "completed";
  task.stage = "completed";
  task.result = {
    videoUrl: `/media/video-dub/results/${task.id}/${resultFileName}`
  };
  await saveTask(task);
}

async function extractVideoFrames(videoPath, framesDir) {
  // Extract 3 key frames at ~25%, 50%, 75% of video duration
  return extractKeyFrames(videoPath, framesDir, 3);
}

function mapEmotionToSpeed(emotion) {
  const map = {
    happy: 1.1,
    sad: 0.9,
    angry: 1.2,
    calm: 0.9,
    fluent: 1.0,
    neutral: 1.0,
    surprised: 1.15,
    fearful: 0.85,
    disgusted: 0.95
  };
  return map[emotion] || 1.0;
}

function buildBgmPrompt(analysis) {
  const genre = analysis.genre || "电子氛围";
  const mood = analysis.mood || "轻松";
  const style = analysis.style || "通用";
  return `${genre}, ${mood} atmosphere, ${style} feeling, instrumental only, no vocals, soft background music, cinematic`;
}

export async function getTaskById(taskId, userId) {
  const task = await findVideoDubTask({ id: taskId, userId });
  if (!task) throw createHttpError("任务不存在", 404);
  return sanitizeTask(task);
}

export async function getRecentTasks(userId) {
  const tasks = await listVideoDubTasks({ userId });
  return tasks.map(sanitizeTask);
}

export async function deleteTask(taskId, userId) {
  const task = await findVideoDubTask({ id: taskId, userId });
  if (!task) throw createHttpError("任务不存在", 404);

  const paths = buildStoragePaths(taskId);
  try {
    if (task.filePath) await unlink(task.filePath).catch(() => {});
  } catch {
    // ignore cleanup errors
  }

  await deleteVideoDubTask({ id: taskId, userId });
  return { ok: true };
}

function sanitizeTask(task) {
  const thumbnailUrl = task.thumbnailUrl || (task.result ? buildFrameUrl(task.id) : null);
  const result = {
    id: task.id,
    status: task.status,
    stage: task.stage,
    sourceAssetId: task.sourceAssetId,
    sourceFileName: task.sourceFileName,
    thumbnailUrl,
    result: task.result || null,
    createdAt: task.createdAt,
    error: task.error || null
  };

  if (task.status !== "uploaded" && task.status !== "queued") {
    result.analysis = task.analysis || null;
    result.dubbing = task.dubbing || null;
    result.bgm = task.bgm || null;
    result.progress = calculateProgress(task.stage);
  }

  return result;
}

function calculateProgress(stage) {
  const progressMap = {
    uploaded: 0,
    queued: 5,
    extracting_frames: 10,
    analyzing_video: 25,
    generating_script: 35,
    generating_voice: 50,
    generating_bgm: 70,
    composing_video: 85,
    completed: 100,
    failed: 0
  };
  return progressMap[stage] || 0;
}
