import { access, mkdir, rename, writeFile } from "fs/promises";
import { execFile } from "child_process";
import { createHash, randomUUID } from "crypto";
import path from "path";
import { promisify } from "util";
import { ffmpegPath } from "../../shared/ffmpegPath.js";
import { config } from "../../config/index.js";
import { getPool } from "../../db/pool.js";
import {
  createKieDigitalHumanTask,
  extractKieDigitalHumanResult,
  getKieDigitalHumanTask,
  mapKieDigitalHumanState
} from "../../providers/kie/digitalHuman.js";
import { uploadFileToKie } from "../../providers/kie/upload.js";
import {
  buildReferenceAudio,
  buildReferenceImage,
  createArkVideoGenerationTask,
  extractArkVideoGenerationResult,
  getArkVideoGenerationTask,
  mapArkVideoGenerationState
} from "../../providers/volcengine/videoGeneration.js";
import { saveMinimaxSpeechAudio, synthesizeMinimaxSpeech } from "../../providers/minimax/tts.js";
import { designMinimaxVoice } from "../../providers/minimax/voiceDesign.js";
import { debitCredits, refundCredits } from "../../shared/creditService.js";
import { createHttpError } from "../../shared/http.js";
import { calculateBillingQuote, estimateSpeechSeconds } from "../../shared/billingRules.js";
import { formatBeijingClock, formatBeijingDateTime } from "../../shared/time.js";
import { getDemoUser } from "../../shared/userService.js";
import {
  createTask as createImageGenerationTask,
  getTask as getImageGenerationTask
} from "../image/image.service.js";
import { imageToImageModelKey } from "../image/image.options.js";
import { publicAvatars, digitalHumanModels, voices } from "./digitalHuman.data.js";
import {
  createVirtualAssetFromLocalFile,
  createVirtualAssetFromRemoteUrl,
  isArkOpenApiConfigured,
  listVirtualAssets,
  refreshVirtualAsset,
  waitForVirtualAssetReference
} from "./arkVirtualAssets.service.js";
import {
  createDigitalHumanTaskRow,
  deleteDigitalHumanTaskRow,
  findDigitalHumanTaskRow,
  findRefreshableDigitalHumanTasks,
  listDigitalHumanTaskRows,
  lockDigitalHumanTaskForRefund,
  markDigitalHumanTaskRefunded,
  setDigitalHumanTaskCompleted,
  setDigitalHumanTaskError,
  setDigitalHumanTaskFailed,
  setDigitalHumanTaskProcessing,
  setDigitalHumanTaskProviderStarted
} from "./digitalHuman.repository.js";

const myAvatars = [];
const designedVoices = [];
const uploadedDriveAudios = new Map();
const uploadedSceneImages = new Map();
const execFileAsync = promisify(execFile);
const maxDigitalHumanAudioMs = 15 * 1000;
const minSeedanceReferenceAudioMs = 2 * 1000;
const klingAvatarPrompt =
  "A person speaks naturally according to the provided audio. Preserve the original Chinese voiceover text exactly as spoken in the audio: do not translate, rewrite, paraphrase, or generate English speech. Keep the original person, clothing, background, composition, and lighting stable. Do not add new scenes or visual elements.";
const seedanceDigitalHumanPrompt =
  "请生成一段单人数字人口播视频。人物参考图是所选数字人的三视图/身份图，用于确定同一个数字人的脸型、五官、发型、服装、体态和整体外观，请严格保持人物身份一致，不要更换人物、不要新增其他人物。参考音频是真实口播音频，请直接按照参考音频进行自然口型同步和面部表情驱动，不要翻译、改写、复述、总结或生成新的对白，不要生成英文对白。若提供了场景参考图，仅将其作为背景、空间氛围和光线参考，人物仍以三视图为准；若未提供场景参考图，请使用人物参考图中的默认视觉风格，保持画面干净稳定。镜头保持稳定，动作以自然头部微动、眨眼和口型同步为主，不要添加无关文字、字幕、logo、水印、商品包装变化或新场景。";

const seedanceDigitalHumanPromptV2 = [
  "请生成一段单人数字人口播视频。",
  "人物参考图是所选数字人的三视图/身份图，只用于确定同一个数字人的脸型、五官、发型、服装、体态和整体外观；必须严格保持人物身份一致，不要替换人物，不要新增其他人物。",
  "场景参考图是最终视频的背景、空间氛围和光线参考；必须把数字人自然放入该场景中，不要忽略场景参考图，不要只使用纯色背景或空白背景。",
  "参考音频是最终口播的唯一依据。必须直接读取并遵循 reference_audio 的真实音频内容、节奏、停顿、语气和时长，让数字人的口型、面部表情和轻微头部动作严格同步参考音频。",
  "最终视频必须以 reference_audio 作为口播声音来源，不要生成静音视频，不要替换成新的配音或新的台词。",
  "不要翻译、改写、复述、总结或重新生成中文口播文案；不要生成英文对白；不要添加无关文字、字幕、logo、水印、无关商品或新场景。",
  "镜头保持稳定，画面干净自然，以真实口播感为主。"
].join("\n");

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

function getVideoDurationSeconds(audioDurationMs) {
  return Math.max(2, Math.min(15, Math.ceil(Number(audioDurationMs || 0) / 1000)));
}

function getArkDurationSeconds(audioDurationMs) {
  const seconds = Math.ceil(Number(audioDurationMs || 0) / 1000);
  return seconds > 5 ? 10 : 5;
}

async function padAudioFileToMinimumDuration(filePath, currentDurationMs, minimumDurationMs = minSeedanceReferenceAudioMs) {
  const durationMs = Number(currentDurationMs || 0);
  if (durationMs >= minimumDurationMs) return durationMs;

  const targetSeconds = minimumDurationMs / 1000;
  const tempPath = `${filePath}.seedance-pad-${Date.now()}.mp3`;
  await execFileAsync(ffmpegPath, [
    "-y",
    "-i",
    filePath,
    "-af",
    "apad",
    "-t",
    String(targetSeconds),
    "-c:a",
    "libmp3lame",
    "-b:a",
    "128k",
    tempPath
  ]);
  await rename(tempPath, filePath);
  return minimumDurationMs;
}

function normalizeUploadedAudioDurationMs(value) {
  const durationMs = Math.round(Number(value || 0));
  return Number.isFinite(durationMs) && durationMs > 0 ? durationMs : 0;
}

function getUploadedDriveAudio(audioFileId) {
  const id = String(audioFileId || "").trim();
  return id ? uploadedDriveAudios.get(id) : null;
}

function getUploadedSceneImage(sceneFileId) {
  const id = String(sceneFileId || "").trim();
  return id ? uploadedSceneImages.get(id) : null;
}

function isImagePath(filePath = "") {
  return /\.(jpe?g|png|webp)$/i.test(filePath);
}

function isVideoPath(filePath = "") {
  return /\.(mp4|webm|mov)$/i.test(filePath);
}

function getImageMimeType(filePath = "") {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  return "image/jpeg";
}

const ttsEmotionOptions = new Set(["happy", "sad", "angry", "fearful", "disgusted", "surprised", "calm"]);

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
  const id = String(voiceId || "").trim();
  const found = [...designedVoices, ...voices].find((item) => item.id === id);
  if (found) return found;
  if (id) return { id, name: "自定义音色", providerVoiceId: id };
  return voices[0];
}

function getProviderVoiceId(voice) {
  return String(voice?.providerVoiceId || voice?.id || voices[0].id).trim();
}

function isAiCustomAvatarAsset(asset) {
  return String(asset?.localUrl || "").includes("/digital-human/avatars/ai/");
}

function mapVirtualAssetToAvatar(asset) {
  if (!asset) return null;
  const ready = asset.status === "active";
  const isAiCustom = isAiCustomAvatarAsset(asset);
  return {
    id: `ark-asset-${asset.id}`,
    name: isAiCustom ? "AI Custom Avatar" : asset.fileName || `Ark Avatar ${asset.id}`,
    description:
      asset.status === "failed"
        ? asset.error || "Ark asset failed"
        : ready
          ? "Ark AIGC asset is Active"
          : "Ark AIGC asset is processing",
    language: "自定义 / 可灵",
    status: ready ? "ready" : asset.status === "failed" ? "failed" : "training",
    cover: asset.localUrl,
    provider: "kie",
    source: isAiCustom ? "ai-custom" : "upload",
    avatarType: isAiCustom ? "ai-custom" : "upload",
    arkAssetId: asset.id,
    providerAssetId: asset.providerAssetId,
    assetUri: asset.assetUri,
    createdAt: nowLabel(asset.createdAt || new Date())
  };
}

async function getMyAvatars() {
  const assets = await listVirtualAssets({ feature: "digital-human" });
  return assets
    .filter((asset) => asset.assetType === "Image" && isAiCustomAvatarAsset(asset))
    .map(mapVirtualAssetToAvatar)
    .filter(Boolean);
}

async function getAvatarById(avatarId) {
  const staticAvatar = publicAvatars.find((item) => item.id === avatarId);
  if (staticAvatar) return staticAvatar;

  const match = /^ark-asset-(\d+)$/.exec(String(avatarId || ""));
  if (!match) return null;
  if (!isArkOpenApiConfigured()) {
    const asset = await refreshVirtualAsset(match[1]);
    return asset ? mapVirtualAssetToAvatar(asset) : null;
  }
  return mapVirtualAssetToAvatar(await refreshVirtualAsset(match[1]));
}

function getModelByKey(modelKey) {
  return digitalHumanModels.find((item) => item.value === modelKey) || digitalHumanModels[0];
}

function mapTask(row) {
  const status = row.status === "pending" ? "processing" : row.status;
  const progress = row.status === "completed" ? 100 : row.status === "failed" ? 0 : row.provider_task_id ? 68 : 24;

  return {
    id: String(row.id),
    avatarId: row.avatar_id,
    avatarName: row.avatar_name,
    voiceId: row.voice_id,
    voiceName: row.voice_name,
    model: row.model_key,
    providerModel: row.provider_model,
    driveMode: row.drive_mode,
    text: row.text || "",
    speed: Number(row.speed || 1),
    volume: Number(row.volume || 1),
    pitch: Number(row.pitch || 0),
    emotion: row.emotion || "",
    audioUrl: row.audio_url || "",
    status,
    progress,
    duration: row.audio_duration_ms ? getVideoDurationSeconds(row.audio_duration_ms) : estimateSeconds(row.text || ""),
    audioDurationMs: Number(row.audio_duration_ms || 0),
    costPoints: row.cost_points,
    resultUrl: row.result_url || "",
    thumbnailUrl: row.thumbnail_url || "",
    error: row.error_message || "",
    createdAt: nowLabel(row.created_at),
    time: displayTime(row.created_at)
  };
}

function resolvePublicAssetPath(assetPath = "") {
  const relativePath = String(assetPath || "").replace(/^\/+/, "");
  return path.resolve(process.cwd(), config.media.publicAssetsDir, relativePath);
}

function resolveAssetFilePath(assetPath = "") {
  const value = String(assetPath || "").trim();
  if (!value) return "";
  if (value.startsWith("/media/")) {
    const relativePath = value.replace(/^\/media\/?/, "");
    return path.resolve(process.cwd(), config.media.storageDir, relativePath);
  }
  return resolvePublicAssetPath(value);
}

async function assertFileExists(filePath, message) {
  try {
    await access(filePath);
  } catch {
    throw createHttpError(message, 500);
  }
}

async function fileExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function getCompanionPosterPath(filePath) {
  const parsed = path.parse(filePath);
  const posterPath = path.join(parsed.dir, "posters", `${parsed.name}.jpg`);
  return (await fileExists(posterPath)) ? posterPath : "";
}

async function getVideoPosterPath(filePath) {
  const outputDir = path.resolve(process.cwd(), config.media.storageDir, "digital-human", "avatar-frames");
  await mkdir(outputDir, { recursive: true });
  const fileHash = createHash("sha256").update(path.resolve(filePath)).digest("hex").slice(0, 16);
  const safeBaseName = path.basename(filePath, path.extname(filePath)).replace(/[^\p{L}\p{N}._-]+/gu, "-").slice(0, 48);
  const outputPath = path.join(outputDir, `${safeBaseName || "avatar"}-${fileHash}.jpg`);

  try {
    await access(outputPath);
    return outputPath;
  } catch {}

  await execFileAsync(ffmpegPath, [
    "-y",
    "-ss",
    "0.1",
    "-i",
    filePath,
    "-frames:v",
    "1",
    "-q:v",
    "2",
    outputPath
  ]);
  return outputPath;
}

async function resolveImageAssetFile(assetPath, label) {
  if (!assetPath) {
    throw createHttpError(`${label} image asset is required`, 400);
  }

  const filePath = resolveAssetFilePath(assetPath);
  await assertFileExists(filePath, `${label} asset not found: ${assetPath}`);
  const imagePath = isImagePath(filePath)
    ? filePath
    : isVideoPath(filePath)
      ? (await getCompanionPosterPath(filePath)) || (await getVideoPosterPath(filePath))
      : "";
  if (!imagePath) {
    throw createHttpError(`${label} asset must be an image or video`, 400);
  }
  return imagePath;
}

async function getAvatarIdentityImageFile(avatar) {
  const assetPath = avatar.threeView || avatar.imagePath || avatar.posterPath || avatar.poster || avatar.assetPath || avatar.cover;
  return resolveImageAssetFile(assetPath, "avatar");
}

async function getAvatarSceneImageFile(avatar, uploadedScene) {
  if (uploadedScene?.filePath) return uploadedScene.filePath;
  const assetPath = avatar.posterPath || avatar.poster || avatar.assetPath || avatar.cover || avatar.threeView || avatar.imagePath;
  return resolveImageAssetFile(assetPath, "scene");
}

async function getAvatarImageProviderUrl(avatar) {
  if (avatar.providerImageUrl) return avatar.providerImageUrl;
  const imagePath = await getAvatarIdentityImageFile(avatar);

  const upload = await uploadFileToKie({
    filePath: imagePath,
    fileName: path.basename(imagePath),
    mimeType: getImageMimeType(imagePath),
    uploadPath: "digital-human/avatar-image"
  });
  return upload.url;
}

async function createKieProviderTaskFromUrls(taskId, { audioUrl, avatarImageUrl, audioLocalUrl, audioDurationMs }) {
  console.log(`[digital-human] task ${taskId}: creating fallback ${config.kie.digitalHumanModel} task`);
  const provider = await createKieDigitalHumanTask({
    model: config.kie.digitalHumanModel,
    imageUrl: avatarImageUrl,
    audioUrl,
    prompt: klingAvatarPrompt
  });

  await setDigitalHumanTaskProviderStarted(taskId, {
    providerTaskId: provider.taskId,
    providerModel: config.kie.digitalHumanModel,
    audioUrl: audioLocalUrl || "",
    audioProviderUrl: audioUrl,
    avatarProviderUrl: avatarImageUrl,
    audioDurationMs
  });
  console.log(`[digital-human] task ${taskId}: fallback KIE task ${provider.taskId} created`);
  return provider;
}

async function uploadImageToKieReference(filePath, uploadPath) {
  const upload = await uploadFileToKie({
    filePath,
    fileName: path.basename(filePath),
    mimeType: getImageMimeType(filePath),
    uploadPath
  });
  return upload.url;
}

async function createSeedanceVirtualReferenceFromUrl({ userId, feature, url, originalName, mimeType }) {
  if (/^asset:\/\//i.test(String(url || ""))) return url;
  const asset = await createVirtualAssetFromRemoteUrl({
    userId,
    feature,
    url,
    originalName,
    mimeType
  });
  return waitForVirtualAssetReference(asset.id);
}

async function savePreviewVoiceAudio({ audioBuffer, durationMs }) {
  const id = `dh-audio-${randomUUID()}`;
  const audioDir = path.resolve(process.cwd(), config.media.storageDir, "digital-human", "audio-uploads");
  await mkdir(audioDir, { recursive: true });
  const fileName = `${id}.mp3`;
  const filePath = path.join(audioDir, fileName);
  await writeFile(filePath, audioBuffer);

  const audio = {
    id,
    filePath,
    localUrl: `/media/digital-human/audio-uploads/${fileName}`,
    originalName: fileName,
    mimeType: "audio/mpeg",
    sizeBytes: audioBuffer.length,
    durationMs,
    createdAt: new Date()
  };
  uploadedDriveAudios.set(id, audio);
  return audio;
}

async function createProviderTask(taskId, payload) {
  const { text, voiceId, speed, volume, pitch, emotion, avatar, model, uploadedAudio, uploadedScene, userId } = payload;
  let savedAudio;
  let audioDurationMs;

  if (uploadedAudio) {
    console.log(`[digital-human] task ${taskId}: using uploaded drive audio ${uploadedAudio.id}`);
    savedAudio = {
      fileName: path.basename(uploadedAudio.filePath),
      filePath: uploadedAudio.filePath,
      publicPath: uploadedAudio.localUrl,
      mimeType: uploadedAudio.mimeType || "audio/mpeg"
    };
    audioDurationMs = normalizeUploadedAudioDurationMs(uploadedAudio.durationMs) || estimateSeconds(text) * 1000;
  } else {
    console.log(`[digital-human] task ${taskId}: synthesizing MiniMax TTS with voice ${voiceId}`);
    const speech = await synthesizeMinimaxSpeech({ text, voiceId, speed, volume, pitch, emotion });
    audioDurationMs = getAudioDurationMs(speech, text);
    savedAudio = await saveMinimaxSpeechAudio({ taskId, audioBuffer: speech.audioBuffer });
  }

  if (audioDurationMs > maxDigitalHumanAudioMs) {
    throw createHttpError("audio duration must be 15 seconds or shorter", 400);
  }
  audioDurationMs = await padAudioFileToMinimumDuration(savedAudio.filePath, audioDurationMs);

  const [avatarImagePath, sceneImagePath] = await Promise.all([
    getAvatarIdentityImageFile(avatar),
    getAvatarSceneImageFile(avatar, uploadedScene)
  ]);

  console.log(`[digital-human] task ${taskId}: preparing public provider assets`);
  const [kieAudioUpload, kieAvatarImageProviderUrl, kieSceneImageProviderUrl] = await Promise.all([
    uploadFileToKie({
      filePath: savedAudio.filePath,
      fileName: savedAudio.fileName,
      mimeType: savedAudio.mimeType,
      uploadPath: "digital-human/audio"
    }),
    uploadImageToKieReference(avatarImagePath, "digital-human/avatar-image"),
    uploadImageToKieReference(sceneImagePath, "digital-human/scene-image")
  ]);

  if (model.provider !== "ark") {
    return createKieProviderTaskFromUrls(taskId, {
      audioUrl: kieAudioUpload.url,
      avatarImageUrl: kieAvatarImageProviderUrl,
      audioLocalUrl: savedAudio.publicPath,
      audioDurationMs
    });
  }

  try {
    console.log(`[digital-human] task ${taskId}: creating ${config.ark.videoModel} task`);
    const [avatarReference, sceneReference, audioReference] = await Promise.all([
      createSeedanceVirtualReferenceFromUrl({
        userId,
        feature: "digital-human-avatar-three-view",
        url: kieAvatarImageProviderUrl,
        originalName: path.basename(avatarImagePath),
        mimeType: getImageMimeType(avatarImagePath)
      }),
      kieSceneImageProviderUrl
        ? createSeedanceVirtualReferenceFromUrl({
            userId,
            feature: "digital-human-scene-image",
            url: kieSceneImageProviderUrl,
            originalName: path.basename(sceneImagePath),
            mimeType: getImageMimeType(sceneImagePath)
          })
        : Promise.resolve(""),
      createSeedanceVirtualReferenceFromUrl({
        userId,
        feature: "digital-human-audio",
        url: kieAudioUpload.url,
        originalName: savedAudio.fileName,
        mimeType: savedAudio.mimeType
      })
    ]);

    const content = [
      { type: "text", text: seedanceDigitalHumanPromptV2 },
      buildReferenceImage(avatarReference),
      buildReferenceAudio(audioReference)
    ];
    if (sceneReference) {
      content.splice(2, 0, buildReferenceImage(sceneReference));
    }

    const provider = await createArkVideoGenerationTask({
      model: config.ark.videoModel,
      content,
      resolution: "720p",
      ratio: "adaptive",
      duration: getArkDurationSeconds(audioDurationMs),
      generateAudio: true,
      watermark: false
    });

    await setDigitalHumanTaskProviderStarted(taskId, {
      providerTaskId: provider.taskId,
      providerModel: config.ark.videoModel,
      audioUrl: savedAudio.publicPath,
      audioProviderUrl: kieAudioUpload.url,
      avatarProviderUrl: kieAvatarImageProviderUrl,
      audioDurationMs
    });
    console.log(`[digital-human] task ${taskId}: Seedance task ${provider.taskId} created`);
    return provider;
  } catch (error) {
    console.error(`[digital-human] task ${taskId}: Seedance create failed, falling back to KIE`, error.message, error.body || "");
    return createKieProviderTaskFromUrls(taskId, {
      audioUrl: kieAudioUpload.url,
      avatarImageUrl: kieAvatarImageProviderUrl,
      audioLocalUrl: savedAudio.publicPath,
      audioDurationMs
    });
  }
}
export function getModels() {
  return {
    models: digitalHumanModels.map((model) => ({
      ...model,
      providerModel: model.provider === "kie" ? config.kie.digitalHumanModel : config.ark.videoModel,
      resolution: config.kie.digitalHumanResolution,
      configured: model.provider === "kie"
        ? Boolean(config.kie.apiKey && config.minimax.apiKey)
        : Boolean(config.ark.apiKey && config.ark.accessKeyId && config.ark.secretAccessKey && config.minimax.apiKey)
    })),
    defaults: {
      model: digitalHumanModels[0].value,
      driveMode: "text"
    }
  };
}

export async function getAvatars() {
  return { public: publicAvatars, mine: await getMyAvatars() };
}

export function getVoices() {
  return { voices: [...designedVoices, ...voices] };
}

const aiAvatarSource = "digital-human-avatar";
const aiAvatarReferenceByStyle = {
  default: "/assets/digital-human/thumb-digital-human.jpg",
  realistic: "/assets/digital-human/hot-1-digital-human.jpg",
  cartoon: "/assets/digital-human/thumb-digital-human.jpg"
};

function normalizeAiAvatarText(value, fallback = "") {
  return String(value || fallback).trim().slice(0, 500);
}

function getSkinToneLabel(value) {
  const index = Number(value);
  const labels = [
    "fair warm skin tone",
    "natural light skin tone",
    "warm tan skin tone",
    "deep brown skin tone",
    "dark brown skin tone"
  ];
  return labels[Number.isInteger(index) && index >= 0 && index < labels.length ? index : 1];
}

function selectAiAvatarReference(payload = {}) {
  const style = String(payload.style || "").toLowerCase();
  if (style.includes("3d") || style.includes("cartoon")) return aiAvatarReferenceByStyle.cartoon;
  if (style.includes("real") || style.includes("write")) return aiAvatarReferenceByStyle.realistic;
  return aiAvatarReferenceByStyle.default;
}

function buildAiAvatarPrompt(payload = {}) {
  const gender = normalizeAiAvatarText(payload.gender, "female");
  const age = normalizeAiAvatarText(payload.age, "young adult");
  const style = normalizeAiAvatarText(payload.style, "realistic portrait");
  const userPrompt = normalizeAiAvatarText(payload.prompt || payload.description);
  const recommendation = normalizeAiAvatarText(payload.recommend || payload.recommendation);
  if (!userPrompt) throw createHttpError("prompt is required", 400);

  return [
    "Create a front-facing half-body digital human avatar for talking-head video generation.",
    `Gender: ${gender}.`,
    `Age group: ${age}.`,
    `Skin tone: ${getSkinToneLabel(payload.skinTone)}.`,
    `Facial and visual style: ${style}.`,
    recommendation ? `Role preset: ${recommendation}.` : "",
    `User description: ${userPrompt}.`,
    "Keep one single person, clear face, natural expression, symmetrical lighting, clean background, no text, no logo, no watermark.",
    "The result must be suitable as a reusable digital-human avatar image for later lip-sync video generation."
  ].filter(Boolean).join("\n");
}

async function uploadAiAvatarReference(payload) {
  const referencePath = selectAiAvatarReference(payload);
  const filePath = resolveAssetFilePath(referencePath);
  await assertFileExists(filePath, `AI avatar reference image not found: ${referencePath}`);
  const upload = await uploadFileToKie({
    filePath,
    fileName: path.basename(filePath),
    mimeType: "image/jpeg",
    uploadPath: "digital-human/ai-avatar-reference"
  });
  return { referencePath, referenceImageUrl: upload.url };
}

function normalizeAiAvatarRatio(value) {
  const ratio = String(value || "9:16").trim();
  return ["1:1", "3:4", "4:3", "9:16", "16:9", "21:9"].includes(ratio) ? ratio : "9:16";
}

function mapAiAvatarTask(task) {
  if (!task) return null;
  const status = task.status === "completed" ? "preview_ready" : task.status;
  return {
    id: String(task.id),
    imageTaskId: String(task.id),
    status,
    progress: status === "preview_ready" ? 100 : task.progress || (task.providerTaskId ? 68 : 24),
    prompt: task.prompt,
    ratio: task.ratio,
    points: task.points,
    providerTaskId: task.providerTaskId,
    imageUrl: task.imageUrl || task.image || null,
    error: task.error || null
  };
}

export async function createAiCustomAvatarTask(payload = {}, userId) {
  if (!userId) throw createHttpError("user is required", 401);
  const prompt = buildAiAvatarPrompt(payload);
  const { referenceImageUrl } = await uploadAiAvatarReference(payload);
  const task = await createImageGenerationTask({
    prompt,
    model: imageToImageModelKey,
    fallbackModel: "nano_banana2",
    ratio: normalizeAiAvatarRatio(payload.ratio),
    quality: "1K",
    count: 1,
    source: aiAvatarSource,
    referenceImageUrl
  }, userId);
  return mapAiAvatarTask(task);
}

export async function getAiCustomAvatarTask(id, userId) {
  if (!userId) throw createHttpError("user is required", 401);
  const task = await getImageGenerationTask(id, userId);
  if (!task || task.source !== aiAvatarSource) return null;
  return mapAiAvatarTask(task);
}

function getExtensionForMime(mimeType = "") {
  if (mimeType.includes("png")) return ".png";
  if (mimeType.includes("webp")) return ".webp";
  return ".jpg";
}

async function downloadAiAvatarPreview(imageUrl, taskId) {
  let response;
  let lastError;
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    try {
      response = await fetch(imageUrl);
      if (response.ok) break;
      lastError = createHttpError(`download generated avatar failed with ${response.status}`, 502);
    } catch (error) {
      lastError = error;
    }
    if (attempt < 5) await new Promise((resolve) => setTimeout(resolve, attempt * 1500));
  }
  if (!response) throw lastError || createHttpError("download generated avatar failed", 502);
  if (!response.ok) {
    throw createHttpError(`download generated avatar failed with ${response.status}`, 502);
  }
  const mimeType = response.headers.get("content-type") || "image/jpeg";
  const ext = getExtensionForMime(mimeType);
  const fileName = `${Date.now()}-${taskId}-${randomUUID().slice(0, 8)}${ext}`;
  const outputDir = path.resolve(process.cwd(), config.media.storageDir, "digital-human", "avatars", "ai");
  await mkdir(outputDir, { recursive: true });
  const filePath = path.join(outputDir, fileName);
  const bytes = Buffer.from(await response.arrayBuffer());
  await writeFile(filePath, bytes);
  return {
    filePath,
    fileName,
    localUrl: `/media/digital-human/avatars/ai/${fileName}`,
    mimeType,
    sizeBytes: bytes.length
  };
}

export async function saveAiCustomAvatarTask(id, payload = {}, userId) {
  if (!userId) throw createHttpError("user is required", 401);
  const task = await getAiCustomAvatarTask(id, userId);
  if (!task) throw createHttpError("AI avatar task not found", 404);
  if (task.status !== "preview_ready" || !task.imageUrl) {
    throw createHttpError("AI avatar preview is not ready", 400);
  }

  const saved = await downloadAiAvatarPreview(task.imageUrl, id);
  const asset = await createVirtualAssetFromLocalFile({
    userId,
    feature: "digital-human",
    localUrl: saved.localUrl,
    filePath: saved.filePath,
    originalName: saved.fileName,
    mimeType: saved.mimeType,
    sizeBytes: saved.sizeBytes
  });
  const avatar = mapVirtualAssetToAvatar(asset);
  avatar.name = normalizeAiAvatarText(payload.name, "AI Custom Avatar");
  return {
    ...task,
    status: "saved",
    avatar
  };
}

export async function designVoice(payload) {
  const prompt = String(payload.prompt || payload.description || "").trim();
  const previewText = String(payload.previewText || payload.preview_text || "").trim();
  const voiceId = String(payload.voiceId || payload.voice_id || "").trim();
  const name = String(payload.name || "").trim();

  if (!prompt) throw createHttpError("prompt is required", 400);
  if (!previewText) throw createHttpError("previewText is required", 400);
  if (previewText.length > 500) throw createHttpError("previewText must be 500 characters or fewer", 400);

  const result = await designMinimaxVoice({
    prompt,
    previewText,
    voiceId,
    aigcWatermark: payload.aigcWatermark ?? payload.aigc_watermark ?? false
  });

  const voice = {
    id: result.voiceId,
    name: name || `定制音色 ${designedVoices.length + 1}`,
    description: prompt,
    language: "中文 / 定制",
    sampleUrl: result.trialAudioDataUrl,
    provider: "minimax",
    source: "voice-design",
    createdAt: nowLabel()
  };

  const existingIndex = designedVoices.findIndex((item) => item.id === voice.id);
  if (existingIndex >= 0) {
    designedVoices.splice(existingIndex, 1, voice);
  } else {
    designedVoices.unshift(voice);
  }

  return {
    voice,
    trialAudioBase64: result.trialAudioBase64,
    trialAudioDataUrl: result.trialAudioDataUrl
  };
}

export async function previewVoice(payload) {
  const text = String(payload.previewText || payload.text || "").trim();
  const voiceId = String(payload.voiceId || voices[0].id).trim();
  if (!text) throw createHttpError("previewText is required", 400);
  const voice = getVoiceById(voiceId);

  const result = await synthesizeMinimaxSpeech({
    text,
    voiceId: getProviderVoiceId(voice),
    speed: normalizeDecimal(payload.speed, 1),
    volume: normalizeVolume(payload.volume),
    pitch: normalizeDecimal(payload.pitch, 0),
    emotion: normalizeEmotion(payload.emotion)
  });
  const durationMs = getAudioDurationMs(result, text);
  const savedAudio = await savePreviewVoiceAudio({
    audioBuffer: result.audioBuffer,
    durationMs
  });

  return {
    voiceId,
    audioFileId: savedAudio.id,
    audioUrl: savedAudio.localUrl,
    originalName: savedAudio.originalName,
    mimeType: savedAudio.mimeType,
    size: savedAudio.sizeBytes,
    audioBase64: result.audioBase64,
    audioDataUrl: `data:${result.mimeType};base64,${result.audioBase64}`,
    durationMs,
    maxDurationMs: maxDigitalHumanAudioMs,
    isTooLong: durationMs > maxDigitalHumanAudioMs,
    videoDuration: getVideoDurationSeconds(durationMs)
  };
}

export async function uploadDriveAudio(payload, file) {
  if (!file) throw createHttpError("audio file is required", 400);
  const id = `dh-audio-${randomUUID()}`;
  const originalName = file.originalname || file.filename || "uploaded-audio";
  const localUrl = `/media/digital-human/audio-uploads/${file.filename}`;
  const durationMs = normalizeUploadedAudioDurationMs(payload.durationMs || payload.duration_ms);
  const audio = {
    id,
    filePath: file.path,
    localUrl,
    originalName,
    mimeType: file.mimetype || "audio/mpeg",
    sizeBytes: file.size || 0,
    durationMs,
    createdAt: new Date()
  };
  uploadedDriveAudios.set(id, audio);

  return {
    id,
    audioFileId: id,
    url: localUrl,
    originalName,
    name: originalName,
    mimeType: audio.mimeType,
    size: audio.sizeBytes,
    durationMs
  };
}

export async function uploadSceneImage(_payload, file) {
  if (!file) throw createHttpError("scene image is required", 400);
  const id = `dh-scene-${randomUUID()}`;
  const originalName = file.originalname || file.filename || "scene-image";
  const localUrl = `/media/digital-human/scene-uploads/${file.filename}`;
  const scene = {
    id,
    filePath: file.path,
    localUrl,
    originalName,
    mimeType: file.mimetype || getImageMimeType(file.path),
    sizeBytes: file.size || 0,
    createdAt: new Date()
  };
  uploadedSceneImages.set(id, scene);

  return {
    id,
    sceneFileId: id,
    localUrl,
    url: localUrl,
    originalName,
    name: originalName,
    mimeType: scene.mimeType,
    size: scene.sizeBytes
  };
}

export async function listTasks() {
  await refreshProcessingTasks();
  const rows = await listDigitalHumanTaskRows();
  return rows.map(mapTask);
}

export async function getTask(id) {
  await refreshTask(id);
  const row = await findDigitalHumanTaskRow(id);
  return row ? mapTask(row) : null;
}

export async function createTask(payload) {
  const avatarId = String(payload.avatarId || "").trim();
  const driveMode = String(payload.driveMode || "text");
  const text = String(payload.text || "").trim();
  const audioFileId = String(payload.audioFileId || payload.audio_file_id || "").trim();
  const sceneFileId = String(payload.sceneFileId || payload.scene_file_id || "").trim();
  const audioName = String(payload.audioName || payload.audio_name || "").trim();
  const voiceId = String(payload.voiceId || voices[0].id).trim();
  const modelKey = String(payload.model || digitalHumanModels[0].value).trim();
  const speed = normalizeDecimal(payload.speed, 1);
  const volume = normalizeVolume(payload.volume);
  const pitch = normalizeDecimal(payload.pitch, 0);
  const emotion = normalizeEmotion(payload.emotion);

  if (!avatarId) throw createHttpError("avatarId is required", 400);
  if (!["text", "audio"].includes(driveMode)) throw createHttpError("driveMode is invalid", 400);
  const uploadedAudio = driveMode === "audio" ? getUploadedDriveAudio(audioFileId) : null;
  const uploadedScene = sceneFileId ? getUploadedSceneImage(sceneFileId) : null;
  if (driveMode === "audio" && !uploadedAudio) throw createHttpError("audio file is required", 400);
  if (sceneFileId && !uploadedScene) throw createHttpError("scene image is required", 400);
  if (driveMode === "text" && !text) throw createHttpError("text is required", 400);
  if (driveMode === "text" && text.length > 2000) throw createHttpError("text must be 2000 characters or fewer", 400);

  const avatar = await getAvatarById(avatarId);
  if (!avatar) throw createHttpError("avatar not found", 404);
  if (avatar.status !== "ready") throw createHttpError("avatar is not ready", 400);

  const model = getModelByKey(modelKey);
  if (!model || !["ark", "kie"].includes(model.provider)) throw createHttpError("digital human model not found", 400);

  const voice = driveMode === "audio"
    ? { id: "uploaded-audio", name: audioName || uploadedAudio.originalName || "用户上传音频" }
    : getVoiceById(voiceId);
  const taskText = driveMode === "audio" ? audioName || uploadedAudio.originalName || "用户上传音频" : text;
  const billingDuration = driveMode === "audio"
    ? Math.ceil(Number(uploadedAudio?.durationMs || 0) / 1000)
    : estimateSpeechSeconds(text);
  const costPoints = calculateBillingQuote("digital-human", {
    durationSeconds: billingDuration,
    durationMs: uploadedAudio?.durationMs || 0,
    text,
    uploadedAudio: driveMode === "audio"
  }).points;
  const providerModel = model.provider === "ark" ? config.ark.videoModel : config.kie.digitalHumanModel;

  const pool = getPool();
  const connection = await pool.getConnection();
  let taskId;
  let userId;

  try {
    await connection.beginTransaction();
    const user = await getDemoUser(connection);
    userId = user.id;
    taskId = await createDigitalHumanTaskRow(connection, {
      userId,
      avatarId,
      avatarName: avatar.name,
      modelKey: model.value,
      providerModel,
      driveMode,
      text: taskText,
      voiceId: voice.id,
      voiceName: voice.name,
      speed,
      volume,
      pitch,
      emotion,
      costPoints
    });

    await debitCredits(connection, {
      userId,
      taskId,
      amount: costPoints,
      memo: "digital human generation debit"
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
      text: taskText,
      voiceId: getProviderVoiceId(voice),
      speed,
      volume,
      pitch,
      emotion,
      avatar,
      model,
      uploadedAudio,
      uploadedScene,
      userId
    });
  } catch (error) {
    console.error("Create digital human provider task failed:", error.message, error.body || "");
    await refundTask(taskId, userId, costPoints, `数字人任务创建失败：${error.message}`);
  }

  return getTask(taskId);
}

async function refreshProcessingTasks() {
  const rows = await findRefreshableDigitalHumanTasks();
  await Promise.all(rows.map((row) => refreshTask(row.id)));
}

async function fallbackArkTaskToKie(row, reason) {
  if (!row?.audio_provider_url || !row?.avatar_provider_url) {
    await refundTask(row.id, null, null, reason || "Seedance task failed and fallback assets are missing");
    return;
  }

  try {
    await createKieProviderTaskFromUrls(row.id, {
      audioUrl: row.audio_provider_url,
      avatarImageUrl: row.avatar_provider_url,
      audioLocalUrl: row.audio_url,
      audioDurationMs: Number(row.audio_duration_ms || 0)
    });
  } catch (fallbackError) {
    await refundTask(row.id, null, null, `${reason || "Seedance task failed"}; fallback failed: ${fallbackError.message}`);
  }
}

async function refreshTask(id) {
  const row = await findDigitalHumanTaskRow(id);
  if (!row || !row.provider_task_id || !["pending", "processing"].includes(row.status)) return;

  try {
    const isArkTask = String(row.provider_model || "").startsWith("doubao-seedance");
    const record = isArkTask
      ? await getArkVideoGenerationTask({ taskId: row.provider_task_id })
      : await getKieDigitalHumanTask({ taskId: row.provider_task_id });
    const mapped = isArkTask ? mapArkVideoGenerationState(record) : mapKieDigitalHumanState(record);
    if (mapped === "completed") {
      const result = isArkTask ? extractArkVideoGenerationResult(record) : extractKieDigitalHumanResult(record);
      if (!result.resultUrl) {
        await refundTask(id, null, null, "digital human result missing video URL");
      } else {
        await setDigitalHumanTaskCompleted(id, result);
      }
    } else if (mapped === "failed") {
      const result = isArkTask ? extractArkVideoGenerationResult(record) : {};
      const message = result.errorMessage || record.data?.failMsg || record.data?.errorMessage || "digital human task failed";
      if (isArkTask) {
        await fallbackArkTaskToKie(row, message);
      } else {
        await refundTask(id, null, null, message);
      }
    } else {
      await setDigitalHumanTaskProcessing(id);
    }
  } catch (error) {
    await setDigitalHumanTaskError(id, `查询数字人状态失败：${error.message}`);
  }
}

async function refundTask(id, userIdArg, costPointsArg, message) {
  const connection = await getPool().getConnection();
  try {
    await connection.beginTransaction();
    const task = await lockDigitalHumanTaskForRefund(connection, id);
    if (!task) {
      await connection.rollback();
      return;
    }

    const userId = userIdArg || task.user_id;
    const costPoints = costPointsArg || task.cost_points;
    await setDigitalHumanTaskFailed(connection, id, message);

    if (!task.refunded) {
      await refundCredits(connection, {
        userId,
        taskId: id,
        amount: costPoints,
        memo: "digital human generation refund"
      });
      await markDigitalHumanTaskRefunded(connection, id);
    }

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export function deleteTask(id) {
  return deleteDigitalHumanTaskRow(id);
}

export async function regenerateTask(id) {
  const task = await getTask(id);
  if (!task) return null;
  return createTask(task);
}

export function createAvatar(payload) {
  const { name, fileName = "" } = payload;
  if (!name?.trim()) throw createHttpError("name is required", 400);

  const avatar = {
    id: `mine-${Date.now()}`,
    name: name.trim(),
    description: fileName ? `来自 ${fileName}` : "待上传训练素材",
    language: "自定义",
    status: "training",
    cover: "",
    createdAt: nowLabel()
  };
  myAvatars.unshift(avatar);

  setTimeout(() => {
    avatar.status = "ready";
  }, 1000);

  return avatar;
}

export function updateAvatar(id, payload) {
  const avatar = myAvatars.find((item) => item.id === id);
  if (!avatar) return null;
  if (payload.name?.trim()) avatar.name = payload.name.trim();
  return avatar;
}

export function deleteAvatar(id) {
  const index = myAvatars.findIndex((item) => item.id === id);
  if (index >= 0) myAvatars.splice(index, 1);
  return { ok: index >= 0 };
}

export async function createArkAvatar(payload, file) {
  const { name } = payload;
  if (!name?.trim()) throw createHttpError("name is required", 400);
  if (!file) throw createHttpError("avatar image is required", 400);

  const user = await getDemoUser();
  const asset = await createVirtualAssetFromLocalFile({
    userId: user.id,
    feature: "digital-human",
    localUrl: `/media/digital-human/avatars/${file.filename}`,
    filePath: file.path,
    originalName: file.originalname || file.filename,
    mimeType: file.mimetype || "image/png",
    sizeBytes: file.size || 0
  });
  const avatar = mapVirtualAssetToAvatar(asset);
  avatar.name = name.trim();
  return avatar;
}
