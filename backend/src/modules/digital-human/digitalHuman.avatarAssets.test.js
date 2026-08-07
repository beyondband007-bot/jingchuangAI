import assert from "node:assert/strict";
import { access } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { publicAvatars } from "./digitalHuman.data.js";
import { getAvatarIdentityAssetPath } from "./digitalHuman.service.js";

const publicAssetsDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../../frontend-app/public",
);
const expectedViewTypes = ["front", "side", "back", "face"];

test("official digital humans have complete and unique reference media", async () => {
  assert.equal(publicAvatars.length, 15);
  assert.equal(new Set(publicAvatars.map((avatar) => avatar.id)).size, 15);
  assert.equal(new Set(publicAvatars.map((avatar) => avatar.name)).size, 15);
  assert.deepEqual(
    publicAvatars.map((avatar) => avatar.name),
    ["数字人1 清妍", "数字人2 晚晴", "数字人3 知夏", "数字人4 念安", "数字人5 若溪", "数字人6 知微", "数字人7 星澜", "数字人8 语宁", "数字人9 可昕", "数字人10 映雪", "数字人11 雅晴", "数字人12 清禾", "数字人13 婉柔", "数字人14 予安", "数字人15 书瑶"],
  );
  assert.ok(publicAvatars.every((avatar) => !/车场介绍|单车介绍/.test(JSON.stringify(avatar))));

  await Promise.all(
    publicAvatars.flatMap((avatar) => {
      assert.match(avatar.id, /^official-dh-(?:0[5-9]|1\d)$/);
      assert.match(avatar.cover, /\/preview\.mp4$/);
      assert.match(avatar.poster, /\/poster\.jpg$/);
      assert.match(avatar.referenceImage, /\/reference-front\.(?:png|jpg)$/);
      assert.deepEqual(avatar.views.map((view) => view.type), expectedViewTypes);
      assert.equal(new Set(avatar.views.map((view) => view.url)).size, 4);

      return [avatar.cover, avatar.poster, avatar.referenceImage, ...avatar.views.map((view) => view.url)].map(
        (assetPath) => access(path.resolve(publicAssetsDir, assetPath.replace(/^\//, ""))),
      );
    }),
  );
});

test("explicit front reference image takes priority over legacy three-view assets", () => {
  assert.equal(
    getAvatarIdentityAssetPath({
      referenceImage: "/assets/digital-human/official-v2/dh-05/reference-front.png",
      threeView: "/assets/digital-human/three-view/legacy-board.png",
      poster: "/assets/digital-human/official-v2/dh-05/poster.jpg",
    }),
    "/assets/digital-human/official-v2/dh-05/reference-front.png",
  );
});
