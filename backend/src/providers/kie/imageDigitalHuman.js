import { requestKie } from "./client.js";

function extractTaskId(result, label) {
  const taskId = result.data?.taskId || result.taskId || "";
  if (!taskId) {
    const error = new Error(`KIE ${label} response missing taskId`);
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
  resolution = "480p"
}) {
  const result = await requestKie("/api/v1/jobs/createTask", {
    method: "POST",
    body: JSON.stringify({
      model,
      input: {
        prompt,
        image_url: imageUrl,
        audio_url: audioUrl,
        resolution,
        num_frames: 80,
        frames_per_second: 16,
        enable_safety_checker: true
      }
    })
  });

  return extractTaskId(result, "speech-to-video");
}

export async function createKieImageR2VTask({
  model,
  prompt,
  imageUrl,
  audioUrl,
  resolution = "480p",
  duration = 5
}) {
  const result = await requestKie("/api/v1/jobs/createTask", {
    method: "POST",
    body: JSON.stringify({
      model,
      input: {
        prompt,
        reference_image: [imageUrl],
        reference_voice: audioUrl,
        aspect_ratio: "9:16",
        resolution,
        duration: Number(duration),
        prompt_extend: true,
        watermark: false,
        seed: 0
      }
    })
  });

  return extractTaskId(result, "image-r2v");
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
