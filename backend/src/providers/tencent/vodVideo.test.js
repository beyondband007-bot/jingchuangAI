import assert from "node:assert/strict";
import test from "node:test";
import {
  buildTencentVodSeedancePayload,
  createTencentVodSeedanceTask,
  extractTencentVodSeedanceResult,
  mapTencentVodSeedanceState
} from "./vodVideo.js";

test("builds Tencent VOD Seedance multimodal payload without changing Ark", () => {
  const payload = buildTencentVodSeedancePayload({
    subAppId: 251000001,
    modelName: "OS",
    modelVersion: "2.0",
    prompt: "cinematic portrait",
    firstFrameImageUrl: "https://example.com/first.png",
    lastFrameImageUrl: "https://example.com/last.png",
    referenceImageUrls: ["https://example.com/ref.png"],
    referenceVideoUrl: "https://example.com/ref.mp4",
    ratio: "9:16",
    duration: 8,
    resolution: "720P",
    generateAudio: true
  });

  assert.equal(payload.SubAppId, 251000001);
  assert.equal(payload.ModelName, "OS");
  assert.equal(payload.ModelVersion, "2.0");
  assert.deepEqual(payload.FileInfos.map(({ Category, Usage }) => ({ Category, Usage })), [
    { Category: "Image", Usage: "FirstFrame" },
    { Category: "Image", Usage: "LastFrame" },
    { Category: "Image", Usage: "Reference" },
    { Category: "Video", Usage: "Reference" }
  ]);
  assert.deepEqual(payload.OutputConfig, {
    StorageMode: "Temporary",
    Duration: 8,
    Resolution: "720P",
    AspectRatio: "9:16",
    AudioGeneration: "Enabled",
    PersonGeneration: "AllowAdult",
    InputComplianceCheck: "Enabled",
    OutputComplianceCheck: "Enabled"
  });
});

test("creates and maps Tencent VOD Seedance tasks", async () => {
  let captured;
  const client = {
    async CreateAigcVideoTask(payload) {
      captured = payload;
      return { TaskId: "251000001-AigcVideoTask-test", RequestId: "request-test" };
    }
  };

  const created = await createTencentVodSeedanceTask({
    client,
    subAppId: 251000001,
    modelName: "OS",
    modelVersion: "2.0",
    prompt: "test",
    duration: 5
  });

  assert.equal(created.taskId, "251000001-AigcVideoTask-test");
  assert.equal(captured.Prompt, "test");

  const completed = {
    Status: "FINISH",
    AigcVideoTask: {
      Status: "FINISH",
      ErrCode: 0,
      Output: { FileInfos: [{ FileUrl: "https://example.com/result.mp4" }] }
    }
  };
  assert.equal(mapTencentVodSeedanceState(completed), "completed");
  assert.deepEqual(extractTencentVodSeedanceResult(completed).resultUrls, ["https://example.com/result.mp4"]);
  assert.equal(mapTencentVodSeedanceState({ AigcVideoTask: { Status: "FINISH", ErrCodeExt: "FailedOperation" } }), "failed");
});
