import { getPool } from "../../db/pool.js";

const runningTaskSources = [
  {
    sourceType: "image",
    tableName: "image_generation_tasks",
    statuses: ["pending", "processing"],
    source: "image"
  },
  {
    sourceType: "infinite-canvas",
    tableName: "image_generation_tasks",
    statuses: ["pending", "processing"],
    source: "infinite-canvas"
  },
  {
    sourceType: "video",
    tableName: "video_generation_tasks",
    statuses: ["pending", "processing"],
    source: "video"
  },
  {
    sourceType: "infinite-canvas",
    tableName: "video_generation_tasks",
    statuses: ["pending", "processing"],
    source: "infinite-canvas"
  },
  { sourceType: "digital-human", tableName: "digital_human_tasks", statuses: ["pending", "processing"] },
  { sourceType: "image-digital-human", tableName: "image_digital_human_tasks", statuses: ["pending", "processing"] },
  { sourceType: "motion", tableName: "motion_transfer_tasks", statuses: ["pending", "processing"] },
  { sourceType: "face-swap", tableName: "face_swap_tasks", statuses: ["pending", "processing"] },
  { sourceType: "watermark", tableName: "watermark_tasks", statuses: ["pending", "processing"] },
  { sourceType: "remove-bg", tableName: "remove_bg_tasks", statuses: ["pending", "processing"] },
  { sourceType: "enhance", tableName: "enhance_tasks", statuses: ["pending", "processing"] },
  // Article packages are only a container. Their stored status can lag behind
  // the image jobs when a user leaves before the history view refreshes it, so
  // use the child jobs as the source of truth for the sidebar notification.
  {
    sourceType: "article",
    tableName: "image_generation_tasks",
    statuses: ["pending", "processing"],
    source: "article"
  },
  { sourceType: "music", tableName: "music_tasks", statuses: ["processing"] },
  { sourceType: "replicate", tableName: "replicate_tasks", statuses: ["processing"] },
];

export async function getRunningTaskSummary(userId) {
  const params = [];
  const statements = runningTaskSources.map(({ sourceType, tableName, statuses, source }) => {
    params.push(sourceType, userId, ...statuses);
    if (source) params.push(source);
    return `SELECT ? AS source_type, COUNT(*) AS running_count
      FROM ${tableName}
      WHERE user_id = ? AND status IN (${statuses.map(() => "?").join(",")})
      ${source ? "AND source = ?" : ""}`;
  });
  const [rows] = await getPool().query(statements.join(" UNION ALL "), params);
  return rows.filter((row) => Number(row.running_count) > 0);
}
