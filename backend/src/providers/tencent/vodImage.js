import { config } from "../../config/index.js";
import { createTencentVodClient } from "./vodVideo.js";

export const TENCENT_VOD_IMAGE_MODELS = Object.freeze({
  gpt_image_2: { modelName: "OG", modelVersion: "image2_medium" },
  gpt_image_2_i2i: { modelName: "OG", modelVersion: "image2_medium" },
  nano_banana_pro: { modelName: "GG", modelVersion: "3.0" },
  seedream_4_5: { modelName: "SI", modelVersion: "4.5" }
});

export function getTencentVodImageModel(modelKey) {
  return TENCENT_VOD_IMAGE_MODELS[modelKey] || null;
}

export function buildTencentVodImagePayload({
  modelKey,
  prompt,
  ratio = "1:1",
  quality = "1K",
  referenceImageUrls = [],
  subAppId = config.tencentCloud.vodSubAppId,
  storageMode = config.tencentCloud.vodStorageMode || "Temporary"
}) {
  const model = getTencentVodImageModel(modelKey);
  if (!model) {
    const error = new Error(`Tencent Cloud VOD does not support image model: ${modelKey}`);
    error.status = 400;
    throw error;
  }

  const fileInfos = referenceImageUrls
    .map((url) => String(url || "").trim())
    .filter(Boolean)
    .map((url) => ({ Type: "Url", Url: url }));

  return {
    SubAppId: Number(subAppId),
    ModelName: model.modelName,
    ModelVersion: model.modelVersion,
    Prompt: String(prompt || "").trim(),
    ...(fileInfos.length ? { FileInfos: fileInfos } : {}),
    EnhancePrompt: "Disabled",
    OutputConfig: {
      StorageMode: storageMode,
      Resolution: String(quality || "1K").toUpperCase(),
      AspectRatio: ratio
    }
  };
}

export async function createTencentVodImageTask(options = {}) {
  const client = options.client || createTencentVodClient();
  const payload = buildTencentVodImagePayload(options);
  const result = await client.CreateAigcImageTask(payload);
  if (!result?.TaskId) {
    const error = new Error("Tencent Cloud VOD image response missing task id");
    error.status = 502;
    error.body = result;
    throw error;
  }
  return { taskId: result.TaskId, requestId: result.RequestId || null, raw: result };
}

export async function getTencentVodImageTask({
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

function getImageTask(record = {}) {
  return record?.AigcImageTask || record;
}

export function mapTencentVodImageState(record = {}) {
  const task = getImageTask(record);
  const status = String(task?.Status || record?.Status || "").toUpperCase();
  const errCode = Number(task?.ErrCode || 0);
  const errCodeExt = String(task?.ErrCodeExt || "").trim();
  if (["ABORTED", "FAIL", "FAILED"].includes(status)) return "failed";
  if (status === "FINISH") return errCode !== 0 || errCodeExt ? "failed" : "completed";
  return "processing";
}

export function extractTencentVodImageResult(record = {}) {
  const task = getImageTask(record);
  const files = Array.isArray(task?.Output?.FileInfos) ? task.Output.FileInfos : [];
  return {
    resultUrls: files.map((item) => item?.FileUrl).filter(Boolean),
    errorCode: task?.ErrCodeExt || task?.ErrCode || null,
    errorMessage: task?.Message || record?.Message || "",
    progress: task?.Progress ?? null,
    files
  };
}

export function isTencentVodImageTaskId(taskId) {
  return /-AigcImageTask-/i.test(String(taskId || ""));
}
