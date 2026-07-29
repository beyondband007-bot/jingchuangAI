import assert from "node:assert/strict";
import test from "node:test";
import {
  createVirtualAssetFromRemoteUrl,
  shouldCreateLocalOnlyVirtualAsset,
  shouldFallbackToLocalVirtualAsset
} from "./arkVirtualAssets.service.js";

test("honors localOnly even when Ark credentials are configured", () => {
  assert.equal(shouldCreateLocalOnlyVirtualAsset(true, true), true);
  assert.equal(shouldCreateLocalOnlyVirtualAsset(false, true), false);
  assert.equal(shouldCreateLocalOnlyVirtualAsset(false, false), true);
});

test("remote virtual assets never reference the localOnly option", async () => {
  await assert.rejects(
    createVirtualAssetFromRemoteUrl({
      userId: 1,
      url: "not-a-remote-url",
      originalName: "avatar.png",
      mimeType: "image/png"
    }),
    (error) => {
      assert.notEqual(error?.name, "ReferenceError");
      assert.doesNotMatch(String(error?.message || ""), /localOnly/);
      return true;
    }
  );
});

test("falls back to a local asset when configured public media is unreachable", () => {
  assert.equal(
    shouldFallbackToLocalVirtualAsset({
      status: 502,
      message: "图片公网地址无法访问：https://example.com/media/avatar.png"
    }),
    true
  );
});

test("keeps unrelated Ark errors visible instead of silently degrading", () => {
  assert.equal(
    shouldFallbackToLocalVirtualAsset({
      status: 403,
      message: "Ark credentials are invalid"
    }),
    false
  );
});
