// 生成数字人三视图+特写参考图样例(主播对话)
// 直接调用 KIE 接口,绕过后端鉴权/积分层
import { readFile, writeFile } from "fs/promises";
import path from "path";

const ROOT = "D:/AI工作台";
const ENV_PATH = `${ROOT}/.env`;

// 解析 .env
const envText = await readFile(ENV_PATH, "utf8");
const env = {};
for (const line of envText.split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "").trim();
}
const KIE_KEY = env.KIE_API_KEY;
const KIE_BASE = (env.KIE_API_BASE_URL || "https://api.kie.ai").replace(/\/$/, "");
const KIE_UPLOAD_BASE = (env.KIE_FILE_UPLOAD_BASE_URL || "https://kieai.redpandaai.co").replace(/\/$/, "");

if (!KIE_KEY) { console.error("KIE_API_KEY missing in .env"); process.exit(1); }
console.log("KIE base:", KIE_BASE, "| upload base:", KIE_UPLOAD_BASE);

const authHeaders = { Authorization: `Bearer ${KIE_KEY}` };

// 1) 上传参考帧
const refPath = `${ROOT}/tmp_dh_frames/sample_01.png`;
const refBytes = await readFile(refPath);
const fd = new FormData();
fd.append("file", new Blob([refBytes], { type: "image/png" }), "sample_01.png");
fd.append("uploadPath", "digital-human");
fd.append("fileName", "sample_01.png");
const upRes = await fetch(`${KIE_UPLOAD_BASE}/api/file-stream-upload`, {
  method: "POST", headers: authHeaders, body: fd
});
const upJson = await upRes.json().catch(() => ({ raw: upRes.text() }));
const refUrl = upJson?.data?.fileUrl || upJson?.data?.downloadUrl || upJson?.data?.url || upJson?.data?.file_url || upJson?.url;
if (!refUrl) { console.error("upload failed:", JSON.stringify(upJson).slice(0, 500)); process.exit(1); }
console.log("reference url:", refUrl);

// 2) 建图生图任务 (gpt_image_2_i2i)
const prompt = [
  "Character design reference sheet of a digital human presenter (a professional AI news/sales host).",
  "Based on the reference photo's appearance.",
  "Four-panel flat layout on a clean pure-white background, evenly spaced:",
  "(1) front full-body view, (2) side profile full-body view, (3) back full-body view, (4) a close-up face portrait.",
  "Same person across all four panels, neutral relaxed pose, full body visible in each view,",
  "even soft studio lighting, photorealistic, high detail.",
  "No text, no labels, no captions, no watermarks, no borders."
].join(" ");

const createBody = {
  model: "gpt-image-2-image-to-image",
  input: { prompt, input_urls: [refUrl], aspect_ratio: "1:1", resolution: "2K" }
};
const createRes = await fetch(`${KIE_BASE}/api/v1/jobs/createTask`, {
  method: "POST",
  headers: { ...authHeaders, "Content-Type": "application/json" },
  body: JSON.stringify(createBody)
});
const createJson = await createRes.json().catch(() => ({}));
const taskId = createJson?.data?.taskId;
if (!taskId) { console.error("createTask failed:", JSON.stringify(createJson).slice(0, 800)); process.exit(1); }
console.log("taskId:", taskId);

// 3) 轮询
let resultUrls = [];
for (let i = 0; i < 60; i++) {
  await new Promise(r => setTimeout(r, 5000));
  const qRes = await fetch(`${KIE_BASE}/api/v1/jobs/recordInfo?taskId=${encodeURIComponent(taskId)}`, { headers: authHeaders });
  const qJson = await qRes.json().catch(() => ({}));
  const state = qJson?.data?.state || qJson?.data?.status;
  const rj = qJson?.data?.resultJson;
  console.log(`[${i*5+5}s] state=${state || "?"}`);
  if (state === "success" || state === "fail" || state === "failed") {
    if (state !== "success" && state !== "success".toUpperCase()) {
      // 失败
      if (state === "fail" || state === "failed") { console.error("task failed:", JSON.stringify(qJson).slice(0, 800)); process.exit(1); }
    }
    if (rj) {
      try {
        const p = JSON.parse(rj);
        resultUrls = p.resultUrls || (p.outputMediaUrls || []).map(x => x.mediaUrl).filter(Boolean) || p.urls || [];
      } catch {}
    }
    if (resultUrls.length) break;
    if (state === "success") { console.error("success but no urls:", JSON.stringify(qJson).slice(0, 800)); process.exit(1); }
  }
}
if (!resultUrls.length) { console.error("timed out, no result"); process.exit(1); }
console.log("result urls:", resultUrls);

// 4) 下载到桌面
const outPath = "C:/Users/Administrator/Desktop/数字人三视图_主播对话.png";
const imgRes = await fetch(resultUrls[0]);
const buf = Buffer.from(await imgRes.arrayBuffer());
await writeFile(outPath, buf);
console.log("saved:", outPath, `(${(buf.length/1024).toFixed(0)} KB)`);
