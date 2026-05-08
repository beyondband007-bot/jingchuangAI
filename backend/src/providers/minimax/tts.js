import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { config } from "../../config/index.js";
import { requestMinimax } from "./client.js";

function hexToBuffer(hex = "") {
  const cleaned = String(hex).replace(/\s+/g, "");
  return cleaned ? Buffer.from(cleaned, "hex") : Buffer.alloc(0);
}

function clampNumber(value, fallback, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
}

function buildTtsPath() {
  if (!config.minimax.groupId) return "/v1/t2a_v2";
  return `/v1/t2a_v2?GroupId=${encodeURIComponent(config.minimax.groupId)}`;
}

export async function synthesizeMinimaxSpeech({ text, voiceId, speed = 1, volume = 1, pitch = 0, emotion = "" }) {
  const trimmedText = String(text || "").trim();
  if (!trimmedText) {
    const error = new Error("text is required");
    error.status = 400;
    throw error;
  }

  const body = {
    model: config.minimax.ttsModel,
    text: trimmedText,
    stream: false,
    voice_setting: {
      voice_id: voiceId,
      speed: clampNumber(speed, 1, 0.5, 2),
      vol: clampNumber(volume, 1, 0.1, 10),
      pitch: clampNumber(pitch, 0, -12, 12)
    },
    audio_setting: {
      sample_rate: 32000,
      bitrate: 128000,
      format: "mp3",
      channel: 1
    }
  };

  if (emotion) {
    body.voice_setting.emotion = emotion;
  }

  const result = await requestMinimax(buildTtsPath(), {
    method: "POST",
    body: JSON.stringify(body)
  });

  const audioHex = result.data?.audio || result.audio || "";
  const audioBuffer = hexToBuffer(audioHex);
  if (!audioBuffer.length) {
    const error = new Error("Minimax TTS response missing audio");
    error.status = 502;
    error.body = result;
    throw error;
  }

  return {
    audioBuffer,
    audioBase64: audioBuffer.toString("base64"),
    format: "mp3",
    mimeType: "audio/mpeg",
    durationMs: Number(result.extra_info?.audio_length || result.data?.audio_length || 0),
    raw: result
  };
}

export async function saveMinimaxSpeechAudio({ taskId, audioBuffer }) {
  const audioDir = path.resolve(process.cwd(), config.media.storageDir, "digital-human", "audio");
  await mkdir(audioDir, { recursive: true });
  const fileName = `${taskId}.mp3`;
  const filePath = path.join(audioDir, fileName);
  await writeFile(filePath, audioBuffer);

  return {
    fileName,
    filePath,
    publicPath: `/media/digital-human/audio/${fileName}`,
    mimeType: "audio/mpeg"
  };
}
