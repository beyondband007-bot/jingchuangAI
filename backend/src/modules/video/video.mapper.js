import { formatBeijingDateTime } from "../../shared/time.js";
import { parseVideoTaskError } from "./video.errors.js";
import {
  getDefaultVideoResolution,
  getVideoResolutionOptions
} from "./video.resolutions.js";
function parseJson(value, fallback) {
  if (!value) return fallback;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

export function mapVideoModel(row) {
  const resolutions = getVideoResolutionOptions(row);
  return {
    value: row.model_key,
    label: row.display_name,
    providerType: row.provider_type,
    providerModel: row.provider_model,
    mode: row.mode,
    priceUnit: row.price_unit,
    basePoints: row.base_points,
    rmbPerSecond: Number(row.rmb_per_second || 0),
    ratios: parseJson(row.supported_ratios, []),
    durations: parseJson(row.supported_durations, []),
    resolutions,
    defaultResolution: getDefaultVideoResolution(row),
    defaultRatio: row.default_ratio,
    defaultDuration: row.default_duration
  };
}

export function mapVideoTask(row) {
  const urls = parseJson(row.result_urls, []);
  const duration = Number(row.duration);
  const errorDetail = parseVideoTaskError(row.error_message, {
    refunded: Boolean(row.refunded),
    points: Number(row.cost_points || 0)
  });
  return {
    id: row.id,
    model: row.display_name || row.model_key,
    modelKey: row.model_key,
    source: row.source || "video",
    ratio: row.ratio,
    resolution: row.resolution || null,
    duration,
    mode: row.mode || "first-frame",
    count: row.video_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    time: formatBeijingDateTime(row.created_at),
    price: `${row.cost_points} 积分`,
    rmb: row.rmb_cost ? `¥${Number(row.rmb_cost).toFixed(1)}` : null,
    points: row.cost_points,
    prompt: row.prompt,
    video: urls[0] || null,
    status: row.status,
    providerTaskId: row.provider_task_id || null,
    favorite: Boolean(row.favorite),
    error: errorDetail?.message || null,
    errorDetail,
    refunded: Boolean(row.refunded),
    referenceImageUrl: row.reference_image_url || null,
    firstFrameImageUrl: row.first_frame_image_url || null,
    lastFrameImageUrl: row.last_frame_image_url || null,
    referenceImageUrls: parseJson(row.reference_image_urls, []),
    referenceVideoUrl: row.reference_video_url || null,
    referenceAudioUrl: row.reference_audio_url || null
  };
}
