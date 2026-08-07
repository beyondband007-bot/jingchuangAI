import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
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

test("official fallback data preserves the verified 15-person reference mapping", async () => {
  const source = await readFile(new URL("../src/data/faceminiData.js", import.meta.url), "utf8");
  const definitionBlock = source.match(
    /const officialDigitalHumanDefinitions = \[([\s\S]*?)\n\];\n\nfunction getOfficialDigitalHumanAssetDirectory/,
  )?.[1];

  assert.ok(definitionBlock, "official digital-human fallback definition is present");
  assert.equal((definitionBlock.match(/\["dh-(?:0[5-9]|1\d)"/g) || []).length, 15);
  assert.doesNotMatch(definitionBlock, /车场介绍|单车介绍/);
  assert.match(definitionBlock, /"数字人1 清妍"/);
  assert.match(definitionBlock, /"数字人15 书瑶"/);
  assert.match(source, /avatarId: `official-\$\{avatarId\}`/);
  assert.match(source, /referenceImage: `\$\{assetDirectory\}\/reference-front\.\$\{referenceExtension\}`/);
  assert.match(source, /type: "front"[\s\S]*type: "side"[\s\S]*type: "back"[\s\S]*type: "face"/);
});

test("avatar confirmation modal keeps voice selection outside and renders a two-by-two view board", async () => {
  const source = await readFile(
    new URL("../src/features/digital-human-v2/components/AvatarConfirmOverlay.jsx", import.meta.url),
    "utf8",
  );

  assert.doesNotMatch(source, /VoicePickerPanel|digitalHumanApi|onVoiceIdChange|previewVoice/);
  assert.match(source, /<video[\s\S]*?controls/);
  assert.match(source, /dhv2-avatar-confirm__views-grid/);
  assert.match(source, /REQUIRED_VIEW_TYPES = \["front", "side", "back", "face"\]/);
  assert.match(source, /aria-label="关闭形象确认"/);

  const avatarCardSource = await readFile(
    new URL("../src/features/digital-human-v2/components/AvatarCard.jsx", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(avatarCardSource, /dhv2-avatar-card__tag/);
});
