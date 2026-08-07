export const UPLOAD_SIZE_LIMITS = {
  chatAttachment: 20 * 1024 * 1024,
  imageReference: 30 * 1024 * 1024,
  videoReferenceImage: 30 * 1024 * 1024,
  videoReferenceVideo: 100 * 1024 * 1024,
  digitalHumanImage: 30 * 1024 * 1024,
  accountAvatar: 2 * 1024 * 1024,
  canvasMedia: 100 * 1024 * 1024,
};

export function formatFileSizeLimit(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "";
  if (bytes >= 1024 * 1024 * 1024) {
    const gb = bytes / (1024 * 1024 * 1024);
    return Number.isInteger(gb) ? `${gb}GB` : `${gb.toFixed(1)}GB`;
  }
  return `${Math.round(bytes / (1024 * 1024))}MB`;
}

export function getFileSizeLimitError(file, maxBytes, label = "文件") {
  const size = Number(file?.size);
  if (!Number.isFinite(size) || size <= maxBytes) return "";
  return `${label}需小于 ${formatFileSizeLimit(maxBytes)}`;
}

export function isFileWithinSizeLimit(file, maxBytes) {
  const size = Number(file?.size);
  return Number.isFinite(size) && size > 0 && size <= maxBytes;
}
