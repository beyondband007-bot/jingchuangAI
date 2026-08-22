import { config } from "../../config/index.js";
import { requestMinimax } from "./client.js";

function hexToBuffer(hex = "") {
  const cleaned = String(hex).replace(/\s+/g, "");
  return cleaned ? Buffer.from(cleaned, "hex") : Buffer.alloc(0);
}

export function buildMinimaxMusicRequestBody({
  prompt,
  lyrics = "",
  model = config.minimax.musicModel,
  isInstrumental = false,
  lyricsOptimizer = false,
  outputFormat = "hex"
}) {
  const trimmedPrompt = String(prompt || "").trim();
  if (!trimmedPrompt) {
    const error = new Error("prompt is required");
    error.status = 400;
    throw error;
  }

  const body = {
    model,
    prompt: trimmedPrompt,
    audio_setting: {
      sample_rate: 44100,
      bitrate: 256000,
      format: "mp3"
    },
    output_format: outputFormat,
    lyrics_optimizer: Boolean(lyricsOptimizer),
    is_instrumental: Boolean(isInstrumental)
  };

  const trimmedLyrics = String(lyrics || "").trim();
  if (trimmedLyrics) {
    body.lyrics = trimmedLyrics;
  }

  return body;
}

function createMusicResponseError(message, result) {
  const error = new Error(message);
  error.status = 502;
  error.body = result;
  error.traceId = result?.trace_id || result?.data?.trace_id || "";
  return error;
}

function normalizeMusicProviderError(error) {
  const raw = String(error?.message || "");
  if (/permission|unauthori[sz]ed|not.*(eligible|available)|music.*api.*(open|enable)|账户.*(权限|开通)/i.test(raw)) {
    error.message = "MiniMax 音乐 API 未开通或当前密钥无 Music 3.0 使用权限";
  } else if (/insufficient.*(balance|quota)|balance.*insufficient|余额不足|额度不足/i.test(raw)) {
    error.message = "MiniMax 账户余额或音乐调用额度不足";
  } else if (/model.*(not.*found|not.*available|unavailable)|模型.*(不可用|不存在)/i.test(raw)) {
    error.message = "MiniMax Music 3.0 Free 当前不可用，请确认账户授权和模型配置";
  }
  return error;
}

export function parseMinimaxMusicResponse(result) {
  const baseStatus = Number(result?.base_resp?.status_code);
  if (Number.isFinite(baseStatus) && baseStatus !== 0) {
    throw createMusicResponseError(result?.base_resp?.status_msg || "MiniMax 音乐服务返回失败", result);
  }

  const dataStatus = Number(result?.data?.status);
  if (!Number.isFinite(dataStatus) || dataStatus !== 2) {
    throw createMusicResponseError("MiniMax 音乐生成未成功完成", result);
  }

  const audioHex = result.data?.audio || "";
  const audioBuffer = hexToBuffer(audioHex);
  if (!audioBuffer.length) {
    throw createMusicResponseError("MiniMax 音乐服务未返回有效音频", result);
  }

  return {
    audioBuffer,
    audioBase64: audioBuffer.toString("base64"),
    format: "mp3",
    mimeType: "audio/mpeg",
    durationMs: Number(
      result.extra_info?.music_duration || result.data?.music_duration || 0
    ),
    sampleRate: Number(
      result.extra_info?.music_sample_rate || result.data?.music_sample_rate || 44100
    ),
    channel: Number(
      result.extra_info?.music_channel || result.data?.music_channel || 2
    ),
    bitrate: Number(
      result.extra_info?.bitrate || result.data?.bitrate || 256000
    ),
    musicSize: Number(
      result.extra_info?.music_size || result.data?.music_size || 0
    ),
    traceId: result.trace_id || result.data?.trace_id || "",
    raw: result
  };
}

export async function generateMinimaxMusic(options = {}) {
  const body = buildMinimaxMusicRequestBody(options);
  try {
    const result = await requestMinimax("/v1/music_generation", {
      method: "POST",
      body: JSON.stringify(body)
    });
    return parseMinimaxMusicResponse(result);
  } catch (error) {
    throw normalizeMusicProviderError(error);
  }
}
