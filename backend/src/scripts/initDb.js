import { config } from "../config/index.js";
import { getPool, getServerConnection } from "../db/pool.js";

async function createDatabaseIfNeeded() {
  const connection = await getServerConnection();
  try {
    await connection.query(
      `CREATE DATABASE IF NOT EXISTS \`${config.db.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
  } finally {
    await connection.end();
  }
}

async function createTables() {
  const pool = getPool();

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      external_id VARCHAR(64) NOT NULL UNIQUE,
      display_name VARCHAR(120) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS credit_accounts (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      user_id BIGINT UNSIGNED NOT NULL UNIQUE,
      balance INT NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_credit_accounts_user FOREIGN KEY (user_id) REFERENCES users(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS credit_transactions (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      user_id BIGINT UNSIGNED NOT NULL,
      task_id BIGINT UNSIGNED NULL,
      type ENUM('grant','debit','refund') NOT NULL,
      amount INT NOT NULL,
      balance_after INT NOT NULL,
      memo VARCHAR(255) NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_credit_transactions_user_created (user_id, created_at),
      CONSTRAINT fk_credit_transactions_user FOREIGN KEY (user_id) REFERENCES users(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS image_model_prices (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      model_key VARCHAR(80) NOT NULL UNIQUE,
      display_name VARCHAR(120) NOT NULL,
      base_points INT NOT NULL,
      enabled BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS image_generation_tasks (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      user_id BIGINT UNSIGNED NOT NULL,
      model_key VARCHAR(80) NOT NULL,
      prompt TEXT NOT NULL,
      ratio VARCHAR(20) NOT NULL,
      quality VARCHAR(20) NOT NULL,
      image_count INT NOT NULL DEFAULT 1,
      cost_points INT NOT NULL,
      status ENUM('pending','processing','completed','failed') NOT NULL DEFAULT 'pending',
      provider_task_id VARCHAR(160) NULL,
      result_urls JSON NULL,
      error_message TEXT NULL,
      refunded BOOLEAN NOT NULL DEFAULT FALSE,
      favorite BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_image_tasks_user_created (user_id, created_at),
      INDEX idx_image_tasks_status (status),
      CONSTRAINT fk_image_tasks_user FOREIGN KEY (user_id) REFERENCES users(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  const [columns] = await pool.query(
    `SELECT COLUMN_NAME
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'image_generation_tasks' AND COLUMN_NAME = 'favorite'`,
    [config.db.database]
  );
  if (columns.length === 0) {
    await pool.query("ALTER TABLE image_generation_tasks ADD COLUMN favorite BOOLEAN NOT NULL DEFAULT FALSE AFTER refunded");
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS video_model_prices (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      model_key VARCHAR(80) NOT NULL UNIQUE,
      provider_type VARCHAR(30) NOT NULL,
      provider_model VARCHAR(120) NOT NULL,
      display_name VARCHAR(120) NOT NULL,
      mode VARCHAR(40) NULL,
      price_unit ENUM('per_second','per_task') NOT NULL DEFAULT 'per_second',
      base_points INT NOT NULL,
      rmb_per_second DECIMAL(8,3) NOT NULL DEFAULT 0,
      supported_ratios JSON NOT NULL,
      supported_durations JSON NOT NULL,
      default_ratio VARCHAR(20) NOT NULL,
      default_duration INT NOT NULL,
      enabled BOOLEAN NOT NULL DEFAULT TRUE,
      sort_order INT NOT NULL DEFAULT 100,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS video_generation_tasks (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      user_id BIGINT UNSIGNED NOT NULL,
      model_key VARCHAR(80) NOT NULL,
      prompt TEXT NOT NULL,
      ratio VARCHAR(20) NOT NULL,
      duration INT NOT NULL,
      mode VARCHAR(40) NOT NULL DEFAULT 'first-frame',
      video_count INT NOT NULL DEFAULT 1,
      cost_points INT NOT NULL,
      rmb_cost DECIMAL(10,2) NULL,
      status ENUM('pending','processing','completed','failed') NOT NULL DEFAULT 'pending',
      provider_task_id VARCHAR(160) NULL,
      result_urls JSON NULL,
      error_message TEXT NULL,
      refunded BOOLEAN NOT NULL DEFAULT FALSE,
      favorite BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_video_tasks_user_created (user_id, created_at),
      INDEX idx_video_tasks_status (status),
      CONSTRAINT fk_video_tasks_user FOREIGN KEY (user_id) REFERENCES users(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS chat_model_prices (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      model_key VARCHAR(80) NOT NULL UNIQUE,
      provider_model VARCHAR(120) NOT NULL,
      display_name VARCHAR(120) NOT NULL,
      points_per_kie_credit DECIMAL(8,3) NOT NULL DEFAULT 4.000,
      reserve_points INT NOT NULL DEFAULT 1,
      enabled BOOLEAN NOT NULL DEFAULT TRUE,
      sort_order INT NOT NULL DEFAULT 100,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS chat_conversations (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      user_id BIGINT UNSIGNED NOT NULL,
      title VARCHAR(160) NOT NULL,
      model_key VARCHAR(80) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_chat_conversations_user_updated (user_id, updated_at),
      CONSTRAINT fk_chat_conversations_user FOREIGN KEY (user_id) REFERENCES users(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS chat_messages (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      conversation_id BIGINT UNSIGNED NOT NULL,
      role ENUM('system','user','assistant') NOT NULL,
      content MEDIUMTEXT NOT NULL,
      model_key VARCHAR(80) NULL,
      cost_points INT NOT NULL DEFAULT 0,
      kie_credits_consumed DECIMAL(12,4) NOT NULL DEFAULT 0,
      usage_json JSON NULL,
      status ENUM('completed','failed') NOT NULL DEFAULT 'completed',
      error_message TEXT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_chat_messages_conversation_created (conversation_id, created_at),
      CONSTRAINT fk_chat_messages_conversation FOREIGN KEY (conversation_id) REFERENCES chat_conversations(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

async function seedDemoData() {
  const pool = getPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    await connection.query(
      `INSERT INTO users (external_id, display_name)
       VALUES ('demo-user', '匿名用户')
       ON DUPLICATE KEY UPDATE display_name = VALUES(display_name)`
    );

    const [users] = await connection.query("SELECT id FROM users WHERE external_id = 'demo-user' LIMIT 1");
    const userId = users[0].id;

    const [accounts] = await connection.query("SELECT id FROM credit_accounts WHERE user_id = ? LIMIT 1", [userId]);
    if (accounts.length === 0) {
      await connection.query("INSERT INTO credit_accounts (user_id, balance) VALUES (?, ?)", [
        userId,
        config.defaultDemoCredits
      ]);
      await connection.query(
        `INSERT INTO credit_transactions (user_id, type, amount, balance_after, memo)
         VALUES (?, 'grant', ?, ?, 'demo-user initial credits')`,
        [userId, config.defaultDemoCredits, config.defaultDemoCredits]
      );
    }

    await connection.query(`
      INSERT INTO image_model_prices (model_key, display_name, base_points, enabled)
      VALUES
        ('gpt_image_2', 'GPT Image 2', 35, TRUE),
        ('four_o_image', '4o Image', 21, FALSE),
        ('nano_banana_pro', 'Nano Banana Pro', 63, TRUE),
        ('flux_2_pro', 'Flux 2 Pro', 18, TRUE),
        ('imagen_4_fast', 'Imagen 4 Fast', 14, TRUE),
        ('seedream_4_5', 'Seedream 4.5', 22, TRUE),
        ('nano_banana2', 'nano_banana2', 25, FALSE),
        ('midjourney', 'Midjourney', 35, FALSE)
      ON DUPLICATE KEY UPDATE
        display_name = VALUES(display_name),
        base_points = VALUES(base_points),
        enabled = VALUES(enabled)
    `);

    await connection.query(`
      INSERT INTO video_model_prices
        (model_key, provider_type, provider_model, display_name, mode, price_unit, base_points, rmb_per_second,
         supported_ratios, supported_durations, default_ratio, default_duration, enabled, sort_order)
      VALUES
        ('veo_3_1_fast', 'veo', 'veo3_fast', 'Veo 3.1 Fast', 'first-frame', 'per_second', 280, 2.800,
          JSON_ARRAY('16:9','9:16'), JSON_ARRAY(8), '16:9', 8, TRUE, 10),
        ('veo_3_1_quality', 'veo', 'veo3_quality', 'Veo 3.1 Quality', 'first-frame', 'per_second', 1400, 14.000,
          JSON_ARRAY('16:9','9:16'), JSON_ARRAY(8), '16:9', 8, FALSE, 20),
        ('veo_3_1_lite', 'veo', 'veo3_lite', 'Veo 3.1 Lite', 'first-frame', 'per_second', 120, 1.200,
          JSON_ARRAY('16:9','9:16'), JSON_ARRAY(8), '16:9', 8, TRUE, 30),
        ('sora_2', 'jobs', 'sora-2/text-to-video', 'Sora 2', 'first-frame', 'per_second', 11, 0.105,
          JSON_ARRAY('16:9','9:16'), JSON_ARRAY(10,15), '16:9', 10, FALSE, 40),
        ('kling_3_std', 'jobs', 'kling-3.0/video', 'Kling 3.0 Std', 'std', 'per_second', 49, 0.490,
          JSON_ARRAY('16:9','9:16','1:1'), JSON_ARRAY(3,4,5,6,8,10,15), '16:9', 6, TRUE, 50),
        ('kling_3_pro', 'jobs', 'kling-3.0/video', 'Kling 3.0 Pro', 'pro', 'per_second', 63, 0.630,
          JSON_ARRAY('16:9','9:16','1:1'), JSON_ARRAY(3,4,5,6,8,10,15), '16:9', 6, TRUE, 60),
        ('kling_3_4k', 'jobs', 'kling-3.0/video', 'Kling 3.0 4K', '4K', 'per_second', 235, 2.345,
          JSON_ARRAY('16:9','9:16','1:1'), JSON_ARRAY(3,4,5,6,8,10,15), '16:9', 6, TRUE, 70),
        ('seedance_2_0_720p', 'jobs', 'seedance/2.0-text-to-video', 'Seedance 2.0 720P', 'first-frame', 'per_second', 88, 0.875,
          JSON_ARRAY('16:9','9:16','1:1','4:3','3:4'), JSON_ARRAY(4,5,6,8,10,15), '16:9', 6, FALSE, 80),
        ('wan_2_7_720p', 'jobs', 'wan/2.7-text-to-video', 'Wan 2.7 720P', 'first-frame', 'per_second', 56, 0.560,
          JSON_ARRAY('16:9','9:16','1:1','4:3','3:4'), JSON_ARRAY(2,3,4,5,6,8,10,15), '16:9', 6, FALSE, 90)
      ON DUPLICATE KEY UPDATE
        provider_type = VALUES(provider_type),
        provider_model = VALUES(provider_model),
        display_name = VALUES(display_name),
        mode = VALUES(mode),
        price_unit = VALUES(price_unit),
        base_points = VALUES(base_points),
        rmb_per_second = VALUES(rmb_per_second),
        supported_ratios = VALUES(supported_ratios),
        supported_durations = VALUES(supported_durations),
        default_ratio = VALUES(default_ratio),
        default_duration = VALUES(default_duration),
        enabled = VALUES(enabled),
        sort_order = VALUES(sort_order)
    `);

    await connection.query(`
      INSERT INTO chat_model_prices
        (model_key, provider_model, display_name, points_per_kie_credit, reserve_points, enabled, sort_order)
      VALUES
        ('gpt-5-4', 'gpt-5-4', 'GPT 5.4', 4.000, 1, TRUE, 10),
        ('gpt-5-5', 'gpt-5-5', 'GPT 5.5', 4.000, 1, TRUE, 20),
        ('gemini-3-pro-openai', 'gemini-3-pro-openai', 'Gemini 3 Pro', 4.000, 1, TRUE, 30),
        ('claude-sonnet-4-6', 'claude-sonnet-4-6', 'Claude Sonnet 4.6', 4.000, 1, FALSE, 40),
        ('gemini-2.5-flash', 'gemini-2.5-flash', 'Gemini 2.5 Flash', 4.000, 1, FALSE, 50)
      ON DUPLICATE KEY UPDATE
        provider_model = VALUES(provider_model),
        display_name = VALUES(display_name),
        points_per_kie_credit = VALUES(points_per_kie_credit),
        reserve_points = VALUES(reserve_points),
        enabled = VALUES(enabled),
        sort_order = VALUES(sort_order)
    `);

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function initDatabase() {
  await createDatabaseIfNeeded();
  await createTables();
  await seedDemoData();
}

initDatabase()
  .then(() => {
    console.log(`Database initialized: ${config.db.database}`);
    process.exit(0);
  })
  .catch((error) => {
    console.error("Database initialization failed:");
    console.error(error.message);
    process.exit(1);
  });
