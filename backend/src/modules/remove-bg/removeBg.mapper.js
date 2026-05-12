function displayTime(dateValue) {
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(new Date(dateValue));
}

export function mapRemoveBgAsset(row) {
  if (!row) return null;
  return {
    id: String(row.id),
    kind: row.kind,
    localUrl: row.local_url,
    fileName: row.original_name || row.stored_name,
    mimeType: row.mime_type,
    sizeBytes: Number(row.size_bytes || 0),
    providerUrl: row.provider_url || "",
    createdAt: row.created_at
  };
}

export function mapRemoveBgTask(row) {
  const status = row.status === "pending" ? "processing" : row.status;
  const points = Number(row.cost_points || 0);
  return {
    id: String(row.id),
    model: row.model_key,
    providerModel: row.provider_model,
    mediaType: row.media_type,
    sourceAssetId: String(row.source_asset_id),
    sourceUrl: row.source_local_url || "",
    sourceFileName: row.source_original_name || "",
    sourceMimeType: row.source_mime_type || "",
    status,
    progress: row.status === "completed" ? 100 : row.status === "failed" ? 0 : row.provider_task_id ? 68 : 24,
    resultUrl: row.result_url || "",
    thumbnailUrl: row.thumbnail_url || "",
    providerTaskId: row.provider_task_id || "",
    favorite: Boolean(row.favorite),
    error: row.error_message || "",
    points,
    price: `${points} 积分`,
    time: displayTime(row.created_at)
  };
}
