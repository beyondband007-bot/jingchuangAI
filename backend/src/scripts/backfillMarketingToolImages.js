import { getPool } from "../db/pool.js";
import { persistGeneratedImages } from "../shared/generatedImageStorage.js";

const definitions = [
  { table: "watermark_tasks", feature: "watermark-images" },
  { table: "remove_bg_tasks", feature: "remove-bg-images" },
  { table: "enhance_tasks", feature: "enhance-images", where: "AND media_type = 'image'" }
];
const limit = Math.max(1, Math.min(1000, Number(process.env.MARKETING_IMAGE_BACKFILL_LIMIT || 500)));

function isLocal(url) {
  return String(url || "").startsWith("/media/");
}

async function backfillDefinition(pool, definition) {
  const [rows] = await pool.query(
    `SELECT id, result_url, thumbnail_url FROM ${definition.table}
     WHERE status = 'completed' AND result_url IS NOT NULL AND result_url <> '' ${definition.where || ""}
     ORDER BY id ASC LIMIT ?`,
    [limit]
  );
  let saved = 0;
  let skipped = 0;
  let failed = 0;
  for (const row of rows) {
    if (isLocal(row.result_url)) {
      if (!isLocal(row.thumbnail_url)) {
        const thumbnailUrl = row.result_url.replace(/\/result-1\.[^/]+$/, "/thumbnail-1.jpg");
        await pool.query(`UPDATE ${definition.table} SET thumbnail_url = ? WHERE id = ?`, [thumbnailUrl, row.id]);
        saved += 1;
      }
      skipped += 1;
      continue;
    }
    try {
      const [localUrl] = await persistGeneratedImages({
        taskId: row.id,
        feature: definition.feature,
        urls: [row.result_url],
        attempts: 2,
        timeoutMs: 120_000
      });
      const thumbnailUrl = localUrl.replace(/\/result-1\.[^/]+$/, "/thumbnail-1.jpg");
      await pool.query(`UPDATE ${definition.table} SET result_url = ?, thumbnail_url = ? WHERE id = ?`, [localUrl, thumbnailUrl, row.id]);
      saved += 1;
    } catch (error) {
      failed += 1;
      console.warn(`${definition.table} task ${row.id} not migrated: ${error.message}`);
    }
  }
  return { table: definition.table, candidates: rows.length, saved, skipped, failed };
}

async function main() {
  const pool = getPool();
  const results = [];
  for (const definition of definitions) results.push(await backfillDefinition(pool, definition));
  console.log(JSON.stringify(results));
  await pool.end();
}

main().catch(async (error) => {
  console.error(`Marketing image backfill failed: ${error.message}`);
  await getPool().end().catch(() => {});
  process.exit(1);
});
