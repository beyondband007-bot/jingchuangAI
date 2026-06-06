import { getKieTask, requestKie } from "./client.js";

function extractTaskId(result) {
  const taskId = result.data?.taskId || result.taskId || "";
  if (!taskId) {
    const error = new Error("face swap response missing taskId");
    error.status = 502;
    error.body = result;
    throw error;
  }
  return { taskId, raw: result };
}

export async function createKieFaceSwapTask({ model, prompt, imageUrl, videoUrl, resolution, duration }) {
  const result = await requestKie("/api/v1/jobs/createTask", {
    method: "POST",
    body: JSON.stringify({
      model,
      input: {
        prompt,
        reference_image: [imageUrl],
        reference_video: [videoUrl],
        first_frame_url: imageUrl,
        first_clip_url: videoUrl,
        resolution,
        duration: Number(duration),
        prompt_extend: true,
        watermark: false
      }
    })
  });

  return extractTaskId(result);
}

export async function getKieFaceSwapTask({ taskId }) {
  return getKieTask(taskId);
}

export function mapKieFaceSwapState(record) {
  const state = record.data?.state || record.state || "";
  if (state === "success") return "completed";
  if (state === "fail") return "failed";
  return "processing";
}

export function extractFaceSwapResult(record) {
  const json = record?.data?.resultJson;
  if (!json) return { resultUrl: "", thumbnailUrl: "" };

  try {
    const parsed = JSON.parse(json);
    const outputMediaUrls = Array.isArray(parsed.outputMediaUrls) ? parsed.outputMediaUrls : [];
    const resultUrl =
      outputMediaUrls.map((item) => item.mediaUrl).find(Boolean) ||
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
