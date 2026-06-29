// 轮询已存在的 KIE 任务并下载结果(带 fetch 重试,应对网络瞬断)
import { readFile, writeFile } from "fs/promises";

const ROOT = "D:/AI工作台";
const envText = await readFile(`${ROOT}/.env`, "utf8");
const env = {};
for (const line of envText.split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "").trim();
}
const KIE_KEY = env.KIE_API_KEY;
const KIE_BASE = (env.KIE_API_BASE_URL || "https://api.kie.ai").replace(/\/$/, "");
const authHeaders = { Authorization: `Bearer ${KIE_KEY}` };

const TASK_ID = "cf7dd70c420100d1e593095f25872a21";
const OUT = "C:/Users/Administrator/Desktop/数字人三视图/数字人三视图_时尚类女主播.png";

async function fetchRetry(url, opts, tries = 5) {
  let lastErr;
  for (let i = 0; i < tries; i++) {
    try { return await fetch(url, opts); } catch (e) { lastErr = e; console.log(`  fetch retry ${i+1}/${tries}: ${e.message}`); await new Promise(r => setTimeout(r, 3000)); }
  }
  throw lastErr;
}

for (let i = 0; i < 80; i++) {
  await new Promise(r => setTimeout(r, 4000));
  let j;
  try {
    const res = await fetchRetry(`${KIE_BASE}/api/v1/jobs/recordInfo?taskId=${encodeURIComponent(TASK_ID)}`, { headers: authHeaders });
    j = await res.json().catch(() => ({}));
  } catch (e) { console.log(`[${i*4+4}s] poll error: ${e.message}`); continue; }
  const state = j?.data?.state || j?.data?.status;
  process.stdout.write(`[${i*4+4}s ${state||"?"}]`);
  if (state === "success" || state === "fail" || state === "failed") {
    if (state === "fail" || state === "failed") { console.error("\ntask failed:", JSON.stringify(j).slice(0, 400)); process.exit(1); }
    const rj = j?.data?.resultJson;
    let urls = [];
    if (rj) { try { const p = JSON.parse(rj); urls = p.resultUrls || (p.outputMediaUrls||[]).map(x=>x.mediaUrl).filter(Boolean) || p.urls || []; } catch {} }
    if (!urls.length) { console.error("\nsuccess but no url:", JSON.stringify(j).slice(0, 400)); process.exit(1); }
    console.log("\nimage url:", urls[0]);
    const buf = Buffer.from(await (await fetchRetry(urls[0])).arrayBuffer());
    await writeFile(OUT, buf);
    console.log(`saved: ${OUT} (${(buf.length/1024).toFixed(0)}KB)`);
    process.exit(0);
  }
}
console.error("timeout"); process.exit(1);
