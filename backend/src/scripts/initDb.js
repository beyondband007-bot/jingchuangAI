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
      username VARCHAR(64) NULL,
      phone VARCHAR(20) NULL UNIQUE,
      email VARCHAR(254) NULL UNIQUE,
      password_hash VARCHAR(255) NULL,
      display_name VARCHAR(120) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  const [userColumns] = await pool.query(
    `SELECT COLUMN_NAME
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users'`,
    [config.db.database]
  );
  const userColumnNames = new Set(userColumns.map((column) => column.COLUMN_NAME));
  if (!userColumnNames.has("username")) {
    await pool.query("ALTER TABLE users ADD COLUMN username VARCHAR(64) NULL AFTER external_id");
  }
  if (!userColumnNames.has("phone")) {
    await pool.query("ALTER TABLE users ADD COLUMN phone VARCHAR(20) NULL AFTER username");
  }
  if (!userColumnNames.has("email")) {
    await pool.query("ALTER TABLE users ADD COLUMN email VARCHAR(254) NULL AFTER phone");
  }
  if (!userColumnNames.has("password_hash")) {
    await pool.query("ALTER TABLE users ADD COLUMN password_hash VARCHAR(255) NULL AFTER email");
  }

  const [usernameIndexes] = await pool.query(
    `SELECT INDEX_NAME
     FROM INFORMATION_SCHEMA.STATISTICS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = 'username' AND NON_UNIQUE = 0`,
    [config.db.database]
  );
  if (usernameIndexes.length === 0) {
    await pool.query("ALTER TABLE users ADD UNIQUE INDEX uq_users_username (username)");
  }

  const [phoneIndexes] = await pool.query(
    `SELECT INDEX_NAME
     FROM INFORMATION_SCHEMA.STATISTICS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = 'phone' AND NON_UNIQUE = 0`,
    [config.db.database]
  );
  if (phoneIndexes.length === 0) {
    await pool.query("ALTER TABLE users ADD UNIQUE INDEX uq_users_phone (phone)");
  }

  const [emailIndexes] = await pool.query(
    `SELECT INDEX_NAME
     FROM INFORMATION_SCHEMA.STATISTICS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = 'email' AND NON_UNIQUE = 0`,
    [config.db.database]
  );
  if (emailIndexes.length === 0) {
    await pool.query("ALTER TABLE users ADD UNIQUE INDEX uq_users_email (email)");
  }

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
      type ENUM('grant','debit','refund','recharge') NOT NULL,
      amount INT NOT NULL,
      balance_after INT NOT NULL,
      memo VARCHAR(255) NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_credit_transactions_user_created (user_id, created_at),
      CONSTRAINT fk_credit_transactions_user FOREIGN KEY (user_id) REFERENCES users(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  const [creditTransactionTypeColumns] = await pool.query(
    `SELECT COLUMN_TYPE
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'credit_transactions' AND COLUMN_NAME = 'type'
     LIMIT 1`,
    [config.db.database]
  );
  if (creditTransactionTypeColumns.length && !String(creditTransactionTypeColumns[0].COLUMN_TYPE).includes("'recharge'")) {
    await pool.query("ALTER TABLE credit_transactions MODIFY COLUMN type ENUM('grant','debit','refund','recharge') NOT NULL");
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS auth_sessions (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      user_id BIGINT UNSIGNED NOT NULL,
      token_hash CHAR(64) NOT NULL UNIQUE,
      expires_at DATETIME NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      last_seen_at TIMESTAMP NULL,
      INDEX idx_auth_sessions_user (user_id),
      INDEX idx_auth_sessions_expires (expires_at),
      CONSTRAINT fk_auth_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS auth_verification_codes (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      channel ENUM('sms') NOT NULL DEFAULT 'sms',
      scene ENUM('register','login','password_reset') NOT NULL,
      target VARCHAR(64) NOT NULL,
      code_hash CHAR(64) NOT NULL,
      salt VARCHAR(64) NOT NULL,
      expires_at DATETIME NOT NULL,
      sent_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      attempts INT NOT NULL DEFAULT 0,
      consumed_at DATETIME NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_auth_verification_lookup (channel, scene, target, consumed_at, expires_at),
      INDEX idx_auth_verification_sent (channel, scene, target, sent_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_security_questions (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      user_id BIGINT UNSIGNED NOT NULL,
      question_key VARCHAR(80) NOT NULL,
      answer_hash VARCHAR(255) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_user_security_question (user_id, question_key),
      INDEX idx_user_security_questions_user (user_id),
      CONSTRAINT fk_user_security_questions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS payment_orders (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      user_id BIGINT UNSIGNED NOT NULL,
      out_trade_no VARCHAR(64) NOT NULL UNIQUE,
      provider VARCHAR(32) NOT NULL,
      subject VARCHAR(255) NOT NULL,
      total_amount DECIMAL(10, 2) NOT NULL,
      points INT NOT NULL,
      status VARCHAR(32) NOT NULL DEFAULT 'CREATED',
      status_message VARCHAR(255) NULL,
      client_token_hash CHAR(64) NULL,
      qr_code VARCHAR(1024) NULL,
      qr_code_data_url MEDIUMTEXT NULL,
      alipay_trade_no VARCHAR(64) NULL,
      alipay_trade_status VARCHAR(32) NULL,
      paid_at DATETIME NULL,
      canceled_at DATETIME NULL,
      closed_at DATETIME NULL,
      last_checked_at DATETIME NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_payment_orders_user_created (user_id, created_at),
      INDEX idx_payment_orders_provider (provider),
      INDEX idx_payment_orders_status (status),
      INDEX idx_payment_orders_created_at (created_at),
      CONSTRAINT fk_payment_orders_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS payment_events (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      order_id BIGINT UNSIGNED NOT NULL,
      event_type VARCHAR(64) NOT NULL,
      provider VARCHAR(32) NOT NULL,
      payload_json JSON NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_payment_events_order_id (order_id),
      INDEX idx_payment_events_event_type (event_type),
      INDEX idx_payment_events_created_at (created_at),
      CONSTRAINT fk_payment_events_order FOREIGN KEY (order_id) REFERENCES payment_orders(id) ON DELETE CASCADE
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
      source VARCHAR(40) NOT NULL DEFAULT 'image',
      model_key VARCHAR(80) NOT NULL,
      prompt TEXT NOT NULL,
      ratio VARCHAR(20) NOT NULL,
      quality VARCHAR(20) NOT NULL,
      image_count INT NOT NULL DEFAULT 1,
      cost_points INT NOT NULL,
      status ENUM('pending','processing','completed','failed') NOT NULL DEFAULT 'pending',
      provider_task_id VARCHAR(160) NULL,
      reference_image_url TEXT NULL,
      result_urls JSON NULL,
      error_message TEXT NULL,
      refunded BOOLEAN NOT NULL DEFAULT FALSE,
      favorite BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_image_tasks_user_created (user_id, created_at),
      INDEX idx_image_tasks_source_created (source, user_id, created_at),
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

  const [sourceColumns] = await pool.query(
    `SELECT COLUMN_NAME
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'image_generation_tasks' AND COLUMN_NAME = 'source'`,
    [config.db.database]
  );
  if (sourceColumns.length === 0) {
    await pool.query("ALTER TABLE image_generation_tasks ADD COLUMN source VARCHAR(40) NOT NULL DEFAULT 'image' AFTER user_id");
  }

  const [referenceImageUrlColumns] = await pool.query(
    `SELECT COLUMN_NAME
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'image_generation_tasks' AND COLUMN_NAME = 'reference_image_url'`,
    [config.db.database]
  );
  if (referenceImageUrlColumns.length === 0) {
    await pool.query("ALTER TABLE image_generation_tasks ADD COLUMN reference_image_url TEXT NULL AFTER provider_task_id");
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
    CREATE TABLE IF NOT EXISTS digital_human_tasks (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      user_id BIGINT UNSIGNED NOT NULL,
      avatar_id VARCHAR(80) NOT NULL,
      avatar_name VARCHAR(120) NOT NULL,
      model_key VARCHAR(80) NOT NULL,
      provider_model VARCHAR(120) NOT NULL,
      drive_mode ENUM('text','audio') NOT NULL DEFAULT 'text',
      text MEDIUMTEXT NULL,
      voice_id VARCHAR(160) NOT NULL,
      voice_name VARCHAR(120) NOT NULL,
      speed DECIMAL(4,2) NOT NULL DEFAULT 1.00,
      volume DECIMAL(4,2) NOT NULL DEFAULT 1.00,
      pitch DECIMAL(5,2) NOT NULL DEFAULT 0.00,
      emotion VARCHAR(30) NULL,
      audio_url VARCHAR(1000) NULL,
      audio_provider_url VARCHAR(1000) NULL,
      audio_duration_ms INT NULL,
      avatar_provider_url VARCHAR(1000) NULL,
      provider_task_id VARCHAR(160) NULL,
      result_url VARCHAR(1000) NULL,
      thumbnail_url VARCHAR(1000) NULL,
      cost_points INT NOT NULL,
      status ENUM('pending','processing','completed','failed') NOT NULL DEFAULT 'pending',
      error_message TEXT NULL,
      refunded BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_digital_human_user_created (user_id, created_at),
      INDEX idx_digital_human_status (status),
      CONSTRAINT fk_digital_human_tasks_user FOREIGN KEY (user_id) REFERENCES users(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  const [dhColumns] = await pool.query(
    `SELECT COLUMN_NAME
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'digital_human_tasks'`,
    [config.db.database]
  );
  const digitalHumanColumns = new Set(dhColumns.map((column) => column.COLUMN_NAME));
  if (digitalHumanColumns.has("volume")) {
    await pool.query("ALTER TABLE digital_human_tasks MODIFY COLUMN volume DECIMAL(4,2) NOT NULL DEFAULT 1.00");
  }
  if (digitalHumanColumns.has("pitch")) {
    await pool.query("ALTER TABLE digital_human_tasks MODIFY COLUMN pitch DECIMAL(5,2) NOT NULL DEFAULT 0.00");
  }
  if (!digitalHumanColumns.has("emotion")) {
    await pool.query("ALTER TABLE digital_human_tasks ADD COLUMN emotion VARCHAR(30) NULL AFTER pitch");
  }
  if (!digitalHumanColumns.has("audio_duration_ms")) {
    await pool.query("ALTER TABLE digital_human_tasks ADD COLUMN audio_duration_ms INT NULL AFTER audio_provider_url");
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS image_digital_human_tasks (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      user_id BIGINT UNSIGNED NOT NULL,
      model_key VARCHAR(80) NOT NULL,
      provider_model VARCHAR(160) NOT NULL,
      fallback_provider_model VARCHAR(160) NULL,
      used_provider_model VARCHAR(160) NULL,
      text MEDIUMTEXT NOT NULL,
      voice_id VARCHAR(160) NOT NULL,
      voice_name VARCHAR(120) NOT NULL,
      speed DECIMAL(4,2) NOT NULL DEFAULT 1.00,
      volume DECIMAL(4,2) NOT NULL DEFAULT 1.00,
      pitch DECIMAL(5,2) NOT NULL DEFAULT 0.00,
      emotion VARCHAR(30) NULL,
      portrait_url VARCHAR(1000) NOT NULL,
      portrait_provider_url VARCHAR(1000) NULL,
      audio_url VARCHAR(1000) NULL,
      audio_provider_url VARCHAR(1000) NULL,
      audio_duration_ms INT NULL,
      provider_task_id VARCHAR(160) NULL,
      result_url VARCHAR(1000) NULL,
      thumbnail_url VARCHAR(1000) NULL,
      cost_points INT NOT NULL,
      status ENUM('pending','processing','completed','failed') NOT NULL DEFAULT 'pending',
      error_message TEXT NULL,
      refunded BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_image_digital_human_user_created (user_id, created_at),
      INDEX idx_image_digital_human_status (status),
      CONSTRAINT fk_image_digital_human_tasks_user FOREIGN KEY (user_id) REFERENCES users(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS motion_transfer_assets (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      user_id BIGINT UNSIGNED NOT NULL,
      kind ENUM('image','video') NOT NULL,
      local_url VARCHAR(1000) NOT NULL,
      file_path VARCHAR(1000) NOT NULL,
      stored_name VARCHAR(255) NOT NULL,
      original_name VARCHAR(255) NULL,
      mime_type VARCHAR(160) NOT NULL,
      size_bytes BIGINT UNSIGNED NOT NULL DEFAULT 0,
      provider_url VARCHAR(1000) NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_motion_assets_user_created (user_id, created_at),
      INDEX idx_motion_assets_kind (kind),
      CONSTRAINT fk_motion_transfer_assets_user FOREIGN KEY (user_id) REFERENCES users(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS motion_transfer_tasks (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      user_id BIGINT UNSIGNED NOT NULL,
      image_asset_id BIGINT UNSIGNED NOT NULL,
      video_asset_id BIGINT UNSIGNED NOT NULL,
      model_key VARCHAR(80) NOT NULL,
      provider_model VARCHAR(160) NOT NULL,
      prompt TEXT NOT NULL,
      resolution VARCHAR(40) NOT NULL,
      duration INT NOT NULL,
      character_orientation ENUM('image','video') NOT NULL DEFAULT 'image',
      cost_points INT NOT NULL,
      status ENUM('pending','processing','completed','failed') NOT NULL DEFAULT 'pending',
      provider_task_id VARCHAR(160) NULL,
      result_url VARCHAR(1000) NULL,
      thumbnail_url VARCHAR(1000) NULL,
      error_message TEXT NULL,
      refunded BOOLEAN NOT NULL DEFAULT FALSE,
      favorite BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_motion_tasks_user_created (user_id, created_at),
      INDEX idx_motion_tasks_status (status),
      CONSTRAINT fk_motion_transfer_tasks_user FOREIGN KEY (user_id) REFERENCES users(id),
      CONSTRAINT fk_motion_transfer_tasks_image FOREIGN KEY (image_asset_id) REFERENCES motion_transfer_assets(id),
      CONSTRAINT fk_motion_transfer_tasks_video FOREIGN KEY (video_asset_id) REFERENCES motion_transfer_assets(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  const [motionTransferColumns] = await pool.query(
    `SELECT COLUMN_NAME
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'motion_transfer_tasks'`,
    [config.db.database]
  );
  const motionTransferColumnSet = new Set(motionTransferColumns.map((column) => column.COLUMN_NAME));
  if (!motionTransferColumnSet.has("character_orientation")) {
    await pool.query("ALTER TABLE motion_transfer_tasks ADD COLUMN character_orientation ENUM('image','video') NOT NULL DEFAULT 'image' AFTER duration");
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS face_swap_assets (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      user_id BIGINT UNSIGNED NOT NULL,
      kind ENUM('image','video') NOT NULL,
      local_url VARCHAR(1000) NOT NULL,
      file_path VARCHAR(1000) NOT NULL,
      stored_name VARCHAR(255) NOT NULL,
      original_name VARCHAR(255) NULL,
      mime_type VARCHAR(160) NOT NULL,
      size_bytes BIGINT UNSIGNED NOT NULL DEFAULT 0,
      provider_url VARCHAR(1000) NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_face_swap_assets_user_created (user_id, created_at),
      INDEX idx_face_swap_assets_kind (kind),
      CONSTRAINT fk_face_swap_assets_user FOREIGN KEY (user_id) REFERENCES users(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS face_swap_tasks (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      user_id BIGINT UNSIGNED NOT NULL,
      image_asset_id BIGINT UNSIGNED NOT NULL,
      video_asset_id BIGINT UNSIGNED NOT NULL,
      model_key VARCHAR(80) NOT NULL,
      provider_model VARCHAR(160) NOT NULL,
      prompt TEXT NOT NULL,
      resolution VARCHAR(40) NOT NULL,
      duration INT NOT NULL,
      cost_points INT NOT NULL,
      status ENUM('pending','processing','completed','failed') NOT NULL DEFAULT 'pending',
      provider_task_id VARCHAR(160) NULL,
      result_url VARCHAR(1000) NULL,
      thumbnail_url VARCHAR(1000) NULL,
      error_message TEXT NULL,
      refunded BOOLEAN NOT NULL DEFAULT FALSE,
      favorite BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_face_swap_tasks_user_created (user_id, created_at),
      INDEX idx_face_swap_tasks_status (status),
      CONSTRAINT fk_face_swap_tasks_user FOREIGN KEY (user_id) REFERENCES users(id),
      CONSTRAINT fk_face_swap_tasks_image FOREIGN KEY (image_asset_id) REFERENCES face_swap_assets(id),
      CONSTRAINT fk_face_swap_tasks_video FOREIGN KEY (video_asset_id) REFERENCES face_swap_assets(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS watermark_assets (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      user_id BIGINT UNSIGNED NOT NULL,
      kind ENUM('image','video') NOT NULL,
      local_url VARCHAR(1000) NOT NULL,
      file_path VARCHAR(1000) NOT NULL,
      stored_name VARCHAR(255) NOT NULL,
      original_name VARCHAR(255) NULL,
      mime_type VARCHAR(160) NOT NULL,
      size_bytes BIGINT UNSIGNED NOT NULL DEFAULT 0,
      provider_url VARCHAR(1000) NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_watermark_assets_user_created (user_id, created_at),
      INDEX idx_watermark_assets_kind (kind),
      CONSTRAINT fk_watermark_assets_user FOREIGN KEY (user_id) REFERENCES users(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS watermark_tasks (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      user_id BIGINT UNSIGNED NOT NULL,
      source_asset_id BIGINT UNSIGNED NOT NULL,
      media_type ENUM('image','video') NOT NULL,
      model_key VARCHAR(80) NOT NULL,
      provider_model VARCHAR(160) NOT NULL,
      prompt TEXT NOT NULL,
      resolution VARCHAR(40) NOT NULL,
      cost_points INT NOT NULL,
      status ENUM('pending','processing','completed','failed') NOT NULL DEFAULT 'pending',
      provider_task_id VARCHAR(160) NULL,
      result_url VARCHAR(1000) NULL,
      thumbnail_url VARCHAR(1000) NULL,
      error_message TEXT NULL,
      refunded BOOLEAN NOT NULL DEFAULT FALSE,
      favorite BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_watermark_tasks_user_created (user_id, created_at),
      INDEX idx_watermark_tasks_status (status),
      INDEX idx_watermark_tasks_media_type (media_type),
      CONSTRAINT fk_watermark_tasks_user FOREIGN KEY (user_id) REFERENCES users(id),
      CONSTRAINT fk_watermark_tasks_source FOREIGN KEY (source_asset_id) REFERENCES watermark_assets(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS enhance_assets (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      user_id BIGINT UNSIGNED NOT NULL,
      kind ENUM('image','video') NOT NULL,
      local_url VARCHAR(1000) NOT NULL,
      file_path VARCHAR(1000) NOT NULL,
      stored_name VARCHAR(255) NOT NULL,
      original_name VARCHAR(255) NULL,
      mime_type VARCHAR(160) NOT NULL,
      size_bytes BIGINT UNSIGNED NOT NULL DEFAULT 0,
      provider_url VARCHAR(1000) NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_enhance_assets_user_created (user_id, created_at),
      INDEX idx_enhance_assets_kind (kind),
      CONSTRAINT fk_enhance_assets_user FOREIGN KEY (user_id) REFERENCES users(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS enhance_tasks (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      user_id BIGINT UNSIGNED NOT NULL,
      source_asset_id BIGINT UNSIGNED NOT NULL,
      media_type ENUM('image','video') NOT NULL,
      model_key VARCHAR(80) NOT NULL,
      provider_model VARCHAR(160) NOT NULL,
      upscale_factor VARCHAR(20) NOT NULL,
      cost_points INT NOT NULL,
      status ENUM('pending','processing','completed','failed') NOT NULL DEFAULT 'pending',
      provider_task_id VARCHAR(160) NULL,
      result_url VARCHAR(1000) NULL,
      thumbnail_url VARCHAR(1000) NULL,
      error_message TEXT NULL,
      refunded BOOLEAN NOT NULL DEFAULT FALSE,
      favorite BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_enhance_tasks_user_created (user_id, created_at),
      INDEX idx_enhance_tasks_status (status),
      INDEX idx_enhance_tasks_media_type (media_type),
      CONSTRAINT fk_enhance_tasks_user FOREIGN KEY (user_id) REFERENCES users(id),
      CONSTRAINT fk_enhance_tasks_source FOREIGN KEY (source_asset_id) REFERENCES enhance_assets(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS remove_bg_assets (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      user_id BIGINT UNSIGNED NOT NULL,
      kind ENUM('image') NOT NULL DEFAULT 'image',
      local_url VARCHAR(1000) NOT NULL,
      file_path VARCHAR(1000) NOT NULL,
      stored_name VARCHAR(255) NOT NULL,
      original_name VARCHAR(255) NULL,
      mime_type VARCHAR(160) NOT NULL,
      size_bytes BIGINT UNSIGNED NOT NULL DEFAULT 0,
      provider_url VARCHAR(1000) NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_remove_bg_assets_user_created (user_id, created_at),
      CONSTRAINT fk_remove_bg_assets_user FOREIGN KEY (user_id) REFERENCES users(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS remove_bg_tasks (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      user_id BIGINT UNSIGNED NOT NULL,
      source_asset_id BIGINT UNSIGNED NOT NULL,
      media_type ENUM('image') NOT NULL DEFAULT 'image',
      model_key VARCHAR(80) NOT NULL,
      provider_model VARCHAR(160) NOT NULL,
      cost_points INT NOT NULL,
      status ENUM('pending','processing','completed','failed') NOT NULL DEFAULT 'pending',
      provider_task_id VARCHAR(160) NULL,
      result_url VARCHAR(1000) NULL,
      thumbnail_url VARCHAR(1000) NULL,
      error_message TEXT NULL,
      refunded BOOLEAN NOT NULL DEFAULT FALSE,
      favorite BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_remove_bg_tasks_user_created (user_id, created_at),
      INDEX idx_remove_bg_tasks_status (status),
      CONSTRAINT fk_remove_bg_tasks_user FOREIGN KEY (user_id) REFERENCES users(id),
      CONSTRAINT fk_remove_bg_tasks_source FOREIGN KEY (source_asset_id) REFERENCES remove_bg_assets(id)
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
      attachments_json JSON NULL,
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

  const [chatMessageColumns] = await pool.query(
    `SELECT COLUMN_NAME
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'chat_messages'`,
    [config.db.database]
  );
  const chatMessageColumnNames = new Set(chatMessageColumns.map((column) => column.COLUMN_NAME));
  if (!chatMessageColumnNames.has("attachments_json")) {
    await pool.query("ALTER TABLE chat_messages ADD COLUMN attachments_json JSON NULL AFTER content");
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS music_tasks (
      id VARCHAR(120) NOT NULL PRIMARY KEY,
      user_id BIGINT UNSIGNED NOT NULL,
      prompt TEXT NOT NULL,
      lyrics MEDIUMTEXT NULL,
      model VARCHAR(80) NOT NULL,
      is_instrumental BOOLEAN NOT NULL DEFAULT FALSE,
      audio_url VARCHAR(1000) NOT NULL,
      status ENUM('processing','completed','failed') NOT NULL DEFAULT 'completed',
      error_message TEXT NULL,
      duration_ms INT NOT NULL DEFAULT 0,
      sample_rate INT NULL,
      channel INT NULL,
      bitrate INT NULL,
      music_size INT NULL,
      trace_id VARCHAR(160) NULL,
      favorite BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_music_tasks_user_created (user_id, created_at),
      CONSTRAINT fk_music_tasks_user FOREIGN KEY (user_id) REFERENCES users(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  const [musicColumns] = await pool.query(
    `SELECT COLUMN_NAME
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'music_tasks'`,
    [config.db.database]
  );
  const musicColumnNames = new Set(musicColumns.map((column) => column.COLUMN_NAME));
  if (!musicColumnNames.has("status")) {
    await pool.query("ALTER TABLE music_tasks ADD COLUMN status ENUM('processing','completed','failed') NOT NULL DEFAULT 'completed' AFTER audio_url");
  }
  if (!musicColumnNames.has("error_message")) {
    await pool.query("ALTER TABLE music_tasks ADD COLUMN error_message TEXT NULL AFTER status");
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS voice_synthesis_tasks (
      id VARCHAR(120) NOT NULL PRIMARY KEY,
      user_id BIGINT UNSIGNED NOT NULL,
      title VARCHAR(255) NOT NULL,
      voice_id VARCHAR(160) NOT NULL,
      voice_name VARCHAR(160) NULL,
      text MEDIUMTEXT NOT NULL,
      audio_url VARCHAR(1000) NOT NULL,
      duration_ms INT NOT NULL DEFAULT 0,
      mime_type VARCHAR(120) NULL,
      favorite BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_voice_synthesis_user_created (user_id, created_at),
      CONSTRAINT fk_voice_synthesis_user FOREIGN KEY (user_id) REFERENCES users(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS voice_convert_tasks (
      id VARCHAR(120) NOT NULL PRIMARY KEY,
      user_id BIGINT UNSIGNED NOT NULL,
      title VARCHAR(255) NOT NULL,
      voice_id VARCHAR(160) NULL,
      voice_name VARCHAR(160) NULL,
      source_file_name VARCHAR(255) NULL,
      audio_url VARCHAR(1000) NOT NULL,
      duration_ms INT NOT NULL DEFAULT 0,
      source_duration_ms INT NOT NULL DEFAULT 0,
      mime_type VARCHAR(120) NULL,
      rhythm_meta JSON NULL,
      favorite BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_voice_convert_user_created (user_id, created_at),
      CONSTRAINT fk_voice_convert_user FOREIGN KEY (user_id) REFERENCES users(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS transcribe_tasks (
      id VARCHAR(120) NOT NULL PRIMARY KEY,
      user_id BIGINT UNSIGNED NOT NULL,
      file_name VARCHAR(255) NOT NULL,
      mime_type VARCHAR(160) NULL,
      size_bytes BIGINT UNSIGNED NOT NULL DEFAULT 0,
      duration_ms INT NOT NULL DEFAULT 0,
      text MEDIUMTEXT NOT NULL,
      formatted_text MEDIUMTEXT NULL,
      segments JSON NULL,
      trace_id VARCHAR(160) NULL,
      favorite BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_transcribe_user_created (user_id, created_at),
      CONSTRAINT fk_transcribe_user FOREIGN KEY (user_id) REFERENCES users(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS replicate_tasks (
      id VARCHAR(120) NOT NULL PRIMARY KEY,
      user_id BIGINT UNSIGNED NOT NULL,
      source VARCHAR(20) NOT NULL,
      file_name VARCHAR(255) NOT NULL,
      prompt MEDIUMTEXT NULL,
      description MEDIUMTEXT NULL,
      style VARCHAR(160) NULL,
      mood VARCHAR(160) NULL,
      tags JSON NULL,
      model VARCHAR(160) NULL,
      frame_count INT NULL,
      favorite BOOLEAN NOT NULL DEFAULT FALSE,
      status ENUM('processing','completed','failed') NOT NULL DEFAULT 'completed',
      error_message TEXT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_replicate_user_created (user_id, created_at),
      CONSTRAINT fk_replicate_user FOREIGN KEY (user_id) REFERENCES users(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  const [replicateColumns] = await pool.query(
    `SELECT COLUMN_NAME
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'replicate_tasks'`,
    [config.db.database]
  );
  const replicateColumnNames = new Set(replicateColumns.map((column) => column.COLUMN_NAME));
  if (!replicateColumnNames.has("status")) {
    await pool.query("ALTER TABLE replicate_tasks ADD COLUMN status ENUM('processing','completed','failed') NOT NULL DEFAULT 'completed' AFTER favorite");
  }
  if (!replicateColumnNames.has("error_message")) {
    await pool.query("ALTER TABLE replicate_tasks ADD COLUMN error_message TEXT NULL AFTER status");
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
       ON DUPLICATE KEY UPDATE external_id = external_id`
    );

    await connection.query(
      `INSERT INTO users (external_id, display_name)
       VALUES ('guest-user', '游客')
       ON DUPLICATE KEY UPDATE display_name = VALUES(display_name)`
    );

    const [users] = await connection.query("SELECT id FROM users WHERE external_id = 'demo-user' LIMIT 1");
    const userId = users[0].id;

    const [guestUsers] = await connection.query("SELECT id FROM users WHERE external_id = 'guest-user' LIMIT 1");
    const guestUserId = guestUsers[0].id;

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

    const [guestAccounts] = await connection.query("SELECT id FROM credit_accounts WHERE user_id = ? LIMIT 1", [guestUserId]);
    if (guestAccounts.length === 0) {
      await connection.query("INSERT INTO credit_accounts (user_id, balance) VALUES (?, 0)", [guestUserId]);
    } else {
      await connection.query("UPDATE credit_accounts SET balance = 0 WHERE user_id = ?", [guestUserId]);
    }

    await connection.query(`
      INSERT INTO image_model_prices (model_key, display_name, base_points, enabled)
      VALUES
        ('gpt_image_1_5_i2i', 'GPT Image 1.5 图生图', 35, TRUE),
        ('gpt_image_2', 'GPT Image 2', 35, TRUE),
        ('gpt_image_2_i2i', 'GPT Image 2 图生图', 35, TRUE),
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
        ('wan_2_7_720p', 'jobs', 'wan/2-7-text-to-video', 'Wan 2.7 720P', 'first-frame', 'per_second', 56, 0.560,
          JSON_ARRAY('16:9','9:16','1:1','4:3','3:4'), JSON_ARRAY(2,3,4,5,6,8,10,15), '16:9', 6, TRUE, 90)
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
        ('gpt-5-4', 'gpt-5-4', 'Codex5.4', 4.000, 1, TRUE, 10),
        ('gpt-5-5', 'gpt-5-5', 'Codex5.5', 4.000, 1, TRUE, 20),
        ('gemini-3-pro', 'gemini-3-pro', 'Gemini 3 Pro', 4.000, 1, TRUE, 30),
        ('claude-sonnet-4-6', 'claude-sonnet-4-6', 'Claude Sonnet 4.6', 4.000, 1, TRUE, 40),
        ('claude-opus-4-6', 'claude-opus-4-6', 'Claude Opus 4.6', 4.000, 1, TRUE, 50),
        ('gemini-3-pro-openai', 'gemini-3-pro-openai', 'Gemini 3 Pro', 4.000, 1, FALSE, 60),
        ('gemini-2.5-flash', 'gemini-2.5-flash', 'Gemini 2.5 Flash', 4.000, 1, FALSE, 70)
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
