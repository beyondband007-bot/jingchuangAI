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

export async function createKieRemoveBgTask({ model, sourceUrl }) {
  const result = await requestKie("/api/v1/jobs/createTask", {
    method: "POST",
    body: JSON.stringify({
      model,
      input: {
        image: sourceUrl
      }
    })
  });

  return extractTaskId(result, "remove background");
}

export async function getKieRemoveBgTask({ taskId }) {
  return getKieTask(taskId);
}

export function mapKieRemoveBgState(record) {
  const state = record.data?.state || record.state || "";
  if (state === "success") return "completed";
  if (state === "fail") return "failed";
  return "processing";
}

export function extractRemoveBgResult(record) {
  const json = record?.data?.resultJson;
  if (!json) return { resultUrl: "", thumbnailUrl: "" };

  try {
    const parsed = JSON.parse(json);
    const outputMediaUrls = Array.isArray(parsed.outputMediaUrls) ? parsed.outputMediaUrls : [];
    const resultUrl =
      outputMediaUrls.map((item) => item.mediaUrl).find(Boolean) ||
      parsed.imageUrl ||
      parsed.image_url ||
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
