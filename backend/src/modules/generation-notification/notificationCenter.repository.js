import { getPool } from "../../db/pool.js";

const taskSources = [
  { table: "image_generation_tasks", type: "image", label: "图片生成" },
  { table: "video_generation_tasks", type: "video", label: "视频生成" },
  { table: "digital_human_tasks", type: "digital-human", label: "数字人视频" },
  { table: "image_digital_human_tasks", type: "image-digital-human", label: "数字人形象" },
  { table: "motion_transfer_tasks", type: "motion", label: "动作迁移" },
  { table: "face_swap_tasks", type: "face-swap", label: "人脸替换" },
  { table: "watermark_tasks", type: "watermark", label: "去水印" },
  { table: "remove_bg_tasks", type: "remove-bg", label: "智能抠图" },
  { table: "enhance_tasks", type: "enhance", label: "画质提升" },
  { table: "music_tasks", type: "music", label: "AI 音乐" },
  { table: "replicate_tasks", type: "replicate", label: "模型任务" },
];

function taskTitle(label, status) {
  return `${label}${status === "completed" ? "任务成功" : "任务失败"}`;
}

function taskContent(label, status) {
  return status === "completed"
    ? `您的${label}任务已完成，结果已保存到历史记录。`
    : `您的${label}任务未能完成；如已扣除积分，系统会按规则自动退款。`;
}

export async function synchronizeTaskNotifications(userId, pool = getPool()) {
  const rows = [];
  for (const source of taskSources) {
    const [sourceRows] = await pool.query(
      `SELECT id, status, updated_at
       FROM ${source.table}
       WHERE user_id = ? AND status IN ('completed', 'failed')
       ORDER BY updated_at DESC
       LIMIT 50`,
      [userId],
    );
    sourceRows.forEach((row) => rows.push({ ...source, ...row }));
  }

  await Promise.all(rows.map((row) => pool.query(
    `INSERT INTO notifications
      (user_id, category, event_key, title, content, result_status, target_type, target_id, created_at)
     VALUES (?, 'task', ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE updated_at = VALUES(updated_at)`,
    [
      userId,
      `task:${userId}:${row.type}:${row.id}:${row.status}`,
      taskTitle(row.label, row.status),
      taskContent(row.label, row.status),
      row.status === "completed" ? "success" : "failed",
      row.type,
      String(row.id),
      row.updated_at,
    ],
  )));

  const [orders] = await pool.query(
    `SELECT id, status, points, updated_at
     FROM payment_orders
     WHERE user_id = ? AND status IN ('PAID', 'CLOSED', 'CANCELED')
     ORDER BY updated_at DESC
     LIMIT 50`,
    [userId],
  );
  await Promise.all(orders.map((order) => {
    const success = order.status === "PAID";
    return pool.query(
      `INSERT INTO notifications
        (user_id, category, event_key, title, content, result_status, target_type, target_id, created_at)
       VALUES (?, 'task', ?, ?, ?, ?, 'payment-order', ?, ?)
       ON DUPLICATE KEY UPDATE updated_at = VALUES(updated_at)`,
      [
        userId,
        `payment:${userId}:${order.id}:${order.status}`,
        success ? "充值订单支付成功" : "充值订单未完成",
        success ? `您的充值订单已支付成功，${order.points} 积分已到账。` : "您的充值订单已关闭或取消，未扣除积分。",
        success ? "success" : "failed",
        String(order.id),
        order.updated_at,
      ],
    );
  }));
}

export async function listNotifications({ userId, category, limit = 20, offset = 0 }, pool = getPool()) {
  const params = [userId];
  let categorySql = "";
  if (category) {
    categorySql = "AND n.category = ?";
    params.push(category);
  }
  params.push(limit, offset);
  const [rows] = await pool.query(
    `SELECT n.id, n.category, n.title, n.content, n.result_status AS resultStatus,
            n.target_type AS targetType, n.target_id AS targetId, n.created_at AS createdAt,
            n.updated_at AS updatedAt, (nr.notification_id IS NOT NULL) AS isRead
     FROM notifications n
     LEFT JOIN notification_reads nr
       ON nr.notification_id = n.id AND nr.user_id = ?
     WHERE (n.user_id = ? OR n.user_id IS NULL) ${categorySql}
     ORDER BY n.created_at DESC, n.id DESC
     LIMIT ? OFFSET ?`,
    [userId, ...params],
  );
  return rows.map((row) => ({ ...row, isRead: Boolean(row.isRead) }));
}

export async function countNotifications({ userId, category, unreadOnly = false }, pool = getPool()) {
  const params = [userId, userId];
  const categorySql = category ? "AND n.category = ?" : "";
  if (category) params.push(category);
  const unreadSql = unreadOnly ? "AND nr.notification_id IS NULL" : "";
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS total
     FROM notifications n
     LEFT JOIN notification_reads nr
       ON nr.notification_id = n.id AND nr.user_id = ?
     WHERE (n.user_id = ? OR n.user_id IS NULL) ${categorySql} ${unreadSql}`,
    params,
  );
  return Number(rows[0]?.total || 0);
}

export async function markNotificationsRead({ userId, notificationIds }, pool = getPool()) {
  if (!notificationIds.length) return;
  const placeholders = notificationIds.map(() => "?").join(",");
  await pool.query(
    `INSERT INTO notification_reads (user_id, notification_id)
     SELECT ?, n.id FROM notifications n
     WHERE n.id IN (${placeholders}) AND (n.user_id = ? OR n.user_id IS NULL)
     ON DUPLICATE KEY UPDATE read_at = read_at`,
    [userId, ...notificationIds, userId],
  );
}
