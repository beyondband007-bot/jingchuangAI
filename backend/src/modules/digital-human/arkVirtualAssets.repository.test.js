import assert from "node:assert/strict";
import test from "node:test";
import { findReusableArkVirtualAsset } from "./arkVirtualAssets.repository.js";

async function captureReusableQuery(providerKind) {
  let capturedSql = "";
  const result = await findReusableArkVirtualAsset({
    userId: 43,
    feature: "video-generation-image",
    assetType: "Image",
    sourceHash: "test-hash",
    projectName: "jingchuang",
    providerKind,
    pool: {
      async query(sql) {
        capturedSql = sql;
        return [[], []];
      }
    }
  });
  return { capturedSql, result };
}

test("real Ark asset lookup excludes cached local-only fallbacks", async () => {
  const { capturedSql, result } = await captureReusableQuery("ark");
  assert.equal(result, null);
  assert.match(capturedSql, /provider_asset_id NOT LIKE 'local-%'/);
});

test("local-only lookup cannot reuse a real Ark asset row", async () => {
  const { capturedSql } = await captureReusableQuery("local");
  assert.match(capturedSql, /provider_asset_id LIKE 'local-%'/);
  assert.doesNotMatch(capturedSql, /provider_asset_id NOT LIKE/);
});
