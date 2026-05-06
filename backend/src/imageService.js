import { getPool } from "./db.js";
import { createKieImageTask, extractResultUrls, getKieTask, mapKieState } from "./kieClient.js";

const DEMO_USER = "demo-user";
const ratioOptions = ["1:1", "3:4", "4:3", "9:16", "16:9"];
const qualityOptions = [
  { value: "1K", multiplier: 0.8 },
  { value: "2K", multiplier: 1 },
  { value: "4K", multiplier: 1.65 }
];
const countOptions = [1];

function displayTime(dateValue) {
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(new Date(dateValue));
}

function parseJson(value, fallback) {
  if (!value) return fallback;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function qualityMultiplier(quality) {
  return qualityOptions.find((item) => item.value === quality)?.multiplier || 1;
}

function mapTask(row) {
  const urls = parseJson(row.result_urls, []);
  return {
    id: row.id,
    model: row.display_name || row.model_key,
    modelKey: row.model_key,
    ratio: row.ratio,
    quality: row.quality,
    count: row.image_count,
    time: displayTime(row.created_at),
    price: `¥${(row.cost_points / 100).toFixed(2)}`,
    points: row.cost_points,
    prompt: row.prompt,
    image: urls[0] || null,
    grid: row.image_count > 1,
    status: row.status,
    providerTaskId: row.provider_task_id || null,
    favorite: Boolean(row.favorite),
    error: row.error_message || null
  };
}

export async function getDemoUser(connection) {
  const [rows] = await connection.query("SELECT id, external_id FROM users WHERE external_id = ? LIMIT 1", [DEMO_USER]);
  if (rows.length === 0) {
    throw new Error("demo-user not initialized. Run npm run db:init first.");
  }
  return rows[0];
}

export async function getCredits() {
  const [rows] = await getPool().query(
    `SELECT u.external_id AS userId, ca.balance
     FROM users u
     INNER JOIN credit_accounts ca ON ca.user_id = u.id
     WHERE u.external_id = ?
     LIMIT 1`,
    [DEMO_USER]
  );
  if (rows.length === 0) {
    throw new Error("demo-user not initialized. Run npm run db:init first.");
  }
  return { userId: rows[0].userId, balance: rows[0].balance };
}

export async function getModels() {
  const [models] = await getPool().query(
    `SELECT model_key AS value, display_name AS label, base_points AS basePoints
     FROM image_model_prices
     WHERE enabled = TRUE
     ORDER BY id ASC`
  );
  return {
    models,
    ratios: ratioOptions,
    qualities: qualityOptions,
    counts: countOptions
  };
}

export async function listTasks({ filter = "all" } = {}) {
  await refreshProcessingTasks();

  const params = [DEMO_USER];
  let where = "u.external_id = ?";
  if (filter === "favorite") {
    where += " AND t.favorite = TRUE";
  }

  const [rows] = await getPool().query(
    `SELECT t.*, mp.display_name
     FROM image_generation_tasks t
     INNER JOIN users u ON u.id = t.user_id
     LEFT JOIN image_model_prices mp ON mp.model_key = t.model_key
     WHERE ${where}
     ORDER BY t.created_at DESC, t.id DESC
     LIMIT 100`,
    params
  );

  return rows.map(mapTask);
}

export async function getTask(id) {
  await refreshTask(id);
  const [rows] = await getPool().query(
    `SELECT t.*, mp.display_name
     FROM image_generation_tasks t
     INNER JOIN users u ON u.id = t.user_id
     LEFT JOIN image_model_prices mp ON mp.model_key = t.model_key
     WHERE u.external_id = ? AND t.id = ?
     LIMIT 1`,
    [DEMO_USER, id]
  );
  return rows[0] ? mapTask(rows[0]) : null;
}

export async function createTask(payload) {
  const { prompt, model, ratio, quality, count = 1 } = payload;
  validatePayload({ prompt, model, ratio, quality, count });

  const pool = getPool();
  const connection = await pool.getConnection();
  let userId;
  let taskId;
  let costPoints;

  try {
    await connection.beginTransaction();
    const user = await getDemoUser(connection);
    userId = user.id;

    const [models] = await connection.query("SELECT model_key, base_points FROM image_model_prices WHERE model_key = ? AND enabled = TRUE LIMIT 1", [
      model
    ]);
    if (models.length === 0) {
      const error = new Error("model not found");
      error.status = 400;
      throw error;
    }

    costPoints = Math.ceil(models[0].base_points * qualityMultiplier(quality) * Number(count));
    const [accounts] = await connection.query("SELECT balance FROM credit_accounts WHERE user_id = ? FOR UPDATE", [user.id]);
    if (accounts.length === 0 || accounts[0].balance < costPoints) {
      const error = new Error("insufficient credits");
      error.status = 402;
      throw error;
    }

    const nextBalance = accounts[0].balance - costPoints;
    await connection.query("UPDATE credit_accounts SET balance = ? WHERE user_id = ?", [nextBalance, user.id]);

    const [result] = await connection.query(
      `INSERT INTO image_generation_tasks
       (user_id, model_key, prompt, ratio, quality, image_count, cost_points, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [user.id, model, prompt.trim(), ratio, quality, Number(count), costPoints]
    );
    taskId = result.insertId;

    await connection.query(
      `INSERT INTO credit_transactions (user_id, task_id, type, amount, balance_after, memo)
       VALUES (?, ?, 'debit', ?, ?, 'image generation debit')`,
      [user.id, taskId, -costPoints, nextBalance]
    );

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    connection.release();
    throw error;
  }

  connection.release();

  try {
    const provider = await createKieImageTask({ prompt: prompt.trim(), modelKey: model, ratio, quality });
    await pool.query("UPDATE image_generation_tasks SET status = 'processing', provider_task_id = ? WHERE id = ?", [
      provider.taskId,
      taskId
    ]);
  } catch (error) {
    await refundTask(taskId, userId, costPoints, `KIE 创建任务失败：${error.message}`);
  }

  return getTask(taskId);
}

function validatePayload({ prompt, ratio, quality, count }) {
  if (!prompt || !prompt.trim()) {
    const error = new Error("prompt is required");
    error.status = 400;
    throw error;
  }
  if (!ratioOptions.includes(ratio) || !qualityOptions.some((item) => item.value === quality) || !countOptions.includes(Number(count))) {
    const error = new Error("invalid generation options");
    error.status = 400;
    throw error;
  }
}

async function refreshProcessingTasks() {
  const [rows] = await getPool().query(
    `SELECT id FROM image_generation_tasks
     WHERE status IN ('pending', 'processing') AND provider_task_id IS NOT NULL
     ORDER BY updated_at ASC
     LIMIT 10`
  );
  await Promise.all(rows.map((row) => refreshTask(row.id)));
}

async function refreshTask(id) {
  const [rows] = await getPool().query(
    "SELECT id, provider_task_id, status FROM image_generation_tasks WHERE id = ? LIMIT 1",
    [id]
  );
  const task = rows[0];
  if (!task || !task.provider_task_id || !["pending", "processing"].includes(task.status)) return;

  try {
    const record = await getKieTask(task.provider_task_id);
    const state = record.data?.state;
    const mapped = mapKieState(state);
    if (mapped === "completed") {
      const urls = extractResultUrls(record);
      await getPool().query("UPDATE image_generation_tasks SET status = 'completed', result_urls = ? WHERE id = ?", [
        JSON.stringify(urls),
        id
      ]);
    } else if (mapped === "failed") {
      await refundTask(id, null, null, record.data?.failMsg || "KIE 任务失败");
    } else {
      await getPool().query("UPDATE image_generation_tasks SET status = 'processing' WHERE id = ?", [id]);
    }
  } catch (error) {
    await getPool().query("UPDATE image_generation_tasks SET error_message = ? WHERE id = ?", [
      `查询 KIE 状态失败：${error.message}`,
      id
    ]);
  }
}

async function refundTask(id, userIdArg, costPointsArg, message) {
  const pool = getPool();
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [tasks] = await connection.query(
      "SELECT user_id, cost_points, refunded FROM image_generation_tasks WHERE id = ? FOR UPDATE",
      [id]
    );
    if (tasks.length === 0) {
      await connection.rollback();
      return;
    }
    const userId = userIdArg || tasks[0].user_id;
    const costPoints = costPointsArg || tasks[0].cost_points;

    await connection.query("UPDATE image_generation_tasks SET status = 'failed', error_message = ? WHERE id = ?", [message, id]);

    if (!tasks[0].refunded) {
      const [accounts] = await connection.query("SELECT balance FROM credit_accounts WHERE user_id = ? FOR UPDATE", [userId]);
      const balanceAfter = accounts[0].balance + costPoints;
      await connection.query("UPDATE credit_accounts SET balance = ? WHERE user_id = ?", [balanceAfter, userId]);
      await connection.query("UPDATE image_generation_tasks SET refunded = TRUE WHERE id = ?", [id]);
      await connection.query(
        `INSERT INTO credit_transactions (user_id, task_id, type, amount, balance_after, memo)
         VALUES (?, ?, 'refund', ?, ?, ?)`,
        [userId, id, costPoints, balanceAfter, "image generation refund"]
      );
    }

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function deleteTask(id) {
  const [result] = await getPool().query(
    `DELETE t FROM image_generation_tasks t
     INNER JOIN users u ON u.id = t.user_id
     WHERE u.external_id = ? AND t.id = ?`,
    [DEMO_USER, id]
  );
  return { ok: result.affectedRows > 0 };
}

export async function toggleFavorite(id) {
  await getPool().query(
    `UPDATE image_generation_tasks t
     INNER JOIN users u ON u.id = t.user_id
     SET t.favorite = NOT t.favorite
     WHERE u.external_id = ? AND t.id = ?`,
    [DEMO_USER, id]
  );
  return getTask(id);
}
