import { randomBytes } from "crypto";
import { config } from "../config/index.js";
import { getPool, getServerConnection } from "../db/pool.js";

function createInviteCode() {
  return randomBytes(5).toString("base64url").replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 8);
}

async function createUniqueInviteCode(pool) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const code = createInviteCode();
    const [rows] = await pool.query("SELECT id FROM users WHERE invite_code = ? LIMIT 1", [code]);
    if (rows.length === 0) return code;
  }
  throw new Error("Failed to generate unique invite code.");
}

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

async function ensureIndex(pool, tableName, indexName, columns) {
  const [rows] = await pool.query(
    `SELECT INDEX_NAME
     FROM INFORMATION_SCHEMA.STATISTICS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND INDEX_NAME = ?`,
    [config.db.database, tableName, indexName],
  );
  if (rows.length === 0) {
    await pool.query(`ALTER TABLE ${tableName} ADD INDEX ${indexName} (${columns})`);
  }
}

async function createTables() {
  const pool = getPool();

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      external_id VARCHAR(64) NOT NULL UNIQUE,
      invite_code VARCHAR(32) NULL UNIQUE,
      username VARCHAR(64) NULL,
      phone VARCHAR(20) NULL UNIQUE,
      email VARCHAR(254) NULL UNIQUE,
      password_hash VARCHAR(255) NULL,
      display_name VARCHAR(120) NOT NULL,
      avatar_url VARCHAR(255) NULL,
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
  if (!userColumnNames.has("invite_code")) {
    await pool.query("ALTER TABLE users ADD COLUMN invite_code VARCHAR(32) NULL AFTER external_id");
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
  if (!userColumnNames.has("avatar_url")) {
    await pool.query("ALTER TABLE users ADD COLUMN avatar_url VARCHAR(255) NULL AFTER display_name");
  }

  await pool.query(
    `UPDATE users
     SET avatar_url = CONCAT('/assets/avatars/', FLOOR(1 + RAND() * 25), '.jpg')
     WHERE avatar_url IS NULL OR avatar_url = ''`
  );

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

  const [inviteCodeIndexes] = await pool.query(
    `SELECT INDEX_NAME
     FROM INFORMATION_SCHEMA.STATISTICS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = 'invite_code' AND NON_UNIQUE = 0`,
    [config.db.database]
  );
  if (inviteCodeIndexes.length === 0) {
    await pool.query("ALTER TABLE users ADD UNIQUE INDEX uq_users_invite_code (invite_code)");
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
    CREATE TABLE IF NOT EXISTS invite_bindings (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      inviter_user_id BIGINT UNSIGNED NOT NULL,
      invitee_user_id BIGINT UNSIGNED NOT NULL UNIQUE,
      invite_code VARCHAR(32) NOT NULL,
      reward_status ENUM('pending','granted','skipped') NOT NULL DEFAULT 'pending',
      reward_points INT NOT NULL DEFAULT 200,
      rewarded_at TIMESTAMP NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_invite_bindings_inviter (inviter_user_id, created_at),
      INDEX idx_invite_bindings_code (invite_code),
      CONSTRAINT fk_invite_bindings_inviter FOREIGN KEY (inviter_user_id) REFERENCES users(id),
      CONSTRAINT fk_invite_bindings_invitee FOREIGN KEY (invitee_user_id) REFERENCES users(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS credit_transactions (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      user_id BIGINT UNSIGNED NOT NULL,
      task_id VARCHAR(64) NULL,
      type ENUM('grant','debit','refund','recharge','invitegift') NOT NULL,
      amount INT NOT NULL,
      balance_after INT NOT NULL,
      memo VARCHAR(255) NULL,
      related_user_id BIGINT UNSIGNED NULL,
      invite_binding_id BIGINT UNSIGNED NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_credit_transactions_user_created (user_id, created_at),
      INDEX idx_credit_transactions_type_created (type, created_at),
      INDEX idx_credit_transactions_invite_binding (invite_binding_id),
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
  if (creditTransactionTypeColumns.length && !String(creditTransactionTypeColumns[0].COLUMN_TYPE).includes("'invitegift'")) {
    await pool.query("ALTER TABLE credit_transactions MODIFY COLUMN type ENUM('grant','debit','refund','recharge','invitegift') NOT NULL");
  }
  const [creditTransactionColumns] = await pool.query(
    `SELECT COLUMN_NAME
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'credit_transactions'`,
    [config.db.database]
  );
  const creditTransactionColumnNames = new Set(creditTransactionColumns.map((column) => column.COLUMN_NAME));
  if (!creditTransactionColumnNames.has("related_user_id")) {
    await pool.query("ALTER TABLE credit_transactions ADD COLUMN related_user_id BIGINT UNSIGNED NULL AFTER memo");
  }
  if (!creditTransactionColumnNames.has("invite_binding_id")) {
    await pool.query("ALTER TABLE credit_transactions ADD COLUMN invite_binding_id BIGINT UNSIGNED NULL AFTER related_user_id");
  }

  const [creditTransactionTaskIdColumn] = await pool.query(
    `SELECT DATA_TYPE
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'credit_transactions' AND COLUMN_NAME = 'task_id'
     LIMIT 1`,
    [config.db.database]
  );
  if (
    creditTransactionTaskIdColumn.length &&
    ["bigint", "int", "mediumint", "smallint", "tinyint"].includes(
      String(creditTransactionTaskIdColumn[0].DATA_TYPE).toLowerCase()
    )
  ) {
    await pool.query("ALTER TABLE credit_transactions MODIFY COLUMN task_id VARCHAR(64) NULL");
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS invite_events (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      event_type VARCHAR(64) NOT NULL,
      invite_code VARCHAR(32) NULL,
      user_id BIGINT UNSIGNED NULL,
      payload_json JSON NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_invite_events_type_created (event_type, created_at),
      INDEX idx_invite_events_code_created (invite_code, created_at),
      INDEX idx_invite_events_user_created (user_id, created_at),
      CONSTRAINT fk_invite_events_user FOREIGN KEY (user_id) REFERENCES users(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

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
      scene ENUM('register','login','password_reset','change_phone_old','change_phone_new','change_password') NOT NULL,
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
    ALTER TABLE auth_verification_codes
    MODIFY scene ENUM('register','login','password_reset','change_phone_old','change_phone_new','change_password') NOT NULL
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
      wechat_transaction_id VARCHAR(64) NULL,
      wechat_trade_state VARCHAR(32) NULL,
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

  const [wechatTransactionColumns] = await pool.query(
    `SELECT COLUMN_NAME
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'payment_orders' AND COLUMN_NAME = 'wechat_transaction_id'`,
    [config.db.database]
  );
  if (wechatTransactionColumns.length === 0) {
    await pool.query("ALTER TABLE payment_orders ADD COLUMN wechat_transaction_id VARCHAR(64) NULL AFTER alipay_trade_status");
  }

  const [wechatTradeStateColumns] = await pool.query(
    `SELECT COLUMN_NAME
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'payment_orders' AND COLUMN_NAME = 'wechat_trade_state'`,
    [config.db.database]
  );
  if (wechatTradeStateColumns.length === 0) {
    await pool.query("ALTER TABLE payment_orders ADD COLUMN wechat_trade_state VARCHAR(32) NULL AFTER wechat_transaction_id");
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS canvas_projects (
      id VARCHAR(64) NOT NULL PRIMARY KEY,
      user_id BIGINT UNSIGNED NOT NULL,
      name VARCHAR(160) NOT NULL,
      thumbnail_url TEXT NULL,
      graph_json JSON NOT NULL,
      viewport_json JSON NOT NULL,
      schema_version INT NOT NULL DEFAULT 1,
      revision INT NOT NULL DEFAULT 1,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      deleted_at TIMESTAMP NULL,
      INDEX idx_canvas_projects_user_updated (user_id, updated_at),
      CONSTRAINT fk_canvas_projects_user FOREIGN KEY (user_id) REFERENCES users(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS canvas_node_tasks (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      project_id VARCHAR(64) NOT NULL,
      user_id BIGINT UNSIGNED NOT NULL,
      node_id VARCHAR(80) NOT NULL,
      task_type VARCHAR(32) NOT NULL,
      task_id VARCHAR(80) NOT NULL,
      input_hash CHAR(64) NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_canvas_node_task (project_id, node_id, task_type, task_id),
      INDEX idx_canvas_node_tasks_project (project_id, user_id, created_at),
      CONSTRAINT fk_canvas_node_tasks_project FOREIGN KEY (project_id) REFERENCES canvas_projects(id),
      CONSTRAINT fk_canvas_node_tasks_user FOREIGN KEY (user_id) REFERENCES users(id)
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
      thread_id VARCHAR(80) NULL,
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
      provider_result_urls JSON NULL,
      error_message TEXT NULL,
      refunded BOOLEAN NOT NULL DEFAULT FALSE,
      favorite BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_image_tasks_user_created (user_id, created_at),
      INDEX idx_image_tasks_thread (user_id, thread_id, created_at),
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

  const [threadIdColumns] = await pool.query(
    `SELECT COLUMN_NAME
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'image_generation_tasks' AND COLUMN_NAME = 'thread_id'`,
    [config.db.database]
  );
  if (threadIdColumns.length === 0) {
    await pool.query("ALTER TABLE image_generation_tasks ADD COLUMN thread_id VARCHAR(80) NULL AFTER source");
  }

  const [threadIdIndexes] = await pool.query(
    `SELECT INDEX_NAME
     FROM INFORMATION_SCHEMA.STATISTICS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'image_generation_tasks' AND INDEX_NAME = 'idx_image_tasks_thread'`,
    [config.db.database]
  );
  if (threadIdIndexes.length === 0) {
    await pool.query("ALTER TABLE image_generation_tasks ADD INDEX idx_image_tasks_thread (user_id, thread_id, created_at)");
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

  const [providerResultUrlColumns] = await pool.query(
    `SELECT COLUMN_NAME
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'image_generation_tasks' AND COLUMN_NAME = 'provider_result_urls'`,
    [config.db.database]
  );
  if (providerResultUrlColumns.length === 0) {
    await pool.query("ALTER TABLE image_generation_tasks ADD COLUMN provider_result_urls JSON NULL AFTER result_urls");
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS inspiration_favorites (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      user_id BIGINT UNSIGNED NOT NULL,
      inspiration_id VARCHAR(180) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_inspiration_favorite_user_item (user_id, inspiration_id),
      INDEX idx_inspiration_favorites_user_created (user_id, created_at),
      CONSTRAINT fk_inspiration_favorites_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS article_generation_packages (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      user_id BIGINT UNSIGNED NOT NULL,
      thread_id VARCHAR(80) NOT NULL,
      title VARCHAR(240) NOT NULL,
      body MEDIUMTEXT NOT NULL,
      tags_json JSON NULL,
      image_prompt_plan_json JSON NULL,
      image_task_ids_json JSON NULL,
      model_key VARCHAR(80) NOT NULL,
      ratio VARCHAR(20) NOT NULL,
      quality VARCHAR(20) NOT NULL,
      status ENUM('pending','processing','partial_completed','completed','failed') NOT NULL DEFAULT 'pending',
      favorite BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_article_packages_user_created (user_id, created_at),
      INDEX idx_article_packages_thread (user_id, thread_id),
      INDEX idx_article_packages_status (status),
      CONSTRAINT fk_article_packages_user FOREIGN KEY (user_id) REFERENCES users(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

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
      source VARCHAR(40) NOT NULL DEFAULT 'video',
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
      reference_image_url TEXT NULL,
      first_frame_image_url TEXT NULL,
      last_frame_image_url TEXT NULL,
      reference_image_urls JSON NULL,
      reference_video_url TEXT NULL,
      reference_audio_url TEXT NULL,
      result_urls JSON NULL,
      provider_result_urls JSON NULL,
      error_message TEXT NULL,
      refunded BOOLEAN NOT NULL DEFAULT FALSE,
      favorite BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_video_tasks_user_created (user_id, created_at),
      INDEX idx_video_tasks_source_created (source, user_id, created_at),
      INDEX idx_video_tasks_status (status),
      CONSTRAINT fk_video_tasks_user FOREIGN KEY (user_id) REFERENCES users(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  const [videoSourceColumns] = await pool.query(
    `SELECT COLUMN_NAME
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'video_generation_tasks' AND COLUMN_NAME = 'source'`,
    [config.db.database]
  );
  if (videoSourceColumns.length === 0) {
    await pool.query("ALTER TABLE video_generation_tasks ADD COLUMN source VARCHAR(40) NOT NULL DEFAULT 'video' AFTER user_id");
  }

  const [videoSourceIndexes] = await pool.query(
    `SELECT INDEX_NAME
     FROM INFORMATION_SCHEMA.STATISTICS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'video_generation_tasks' AND INDEX_NAME = 'idx_video_tasks_source_created'`,
    [config.db.database]
  );
  if (videoSourceIndexes.length === 0) {
    await pool.query("ALTER TABLE video_generation_tasks ADD INDEX idx_video_tasks_source_created (source, user_id, created_at)");
  }

  const [videoRefImageColumns] = await pool.query(
    `SELECT COLUMN_NAME
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'video_generation_tasks' AND COLUMN_NAME = 'reference_image_url'`,
    [config.db.database]
  );
  if (videoRefImageColumns.length === 0) {
    await pool.query("ALTER TABLE video_generation_tasks ADD COLUMN reference_image_url TEXT NULL AFTER provider_task_id");
  }

  const [videoFirstFrameColumns] = await pool.query(
    `SELECT COLUMN_NAME
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'video_generation_tasks' AND COLUMN_NAME = 'first_frame_image_url'`,
    [config.db.database]
  );
  if (videoFirstFrameColumns.length === 0) {
    await pool.query("ALTER TABLE video_generation_tasks ADD COLUMN first_frame_image_url TEXT NULL AFTER reference_image_url");
  }

  const [videoLastFrameColumns] = await pool.query(
    `SELECT COLUMN_NAME
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'video_generation_tasks' AND COLUMN_NAME = 'last_frame_image_url'`,
    [config.db.database]
  );
  if (videoLastFrameColumns.length === 0) {
    await pool.query("ALTER TABLE video_generation_tasks ADD COLUMN last_frame_image_url TEXT NULL AFTER first_frame_image_url");
  }

  const [videoReferenceImagesColumns] = await pool.query(
    `SELECT COLUMN_NAME
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'video_generation_tasks' AND COLUMN_NAME = 'reference_image_urls'`,
    [config.db.database]
  );
  if (videoReferenceImagesColumns.length === 0) {
    await pool.query("ALTER TABLE video_generation_tasks ADD COLUMN reference_image_urls JSON NULL AFTER last_frame_image_url");
  }

  const [videoRefVideoColumns] = await pool.query(
    `SELECT COLUMN_NAME
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'video_generation_tasks' AND COLUMN_NAME = 'reference_video_url'`,
    [config.db.database]
  );
  if (videoRefVideoColumns.length === 0) {
    await pool.query("ALTER TABLE video_generation_tasks ADD COLUMN reference_video_url TEXT NULL AFTER reference_image_urls");
  }

  const [videoRefAudioColumns] = await pool.query(
    `SELECT COLUMN_NAME
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'video_generation_tasks' AND COLUMN_NAME = 'reference_audio_url'`,
    [config.db.database]
  );
  if (videoRefAudioColumns.length === 0) {
    await pool.query("ALTER TABLE video_generation_tasks ADD COLUMN reference_audio_url TEXT NULL AFTER reference_video_url");
  }

  const [videoProviderResultColumns] = await pool.query(
    `SELECT COLUMN_NAME
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'video_generation_tasks' AND COLUMN_NAME = 'provider_result_urls'`,
    [config.db.database]
  );
  if (videoProviderResultColumns.length === 0) {
    await pool.query("ALTER TABLE video_generation_tasks ADD COLUMN provider_result_urls JSON NULL AFTER result_urls");
  }

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
    CREATE TABLE IF NOT EXISTS ark_virtual_asset_groups (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      user_id BIGINT UNSIGNED NOT NULL,
      feature VARCHAR(80) NOT NULL DEFAULT 'digital-human',
      name VARCHAR(160) NOT NULL,
      provider_group_id VARCHAR(160) NOT NULL,
      project_name VARCHAR(120) NOT NULL DEFAULT 'jingchuang',
      status ENUM('ready','failed') NOT NULL DEFAULT 'ready',
      error_message TEXT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_ark_group_user_project_feature (user_id, project_name, feature),
      INDEX idx_ark_group_provider (provider_group_id),
      CONSTRAINT fk_ark_virtual_asset_groups_user FOREIGN KEY (user_id) REFERENCES users(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  const [arkGroupIndexes] = await pool.query(
    `SELECT INDEX_NAME
     FROM INFORMATION_SCHEMA.STATISTICS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'ark_virtual_asset_groups'
     GROUP BY INDEX_NAME`,
    [config.db.database]
  );
  const arkGroupIndexNames = new Set(arkGroupIndexes.map((row) => row.INDEX_NAME));
  if (!arkGroupIndexNames.has("idx_ark_group_user")) {
    await pool.query("ALTER TABLE ark_virtual_asset_groups ADD INDEX idx_ark_group_user (user_id)");
  }
  if (arkGroupIndexNames.has("uniq_ark_group_user_feature")) {
    await pool.query("ALTER TABLE ark_virtual_asset_groups DROP INDEX uniq_ark_group_user_feature");
  }
  if (!arkGroupIndexNames.has("uniq_ark_group_user_project_feature")) {
    await pool.query("ALTER TABLE ark_virtual_asset_groups ADD UNIQUE KEY uniq_ark_group_user_project_feature (user_id, project_name, feature)");
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS ark_virtual_assets (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      user_id BIGINT UNSIGNED NOT NULL,
      group_id BIGINT UNSIGNED NOT NULL,
      feature VARCHAR(80) NOT NULL DEFAULT 'digital-human',
      asset_type ENUM('Image','Video','Audio') NOT NULL,
      local_url VARCHAR(1000) NOT NULL,
      public_url VARCHAR(1000) NOT NULL,
      file_path VARCHAR(1000) NULL,
      original_name VARCHAR(255) NULL,
      mime_type VARCHAR(160) NULL,
      size_bytes BIGINT UNSIGNED NOT NULL DEFAULT 0,
      source_hash CHAR(64) NULL,
      provider_asset_id VARCHAR(160) NULL,
      asset_uri VARCHAR(220) NULL,
      status ENUM('processing','active','failed') NOT NULL DEFAULT 'processing',
      error_message TEXT NULL,
      metadata_json JSON NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_ark_asset_user_feature (user_id, feature, created_at),
      INDEX idx_ark_asset_status (status),
      INDEX idx_ark_asset_hash (source_hash),
      INDEX idx_ark_asset_provider (provider_asset_id),
      CONSTRAINT fk_ark_virtual_assets_user FOREIGN KEY (user_id) REFERENCES users(id),
      CONSTRAINT fk_ark_virtual_assets_group FOREIGN KEY (group_id) REFERENCES ark_virtual_asset_groups(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  const [arkAssetColumns] = await pool.query(
    `SELECT COLUMN_NAME
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'ark_virtual_assets'`,
    [config.db.database]
  );
  const arkAssetColumnNames = new Set(arkAssetColumns.map((row) => row.COLUMN_NAME));
  if (!arkAssetColumnNames.has("metadata_json")) {
    await pool.query(
      "ALTER TABLE ark_virtual_assets ADD COLUMN metadata_json JSON NULL AFTER error_message"
    );
  }
  await pool.query(
    `UPDATE ark_virtual_assets
     SET metadata_json = JSON_OBJECT(
       'source', 'upload',
       'name',
       CASE
         WHEN original_name REGEXP '^[0-9a-fA-F-]{24,}\\.[A-Za-z0-9]+$' THEN '我的形象'
         ELSE COALESCE(NULLIF(SUBSTRING_INDEX(original_name, '.', 1), ''), '我的形象')
       END
     )
     WHERE feature = 'digital-human'
       AND asset_type = 'Image'
       AND local_url NOT LIKE '%/digital-human/avatars/ai/%'
       AND metadata_json IS NULL`
  );
  await pool.query(
    `UPDATE ark_virtual_assets
     SET metadata_json = JSON_SET(metadata_json, '$.name', '我的形象')
     WHERE feature = 'digital-human'
       AND asset_type = 'Image'
       AND local_url NOT LIKE '%/digital-human/avatars/ai/%'
       AND original_name REGEXP '^[0-9a-fA-F-]{24,}\\.[A-Za-z0-9]+$'
       AND JSON_UNQUOTE(JSON_EXTRACT(metadata_json, '$.source')) = 'upload'
       AND JSON_UNQUOTE(JSON_EXTRACT(metadata_json, '$.name')) =
         SUBSTRING_INDEX(original_name, '.', 1)`
  );

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
      provider_type VARCHAR(32) NOT NULL DEFAULT 'kie',
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
  const [chatModelColumns] = await pool.query(
    `SELECT COLUMN_NAME
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'chat_model_prices'`,
    [config.db.database]
  );
  const chatModelColumnNames = new Set(chatModelColumns.map((column) => column.COLUMN_NAME));
  if (!chatModelColumnNames.has("provider_type")) {
    await pool.query(
      "ALTER TABLE chat_model_prices ADD COLUMN provider_type VARCHAR(32) NOT NULL DEFAULT 'kie' AFTER model_key"
    );
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS chat_conversations (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      user_id BIGINT UNSIGNED NOT NULL,
      source VARCHAR(40) NOT NULL DEFAULT 'chat',
      title VARCHAR(160) NOT NULL,
      model_key VARCHAR(80) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_chat_conversations_user_updated (user_id, updated_at),
      INDEX idx_chat_conversations_source_updated (source, user_id, updated_at),
      CONSTRAINT fk_chat_conversations_user FOREIGN KEY (user_id) REFERENCES users(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  const [chatConversationColumns] = await pool.query(
    `SELECT COLUMN_NAME
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'chat_conversations'`,
    [config.db.database]
  );
  const chatConversationColumnNames = new Set(chatConversationColumns.map((column) => column.COLUMN_NAME));
  if (!chatConversationColumnNames.has("source")) {
    await pool.query("ALTER TABLE chat_conversations ADD COLUMN source VARCHAR(40) NOT NULL DEFAULT 'chat' AFTER user_id");
  }

  const [chatConversationIndexes] = await pool.query(
    `SELECT INDEX_NAME
     FROM INFORMATION_SCHEMA.STATISTICS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'chat_conversations' AND INDEX_NAME = 'idx_chat_conversations_source_updated'`,
    [config.db.database]
  );
  if (chatConversationIndexes.length === 0) {
    await pool.query("ALTER TABLE chat_conversations ADD INDEX idx_chat_conversations_source_updated (source, user_id, updated_at)");
  }

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
      status ENUM('streaming','completed','stopped','failed') NOT NULL DEFAULT 'completed',
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
  await pool.query(
    "ALTER TABLE chat_messages MODIFY COLUMN status ENUM('streaming','completed','stopped','failed') NOT NULL DEFAULT 'completed'"
  );

  await pool.query(`
    CREATE TABLE IF NOT EXISTS music_tasks (
      id VARCHAR(120) NOT NULL PRIMARY KEY,
      user_id BIGINT UNSIGNED NOT NULL,
      prompt TEXT NOT NULL,
      lyrics MEDIUMTEXT NULL,
      lyrics_timeline JSON NULL,
      lyrics_sync_status ENUM('none','processing','completed','failed') NOT NULL DEFAULT 'none',
      lyrics_sync_error TEXT NULL,
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
  if (!musicColumnNames.has("lyrics_timeline")) {
    await pool.query("ALTER TABLE music_tasks ADD COLUMN lyrics_timeline JSON NULL AFTER lyrics");
  }
  if (!musicColumnNames.has("lyrics_sync_status")) {
    await pool.query("ALTER TABLE music_tasks ADD COLUMN lyrics_sync_status ENUM('none','processing','completed','failed') NOT NULL DEFAULT 'none' AFTER lyrics_timeline");
  }
  if (!musicColumnNames.has("lyrics_sync_error")) {
    await pool.query("ALTER TABLE music_tasks ADD COLUMN lyrics_sync_error TEXT NULL AFTER lyrics_sync_status");
  }
  if (!musicColumnNames.has("title")) {
    await pool.query("ALTER TABLE music_tasks ADD COLUMN title VARCHAR(200) NULL AFTER prompt");
  }
  if (!musicColumnNames.has("cover_url")) {
    await pool.query("ALTER TABLE music_tasks ADD COLUMN cover_url VARCHAR(1000) NULL AFTER title");
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
    CREATE TABLE IF NOT EXISTS voice_clone_assets (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      user_id BIGINT UNSIGNED NOT NULL,
      audio_sha256 CHAR(64) NULL,
      voice_id VARCHAR(160) NOT NULL,
      voice_name VARCHAR(160) NULL,
      source_file_name VARCHAR(255) NULL,
      source_mime_type VARCHAR(120) NULL,
      source_size INT NOT NULL DEFAULT 0,
      duration_ms INT NOT NULL DEFAULT 0,
      demo_audio MEDIUMTEXT NULL,
      status ENUM('processing','completed','failed','expired') NOT NULL DEFAULT 'completed',
      error_message TEXT NULL,
      provider_activated_at TIMESTAMP NULL,
      last_used_at TIMESTAMP NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_voice_clone_user_hash (user_id, audio_sha256),
      INDEX idx_voice_clone_user_created (user_id, created_at),
      INDEX idx_voice_clone_voice_id (voice_id),
      CONSTRAINT fk_voice_clone_assets_user FOREIGN KEY (user_id) REFERENCES users(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  const [voiceCloneColumns] = await pool.query(
    `SELECT COLUMN_NAME
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'voice_clone_assets'`,
    [config.db.database]
  );
  const voiceCloneColumnNames = new Set(voiceCloneColumns.map((column) => column.COLUMN_NAME));
  await pool.query("ALTER TABLE voice_clone_assets MODIFY COLUMN status ENUM('processing','completed','failed','expired') NOT NULL DEFAULT 'completed'");
  if (!voiceCloneColumnNames.has("provider_activated_at")) {
    await pool.query("ALTER TABLE voice_clone_assets ADD COLUMN provider_activated_at TIMESTAMP NULL AFTER error_message");
  }
  if (!voiceCloneColumnNames.has("last_used_at")) {
    await pool.query("ALTER TABLE voice_clone_assets ADD COLUMN last_used_at TIMESTAMP NULL AFTER provider_activated_at");
  }

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
      provider VARCHAR(64) NULL,
      analysis_mode VARCHAR(64) NULL,
      stage VARCHAR(64) NOT NULL DEFAULT 'completed',
      attempt_count INT NOT NULL DEFAULT 0,
      provider_request_id VARCHAR(255) NULL,
      provider_status_code INT NULL,
      latency_ms INT NULL,
      input_tokens INT NULL,
      output_tokens INT NULL,
      input_duration_seconds DECIMAL(10, 3) NULL,
      input_size_bytes BIGINT UNSIGNED NULL,
      fallback_reason TEXT NULL,
      quality_warning TEXT NULL,
      error_code VARCHAR(64) NULL,
      analysis_json JSON NULL,
      favorite BOOLEAN NOT NULL DEFAULT FALSE,
      status ENUM('processing','completed','completed_with_warning','failed') NOT NULL DEFAULT 'completed',
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
    await pool.query("ALTER TABLE replicate_tasks ADD COLUMN status ENUM('processing','completed','completed_with_warning','failed') NOT NULL DEFAULT 'completed' AFTER favorite");
  } else {
    await pool.query("ALTER TABLE replicate_tasks MODIFY COLUMN status ENUM('processing','completed','completed_with_warning','failed') NOT NULL DEFAULT 'completed'");
  }
  if (!replicateColumnNames.has("error_message")) {
    await pool.query("ALTER TABLE replicate_tasks ADD COLUMN error_message TEXT NULL AFTER status");
  }
  const replicateColumnsToAdd = [
    ["provider", "VARCHAR(64) NULL AFTER frame_count"],
    ["analysis_mode", "VARCHAR(64) NULL AFTER provider"],
    ["stage", "VARCHAR(64) NOT NULL DEFAULT 'completed' AFTER analysis_mode"],
    ["attempt_count", "INT NOT NULL DEFAULT 0 AFTER stage"],
    ["provider_request_id", "VARCHAR(255) NULL AFTER attempt_count"],
    ["provider_status_code", "INT NULL AFTER provider_request_id"],
    ["latency_ms", "INT NULL AFTER provider_status_code"],
    ["input_tokens", "INT NULL AFTER latency_ms"],
    ["output_tokens", "INT NULL AFTER input_tokens"],
    ["input_duration_seconds", "DECIMAL(10, 3) NULL AFTER output_tokens"],
    ["input_size_bytes", "BIGINT UNSIGNED NULL AFTER input_duration_seconds"],
    ["fallback_reason", "TEXT NULL AFTER input_size_bytes"],
    ["quality_warning", "TEXT NULL AFTER fallback_reason"],
    ["error_code", "VARCHAR(64) NULL AFTER quality_warning"],
    ["analysis_json", "JSON NULL AFTER error_code"]
  ];
  for (const [columnName, definition] of replicateColumnsToAdd) {
    if (!replicateColumnNames.has(columnName)) {
      await pool.query(`ALTER TABLE replicate_tasks ADD COLUMN ${columnName} ${definition}`);
    }
  }

  const runningTaskTables = [
    ["image_generation_tasks", "idx_image_tasks_user_status"],
    ["video_generation_tasks", "idx_video_tasks_user_status"],
    ["digital_human_tasks", "idx_digital_human_user_status"],
    ["image_digital_human_tasks", "idx_image_digital_human_user_status"],
    ["motion_transfer_tasks", "idx_motion_tasks_user_status"],
    ["face_swap_tasks", "idx_face_swap_tasks_user_status"],
    ["watermark_tasks", "idx_watermark_tasks_user_status"],
    ["remove_bg_tasks", "idx_remove_bg_tasks_user_status"],
    ["enhance_tasks", "idx_enhance_tasks_user_status"],
    ["article_generation_packages", "idx_article_packages_user_status"],
    ["music_tasks", "idx_music_tasks_user_status"],
    ["replicate_tasks", "idx_replicate_tasks_user_status"],
  ];
  for (const [tableName, indexName] of runningTaskTables) {
    await ensureIndex(pool, tableName, indexName, "user_id, status");
  }
}

async function seedDemoData() {
  const pool = getPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    await connection.query(
      `INSERT INTO users (external_id, display_name, avatar_url)
       VALUES ('demo-user', '匿名用户', '/assets/avatars/1.jpg')
       ON DUPLICATE KEY UPDATE avatar_url = IFNULL(NULLIF(avatar_url, ''), VALUES(avatar_url))`
    );

    await connection.query(
      `INSERT INTO users (external_id, display_name, avatar_url)
       VALUES ('guest-user', '游客', '/assets/avatars/2.jpg')
       ON DUPLICATE KEY UPDATE display_name = VALUES(display_name), avatar_url = IFNULL(NULLIF(avatar_url, ''), VALUES(avatar_url))`
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
         VALUES (?, 'grant', ?, ?, '\u6f14\u793a\u8d26\u53f7\u521d\u59cb\u79ef\u5206')`,
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
        ('kling_3_std', 'jobs', 'kling-3.0/video', 'Kling 3.0', 'std', 'per_second', 120, 0.490,
          JSON_ARRAY('16:9','9:16','1:1'), JSON_ARRAY(3,4,5,6,7,8,9,10,11,12,13,14,15), '16:9', 6, TRUE, 90),
        ('kling_3_pro', 'jobs', 'kling-3.0/video', 'Kling 3.0 Pro', 'pro', 'per_second', 63, 0.630,
          JSON_ARRAY('16:9','9:16','1:1'), JSON_ARRAY(3,4,5,6,8,10,15), '16:9', 6, TRUE, 60),
        ('kling_3_4k', 'jobs', 'kling-3.0/video', 'Kling 3.0 4K', '4K', 'per_second', 235, 2.345,
          JSON_ARRAY('16:9','9:16','1:1'), JSON_ARRAY(3,4,5,6,8,10,15), '16:9', 6, TRUE, 70),
        ('seedance_2_0_720p', 'ark', 'doubao-seedance-2-0-260128', 'Seedance 2.0 720P', 'first-frame', 'per_second', 88, 0.875,
          JSON_ARRAY('16:9','9:16','1:1','4:3','3:4'), JSON_ARRAY(4,5,6,8,10,15), '16:9', 6, FALSE, 80),
        ('seedance_2_0_mini', 'jobs', 'bytedance/seedance-2-mini', 'Seedance 2.0 Mini', 'mini', 'per_second', 120, 0.875,
          JSON_ARRAY('16:9','9:16','1:1','4:3','3:4','21:9'), JSON_ARRAY(2,3,4,5,6,7,8,9,10,11,12,13,14,15), '16:9', 6, TRUE, 85),
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

    await connection.query("UPDATE image_model_prices SET base_points = 30");
    await connection.query(`
      UPDATE video_model_prices
      SET base_points = CASE
            WHEN model_key IN ('seedance_2_0_720p', 'seedance_2_0_mini', 'kling_3_std') THEN 120
            ELSE base_points
          END,
          enabled = CASE
            WHEN model_key IN ('seedance_2_0_720p', 'seedance_2_0_mini', 'kling_3_std') THEN TRUE
            ELSE FALSE
          END
    `);

    await connection.query(`
      INSERT INTO chat_model_prices
        (model_key, provider_type, provider_model, display_name, points_per_kie_credit, reserve_points, enabled, sort_order)
      VALUES
        ('deepseek-v4-pro', 'deepseek', 'deepseek-v4-pro', 'DeepSeek V4 Pro', 1.000, 1, TRUE, 5),
        ('qwen3.6-plus', 'qwen', 'qwen3.6-plus', 'Qwen 3.6 Plus', 1.000, 1, TRUE, 7),
        ('qwen3.7-plus', 'qwen', 'qwen3.7-plus', 'Qwen 3.7 Plus', 1.000, 1, TRUE, 8),
        ('gpt-5-6-codex', 'kie', 'gpt-5-6-sol', 'GPT5.6-codex', 4.000, 1, TRUE, 9),
        ('gpt-5-4', 'kie', 'gpt-5.4-codex', 'GPT-5.4-codex', 4.000, 1, TRUE, 10),
        ('gpt-5-5', 'kie', 'gpt-5-5', 'GPT-5.5-codex', 4.000, 1, TRUE, 20),
        ('gemini-3-6-flash-openai', 'kie', 'gemini-3-6-flash-openai', 'Gemini 3.6', 4.000, 1, TRUE, 29),
        ('gemini-3-pro', 'kie', 'gemini-3-pro', 'Gemini 3 Pro', 4.000, 1, TRUE, 30),
        ('gemini-3.1-pro-openai', 'kie', 'gemini-3.1-pro-openai', 'Gemini 3.1 pro', 4.000, 1, TRUE, 40),
        ('claude-sonnet-4-6', 'kie', 'claude-sonnet-4-6', 'Claude Sonnet 4.6', 4.000, 1, TRUE, 50),
        ('claude-opus-4-6', 'kie', 'claude-opus-4-6', 'Claude Opus 4.6', 4.000, 1, TRUE, 60),
        ('gemini-3-pro-openai', 'kie', 'gemini-3-pro-openai', 'Gemini 3 Pro', 4.000, 1, FALSE, 70),
        ('gemini-2.5-flash', 'kie', 'gemini-2.5-flash', 'Gemini 2.5 Flash', 4.000, 1, FALSE, 80)
      ON DUPLICATE KEY UPDATE
        provider_type = VALUES(provider_type),
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

async function backfillInviteCodes() {
  const pool = getPool();
  const [users] = await pool.query(
    "SELECT id FROM users WHERE invite_code IS NULL OR invite_code = '' ORDER BY id ASC"
  );
  for (const user of users) {
    const code = await createUniqueInviteCode(pool);
    await pool.query("UPDATE users SET invite_code = ? WHERE id = ? AND (invite_code IS NULL OR invite_code = '')", [
      code,
      user.id
    ]);
  }
}

export async function initDatabase() {
  await createDatabaseIfNeeded();
  await createTables();
  await seedDemoData();
  await backfillInviteCodes();
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
