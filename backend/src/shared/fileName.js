const mojibakePattern = /[ÃÂÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝÞßàáâãäåæçèéêëìíîïðñòóôõöøùúûüýþÿ]|[脙脗氓忙盲莽茅锟涓婁紶闊抽纭瑙ｆ瀽鍒嗙敤]/;

export function normalizeUploadOriginalName(file) {
  if (!file?.originalname) return file;
  file.originalname = decodeMojibakeFileName(file.originalname);
  return file;
}

export function decodeMojibakeFileName(value) {
  if (typeof value !== "string" || !value) return value;
  if (!mojibakePattern.test(value)) return value;
  try {
    const decoded = Buffer.from(value, "latin1").toString("utf8");
    if (!decoded || decoded.includes("锟") || decoded.includes("\uFFFD")) return value;
    return decoded;
  } catch {
    return value;
  }
}
