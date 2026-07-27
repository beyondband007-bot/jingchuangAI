const strictEditInstructions = [
  "严格编辑视频1。",
  "将视频1中唯一出镜人物的面部身份替换为图片1中的人物；图片1仅用于锁定人物身份和面部特征。",
  "从第一帧到最后一帧保持图片1的人脸身份一致、清晰、自然，不发生身份漂移。",
  "除面部身份外，完整保留视频1的身体、发型、服装、动作、表情节奏、背景、镜头、光照、画面构图和时间轴，不重新设计场景，不新增人物。",
  "完整保留视频1的原始音轨，包括原始台词、音色、语速、背景声和音乐；不要生成新台词、配音、音乐、字幕或水印。"
].join("\n");

export function buildFaceSwapPrompt(extraPrompt = "") {
  const extra = String(extraPrompt || "").trim();
  return extra ? `${strictEditInstructions}\n补充要求：${extra}` : strictEditInstructions;
}

