import { config } from "../../config/index.js";
import { createTencentVodClient } from "./vodVideo.js";

const VIDEO_OUTPUT_TYPES = new Set([
  "SmartErase.Video",
  "AiAnalysis.DeLogo.Video"
]);

function assertFileId(value) {
  const fileId = String(value || "").trim();
  if (!fileId) {
    const error = new Error("Tencent Cloud MPS watermark removal requires a VOD FileId");
    error.status = 502;
    throw error;
  }
  return fileId;
}

export function buildTencentMpsWatermarkPayload({
  fileId,
  subAppId = config.tencentCloud.vodSubAppId
}) {
  return {
    FileId: assertFileId(fileId),
    SubAppId: Number(subAppId),
    AiAnalysisTask: {
      // Tencent VOD's preset MPS smart-erase template. With no
      // ExtendedParameter it performs watermark removal only.
      Definition: 25
    }
  };
}

export async function createTencentMpsWatermarkTask(options = {}) {
  const client = options.client || createTencentVodClient();
  const payload = buildTencentMpsWatermarkPayload(options);
  const result = await client.ProcessMediaByMPS(payload);
  const taskId = String(result?.TaskId || "").trim();
  if (!taskId) {
    const error = new Error("Tencent Cloud MPS watermark response missing TaskId");
    error.status = 502;
    error.body = result;
    throw error;
  }
  return { taskId, requestId: result.RequestId || null, raw: result };
}

export async function getTencentMpsWatermarkTask({
  taskId,
  subAppId = config.tencentCloud.vodSubAppId,
  client
}) {
  const vodClient = client || createTencentVodClient();
  return vodClient.DescribeTaskDetail({
    SubAppId: Number(subAppId),
    TaskId: String(taskId || "")
  });
}

function getMpsTask(record = {}) {
  return record?.ProcessMediaByMPSTask || record;
}

function getSubTasks(record = {}) {
  const task = getMpsTask(record);
  return Array.isArray(task?.SubTaskSet) ? task.SubTaskSet : [];
}

function hasSubTaskFailure(subTask) {
  const status = String(subTask?.Status || "").toUpperCase();
  const errCode = String(subTask?.ErrCode ?? "0");
  return status === "FAIL" || (errCode !== "" && errCode !== "0");
}

export function mapTencentMpsWatermarkState(record = {}) {
  const task = getMpsTask(record);
  const status = String(task?.Status || record?.Status || "").toUpperCase();
  const errCode = Number(task?.ErrCode || 0);
  const subTasks = getSubTasks(record);
  if (["ABORTED", "FAIL", "FAILED"].includes(status) || errCode !== 0 || subTasks.some(hasSubTaskFailure)) {
    return "failed";
  }
  if (status === "FINISH") return "completed";
  return "processing";
}

export function extractTencentMpsWatermarkResult(record = {}) {
  const outputFiles = getSubTasks(record)
    .flatMap((subTask) => Array.isArray(subTask?.Output?.OutputFiles) ? subTask.Output.OutputFiles : []);
  const preferred = outputFiles.find((file) => VIDEO_OUTPUT_TYPES.has(file?.FileType))
    || outputFiles.find((file) => String(file?.FileType || "").endsWith(".Video"))
    || outputFiles.find((file) => file?.Url);
  return {
    resultUrl: preferred?.Url || "",
    providerFileId: preferred?.FileId || "",
    outputFiles
  };
}

export function extractTencentMpsWatermarkError(record = {}) {
  const task = getMpsTask(record);
  const failedSubTask = getSubTasks(record).find(hasSubTaskFailure);
  return failedSubTask?.Message || task?.Message || record?.Message || "腾讯云 MPS 智能擦除任务失败";
}
