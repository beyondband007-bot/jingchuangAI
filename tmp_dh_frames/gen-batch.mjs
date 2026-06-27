// 批量生成数字人三视图+特写(14 个,主播对话已完成)
import { readFile, writeFile, mkdir } from "fs/promises";
import { execFileSync } from "child_process";

const ROOT = "D:/AI工作台";
const ENV_PATH = `${ROOT}/.env`;
const FFMPEG = `${ROOT}/backend/node_modules/@ffmpeg-installer/win32-x64/ffmpeg.exe`;
const VIDEO_DIR = `${ROOT}/frontend-app/public/assets/digital-human`;
const OUT_DIR = "C:/Users/Administrator/Desktop/数字人三视图";
const TMP_DIR = `${ROOT}/tmp_dh_frames`;
await mkdir(OUT_DIR, { recursive: true });

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
if (!KIE_KEY) { console.error("KIE_API_KEY missing"); process.exit(1); }
const authHeaders = { Authorization: `Bearer ${KIE_KEY}` };

const NAMES = [
  "时尚类女主播","知识科普类女主播"
];

const PROMPT = [
  "Character design reference sheet of a digital human avatar/presenter.",
  "Based on the reference photo's appearance and art style.",
  "Four-panel flat layout on a clean pure-white background, evenly spaced:",
  "(1) front full-body view, (2) side profile full-body view, (3) back full-body view, (4) a close-up face portrait.",
  "Same character across all four panels, neutral relaxed pose, full body visible in each view,",
  "even soft studio lighting, matching the reference photo's art style (photorealistic or stylized as in the reference).",
  "No text, no labels, no captions, no watermarks, no borders."
].join(" ");

async function uploadFrame(framePath, idx) {
  const bytes = await readFile(framePath);
  const fd = new FormData();
  fd.append("file", new Blob([bytes], { type: "image/png" }), `ref_${idx}.png`);
  fd.append("uploadPath", "digital-human");
  fd.append("fileName", `ref_${idx}.png`);
  const res = await fetch(`${KIE_UPLOAD_BASE}/api/file-stream-upload`, { method: "POST", headers: authHeaders, body: fd });
  const j = await res.json().catch(() => ({}));
  const url = j?.data?.fileUrl || j?.data?.downloadUrl || j?.data?.url || j?.data?.file_url || j?.url;
  if (!url) throw new Error("upload no url: " + JSON.stringify(j).slice(0, 300));
  return url;
}

async function createTask(refUrl) {
  const res = await fetch(`${KIE_BASE}/api/v1/jobs/createTask`, {
    method: "POST",
    headers: { ...authHeaders, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "gpt-image-2-image-to-image", input: { prompt: PROMPT, input_urls: [refUrl], aspect_ratio: "1:1", resolution: "2K" } })
  });
  const j = await res.json().catch(() => ({}));
  const taskId = j?.data?.taskId;
  if (!taskId) throw new Error("createTask no id: " + JSON.stringify(j).slice(0, 300));
  return taskId;
}

async function pollTask(taskId) {
  for (let i = 0; i < 70; i++) {
    await new Promise(r => setTimeout(r, 5000));
    const res = await fetch(`${KIE_BASE}/api/v1/jobs/recordInfo?taskId=${encodeURIComponent(taskId)}`, { headers: authHeaders });
    const j = await res.json().catch(() => ({}));
    const state = j?.data?.state || j?.data?.status;
    process.stdout.write(`[${i*5+5}s ${state||"?"}]`);
    if (state === "success" || state === "fail" || state === "failed") {
      if (state === "fail" || state === "failed") throw new Error("task failed: " + JSON.stringify(j).slice(0, 300));
      const rj = j?.data?.resultJson;
      if (rj) {
        try {
          const p = JSON.parse(rj);
          const urls = p.resultUrls || (p.outputMediaUrls || []).map(x => x.mediaUrl).filter(Boolean) || p.urls || [];
          if (urls.length) return urls[0];
        } catch {}
      }
      throw new Error("success but no url: " + JSON.stringify(j).slice(0, 300));
    }
  }
  throw new Error("timeout");
}

let ok = 0, fail = 0;
const failed = [];
for (let i = 0; i < NAMES.length; i++) {
  const name = NAMES[i];
  console.log(`\n=== [${i+1}/${NAMES.length}] ${name} ===`);
  try {
    const frame = `${TMP_DIR}/ref_${i}.png`;
    execFileSync(FFMPEG, ["-hide_banner","-loglevel","error","-y","-ss","1","-i",`${VIDEO_DIR}/${name}.mp4`,"-frames:v","1",frame]);
    console.log("frame ok");
    const refUrl = await uploadFrame(frame, i);
    console.log("uploaded:", refUrl);
    const taskId = await createTask(refUrl);
    console.log("taskId:", taskId);
    const imgUrl = await pollTask(taskId);
    console.log("\nimage url:", imgUrl);
    const buf = Buffer.from(await (await fetch(imgUrl)).arrayBuffer());
    const outPath = `${OUT_DIR}/数字人三视图_${name}.png`;
    await writeFile(outPath, buf);
    console.log(`DONE ${name} (${(buf.length/1024).toFixed(0)}KB) -> ${outPath}`);
    ok++;
  } catch (e) {
    console.error(`FAIL ${name}: ${e.message}`);
    fail++;
    failed.push(name);
  }
}
console.log(`\n=== BATCH COMPLETE: ok=${ok} fail=${fail} ===`);
if (failed.length) console.log("failed:", failed.join(", "));
