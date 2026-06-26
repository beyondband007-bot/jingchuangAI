import { requestKie } from "./client.js";

function extractTaskId(result, label) {
  const taskId = result.data?.taskId || result.taskId || "";
  if (!taskId) {
    const error = new Error(`${label} response missing taskId`);
    error.status = 502;
    error.body = result;
    throw error;
  }
  return { taskId, raw: result };
}

export async function createKieSpeechToVideoTask({
  model,
  prompt,
  imageUrl,
  audioUrl,
  resolution,
  audioDurationMs
}) {
  const isWanSpeechToVideo = model === "wan/2-2-a14b-speech-to-video-turbo";
  let input;

  if (isWanSpeechToVideo) {
    const durationSeconds = Number(audioDurationMs || 0) / 1000;
    if (durationSeconds > 30) {
      const error = new Error("Wan 2.2 speech-to-video supports audio up to 30 seconds");
      error.status = 400;
      throw error;
    }

    let framesPerSecond = 16;
    let numFrames = Math.ceil(Math.max(durationSeconds, 2.5) * framesPerSecond / 4) * 4;
    if (numFrames > 120) {
      framesPerSecond = Math.max(4, Math.floor(120 / durationSeconds));
      numFrames = Math.min(120, Math.ceil(durationSeconds * framesPerSecond / 4) * 4);
    }

    input = {
      prompt,
      image_url: imageUrl,
      audio_url: audioUrl,
      num_frames: numFrames,
      frames_per_second: framesPerSecond,
      resolution: resolution || "480p",
      negative_prompt: "",
      num_inference_steps: 27,
      guidance_scale: 3.5,
      shift: 5,
      nsfw_checker: false
    };
  } else {
    input = {
      image_url: imageUrl,
      audio_url: audioUrl,
      prompt
    };
  }

  const result = await requestKie("/api/v1/jobs/createTask", {
    method: "POST",
    body: JSON.stringify({
      model,
      input
    })
  });

  return extractTaskId(result, isWanSpeechToVideo ? "wan-speech-to-video" : "kling-ai-avatar");
}

export async function getKieImageDigitalHumanTask({ taskId }) {
  return requestKie(`/api/v1/jobs/recordInfo?taskId=${encodeURIComponent(taskId)}`, {
    method: "GET"
  });
}

export function mapKieImageDigitalHumanState(record) {
  const state = record.data?.state || record.state || "";
  if (state === "success") return "completed";
  if (state === "fail") return "failed";
  return "processing";
}

export function extractKieImageDigitalHumanResult(record) {
  const json = record?.data?.resultJson;
  if (!json) return { resultUrl: "", thumbnailUrl: "" };

  try {
    const parsed = JSON.parse(json);
    const mediaUrls = Array.isArray(parsed.outputMediaUrls) ? parsed.outputMediaUrls : [];
    const resultUrl =
      mediaUrls.map((item) => item.mediaUrl).find(Boolean) ||
      parsed.videoUrl ||
      parsed.video_url ||
      parsed.resultUrl ||
      parsed.result_url ||
      (Array.isArray(parsed.resultUrls) ? parsed.resultUrls[0] : "") ||
      "";

    return {
      resultUrl,
      thumbnailUrl: parsed.thumbnailUrl || parsed.thumbnail_url || ""
    };
  } catch {
    return { resultUrl: "", thumbnailUrl: "" };
  }
}
