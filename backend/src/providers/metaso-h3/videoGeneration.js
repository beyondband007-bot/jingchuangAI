import {
  buildMinimaxH3Payload,
  extractMinimaxH3VideoResult,
  mapMinimaxH3VideoState
} from "../minimax/videoGeneration.js";
import { requestMetasoH3 } from "./client.js";

export async function createMetasoH3VideoTask(options) {
  const payload = buildMinimaxH3Payload({
    ...options,
    watermark: options?.aigc_watermark ?? options?.watermark
  });
  const result = await requestMetasoH3("/v2/video_generation", {
    method: "POST",
    body: JSON.stringify(payload),
    retries: 0
  });
  if (!result.task_id) {
    const error = new Error("METASO H3 response missing task_id");
    error.status = 502;
    error.body = result;
    throw error;
  }
  return { taskId: result.task_id, raw: result };
}

export async function getMetasoH3VideoTask({ taskId }) {
  return requestMetasoH3(`/v2/query/video_generation/${encodeURIComponent(taskId)}`, {
    method: "GET"
  });
}

export const mapMetasoH3VideoState = mapMinimaxH3VideoState;
export const extractMetasoH3VideoResult = extractMinimaxH3VideoResult;
