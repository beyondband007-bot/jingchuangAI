import { config } from "../../config/index.js";
import { requestKie } from "./client.js";

const FAILED_STATES = new Set([
  "CREATE_TASK_FAILED",
  "GENERATE_AUDIO_FAILED",
  "CALLBACK_EXCEPTION",
  "SENSITIVE_WORD_ERROR",
  "FAILED"
]);

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeText(value) {
  return String(value || "").trim();
}

function createProviderError(message, details = {}) {
  const error = new Error(message);
  error.status = 502;
  error.body = details;
  error.traceId = normalizeText(details?.data?.taskId || details?.taskId);
  return error;
}

export function buildKieMusicRequestBody({
  prompt,
  title,
  lyrics = "",
  model = config.kie.musicModel,
  isInstrumental = false,
  lyricsOptimizer = false,
  callbackUrl = config.kie.musicCallbackUrl,
  durationSeconds
}) {
  const style = normalizeText(prompt);
  const normalizedTitle = normalizeText(title);
  const normalizedLyrics = normalizeText(lyrics);
  const normalizedCallbackUrl = normalizeText(callbackUrl);
  if (!style) throw createProviderError("KIE 音乐风格描述不能为空");
  if (!normalizedCallbackUrl) {
    throw createProviderError("KIE 音乐回调地址未配置，请设置 KIE_MUSIC_CALLBACK_URL");
  }

  const useSimpleMode = !isInstrumental && Boolean(lyricsOptimizer) && !normalizedLyrics;
  if (useSimpleMode) {
    return {
      prompt: style,
      customMode: false,
      instrumental: false,
      model,
      callBackUrl: normalizedCallbackUrl
    };
  }

  if (!normalizedTitle) throw createProviderError("KIE 音乐标题不能为空");
  if (!isInstrumental && !normalizedLyrics) {
    throw createProviderError("KIE 人声音乐需要歌词，或启用 AI 自动歌词");
  }

  const body = {
    customMode: true,
    instrumental: Boolean(isInstrumental),
    model,
    callBackUrl: normalizedCallbackUrl,
    style,
    title: normalizedTitle
  };
  if (!isInstrumental) body.prompt = normalizedLyrics;

  const duration = Number(durationSeconds);
  if (model === "V5_5" && Number.isFinite(duration) && duration > 0) {
    body.duration = Math.round(duration);
  }
  return body;
}

export function parseKieMusicRecord(record) {
  const data = record?.data || {};
  const status = normalizeText(data.status).toUpperCase();
  if (FAILED_STATES.has(status)) {
    throw createProviderError(
      data.errorMessage || data.errorCode || `KIE 音乐生成失败：${status}`,
      record
    );
  }

  if (status !== "SUCCESS") return { done: false, status };

  const tracks = data.response?.sunoData || data.response?.data || [];
  const track = Array.isArray(tracks) ? tracks.find((item) => item?.audioUrl || item?.audio_url) : null;
  if (!track) throw createProviderError("KIE 音乐任务成功，但没有返回音频地址", record);

  return {
    done: true,
    status,
    taskId: normalizeText(data.taskId),
    track: {
      id: normalizeText(track.id),
      audioUrl: normalizeText(track.audioUrl || track.audio_url),
      streamAudioUrl: normalizeText(track.streamAudioUrl || track.stream_audio_url),
      imageUrl: normalizeText(track.imageUrl || track.image_url),
      durationSeconds: Number(track.duration || 0),
      title: normalizeText(track.title),
      modelName: normalizeText(track.modelName || track.model_name)
    }
  };
}

export function normalizeKieMusicError(error) {
  const raw = normalizeText(error?.message);
  if (/insufficient|credit|balance|quota|402/i.test(raw)) {
    error.message = "KIE 账户积分不足，请充值后重试";
  } else if (/unauthorized|invalid.*key|api key|401|403/i.test(raw)) {
    error.message = "KIE API Key 无效或没有音乐模型权限";
  } else if (/sensitive|copyright|413/i.test(raw)) {
    error.message = "歌词或提示词未通过 KIE 内容审核，请修改后重试";
  } else if (/timeout|timed out/i.test(raw)) {
    error.message = "KIE 音乐生成超时，请稍后重试";
  }
  return error;
}

async function downloadTrack(track, fetchImpl = fetch) {
  const audioUrl = track.audioUrl || track.streamAudioUrl;
  if (!audioUrl) throw createProviderError("KIE 音乐结果缺少音频地址", track);

  const response = await fetchImpl(audioUrl, {
    signal: AbortSignal.timeout(Number(config.kie.musicDownloadTimeoutMs || 120000))
  });
  if (!response.ok) {
    throw createProviderError(`KIE 音频下载失败（HTTP ${response.status}）`, track);
  }
  const audioBuffer = Buffer.from(await response.arrayBuffer());
  if (!audioBuffer.length) throw createProviderError("KIE 返回了空音频文件", track);
  return audioBuffer;
}

export async function generateKieMusic(options = {}) {
  try {
    const body = buildKieMusicRequestBody(options);
    const created = await requestKie("/api/v1/generate", {
      method: "POST",
      body: JSON.stringify(body)
    });
    const taskId = normalizeText(created?.data?.taskId);
    if (!taskId) throw createProviderError("KIE 音乐任务创建成功，但没有返回 taskId", created);

    const attempts = Math.max(1, Number(config.kie.musicPollAttempts || 72));
    const intervalMs = Math.max(1000, Number(config.kie.musicPollIntervalMs || 5000));
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      if (attempt > 0) await delay(intervalMs);
      const record = await requestKie(
        `/api/v1/generate/record-info?taskId=${encodeURIComponent(taskId)}`,
        { method: "GET" }
      );
      const parsed = parseKieMusicRecord(record);
      if (!parsed.done) continue;

      const audioBuffer = await downloadTrack(parsed.track);
      return {
        audioBuffer,
        audioBase64: audioBuffer.toString("base64"),
        format: "mp3",
        mimeType: "audio/mpeg",
        durationMs: Math.round(parsed.track.durationSeconds * 1000),
        sampleRate: 0,
        channel: 0,
        bitrate: 0,
        musicSize: audioBuffer.length,
        traceId: taskId,
        providerTaskId: taskId,
        providerAudioId: parsed.track.id,
        providerCoverUrl: parsed.track.imageUrl,
        raw: record
      };
    }
    throw createProviderError(`KIE 音乐生成超时（taskId: ${taskId}）`, { taskId });
  } catch (error) {
    throw normalizeKieMusicError(error);
  }
}
