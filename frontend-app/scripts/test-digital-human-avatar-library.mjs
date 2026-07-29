import assert from "node:assert/strict";
import test from "node:test";
import { getDigitalHumanMineLibraryItems } from "../src/features/digital-human-v2/utils.js";

test("shows uploaded and AI custom avatars in the mine library", () => {
  const items = getDigitalHumanMineLibraryItems([
    {
      id: "ark-asset-43",
      name: "本地上传形象",
      source: "upload",
      avatarType: "upload",
      status: "ready",
      createdAt: "2026-07-29 18:29:17"
    },
    {
      id: "ark-asset-39",
      name: "AI Custom Avatar",
      source: "ai-custom",
      avatarType: "ai-custom",
      status: "ready",
      createdAt: "2026-07-29 18:10:54"
    }
  ]);

  assert.deepEqual(
    items.map((item) => item.id),
    ["ark-asset-43", "ark-asset-39"]
  );
  assert.ok(items.every((item) => item.sourceType === "avatar"));
});
