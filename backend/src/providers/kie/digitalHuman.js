import { requestKie } from "./client.js";

export async function createKieDigitalHumanTask({
  model,
  imageUrl,
  audioUrl,
  prompt = ""
}) {
  const result = await requestKie("/api/v1/jobs/createTask", {
    method: "POST",
    body: JSON.stringify({
      model,
      input: {
        image_url: imageUrl,
        reference_image: [imageUrl],
        audio_url: audioUrl,
        prompt
      }
    })
  });

  const taskId = result.data?.taskId;
  if (!taskId) {
    const error = new Error("digital human response missing taskId");
    error.status = 502;
    error.body = result;
    throw error;
  }

  return { taskId, raw: result };
}

export async function getKieDigitalHumanTask({ taskId }) {
  return requestKie(`/api/v1/jobs/recordInfo?taskId=${encodeURIComponent(taskId)}`, {
    method: "GET"
  });
}

export function mapKieDigitalHumanState(record) {
  const state = record.data?.state || record.state || "";
  if (state === "success") return "completed";
  if (state === "fail") return "failed";
  return "processing";
}

export function extractKieDigitalHumanResult(record) {
  const json = record?.data?.resultJson;
  if (!json) {
    return { resultUrl: "", thumbnailUrl: "" };
  }

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
