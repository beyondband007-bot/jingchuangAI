import { requestMinimax } from "./client.js";

function hexToBuffer(hex = "") {
  const cleaned = String(hex).replace(/\s+/g, "");
  return cleaned ? Buffer.from(cleaned, "hex") : Buffer.alloc(0);
}

export async function generateMinimaxMusic({
  prompt,
  lyrics = "",
  model = "music-2.6-free",
  isInstrumental = false,
  lyricsOptimizer = false,
  responseFormat = "hex"
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
    response_format: responseFormat,
    lyrics_optimizer: Boolean(lyricsOptimizer),
    is_instrumental: Boolean(isInstrumental)
  };

  const trimmedLyrics = String(lyrics || "").trim();
  if (trimmedLyrics) {
    body.lyrics = trimmedLyrics;
  }

  const result = await requestMinimax("/v1/music_generation", {
    method: "POST",
    body: JSON.stringify(body)
  });

  const audioHex = result.data?.audio || result.audio || "";
  const audioBuffer = hexToBuffer(audioHex);
  if (!audioBuffer.length) {
    const error = new Error("MiniMax music generation response missing audio");
    error.status = 502;
    error.body = result;
    throw error;
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
