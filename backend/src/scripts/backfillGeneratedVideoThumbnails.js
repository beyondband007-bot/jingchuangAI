import { getPool } from "../db/pool.js";
import { createGeneratedVideoThumbnail } from "../shared/generatedVideoStorage.js";

const definitions = [
  { table: "video_generation_tasks", feature: "videos", resultColumn: "result_urls" },
  { table: "digital_human_tasks", feature: "digital-human-videos" },
  { table: "image_digital_human_tasks", feature: "image-digital-human-videos" }
];

function firstVideoUrl(value) {
  if (!value) return "";
  if (Array.isArray(value)) return String(value[0] || "");
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? String(parsed[0] || "") : "";
  } catch {
    return String(value);
  }
}

async function backfillTable({ table, feature, resultColumn = "result_url" }) {
  const [rows] = await getPool().query(
    `SELECT id, ${resultColumn} AS result_url
     FROM ${table}
     WHERE status = 'completed'
       AND ${resultColumn} IS NOT NULL
       AND ${resultColumn} <> ''
       AND (thumbnail_url IS NULL OR thumbnail_url = '')
     ORDER BY id ASC`
  );

  let saved = 0;
  let failed = 0;
  for (const row of rows) {
    try {
      const videoUrl = firstVideoUrl(row.result_url);
      if (!videoUrl) throw new Error("result video URL is missing");
      const thumbnailUrl = await createGeneratedVideoThumbnail({
        taskId: row.id,
        feature,
        videoUrl
      });
      await getPool().query(`UPDATE ${table} SET thumbnail_url = ? WHERE id = ?`, [thumbnailUrl, row.id]);
      saved += 1;
    } catch (error) {
      failed += 1;
      console.warn(`Could not create thumbnail for ${table} task ${row.id}: ${error.message}`);
    }
  }
  return { table, candidates: rows.length, saved, failed };
}

async function main() {
  const results = [];
  for (const definition of definitions) results.push(await backfillTable(definition));
  console.log(JSON.stringify(results));
}

main()
  .then(async () => {
    await getPool().end();
  })
  .catch(async (error) => {
    console.error(`Video thumbnail backfill failed: ${error.message}`);
    await getPool().end().catch(() => {});
    process.exitCode = 1;
  });
