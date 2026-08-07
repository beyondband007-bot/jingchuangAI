import tencentcloud from "tencentcloud-sdk-nodejs";
import { config } from "../../config/index.js";

const VodClient = tencentcloud.vod.v20180717.Client;

function assertTencentVodConfigured() {
  if (!config.tencentCloud?.secretId || !config.tencentCloud?.secretKey) {
    const error = new Error("Tencent Cloud VOD credentials are not configured");
    error.status = 503;
    throw error;
  }
  if (!Number.isInteger(config.tencentCloud.vodSubAppId) || config.tencentCloud.vodSubAppId <= 0) {
    const error = new Error("TENCENTCLOUD_VOD_SUB_APP_ID is not configured");
    error.status = 503;
    throw error;
  }
}

export function createTencentVodClient() {
  assertTencentVodConfigured();
  return new VodClient({
    credential: {
      secretId: config.tencentCloud.secretId,
      secretKey: config.tencentCloud.secretKey
    },
    region: config.tencentCloud.vodRegion || config.tencentCloud.region,
    profile: {
      httpProfile: {
        endpoint: "vod.tencentcloudapi.com"
      }
    }
  });
}

function buildUrlInput(category, usage, url, extra = {}) {
  if (!url) return null;
  return {
    Type: "Url",
    Category: category,
    Url: url,
    Usage: usage,
    ...extra
  };
}

export function buildTencentVodSeedancePayload({
  subAppId = config.tencentCloud.vodSubAppId,
  modelName = config.tencentCloud.vodVideoModelName,
  modelVersion = config.tencentCloud.vodVideoModelVersion,
  prompt,
  firstFrameImageUrl,
  lastFrameImageUrl,
  referenceImageUrls = [],
  referenceVideoUrl,
  subjectInfos = [],
  ratio = "16:9",
  duration = 5,
  resolution = "720P",
  generateAudio = true,
  storageMode = config.tencentCloud.vodStorageMode || "Temporary"
}) {
  const fileInfos = [
    buildUrlInput("Image", "FirstFrame", firstFrameImageUrl),
    buildUrlInput("Image", "LastFrame", lastFrameImageUrl),
    ...referenceImageUrls.map((url) => buildUrlInput("Image", "Reference", url)),
    buildUrlInput("Video", "Reference", referenceVideoUrl, { KeepOriginalSound: "Enabled" })
  ].filter(Boolean);

  return {
    SubAppId: Number(subAppId),
    ModelName: modelName,
    ModelVersion: modelVersion,
    Prompt: String(prompt || "").trim(),
    ...(fileInfos.length ? { FileInfos: fileInfos } : {}),
    ...(subjectInfos.length ? { SubjectInfos: subjectInfos } : {}),
    EnhancePrompt: "Disabled",
    OutputConfig: {
      StorageMode: storageMode,
      Duration: Number(duration),
      Resolution: String(resolution || "720P").toUpperCase(),
      AspectRatio: ratio,
      AudioGeneration: generateAudio ? "Enabled" : "Disabled",
      PersonGeneration: "AllowAdult",
      InputComplianceCheck: "Enabled",
      OutputComplianceCheck: "Enabled"
    }
  };
}

export async function createTencentVodSeedanceTask(options = {}) {
  const client = options.client || createTencentVodClient();
  const payload = buildTencentVodSeedancePayload(options);
  const result = await client.CreateAigcVideoTask(payload);
  if (!result?.TaskId) {
    const error = new Error("Tencent Cloud VOD video response missing task id");
    error.body = result;
    throw error;
  }
  return { taskId: result.TaskId, requestId: result.RequestId || null, raw: result };
}

export async function getTencentVodSeedanceTask({
  taskId,
  subAppId = config.tencentCloud.vodSubAppId,
  client
}) {
  const vodClient = client || createTencentVodClient();
  return vodClient.DescribeTaskDetail({
    SubAppId: Number(subAppId),
    TaskId: taskId
  });
}

function getAigcTask(record = {}) {
  return record?.AigcVideoTask || record;
}

export function mapTencentVodSeedanceState(record = {}) {
  const task = getAigcTask(record);
  const status = String(task?.Status || record?.Status || "").toUpperCase();
  const errCode = Number(task?.ErrCode || 0);
  const errCodeExt = String(task?.ErrCodeExt || "").trim();
  if (["ABORTED", "FAIL", "FAILED"].includes(status)) return "failed";
  if (status === "FINISH") return errCode !== 0 || errCodeExt ? "failed" : "completed";
  return "processing";
}

export function extractTencentVodSeedanceResult(record = {}) {
  const task = getAigcTask(record);
  const files = Array.isArray(task?.Output?.FileInfos) ? task.Output.FileInfos : [];
  return {
    resultUrls: files.map((item) => item?.FileUrl).filter(Boolean),
    errorCode: task?.ErrCodeExt || task?.ErrCode || null,
    errorMessage: task?.Message || record?.Message || "",
    progress: task?.Progress ?? null,
    files
  };
}

export async function listTencentVodPortraitElements({
  offset = 0,
  limit = 100,
  subAppId = config.tencentCloud.vodSubAppId,
  client
} = {}) {
  const vodClient = client || createTencentVodClient();
  return vodClient.DescribeAigcAdvancedCustomElements({
    SubAppId: Number(subAppId),
    Offset: Number(offset),
    Limit: Number(limit)
  });
}
