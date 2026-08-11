import path from "path";
import { config } from "../../config/index.js";
import {
  createKieSpeechToVideoTask,
  extractKieImageDigitalHumanResult,
  getKieImageDigitalHumanTask,
  mapKieImageDigitalHumanState
} from "../../providers/kie/imageDigitalHuman.js";
import { uploadFileToKie } from "../../providers/kie/upload.js";
import {
  extractArkVideoGenerationResult,
  getArkVideoGenerationTask,
  mapArkVideoGenerationState
} from "../../providers/volcengine/videoGeneration.js";
import { getVideoDuration } from "../../providers/ffmpeg/video.js";
import { saveMinimaxSpeechAudio, synthesizeMinimaxSpeech } from "../../providers/minimax/tts.js";
import { debitCredits, refundCredits } from "../../shared/creditService.js";
import { createHttpError } from "../../shared/http.js";
import {
  createGeneratedVideoThumbnail,
  persistGeneratedVideos,
  removeStoredGeneratedVideos
} from "../../shared/generatedVideoStorage.js";
import { calculateBillingQuote, estimateSpeechSeconds } from "../../shared/billingRules.js";
import { formatBeijingClock, formatBeijingDateTime } from "../../shared/time.js";
import { getDemoUser } from "../../shared/userService.js";
import { voices } from "../digital-human/digitalHuman.data.js";
import {
  createImageDigitalHumanTaskRow,
  deleteImageDigitalHumanTaskRow,
  findImageDigitalHumanTaskRow,
  findRefreshableImageDigitalHumanTasks,
  listImageDigitalHumanTaskRows,
  lockImageDigitalHumanTaskForRefund,
  markImageDigitalHumanTaskRefunded,
  setImageDigitalHumanTaskCompleted,
  setImageDigitalHumanTaskError,
  setImageDigitalHumanTaskFailed,
  setImageDigitalHumanTaskProcessing,
  setImageDigitalHumanTaskProviderStarted
} from "./imageDigitalHuman.repository.js";
import { getPool } from "../../db/pool.js";

const maxImageDigitalHumanAudioMs = 15 * 1000;
const basePoints = 30;
const maxTextLength = 2000;
const klingAvatarPrompt =
  "A person speaks naturally according to the provided audio. Preserve the original Chinese voiceover text exactly as spoken in the audio: do not translate, rewrite, paraphrase, or generate English speech. Keep the original person, clothing, background, composition, and lighting stable. Do not add new scenes or visual elements.";
const ttsEmotionOptions = new Set(["happy", "sad", "angry", "fearful", "disgusted", "surprised", "calm"]);

function nowLabel(date = new Date()) {
  return formatBeijingDateTime(date);
}

function displayTime(value) {
  return formatBeijingClock(value);
}

function estimateSeconds(text = "") {
  return Math.max(5, Math.min(15, Math.ceil(String(text).length / 4)));
}

function getAudioDurationMs(speech, text = "") {
  const durationMs = Number(speech?.durationMs || 0);
  if (durationMs > 0) return durationMs;
  return estimateSeconds(text) * 1000;
}

function getVideoDurationSeconds(audioDurationMs, text = "") {
  return Math.max(2, Math.min(300, Math.ceil(Number(audioDurationMs || 0) / 1000) || estimateSeconds(text)));
}

function normalizeVolume(volume) {
  const number = Number(volume);
  if (!Number.isFinite(number)) return 1;
  return Math.min(10, Math.max(0.1, number));
}

function normalizeDecimal(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function normalizeEmotion(value) {
  const emotion = String(value || "").trim();
  return ttsEmotionOptions.has(emotion) ? emotion : "";
}

function getVoiceById(voiceId) {
  return voices.find((item) => item.id === voiceId) || voices[0];
}

function getModelByKey(modelKey) {
  const key = String(modelKey || "").trim();
  return getModelDefinitions().find((model) => model.value === key) || getModelDefinitions()[0];
}

function getModelDefinitions() {
  return [
    {
      value: "kie-s2v-r2v",
      label: "可灵数字人",
      provider: "kie",
      primaryModel: config.kie.imageDigitalHumanPrimaryModel,
      fallbackModel: config.kie.imageDigitalHumanFallbackModel,
      resolution: config.kie.imageDigitalHumanResolution,
      fallbackResolution: config.kie.imageDigitalHumanFallbackResolution,
      basePoints
    }
  ];
}

function mapTask(row) {
  const status = row.status === "pending" ? "processing" : row.status;
  const progress = row.status === "completed" ? 100 : row.status === "failed" ? 0 : row.provider_task_id ? 68 : 24;

  return {
    id: String(row.id),
    model: row.model_key,
    providerModel: row.provider_model,
    fallbackProviderModel: row.fallback_provider_model,
    usedProviderModel: row.used_provider_model || row.provider_model,
    text: row.text || "",
    voiceId: row.voice_id,
    voiceName: row.voice_name,
    speed: Number(row.speed || 1),
    volume: Number(row.volume || 1),
    pitch: Number(row.pitch || 0),
    emotion: row.emotion || "",
    portraitUrl: row.portrait_url || "",
    audioUrl: row.audio_url || "",
    status,
    progress,
    duration: row.audio_duration_ms ? getVideoDurationSeconds(row.audio_duration_ms, row.text || "") : estimateSeconds(row.text || ""),
    audioDurationMs: Number(row.audio_duration_ms || 0),
    costPoints: row.cost_points,
    resultUrl: row.result_url || "",
    thumbnailUrl: row.thumbnail_url || "",
    error: row.error_message || "",
    createdAtMs: new Date(row.created_at).getTime(),
    createdAt: nowLabel(row.created_at),
    time: displayTime(row.created_at)
  };
}

function mediaPathToFilePath(mediaPath = "") {
  const relativePath = String(mediaPath || "").replace(/^\/media\/?/, "");
  return path.resolve(process.cwd(), config.media.storageDir, relativePath);
}

async function createProviderTask(taskId, payload) {
  const {
    text,
    voiceId,
    speed,
    volume,
    pitch,
    emotion,
    portraitFilePath,
    portraitFileName,
    portraitMimeType,
    uploadedAudio,
    model
  } = payload;

  let savedAudio;
  let audioDurationMs;

  if (uploadedAudio) {
    console.log(`[image-digital-human] task ${taskId}: using uploaded audio ${uploadedAudio.fileName}`);
    savedAudio = {
      fileName: uploadedAudio.fileName,
      filePath: uploadedAudio.filePath,
      publicPath: uploadedAudio.publicPath,
      mimeType: uploadedAudio.mimeType
    };
    audioDurationMs = uploadedAudio.durationMs;
  } else {
    console.log(`[image-digital-human] task ${taskId}: synthesizing MiniMax TTS with voice ${voiceId}`);
    const speech = await synthesizeMinimaxSpeech({ text, voiceId, speed, volume, pitch, emotion });
    audioDurationMs = getAudioDurationMs(speech, text);
    savedAudio = await saveMinimaxSpeechAudio({
      taskId,
      audioBuffer: speech.audioBuffer,
      featureDir: "image-digital-human"
    });
  }

  if (audioDurationMs > maxImageDigitalHumanAudioMs) {
    throw createHttpError("音频时长不能超过 15 秒，请缩短文本后重试", 400);
  }

  console.log(`[image-digital-human] task ${taskId}: uploading portrait and audio to KIE`);
  const [portraitUpload, audioUpload] = await Promise.all([
    uploadFileToKie({
      filePath: portraitFilePath,
      fileName: portraitFileName,
      mimeType: portraitMimeType,
      uploadPath: "image-digital-human/portrait"
    }),
    uploadFileToKie({
      filePath: savedAudio.filePath,
      fileName: savedAudio.fileName,
      mimeType: savedAudio.mimeType,
      uploadPath: "image-digital-human/audio"
    })
  ]);

  console.log(`[image-digital-human] task ${taskId}: creating Kling AI Avatar task`);
  let usedProviderModel = model.primaryModel;
  let provider;
  try {
    provider = await createKieSpeechToVideoTask({
      model: usedProviderModel,
      prompt: klingAvatarPrompt,
      imageUrl: portraitUpload.url,
      audioUrl: audioUpload.url,
      resolution: model.resolution,
      audioDurationMs
    });
  } catch (error) {
    if (!model.fallbackModel || model.fallbackModel === usedProviderModel) throw error;
    usedProviderModel = model.fallbackModel;
    console.warn(
      `[image-digital-human] task ${taskId}: primary model failed, retrying ${usedProviderModel}`
    );
    provider = await createKieSpeechToVideoTask({
      model: usedProviderModel,
      prompt: klingAvatarPrompt,
      imageUrl: portraitUpload.url,
      audioUrl: audioUpload.url,
      resolution: model.fallbackResolution || model.resolution,
      audioDurationMs
    });
  }

  await setImageDigitalHumanTaskProviderStarted(taskId, {
    providerTaskId: provider.taskId,
    usedProviderModel,
    audioUrl: savedAudio.publicPath,
    audioProviderUrl: audioUpload.url,
    portraitProviderUrl: portraitUpload.url,
    audioDurationMs
  });
  console.log(`[image-digital-human] task ${taskId}: KIE task ${provider.taskId} created`);
}

export function getModels() {
  return {
    models: getModelDefinitions().map((model) => ({
      ...model,
      configured: Boolean(config.kie.apiKey && config.minimax.apiKey)
    })),
    defaults: {
      model: getModelDefinitions()[0].value,
      driveMode: "text"
    },
    limits: {
      maxImageBytes: 10 * 1024 * 1024,
      maxAudioMs: maxImageDigitalHumanAudioMs,
      maxTextLength
    }
  };
}

export function getVoices() {
  return { voices };
}

export async function previewVoice(payload) {
  const text = String(payload.previewText || payload.text || "").trim();
  const voiceId = String(payload.voiceId || voices[0].id).trim();
  if (!text) throw createHttpError("请输入试听文本", 400);

  const result = await synthesizeMinimaxSpeech({
    text,
    voiceId,
    speed: normalizeDecimal(payload.speed, 1),
    volume: normalizeVolume(payload.volume),
    pitch: normalizeDecimal(payload.pitch, 0),
    emotion: normalizeEmotion(payload.emotion)
  });
  const durationMs = getAudioDurationMs(result, text);

  return {
    voiceId,
    audioBase64: result.audioBase64,
    audioDataUrl: `data:${result.mimeType};base64,${result.audioBase64}`,
    durationMs,
    maxDurationMs: maxImageDigitalHumanAudioMs,
    isTooLong: durationMs > maxImageDigitalHumanAudioMs,
    videoDuration: getVideoDurationSeconds(durationMs, text)
  };
}

export async function listTasks() {
  await refreshProcessingTasks();
  const rows = await listImageDigitalHumanTaskRows();
  return rows.map(mapTask);
}

export async function getTask(id) {
  await refreshTask(id);
  const row = await findImageDigitalHumanTaskRow(id);
  return row ? mapTask(row) : null;
}

export async function createTask(payload, file, audioFile = null) {
  if (!file) throw createHttpError("请上传肖像图片", 400);
  if (Number(file.size || 0) > 10 * 1024 * 1024) {
    throw createHttpError("肖像图片大小不能超过 10MB", 400);
  }

  const text = String(payload.text || "").trim();
  const voiceId = String(payload.voiceId || voices[0].id).trim();
  const modelKey = String(payload.model || getModelDefinitions()[0].value).trim();
  const speed = normalizeDecimal(payload.speed, 1);
  const volume = normalizeVolume(payload.volume);
  const pitch = normalizeDecimal(payload.pitch, 0);
  const emotion = normalizeEmotion(payload.emotion);

  if (!text && !audioFile) throw createHttpError("请输入文本或上传音频", 400);
  if (text.length > maxTextLength) throw createHttpError(`文本长度不能超过 ${maxTextLength} 个字符`, 400);

  let uploadedAudio = null;
  if (audioFile) {
    let durationSeconds;
    try {
      durationSeconds = await getVideoDuration(audioFile.path);
    } catch {
      throw createHttpError("无法读取音频时长，请更换音频文件后重试", 400);
    }
    const durationMs = Math.round(durationSeconds * 1000);
    if (durationMs > maxImageDigitalHumanAudioMs) {
      throw createHttpError("音频时长不能超过 15 秒，请裁剪后重试", 400);
    }
    uploadedAudio = {
      fileName: audioFile.originalname || audioFile.filename,
      filePath: audioFile.path,
      publicPath: `/media/image-digital-human/audio/${audioFile.filename}`,
      mimeType: audioFile.mimetype || "audio/mpeg",
      sizeBytes: Number(audioFile.size || 0),
      durationMs
    };
  }

  const model = getModelByKey(modelKey);
  if (!model || model.provider !== "kie") throw createHttpError("图片数字人模型不存在", 400);
  const voice = getVoiceById(voiceId);
  const portraitUrl = `/media/image-digital-human/portraits/${file.filename}`;
  const billingDuration = uploadedAudio
    ? Math.max(1, Math.ceil(uploadedAudio.durationMs / 1000))
    : estimateSpeechSeconds(text);
  const costPoints = calculateBillingQuote("image-digital-human", {
    durationSeconds: billingDuration,
    text
  }).points;

  const connection = await getPool().getConnection();
  let taskId;
  let userId;

  try {
    await connection.beginTransaction();
    const user = await getDemoUser(connection);
    userId = user.id;
    taskId = await createImageDigitalHumanTaskRow(connection, {
      userId,
      modelKey: model.value,
      providerModel: model.primaryModel,
      fallbackProviderModel: model.fallbackModel,
      text,
      voiceId: voice.id,
      voiceName: voice.name,
      speed,
      volume,
      pitch,
      emotion,
      portraitUrl,
      costPoints
    });

    await debitCredits(connection, {
      userId,
      taskId,
      amount: costPoints,
      memo: "image digital human generation debit"
    });

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    connection.release();
    throw error;
  }

  connection.release();

  try {
    await createProviderTask(taskId, {
      text,
      voiceId: voice.id,
      speed,
      volume,
      pitch,
      emotion,
      portraitFilePath: file.path,
      portraitFileName: file.originalname || file.filename,
      portraitMimeType: file.mimetype || "image/png",
      uploadedAudio,
      model
    });
  } catch (error) {
    console.error("Create image digital human provider task failed:", error.message, error.body || "");
    await refundTask(taskId, userId, costPoints, `图片数字人上游服务创建失败：${formatProviderErrorMessage(error)}`);
  }

  return getTask(taskId);
}

function formatProviderErrorMessage(error) {
  const message = String(error?.message || "").trim();
  const providerMessage = String(error?.body?.msg || error?.body?.error || "").trim();
  const rawMessage = providerMessage || message;

  if (/deduction of points failed|insufficient balance|balance insufficient|insufficient quota|quota/i.test(rawMessage)) {
    return "KIE 账号额度扣减失败，请检查 KIE 后台余额或套餐额度";
  }

  return rawMessage || "服务商未返回具体原因";
}

async function refreshProcessingTasks() {
  const rows = await findRefreshableImageDigitalHumanTasks();
  await Promise.all(rows.map((row) => refreshTask(row.id)));
}

async function refreshTask(id) {
  const row = await findImageDigitalHumanTaskRow(id);
  if (!row || !row.provider_task_id || !["pending", "processing"].includes(row.status)) return;

  try {
    const isArkTask =
      row.model_key === "seedance-2.0" || row.provider_model === config.ark.videoModel;
    const record = isArkTask
      ? await getArkVideoGenerationTask({ taskId: row.provider_task_id })
      : await getKieImageDigitalHumanTask({ taskId: row.provider_task_id });
    const mapped = isArkTask
      ? mapArkVideoGenerationState(record)
      : mapKieImageDigitalHumanState(record);
    if (mapped === "completed") {
      const result = isArkTask
        ? extractArkVideoGenerationResult(record)
        : extractKieImageDigitalHumanResult(record);
      if (!result.resultUrl) {
        await refundTask(id, null, null, "图片数字人结果缺少视频链接");
      } else {
        const [localUrl] = await persistGeneratedVideos({
          taskId: id,
          feature: "image-digital-human-videos",
          urls: [result.resultUrl]
        });
        const thumbnailUrl = await createGeneratedVideoThumbnail({
          taskId: id,
          feature: "image-digital-human-videos",
          videoUrl: localUrl
        }).catch((error) => {
          console.warn(`[Image digital human ${id}] Thumbnail generation failed: ${error.message}`);
          return null;
        });
        await setImageDigitalHumanTaskCompleted(id, { ...result, resultUrl: localUrl, thumbnailUrl });
      }
    } else if (mapped === "failed") {
      if (isArkTask) {
        const result = extractArkVideoGenerationResult(record);
        await refundTask(id, null, null, result.errorMessage || "Seedance 2.0 generation failed");
        return;
      }
      await refundTask(id, null, null, record.data?.failMsg || record.data?.errorMessage || "图片数字人任务失败");
    } else {
      await setImageDigitalHumanTaskProcessing(id);
    }
  } catch (error) {
    await setImageDigitalHumanTaskError(id, `查询图片数字人状态失败：${error.message}`);
  }
}

async function refundTask(id, userIdArg, costPointsArg, message) {
  const connection = await getPool().getConnection();
  try {
    await connection.beginTransaction();
    const task = await lockImageDigitalHumanTaskForRefund(connection, id);
    if (!task) {
      await connection.rollback();
      return;
    }

    const userId = userIdArg || task.user_id;
    const costPoints = costPointsArg || task.cost_points;
    await setImageDigitalHumanTaskFailed(connection, id, message);

    if (!task.refunded) {
      await refundCredits(connection, {
        userId,
        taskId: id,
        amount: costPoints,
        memo: "image digital human generation refund"
      });
      await markImageDigitalHumanTaskRefunded(connection, id);
    }

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function deleteTask(id) {
  const result = await deleteImageDigitalHumanTaskRow(id);
  if (result?.ok) {
    await removeStoredGeneratedVideos({
      taskId: id,
      feature: "image-digital-human-videos"
    }).catch((error) => {
      console.warn(`delete local image digital human video for task ${id} failed:`, error.message);
    });
  }
  return result;
}

export async function regenerateTask(id) {
  const task = await getTask(id);
  if (!task) return null;
  if (!task.portraitUrl) throw createHttpError("源肖像图片已丢失，请重新上传", 400);
  const filePath = mediaPathToFilePath(task.portraitUrl);
  return createTask(
    {
      text: task.text,
      voiceId: task.voiceId,
      model: task.model,
      speed: task.speed,
      volume: task.volume,
      pitch: task.pitch,
      emotion: task.emotion
    },
    {
      path: filePath,
      filename: path.basename(filePath),
      originalname: path.basename(filePath),
      mimetype: "image/png"
    }
  );
}
