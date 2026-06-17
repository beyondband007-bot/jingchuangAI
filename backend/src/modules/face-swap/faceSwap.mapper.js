import { formatBeijingClock } from "../../shared/time.js";
import { decodeMojibakeFileName } from "../../shared/fileName.js";

function displayFileName(value, fallback = "") {
  return decodeMojibakeFileName(value || fallback);
}

export function mapFaceSwapAsset(row) {
  if (!row) return null;
  return {
    id: String(row.id),
    kind: row.kind,
    localUrl: row.local_url,
    fileName: displayFileName(row.original_name, row.stored_name),
    mimeType: row.mime_type,
    sizeBytes: Number(row.size_bytes || 0),
    providerUrl: row.provider_url || "",
    createdAt: row.created_at
  };
}

export function mapFaceSwapTask(row) {
  const status = row.status === "pending" ? "processing" : row.status;
  return {
    id: String(row.id),
    model: row.model_key,
    providerModel: row.provider_model,
    prompt: row.prompt,
    resolution: row.resolution,
    duration: Number(row.duration || 0),
    imageAssetId: String(row.image_asset_id),
    videoAssetId: String(row.video_asset_id),
    imageUrl: row.image_local_url || "",
    motionVideoUrl: row.video_local_url || "",
    imageFileName: displayFileName(row.image_original_name),
    videoFileName: displayFileName(row.video_original_name),
    status,
    progress: row.status === "completed" ? 100 : row.status === "failed" ? 0 : row.provider_task_id ? 68 : 24,
    resultUrl: row.result_url || "",
    thumbnailUrl: row.thumbnail_url || "",
    providerTaskId: row.provider_task_id || "",
    favorite: Boolean(row.favorite),
    error: row.error_message || "",
    points: Number(row.cost_points || 0),
    price: `${row.cost_points || 0} 积分`,
    time: formatBeijingClock(row.created_at)
  };
}
