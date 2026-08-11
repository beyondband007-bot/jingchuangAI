import { mkdir } from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { getPool } from "../db/pool.js";
import { config } from "../config/index.js";
import { ffmpegPath } from "../shared/ffmpegPath.js";

const execFileAsync = promisify(execFile);
const sourcesDir = path.resolve(process.cwd(), config.media.storageDir, "replicate", "sources");
const thumbnailsDir = path.resolve(process.cwd(), config.media.storageDir, "replicate", "thumbnails");

async function main() {
  const pool = getPool();
  const [tasks] = await pool.query(
    `SELECT id, source_url FROM replicate_tasks
     WHERE source = 'image' AND source_url IS NOT NULL AND source_url <> ''
       AND (source_thumbnail_url IS NULL OR source_thumbnail_url = '')`
  );
  await mkdir(thumbnailsDir, { recursive: true });

  let saved = 0;
  let missing = 0;
  for (const task of tasks) {
    const filename = path.basename(task.source_url);
    const sourcePath = path.join(sourcesDir, filename);
    const thumbnailName = `${task.id}.jpg`;
    const thumbnailPath = path.join(thumbnailsDir, thumbnailName);
    try {
      await execFileAsync(ffmpegPath, [
        "-y", "-i", sourcePath, "-frames:v", "1",
        "-vf", "scale='min(420,iw)':-2", "-q:v", "2", thumbnailPath
      ]);
      await pool.query(
        "UPDATE replicate_tasks SET source_thumbnail_url = ? WHERE id = ?",
        [`/media/replicate/thumbnails/${thumbnailName}`, task.id]
      );
      saved += 1;
    } catch (error) {
      missing += 1;
      console.warn(`replicate task ${task.id} skipped: ${error.message}`);
    }
  }
  console.log(JSON.stringify({ candidates: tasks.length, saved, missing }));
  await pool.end();
}

main().catch(async (error) => {
  console.error(`Replicate thumbnail backfill failed: ${error.message}`);
  await getPool().end().catch(() => {});
  process.exit(1);
});
