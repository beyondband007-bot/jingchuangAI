import mysql from "mysql2/promise";
import { config } from "../config/index.js";

let pool;

export function getPool() {
  if (!pool) {
    pool = mysql.createPool(config.db);
  }
  return pool;
}

export async function getServerConnection() {
  return mysql.createConnection({
    host: config.db.host,
    port: config.db.port,
    user: config.db.user,
    password: config.db.password,
    multipleStatements: true
  });
}

export async function checkDatabase() {
  const connection = await getPool().getConnection();
  try {
    await connection.ping();
    const [rows] = await connection.query("SELECT DATABASE() AS databaseName");
    return { ok: true, database: rows[0]?.databaseName || config.db.database };
  } finally {
    connection.release();
  }
}
