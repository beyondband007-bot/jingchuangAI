import assert from "node:assert/strict";
import test from "node:test";
import {
  buildTencentImage2Payload,
  extractTencentImage2ResultUrls,
  getTencentImage2Size,
  mapTencentImage2State
} from "./aigcImage.js";

test("builds Tencent Image2 Low text-to-image payload", () => {
  assert.deepEqual(
    buildTencentImage2Payload({ prompt: "A red paper boat", ratio: "16:9", quality: "1K", subAppId: 1259494483 }),
    {
      SubAppId: 1259494483,
      ModelName: "OG",
      ModelVersion: "image2_low",
      Prompt: "A red paper boat",
      EnhancePrompt: "Enabled",
      ExtInfo: '{"AdditionalParameters":"{\\"size\\":\\"1536x864\\"}"}'
    }
  );
});

test("builds Tencent Image2 Low image-to-image payload", () => {
  const payload = buildTencentImage2Payload({
    prompt: "Keep the subject and replace the background",
    ratio: "3:4",
    quality: "2K",
    subAppId: 1259494483,
    referenceFileIds: ["file-a"],
    referenceImageUrls: ["https://cdn.example.com/reference.png"]
  });
  assert.deepEqual(payload.FileInfos, [
    { FileId: "file-a" },
    { Type: "Url", Url: "https://cdn.example.com/reference.png" }
  ]);
  assert.equal(payload.ExtInfo, '{"AdditionalParameters":"{\\"size\\":\\"1536x2048\\"}"}');
});

test("maps Tencent Image2 states and results", () => {
  assert.equal(getTencentImage2Size({ ratio: "21:9", quality: "1K" }), "1344x576");
  assert.equal(mapTencentImage2State({ Status: "PROCESSING" }), "processing");
  assert.equal(mapTencentImage2State({ Status: "FINISH", ErrCode: 0 }), "completed");
  assert.equal(mapTencentImage2State({ Status: "FINISH", ErrCodeExt: "FailedOperation" }), "failed");
  assert.equal(mapTencentImage2State({ Status: "ABORTED" }), "failed");
  assert.deepEqual(extractTencentImage2ResultUrls({ ImageUrls: ["https://example.com/a.png", ""] }), ["https://example.com/a.png"]);
  assert.deepEqual(
    extractTencentImage2ResultUrls({ Output: { FileInfos: [{ FileUrl: "https://example.com/result.png" }] } }),
    ["https://example.com/result.png"]
  );
});
