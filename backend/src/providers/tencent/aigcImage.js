import { config } from "../../config/index.js";
import { createTencentVodClient } from "./vodVideo.js";

export const TENCENT_IMAGE2_PROVIDER_MODEL = "OG/image2_low";

const IMAGE2_SIZES = {
  "1K": {
    "1:1": "1024x1024",
    "3:4": "864x1152",
    "4:3": "1152x864",
    "9:16": "864x1536",
    "16:9": "1536x864",
    "21:9": "1344x576"
  },
  "2K": {
    "1:1": "2048x2048",
    "3:4": "1536x2048",
    "4:3": "2048x1536",
    "9:16": "1440x2560",
    "16:9": "2560x1440",
    "21:9": "2688x1152"
  }
};

function assertTencentImageConfigured() {
  if (!config.tencentCloud?.secretId || !config.tencentCloud?.secretKey) {
    const error = new Error("Tencent Cloud AIGC image credentials are not configured");
    error.status = 503;
    throw error;
  }
  if (!Number.isInteger(config.tencentCloud.vodSubAppId) || config.tencentCloud.vodSubAppId <= 0) {
    const error = new Error("TENCENTCLOUD_VOD_SUB_APP_ID is not configured");
    error.status = 503;
    throw error;
  }
}

export function isTencentImage2ProviderModel(value) {
  return String(value || "").trim() === TENCENT_IMAGE2_PROVIDER_MODEL;
}

export function getTencentImage2Size({ ratio = "1:1", quality = "1K" } = {}) {
  const tier = IMAGE2_SIZES[quality] || IMAGE2_SIZES["1K"];
  return tier[ratio] || tier["1:1"];
}

export function buildTencentImage2Payload({
  prompt,
  ratio = "1:1",
  quality = "1K",
  referenceFileIds = [],
  referenceImageUrls = [],
  subAppId = config.tencentCloud.vodSubAppId
} = {}) {
  const fileInfos = [
    ...referenceFileIds
      .map((fileId) => String(fileId || "").trim())
      .filter(Boolean)
      .map((FileId) => ({ FileId })),
    ...referenceImageUrls
      .map((url) => String(url || "").trim())
      .filter(Boolean)
      .map((Url) => ({ Type: "Url", Url }))
  ].slice(0, 8);

  return {
    SubAppId: Number(subAppId),
    ModelName: "OG",
    ModelVersion: "image2_low",
    Prompt: String(prompt || "").trim(),
    EnhancePrompt: "Enabled",
    ...(fileInfos.length ? { FileInfos: fileInfos } : {}),
    // VOD exposes model-specific options through ExtInfo.  The nested
    // AdditionalParameters value must itself be a JSON string.
    ExtInfo: JSON.stringify({
      AdditionalParameters: JSON.stringify({ size: getTencentImage2Size({ ratio, quality }) })
    })
  };
}

export async function createTencentImage2Task(options = {}) {
  assertTencentImageConfigured();
  const client = options.client || createTencentVodClient();
  const result = await client.CreateAigcImageTask(buildTencentImage2Payload(options));
  const taskId = String(result?.TaskId || "").trim();
  if (!taskId) {
    const error = new Error("Tencent Cloud Image2 response missing TaskId");
    error.status = 502;
    error.body = result;
    throw error;
  }
  return { taskId, raw: result };
}

export async function getTencentImage2Task({
  taskId,
  client,
  subAppId = config.tencentCloud.vodSubAppId
} = {}) {
  const normalizedTaskId = String(taskId || "").trim();
  if (!normalizedTaskId) throw new Error("Tencent Cloud Image2 taskId is required");
  assertTencentImageConfigured();
  const vodClient = client || createTencentVodClient();
  const result = await vodClient.DescribeTaskDetail({
    SubAppId: Number(subAppId),
    TaskId: normalizedTaskId
  });
  return result?.AigcImageTask || result;
}

export function mapTencentImage2State(record = {}) {
  const state = String(record?.Status || "").toUpperCase();
  if (state === "FINISH" || state === "DONE") {
    return Number(record?.ErrCode || 0) === 0 && !String(record?.ErrCodeExt || "").trim()
      ? "completed"
      : "failed";
  }
  if (state === "FAIL" || state === "ABORTED") return "failed";
  return "processing";
}

export function extractTencentImage2ResultUrls(record = {}) {
  const outputUrls = record?.Output?.FileInfos;
  if (Array.isArray(outputUrls)) {
    return outputUrls.map((file) => String(file?.FileUrl || "").trim()).filter(Boolean);
  }
  return Array.isArray(record?.ImageUrls)
    ? record.ImageUrls.map((url) => String(url || "").trim()).filter(Boolean)
    : [];
}

export function extractTencentImage2Error(record = {}) {
  return String(record?.Message || record?.ErrCodeExt || "腾讯云 Image2 任务失败");
}
