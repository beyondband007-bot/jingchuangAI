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

function normalizeUpscaleFactor(value) {
  return String(value || "2").trim() || "2";
}

function isUpscaleImageModel(model) {
  const key = String(model || "").toLowerCase();
  return key.includes("upscale") || key.includes("topaz");
}

export async function createKieEnhanceImageTask({ model, sourceUrl, prompt, upscaleFactor }) {
  const input = isUpscaleImageModel(model)
    ? {
      image_url: sourceUrl,
      upscale_factor: normalizeUpscaleFactor(upscaleFactor)
    }
    : {
      prompt,
      input_urls: [sourceUrl],
      aspect_ratio: "auto"
    };

  const result = await requestKie("/api/v1/jobs/createTask", {
    method: "POST",
    body: JSON.stringify({ model, input })
  });

  return extractTaskId(result, "image enhance");
}

export async function createKieEnhanceVideoTask({ model, sourceUrl, upscaleFactor }) {
  const result = await requestKie("/api/v1/jobs/createTask", {
    method: "POST",
    body: JSON.stringify({
      model,
      input: {
        video_url: sourceUrl,
        upscale_factor: normalizeUpscaleFactor(upscaleFactor)
      }
    })
  });

  return extractTaskId(result, "video enhance");
}

export async function getKieEnhanceTask({ taskId }) {
  return getKieTask(taskId);
}

export function mapKieEnhanceState(record) {
  const state = record.data?.state || record.state || "";
  if (state === "success") return "completed";
  if (state === "fail") return "failed";
  return "processing";
}

export function extractEnhanceResult(record) {
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
