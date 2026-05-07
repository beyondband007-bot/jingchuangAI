import { getPool } from "../db/pool.js";

export const DEMO_USER = "demo-user";

export async function getDemoUser(connection) {
  const [rows] = await connection.query("SELECT id, external_id FROM users WHERE external_id = ? LIMIT 1", [DEMO_USER]);
  if (rows.length === 0) {
    throw new Error("demo-user not initialized. Run npm run db:init first.");
  }
  return rows[0];
}

export async function getDemoUserCredits() {
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
