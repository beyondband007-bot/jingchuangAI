import { getPool } from "../db/pool.js";
import { setImageTaskCompleted } from "../modules/image/image.repository.js";
import { persistGeneratedImages } from "../shared/generatedImageStorage.js";

const days = Math.max(1, Math.min(30, Number(process.env.IMAGE_BACKFILL_DAYS || 14)));
const concurrency = Math.max(1, Math.min(8, Number(process.env.IMAGE_BACKFILL_CONCURRENCY || 4)));
const timeoutMs = Math.max(
  10_000,
  Math.min(300_000, Number(process.env.IMAGE_BACKFILL_TIMEOUT_MS || 180_000))
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
    `SELECT id, result_urls, provider_result_urls
     FROM image_generation_tasks
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
      const providerUrls = savedProviderUrls.length ? savedProviderUrls : displayedUrls;
      if (!providerUrls.length) {
        skipped += 1;
        continue;
      }

      try {
        const localUrls = await persistGeneratedImages({
          taskId: row.id,
          urls: providerUrls,
          attempts: 2,
          timeoutMs
        });
        await setImageTaskCompleted(row.id, localUrls, { providerUrls });
        saved += 1;
        if (saved % 25 === 0) console.log(`Backfilled ${saved} image task(s)`);
      } catch (error) {
        failed += 1;
        console.warn(`Could not backfill image task ${row.id}: ${error.message}`);
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
    console.error(`Image backfill failed: ${error.message}`);
    await getPool().end().catch(() => {});
    process.exit(1);
  });
