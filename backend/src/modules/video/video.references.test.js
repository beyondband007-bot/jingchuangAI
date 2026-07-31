import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, rm } from "fs/promises";
import os from "os";
import path from "path";
import test from "node:test";
import {
  assertVideoReferenceUrlAccessible,
  resolveArkVideoReference
} from "./video.references.js";

test("uploads a local video reference to KIE and validates the returned URL", async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "video-reference-"));
  const referencesDir = path.join(tempDir, "video", "references");
  await mkdir(referencesDir, { recursive: true });
  await writeFile(path.join(referencesDir, "product.png"), Buffer.from("png-bytes"));

  let uploadArgs;
  try {
    const result = await resolveArkVideoReference({
      userId: 18,
      url: "/media/video/references/product.png",
      kind: "image",
      referenceIndex: 1,
      storageDir: tempDir,
      uploadImpl: async (args) => {
        uploadArgs = args;
        return { url: "https://tempfile.example.com/product.png" };
      },
      fetchImpl: async () => new Response(Buffer.from("x"), {
        status: 206,
        headers: { "Content-Type": "image/png" }
      })
    });

    assert.equal(result, "https://tempfile.example.com/product.png");
    assert.equal(uploadArgs.uploadPath, "video-references/18");
    assert.equal(uploadArgs.mimeType, "image/png");
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("returns an explicit no-charge error when KIE upload fails", async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "video-reference-"));
  const referencesDir = path.join(tempDir, "video", "references");
  await mkdir(referencesDir, { recursive: true });
  await writeFile(path.join(referencesDir, "product.png"), Buffer.from("png-bytes"));

  try {
    await assert.rejects(
      resolveArkVideoReference({
        userId: 18,
        url: "/media/video/references/product.png",
        kind: "image",
        referenceIndex: 2,
        storageDir: tempDir,
        uploadImpl: async () => {
          throw new Error("network timeout");
        }
      }),
      (error) => {
        assert.equal(error.code, "VIDEO_REFERENCE_UPLOAD_FAILED");
        assert.equal(error.errorDetail.referenceIndex, 2);
        assert.match(error.message, /未扣除积分/);
        return true;
      }
    );
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("rejects HTML responses masquerading as a reference image", async () => {
  await assert.rejects(
    assertVideoReferenceUrlAccessible({
      url: "https://example.com/product.png",
      kind: "image",
      referenceIndex: 1,
      fetchImpl: async () => new Response("<html></html>", {
        status: 200,
        headers: { "Content-Type": "text/html" }
      })
    }),
    (error) => {
      assert.equal(error.code, "VIDEO_REFERENCE_URL_UNREACHABLE");
      return true;
    }
  );
});
