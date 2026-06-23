import tencentcloud from "tencentcloud-sdk-nodejs";
import { config } from "../../config/index.js";

const AsrClient = tencentcloud.asr.v20190614.Client;

function assertTencentAsrConfigured() {
  if (!config.tencentCloud?.secretId || !config.tencentCloud?.secretKey) {
    const error = new Error("Tencent Cloud ASR is not configured");
    error.status = 500;
    throw error;
  }
}

function createAsrClient() {
  assertTencentAsrConfigured();

  return new AsrClient({
    credential: {
      secretId: config.tencentCloud.secretId,
      secretKey: config.tencentCloud.secretKey
    },
    region: config.tencentCloud.asrRegion || "ap-guangzhou",
    profile: {
      httpProfile: {
        endpoint: "asr.tencentcloudapi.com"
      }
    }
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function createTencentAsrTask({ audioUrl, audioData, audioDataLen }) {
  const client = createAsrClient();

  const payload = {
    EngineModelType: config.tencentCloud.asrEngine || "16k_zh",
    ChannelNum: 1,
    ResTextFormat: Number(config.tencentCloud.asrResTextFormat || 3)
  };

  if (audioData) {
    payload.SourceType = 1;
    payload.Data = audioData;
    payload.DataLen = Number(audioDataLen || 0);
  } else {
    payload.SourceType = 0;
    payload.Url = audioUrl;
  }

  return client.CreateRecTask(payload);
}

export async function getTencentAsrTaskStatus(taskId) {
  const client = createAsrClient();
  return client.DescribeTaskStatus({
    TaskId: Number(taskId)
  });
}

export async function waitForTencentAsrTask(taskId, options = {}) {
  const intervalMs = Number(options.intervalMs || config.tencentCloud.asrPollIntervalMs || 3000);
  const maxAttempts = Number(options.maxAttempts || config.tencentCloud.asrMaxAttempts || 80);

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const result = await getTencentAsrTaskStatus(taskId);
    const status = Number(result?.Data?.Status ?? result?.Status ?? -1);

    if (status === 2) return result;
    if (status === 3) {
      const error = new Error(result?.Data?.ErrorMsg || "Tencent ASR task failed");
      error.body = result;
      throw error;
    }

    await sleep(intervalMs);
  }

  const error = new Error("Tencent ASR task timed out");
  error.status = 504;
  throw error;
}
