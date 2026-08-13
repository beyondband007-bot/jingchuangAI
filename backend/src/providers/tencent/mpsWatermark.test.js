import assert from "node:assert/strict";
import test from "node:test";
import {
  buildTencentMpsWatermarkPayload,
  createTencentMpsWatermarkTask,
  extractTencentMpsWatermarkError,
  extractTencentMpsWatermarkResult,
  mapTencentMpsWatermarkState
} from "./mpsWatermark.js";

test("builds the official Tencent VOD MPS smart erase watermark task", () => {
  assert.deepEqual(buildTencentMpsWatermarkPayload({
    fileId: "vod-file-1",
    subAppId: 123
  }), {
    FileId: "vod-file-1",
    SubAppId: 123,
    AiAnalysisTask: {
      Definition: 25
    }
  });
});

test("creates a Tencent MPS task through VOD", async () => {
  let received;
  const result = await createTencentMpsWatermarkTask({
    fileId: "vod-file-2",
    subAppId: 456,
    client: {
      async ProcessMediaByMPS(payload) {
        received = payload;
        return { TaskId: "mps-task-1", RequestId: "request-1" };
      }
    }
  });
  assert.equal(received.FileId, "vod-file-2");
  assert.equal(result.taskId, "mps-task-1");
  assert.equal(result.requestId, "request-1");
});

test("maps Tencent MPS completion and extracts the smart erase video", () => {
  const record = {
    Status: "FINISH",
    ProcessMediaByMPSTask: {
      Status: "FINISH",
      ErrCode: 0,
      SubTaskSet: [{
        TaskType: "SmartErase",
        Status: "SUCCESS",
        ErrCode: "0",
        Output: {
          OutputFiles: [{ FileType: "SmartErase.Video", Url: "https://example.com/result.mp4", FileId: "result-file" }]
        }
      }]
    }
  };
  assert.equal(mapTencentMpsWatermarkState(record), "completed");
  assert.deepEqual(extractTencentMpsWatermarkResult(record), {
    resultUrl: "https://example.com/result.mp4",
    providerFileId: "result-file",
    outputFiles: [{ FileType: "SmartErase.Video", Url: "https://example.com/result.mp4", FileId: "result-file" }]
  });
});

test("maps a failed MPS subtask and exposes its message", () => {
  const record = {
    ProcessMediaByMPSTask: {
      Status: "FINISH",
      ErrCode: 0,
      SubTaskSet: [{ Status: "FAIL", ErrCode: "1001", Message: "erase failed" }]
    }
  };
  assert.equal(mapTencentMpsWatermarkState(record), "failed");
  assert.equal(extractTencentMpsWatermarkError(record), "erase failed");
});
