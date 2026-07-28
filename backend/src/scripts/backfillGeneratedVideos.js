import { getPool } from "../db/pool.js";
import { setVideoTaskCompleted } from "../modules/video/video.repository.js";
import {
  extractArkVideoGenerationResult,
  getArkVideoGenerationTask,
  mapArkVideoGenerationState
} from "../providers/volcengine/videoGeneration.js";
import { persistGeneratedVideos } from "../shared/generatedVideoStorage.js";

const days = Math.max(1, Math.min(30, Number(process.env.VIDEO_BACKFILL_DAYS || 7)));
const concurrency = Math.max(1, Math.min(4, Number(process.env.VIDEO_BACKFILL_CONCURRENCY || 2)));
const timeoutMs = Math.max(
  30_000,
  Math.min(600_000, Number(process.env.VIDEO_BACKFILL_TIMEOUT_MS || 240_000))
);

function parseUrls(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function isLocalMediaUrl(url) {
  return String(url || "").startsWith("/media/");
}

async function backfill() {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT id, provider_task_id, result_urls, provider_result_urls
     FROM video_generation_tasks
     WHERE status = 'completed'
       AND result_urls IS NOT NULL
       AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
     ORDER BY created_at ASC, id ASC`,
    [days]
  );

  let cursor = 0;
  let saved = 0;
  let skipped = 0;
  let failed = 0;

  async function worker() {
    while (cursor < rows.length) {
      const row = rows[cursor];
      cursor += 1;
      const displayedUrls = parseUrls(row.result_urls);
      if (displayedUrls.length && displayedUrls.every(isLocalMediaUrl)) {
        skipped += 1;
        continue;
      }
      const savedProviderUrls = parseUrls(row.provider_result_urls);
      let providerUrls = savedProviderUrls.length ? savedProviderUrls : displayedUrls;

      if (row.provider_task_id) {
        try {
          const record = await getArkVideoGenerationTask({ taskId: row.provider_task_id });
          if (mapArkVideoGenerationState(record) === "completed") {
            const freshUrl = extractArkVideoGenerationResult(record).resultUrl;
            if (freshUrl) providerUrls = [freshUrl];
          }
        } catch (error) {
          console.warn(`Could not refresh provider URL for video task ${row.id}: ${error.message}`);
        }
      }
      if (!providerUrls.length) {
        skipped += 1;
        continue;
      }

      try {
        const localUrls = await persistGeneratedVideos({
          taskId: row.id,
          urls: providerUrls,
          attempts: 2,
          timeoutMs
        });
        await setVideoTaskCompleted(row.id, localUrls, { providerUrls });
        saved += 1;
        console.log(`Backfilled video task ${row.id}`);
      } catch (error) {
        failed += 1;
        console.warn(`Could not backfill video task ${row.id}: ${error.message}`);
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  console.log(JSON.stringify({ candidates: rows.length, saved, skipped, failed, days }));
}

backfill()
  .then(async () => {
    await getPool().end();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error(`Video backfill failed: ${error.message}`);
    await getPool().end().catch(() => {});
    process.exit(1);
  });
