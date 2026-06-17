/**
 * Windows browsers sometimes expose UTF-8 file names as Latin-1 mojibake (e.g. 音色 -> é³è²).
 */
export function normalizeUploadFileName(name) {
  if (!name || typeof name !== "string") return "";

  if (!/[\u0080-\u00ff]/.test(name)) return name;

  try {
    const bytes = Uint8Array.from(name, (char) => char.charCodeAt(0) & 0xff);
    const decoded = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
    if (!decoded || decoded.includes("\uFFFD") || decoded === name) return name;

    const decodedCjk = (decoded.match(/[\u4e00-\u9fff]/g) || []).length;
    const sourceCjk = (name.match(/[\u4e00-\u9fff]/g) || []).length;
    if (decodedCjk > sourceCjk) return decoded;
  } catch {
    // Keep the original name when decoding fails.
  }

  return name;
}

export function stripFileExtension(name) {
  const normalized = normalizeUploadFileName(name);
  return normalized.replace(/\.[^.]+$/, "");
}
