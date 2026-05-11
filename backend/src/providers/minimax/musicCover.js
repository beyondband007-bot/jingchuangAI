import { requestMinimax } from "./client.js";

function parseStructureResult(value) {
  if (!value) return null;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export async function preprocessMinimaxMusicCover({ audioBuffer }) {
  const audioBase64 = Buffer.from(audioBuffer).toString("base64");
  const result = await requestMinimax("/v1/music_cover_preprocess", {
    method: "POST",
    body: JSON.stringify({
      model: "music-cover",
      audio_base64: audioBase64
    })
  });

  const audioDurationSeconds = Number(result.audio_duration || result.data?.audio_duration || 0);
  const structureResult = parseStructureResult(result.structure_result || result.data?.structure_result);

  return {
    coverFeatureId: result.cover_feature_id || result.data?.cover_feature_id || "",
    formattedLyrics: result.formatted_lyrics || result.data?.formatted_lyrics || "",
    structureResult,
    audioDurationMs: audioDurationSeconds > 0 ? Math.round(audioDurationSeconds * 1000) : 0,
    traceId: result.trace_id || result.data?.trace_id || "",
    raw: result
  };
}
