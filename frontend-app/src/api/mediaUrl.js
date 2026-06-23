export function resolveMediaUrl(url) {
  const value = String(url || "").trim();
  if (!value) return "";
  if (value.startsWith("/")) return value;
  try {
    const parsed = new URL(value, window.location.origin);
    if (parsed.origin === window.location.origin) return value;
    return `/api/media/proxy?url=${encodeURIComponent(value)}`;
  } catch {
    return value;
  }
}

export async function downloadMediaFile(url, fileName) {
  const fetchUrl = resolveMediaUrl(url);
  const response = await fetch(fetchUrl, { credentials: "include" });
  if (!response.ok) throw new Error("下载失败");
  const blob = await response.blob();
  const href = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = href;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(href);
}
