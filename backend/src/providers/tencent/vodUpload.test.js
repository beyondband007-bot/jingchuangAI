import test from "node:test";
import assert from "node:assert/strict";
import os from "os";
import path from "path";
import { mkdtemp, rm, writeFile } from "fs/promises";
import {
  buildTencentVodApplyUploadPayload,
  clearTencentVodReferenceUploadCache,
  getTencentVodMediaType,
  uploadFileToTencentVod,
  uploadReferenceToTencentVod
} from "./vodUpload.js";

test("builds a temporary Tencent VOD image upload request", () => {
  assert.equal(getTencentVodMediaType("product.JPEG"), "jpg");
  assert.deepEqual(buildTencentVodApplyUploadPayload({
    filePath: "/tmp/product.png",
    subAppId: 125900001,
    expireHours: 24,
    now: Date.parse("2026-08-06T00:00:00.000Z")
  }), {
    SubAppId: 125900001,
    MediaType: "png",
    MediaName: "product.png",
    ExpireTime: "2026-08-07T00:00:00.000Z"
  });
});

test("uploads through ApplyUpload, COS, and CommitUpload", async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "tencent-vod-upload-"));
  const filePath = path.join(tempDir, "product.png");
  await writeFile(filePath, Buffer.from("png-bytes"));
  const calls = [];
  try {
    const result = await uploadFileToTencentVod({
      filePath,
      subAppId: 125900001,
      expireHours: 24,
      now: Date.parse("2026-08-06T00:00:00.000Z"),
      vodClient: {
        async ApplyUpload(payload) {
          calls.push(["apply", payload]);
          return {
            StorageBucket: "vod-bucket-125900001",
            StorageRegion: "ap-guangzhou",
            MediaStoragePath: "/reference/product.png",
            VodSessionKey: "session-key",
            TempCertificate: { SecretId: "tmp-id", SecretKey: "tmp-key", Token: "tmp-token" }
          };
        },
        async CommitUpload(payload) {
          calls.push(["commit", payload]);
          return {
            FileId: "file-123",
            MediaUrl: "https://vod.example.com/reference/product.png",
            RequestId: "request-123"
          };
        }
      },
      cosFactory(certificate) {
        calls.push(["certificate", certificate]);
        return {
          async uploadFile(payload) {
            calls.push(["cos", payload]);
          }
        };
      }
    });

    assert.equal(result.url, "https://vod.example.com/reference/product.png");
    assert.equal(result.fileId, "file-123");
    assert.deepEqual(calls[0], ["apply", {
      SubAppId: 125900001,
      MediaType: "png",
      MediaName: "product.png",
      ExpireTime: "2026-08-07T00:00:00.000Z"
    }]);
    assert.deepEqual(calls[2], ["cos", {
      Bucket: "vod-bucket-125900001",
      Region: "ap-guangzhou",
      Key: "/reference/product.png",
      FilePath: filePath
    }]);
    assert.deepEqual(calls[3], ["commit", {
      SubAppId: 125900001,
      VodSessionKey: "session-key"
    }]);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("reuses an uploaded reference until shortly before expiry", async () => {
  clearTencentVodReferenceUploadCache();
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "tencent-vod-cache-"));
  const filePath = path.join(tempDir, "product.jpg");
  await writeFile(filePath, Buffer.from("jpg-bytes"));
  let applyCalls = 0;
  const options = {
    filePath,
    subAppId: 125900001,
    expireHours: 24,
    now: Date.parse("2026-08-06T00:00:00.000Z"),
    vodClient: {
      async ApplyUpload() {
        applyCalls += 1;
        return {
          StorageBucket: "vod-bucket-125900001",
          StorageRegion: "ap-guangzhou",
          MediaStoragePath: "/reference/product.jpg",
          VodSessionKey: "session-key",
          TempCertificate: { SecretId: "tmp-id", SecretKey: "tmp-key", Token: "tmp-token" }
        };
      },
      async CommitUpload() {
        return { FileId: "file-123", MediaUrl: "https://vod.example.com/reference/product.jpg" };
      }
    },
    cosFactory: () => ({ uploadFile: async () => {} })
  };
  try {
    const first = await uploadReferenceToTencentVod(options);
    const second = await uploadReferenceToTencentVod(options);
    assert.equal(first.url, second.url);
    assert.equal(applyCalls, 1);
  } finally {
    clearTencentVodReferenceUploadCache();
    await rm(tempDir, { recursive: true, force: true });
  }
});
