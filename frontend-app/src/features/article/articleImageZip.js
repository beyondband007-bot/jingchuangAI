import JSZip from "jszip";

function extFromUrl(url, fallback = "png") {
  try {
    const pathname = new URL(url, window.location.origin).pathname;
    const ext = pathname.split(".").pop()?.toLowerCase();
    if (ext && /^[a-z0-9]+$/i.test(ext) && ext.length <= 5) return ext;
  } catch {
    return fallback;
  }
  return fallback;
}

function resolveFetchUrl(url) {
  const value = String(url || "").trim();
  if (!value) return "";
  if (value.startsWith("/")) return value;
  try {
    const parsed = new URL(value);
    if (parsed.origin === window.location.origin) return value;
    return `/api/media/proxy?url=${encodeURIComponent(value)}`;
  } catch {
    return value;
  }
}

export function sanitizeArticleZipName(value) {
  const base = String(value || "article-images")
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "_")
    .replace(/\s+/g, "_")
    .slice(0, 48);
  return base || "article-images";
}

export async function buildArticleImagesZipBlob(images) {
  const items = images.map((item) => String(item || "").trim()).filter(Boolean);
  if (!items.length) {
    throw new Error("没有可下载的图片");
  }

  const zip = new JSZip();
  for (let index = 0; index < items.length; index += 1) {
    const fetchUrl = resolveFetchUrl(items[index]);
    const response = await fetch(fetchUrl, { credentials: "include" });
    if (!response.ok) {
      throw new Error(`下载第 ${index + 1} 张图片失败`);
    }
    const buffer = await response.arrayBuffer();
    const contentType = response.headers.get("content-type") || "";
    const ext = contentType.split("/")[1]?.split(";")[0] || extFromUrl(items[index]);
    zip.file(`image-${index + 1}.${ext}`, buffer);
  }

  return zip.generateAsync({ type: "blob" });
}

export async function downloadArticleImagesZip(images, { zipName = "article-images" } = {}) {
  const blob = await buildArticleImagesZipBlob(images);
  const safeName = sanitizeArticleZipName(zipName);
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = `${safeName}.zip`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(objectUrl);
}
