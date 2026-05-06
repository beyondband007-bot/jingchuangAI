import { config } from "./config.js";
import { getPool, getServerConnection } from "./db.js";

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
        ('nano_banana2', 'nano_banana2', 25, TRUE),
        ('nano_banana_pro', 'nano_banana_pro', 35, TRUE),
        ('midjourney', 'Midjourney', 35, TRUE)
      ON DUPLICATE KEY UPDATE
        display_name = VALUES(display_name),
        base_points = VALUES(base_points),
        enabled = VALUES(enabled)
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
