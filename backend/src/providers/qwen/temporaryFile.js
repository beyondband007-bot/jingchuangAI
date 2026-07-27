import { randomUUID } from "crypto";
import { readFile, stat } from "fs/promises";
import path from "path";
import { config } from "../../config/index.js";

function createUploadError(message, status = 502, body = null) {
  const error = new Error(message);
  error.status = status;
  error.body = body;
  error.code = "MEDIA_UPLOAD_FAILED";
  error.provider = "qwen";
  return error;
}

function safeFileName(filePath, originalName = "") {
  const sourceName = path.basename(String(originalName || filePath || "video.mp4"));
  const extension = path.extname(sourceName).toLowerCase().replace(/[^.a-z0-9]/g, "") || ".mp4";
  return `video-reverse-${Date.now()}-${randomUUID().slice(0, 8)}${extension}`;
}

export async function uploadQwenTemporaryFile({
  filePath,
  originalName,
  mimeType = "video/mp4",
  model = config.qwen.videoReverseModel,
  fetchImpl = fetch
}) {
  if (!config.qwen.apiKey) {
    throw createUploadError("QWEN_API_KEY / DASHSCOPE_API_KEY is not configured", 500);
  }
  const fileStat = await stat(filePath);
  const policyUrl = new URL("https://dashscope.aliyuncs.com/api/v1/uploads");
  policyUrl.searchParams.set("action", "getPolicy");
  policyUrl.searchParams.set("model", model);
  const policyResponse = await fetchImpl(policyUrl, {
    headers: {
      Authorization: `Bearer ${config.qwen.apiKey}`,
      "Content-Type": "application/json"
    },
    signal: AbortSignal.timeout(30000)
  });
  const policyBody = await policyResponse.json().catch(() => ({}));
  if (!policyResponse.ok || !policyBody?.data) {
    throw createUploadError(
      policyBody?.message || policyBody?.error?.message || "获取 Qwen 临时文件上传凭证失败",
      policyResponse.status,
      policyBody
    );
  }

  const policy = policyBody.data;
  const maxFileSize = Number(policy.max_file_size_mb || 0) * 1024 * 1024;
  if (maxFileSize > 0 && fileStat.size > maxFileSize) {
    throw createUploadError(`视频超过 Qwen 临时上传限制 ${policy.max_file_size_mb}MB`, 400);
  }

  const filename = safeFileName(filePath, originalName);
  const objectKey = `${String(policy.upload_dir || "").replace(/\/+$/, "")}/${filename}`;
  const form = new FormData();
  form.set("OSSAccessKeyId", policy.oss_access_key_id);
  form.set("Signature", policy.signature);
  form.set("policy", policy.policy);
  form.set("x-oss-object-acl", policy.x_oss_object_acl);
  form.set("x-oss-forbid-overwrite", policy.x_oss_forbid_overwrite);
  form.set("key", objectKey);
  form.set("success_action_status", "200");
  form.set("file", new Blob([await readFile(filePath)], { type: mimeType }), filename);

  const uploadResponse = await fetchImpl(policy.upload_host, {
    method: "POST",
    body: form,
    signal: AbortSignal.timeout(120000)
  });
  if (!uploadResponse.ok) {
    const responseText = await uploadResponse.text().catch(() => "");
    throw createUploadError(
      `上传视频到 Qwen 临时存储失败：HTTP ${uploadResponse.status}`,
      uploadResponse.status,
      responseText.slice(0, 1000)
    );
  }

  return {
    url: `oss://${objectKey}`,
    requestId: policyBody.request_id || policyBody.requestId || "",
    sizeBytes: fileStat.size,
    expiresInSeconds: 48 * 60 * 60
  };
}
