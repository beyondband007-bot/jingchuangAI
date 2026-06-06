import { getKieTask, requestKie } from "./client.js";

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

export async function createKieWatermarkImageTask({ model, prompt, sourceUrl, resolution }) {
  const input = model === "gpt-image-2-image-to-image"
    ? {
      prompt,
      input_urls: [sourceUrl],
      aspect_ratio: "auto"
    }
    : {
      prompt,
      image_input: [sourceUrl],
      aspect_ratio: "auto",
      resolution,
      output_format: "png",
      google_search: false
    };

  const result = await requestKie("/api/v1/jobs/createTask", {
    method: "POST",
    body: JSON.stringify({
      model,
      input
    })
  });

  return extractTaskId(result, "watermark image");
}

export async function createKieWatermarkVideoTask({ model, prompt, sourceUrl, resolution }) {
  const result = await requestKie("/api/v1/jobs/createTask", {
    method: "POST",
    body: JSON.stringify({
      model,
      input: {
        video_url: sourceUrl,
        prompt,
        resolution,
        audio_setting: "origin",
        watermark: false
      }
    })
  });

  return extractTaskId(result, "watermark video");
}

export async function getKieWatermarkTask({ taskId }) {
  return getKieTask(taskId);
}

export function mapKieWatermarkState(record) {
  const state = record.data?.state || record.state || "";
  if (state === "success") return "completed";
  if (state === "fail") return "failed";
  return "processing";
}

export function extractWatermarkResult(record) {
  const json = record?.data?.resultJson;
  if (!json) return { resultUrl: "", thumbnailUrl: "" };

  try {
    const parsed = JSON.parse(json);
    const outputMediaUrls = Array.isArray(parsed.outputMediaUrls) ? parsed.outputMediaUrls : [];
    const resultUrl =
      outputMediaUrls.map((item) => item.mediaUrl).find(Boolean) ||
      parsed.imageUrl ||
      parsed.image_url ||
      parsed.videoUrl ||
      parsed.video_url ||
      parsed.resultUrl ||
      parsed.result_url ||
      (Array.isArray(parsed.resultUrls) ? parsed.resultUrls[0] : "") ||
      (Array.isArray(parsed.urls) ? parsed.urls[0] : "") ||
      "";

    return {
      resultUrl,
      thumbnailUrl: parsed.thumbnailUrl || parsed.thumbnail_url || ""
    };
  } catch {
    return { resultUrl: "", thumbnailUrl: "" };
  }
}
