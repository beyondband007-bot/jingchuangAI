import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, rm } from "fs/promises";
import os from "os";
import path from "path";
import test from "node:test";
import {
  assertVideoReferenceUrlAccessible,
  getLocalMediaFilePath,
  resolveArkVideoReference,
  resolveKieVideoReference,
  resolveMinimaxVideoReference
} from "./video.references.js";

test("resolves a canvas media path inside the configured storage root", () => {
  const storageDir = path.join("tmp", "video-storage");
  assert.equal(
    getLocalMediaFilePath("/media/canvas/uploads/product.png", storageDir),
    path.resolve(process.cwd(), storageDir, "canvas", "uploads", "product.png")
  );
  assert.equal(getLocalMediaFilePath("/media/../secrets.txt", storageDir), "");
});

test("uploads MiniMax H3 canvas references to the temporary file service", async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "minimax-reference-"));
  const canvasDir = path.join(tempDir, "canvas", "uploads");
  await mkdir(canvasDir, { recursive: true });
  await writeFile(path.join(canvasDir, "product.png"), Buffer.from("png-bytes"));

  let uploadArgs;
  try {
    const result = await resolveMinimaxVideoReference({
      userId: 18,
      url: "/media/canvas/uploads/product.png",
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
    assert.equal(uploadArgs.filePath, path.join(canvasDir, "product.png"));
    assert.equal(uploadArgs.uploadPath, "minimax-h3-references/18");
    assert.equal(uploadArgs.mimeType, "image/png");
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("returns a no-charge error when MiniMax H3 temporary upload fails", async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "minimax-reference-"));
  const canvasDir = path.join(tempDir, "canvas", "uploads");
  await mkdir(canvasDir, { recursive: true });
  await writeFile(path.join(canvasDir, "product.png"), Buffer.from("png-bytes"));

  try {
    await assert.rejects(
      resolveMinimaxVideoReference({
        userId: 18,
        url: "/media/canvas/uploads/product.png",
        kind: "image",
        referenceIndex: 2,
        storageDir: tempDir,
        uploadImpl: async () => {
          throw new Error("network timeout");
        }
      }),
      (error) => {
        assert.equal(error.code, "VIDEO_REFERENCE_UPLOAD_FAILED");
        assert.equal(error.errorDetail.stage, "reference_upload");
        assert.equal(error.errorDetail.referenceIndex, 2);
        assert.match(error.message, /未扣除积分/);
        return true;
      }
    );
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("resolves local references shared by normal video and infinite canvas through a trusted Ark asset", async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "video-reference-"));
  const referencesDir = path.join(tempDir, "video", "references");
  await mkdir(referencesDir, { recursive: true });
  await writeFile(path.join(referencesDir, "product.png"), Buffer.from("png-bytes"));

  let createArgs;
  let waitedAssetId;
  try {
    const result = await resolveArkVideoReference({
      userId: 18,
      url: "/media/video/references/product.png",
      kind: "image",
      referenceIndex: 1,
      storageDir: tempDir,
      createLocalAssetImpl: async (args) => {
        createArgs = args;
        return { id: "trusted-asset-row-91" };
      },
      createRemoteAssetImpl: async () => {
        throw new Error("remote asset path should not be used");
      },
      waitForAssetReferenceImpl: async (assetId) => {
        waitedAssetId = assetId;
        return "asset://asset-20260803120000-portrait";
      }
    });

    assert.equal(result, "asset://asset-20260803120000-portrait");
    assert.equal(waitedAssetId, "trusted-asset-row-91");
    assert.equal(createArgs.feature, "video-generation-image");
    assert.equal(createArgs.localUrl, "/media/video/references/product.png");
    assert.equal(createArgs.mimeType, "image/png");
    assert.equal(createArgs.sizeBytes, Buffer.byteLength("png-bytes"));
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("imports a remote Ark video reference into the trusted asset library", async () => {
  let createArgs;
  const result = await resolveArkVideoReference({
    userId: 27,
    url: "https://cdn.example.com/uploads/portrait.webp?token=temporary",
    kind: "image",
    referenceIndex: 2,
    createRemoteAssetImpl: async (args) => {
      createArgs = args;
      return { id: "trusted-remote-row-7" };
    },
    waitForAssetReferenceImpl: async (assetId) => {
      assert.equal(assetId, "trusted-remote-row-7");
      return "asset://asset-20260803120500-remote";
    }
  });

  assert.equal(result, "asset://asset-20260803120500-remote");
  assert.equal(createArgs.feature, "video-generation-image");
  assert.equal(createArgs.originalName, "portrait.webp");
  assert.equal(createArgs.mimeType, "image/webp");
});

test("keeps an existing trusted Ark asset reference unchanged", async () => {
  let createCalls = 0;
  const result = await resolveArkVideoReference({
    userId: 27,
    url: "asset://asset-20260803121000-existing",
    kind: "image",
    referenceIndex: 1,
    createLocalAssetImpl: async () => {
      createCalls += 1;
    },
    createRemoteAssetImpl: async () => {
      createCalls += 1;
    }
  });

  assert.equal(result, "asset://asset-20260803121000-existing");
  assert.equal(createCalls, 0);
});

test("rejects a local-only fallback instead of bypassing the trusted Ark asset library", async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "video-reference-"));
  const referencesDir = path.join(tempDir, "video", "references");
  await mkdir(referencesDir, { recursive: true });
  await writeFile(path.join(referencesDir, "portrait.jpg"), Buffer.from("jpg-bytes"));

  try {
    await assert.rejects(
      resolveArkVideoReference({
        userId: 18,
        url: "/media/video/references/portrait.jpg",
        kind: "image",
        referenceIndex: 1,
        storageDir: tempDir,
        createLocalAssetImpl: async () => ({ id: "local-only-row" }),
        waitForAssetReferenceImpl: async () => "https://public.example.com/media/portrait.jpg"
      }),
      (error) => {
        assert.equal(error.code, "VIDEO_REFERENCE_UPLOAD_FAILED");
        assert.equal(error.errorDetail.stage, "reference_asset");
        assert.equal(error.errorDetail.referenceIndex, 1);
        return true;
      }
    );
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("returns an explicit no-charge error when trusted Ark asset creation fails", async () => {
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
        createLocalAssetImpl: async () => {
          throw new Error("network timeout");
        }
      }),
      (error) => {
        assert.equal(error.code, "VIDEO_REFERENCE_UPLOAD_FAILED");
        assert.equal(error.errorDetail.stage, "reference_asset");
        assert.equal(error.errorDetail.referenceIndex, 2);
        assert.match(error.message, /未扣除积分/);
        return true;
      }
    );
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("keeps KIE video models on the temporary upload path", async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "video-reference-"));
  const referencesDir = path.join(tempDir, "video", "references");
  await mkdir(referencesDir, { recursive: true });
  await writeFile(path.join(referencesDir, "product.png"), Buffer.from("png-bytes"));

  let uploadArgs;
  try {
    const result = await resolveKieVideoReference({
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
      resolveKieVideoReference({
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
        assert.equal(error.errorDetail.stage, "reference_upload");
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
