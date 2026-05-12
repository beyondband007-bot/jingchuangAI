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

function structureToSegments(structureResult) {
  const data = Array.isArray(structureResult)
    ? structureResult
    : Array.isArray(structureResult?.segments)
      ? structureResult.segments
      : Array.isArray(structureResult?.structure)
        ? structureResult.structure
        : [];

  return data
    .map((segment) => {
      const start =
        Number(segment?.start ?? segment?.start_time ?? segment?.startTime ?? 0);
      const end =
        Number(segment?.end ?? segment?.end_time ?? segment?.endTime ?? 0);
      return {
        label: String(segment?.type || segment?.name || segment?.label || ""),
        startMs: start > 1000 ? Math.round(start) : Math.round(start * 1000),
        endMs: end > 1000 ? Math.round(end) : Math.round(end * 1000)
      };
    })
    .filter((segment) => segment.endMs > segment.startMs)
    .sort((a, b) => a.startMs - b.startMs);
}

export async function transcribeMinimaxAudio({ audioBuffer }) {
  const audioBase64 = Buffer.from(audioBuffer).toString("base64");
  const result = await requestMinimax("/v1/music_cover_preprocess", {
    method: "POST",
    body: JSON.stringify({
      model: "music-cover",
      audio_base64: audioBase64
    })
  });

  const audioDurationSeconds = Number(
    result.audio_duration || result.data?.audio_duration || 0
  );
  const structureResult = parseStructureResult(
    result.structure_result || result.data?.structure_result
  );
  const rawText = String(
    result.formatted_lyrics || result.data?.formatted_lyrics || ""
  );

  return {
    text: rawText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .join("\n"),
    formattedText: rawText,
    segments: structureToSegments(structureResult),
    durationMs:
      audioDurationSeconds > 0
        ? Math.round(audioDurationSeconds * 1000)
        : 0,
    traceId: result.trace_id || result.data?.trace_id || "",
    raw: result
  };
}
