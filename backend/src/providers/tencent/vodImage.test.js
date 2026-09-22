import assert from "node:assert/strict";
import test from "node:test";
import {
  buildTencentVodImagePayload,
  extractTencentVodImageResult,
  getTencentVodImageModel,
  mapTencentVodImageState
} from "./vodImage.js";

test("maps every visible image model to Tencent Cloud VOD", () => {
  assert.deepEqual(getTencentVodImageModel("gpt_image_2"), {
    modelName: "OG",
    modelVersion: "image2_medium"
  });
  assert.deepEqual(getTencentVodImageModel("nano_banana_pro"), {
    modelName: "GG",
    modelVersion: "3.0"
  });
  assert.deepEqual(getTencentVodImageModel("seedream_4_5"), {
    modelName: "SI",
    modelVersion: "4.5"
  });
  assert.equal(getTencentVodImageModel("flux_2_pro"), null);
});

test("builds a Tencent VOD image request with reference images", () => {
  assert.deepEqual(buildTencentVodImagePayload({
    modelKey: "seedream_4_5",
    prompt: "a paper boat",
    ratio: "16:9",
    quality: "2K",
    referenceImageUrls: ["https://example.com/reference.png"],
    subAppId: 123
  }), {
    SubAppId: 123,
    ModelName: "SI",
    ModelVersion: "4.5",
    Prompt: "a paper boat",
    FileInfos: [{ Type: "Url", Url: "https://example.com/reference.png" }],
    EnhancePrompt: "Disabled",
    OutputConfig: {
      StorageMode: "Temporary",
      Resolution: "2K",
      AspectRatio: "16:9"
    }
  });
});

test("maps and extracts Tencent VOD image task results", () => {
  const record = {
    AigcImageTask: {
      Status: "FINISH",
      ErrCode: 0,
      Output: { FileInfos: [{ FileUrl: "https://example.com/result.png" }] }
    }
  };
  assert.equal(mapTencentVodImageState(record), "completed");
  assert.deepEqual(extractTencentVodImageResult(record).resultUrls, ["https://example.com/result.png"]);
});
