import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import {
  buildSeedanceDigitalHumanPrompt,
  getSeedanceDurationSeconds,
  isUserAvatarAsset,
  mapVirtualAssetToAvatar,
  parseDigitalHumanVideoSpec,
  resolveAiAvatarPreviewSource
} from "./digitalHuman.service.js";

test("parses every frontend digital-human video spec for Seedance", () => {
  assert.deepEqual(parseDigitalHumanVideoSpec("9:16-720p-30"), {
    videoSpec: "9:16-720p-30",
    ratio: "9:16",
    resolution: "720p",
    fps: 30
  });
  assert.deepEqual(parseDigitalHumanVideoSpec("16:9-720p-30"), {
    videoSpec: "16:9-720p-30",
    ratio: "16:9",
    resolution: "720p",
    fps: 30
  });
  assert.deepEqual(parseDigitalHumanVideoSpec("1:1-720p-30"), {
    videoSpec: "1:1-720p-30",
    ratio: "1:1",
    resolution: "720p",
    fps: 30
  });
});

test("rejects a video spec that is not exposed by the frontend", () => {
  assert.throws(
    () => parseDigitalHumanVideoSpec("4:3-1080p-60"),
    /成片规格无效/
  );
});

test("builds a role-aware prompt with explicit scene adaptation", () => {
  const prompt = buildSeedanceDigitalHumanPrompt({
    avatarName: "企业商务形象",
    avatarDescription: "适合企业宣讲和产品介绍",
    performance: "沉稳自信，轻微点头，双手动作自然",
    emotion: "calm",
    speed: 0.9,
    ratio: "16:9",
    resolution: "720p",
    fps: 30,
    hasSceneReference: true
  });

  assert.match(prompt, /角色定位：企业商务形象；适合企业宣讲和产品介绍/);
  assert.match(prompt, /角色表现：沉稳自信，轻微点头，双手动作自然/);
  assert.match(prompt, /图片2是用户上传的最终场景参考图/);
  assert.match(prompt, /透视比例、景深、色温、主光方向和阴影/);
  assert.match(prompt, /成片规格：16:9，720p，目标 30FPS/);
  assert.match(prompt, /在音频结束时结束/);
});

test("does not claim there is a scene reference when none was uploaded", () => {
  const prompt = buildSeedanceDigitalHumanPrompt({
    avatarName: "知识科普员",
    ratio: "9:16",
    resolution: "720p",
    fps: 30,
    hasSceneReference: false
  });

  assert.match(prompt, /没有提供额外场景图/);
  assert.match(prompt, /不要声称存在第二张场景参考图/);
  assert.doesNotMatch(prompt, /图片2是用户上传的最终场景参考图/);
});

test("uses the avatar default scene as image 2 when the user uploads no scene", () => {
  const prompt = buildSeedanceDigitalHumanPrompt({
    avatarName: "时尚类女主播",
    ratio: "9:16",
    resolution: "720p",
    fps: 30,
    hasSceneReference: true,
    sceneReferenceType: "default"
  });

  assert.match(prompt, /图片2是所选数字人自带的默认场景图/);
  assert.match(prompt, /必须把图片1中的数字人自然放入图片2的场景中/);
  assert.doesNotMatch(prompt, /用户上传的最终场景参考图/);
});

test("uses the actual rounded-up audio length instead of duration buckets", () => {
  assert.equal(getSeedanceDurationSeconds(2_001), 3);
  assert.equal(getSeedanceDurationSeconds(5_001), 6);
  assert.equal(getSeedanceDurationSeconds(10_001), 11);
  assert.equal(getSeedanceDurationSeconds(14_999), 15);
});

test("resolves a recovered AI avatar media URL to its local storage file", () => {
  const source = resolveAiAvatarPreviewSource(
    "/media/generated/images/53/result-1.png"
  );

  assert.equal(source.kind, "local");
  assert.equal(source.mimeType, "image/png");
  assert.ok(
    source.filePath.endsWith(
      path.join("generated", "images", "53", "result-1.png")
    )
  );
});

test("keeps external AI avatar previews on the remote download path", () => {
  assert.deepEqual(
    resolveAiAvatarPreviewSource("https://example.com/avatar.webp"),
    {
      kind: "remote",
      url: "https://example.com/avatar.webp"
    }
  );
});

test("rejects an invalid AI avatar preview URL with a clear provider error", () => {
  assert.throws(
    () => resolveAiAvatarPreviewSource("generated/avatar.png"),
    (error) =>
      error?.status === 502 &&
      error?.message === "generated avatar URL is invalid"
  );
});

test("keeps both uploaded and AI-generated images in the user avatar library", () => {
  assert.equal(isUserAvatarAsset({ assetType: "Image", localUrl: "/media/digital-human/avatars/upload.jpg" }), true);
  assert.equal(isUserAvatarAsset({ assetType: "Image", localUrl: "/media/digital-human/avatars/ai/generated.png" }), true);
  assert.equal(isUserAvatarAsset({ assetType: "Audio", localUrl: "/media/digital-human/audio/test.mp3" }), false);
});

test("restores persisted settings for an uploaded avatar", () => {
  const avatar = mapVirtualAssetToAvatar({
    id: "43",
    assetType: "Image",
    localUrl: "/media/digital-human/avatars/upload.jpg",
    fileName: "upload.jpg",
    status: "active",
    metadata: {
      source: "upload",
      name: "商务讲解员",
      description: "企业服务场景数字人",
      performance: "沉稳自信，自然口播",
      scene: "企业服务",
      defaultVoiceId: "female-shaonv",
      defaultVoiceSpeed: 1.2,
      defaultVoiceEmotion: "开心"
    }
  });

  assert.equal(avatar.id, "ark-asset-43");
  assert.equal(avatar.name, "商务讲解员");
  assert.equal(avatar.source, "upload");
  assert.equal(avatar.scene, "企业服务");
  assert.equal(avatar.performance, "沉稳自信，自然口播");
  assert.equal(avatar.defaultVoiceId, "female-shaonv");
  assert.equal(avatar.defaultVoiceSpeed, 1.2);
  assert.equal(avatar.defaultVoiceEmotion, "开心");
});
