import { getPool } from "../src/db/pool.js";

async function main() {
  const pool = getPool();
  const connection = await pool.getConnection();
  try {
    const [rows] = await connection.query(
      "SELECT u.id, ca.balance FROM users u LEFT JOIN credit_accounts ca ON ca.user_id = u.id WHERE u.external_id = ?",
      ["guest-user"]
    );
    if (!rows.length) {
      console.error("guest-user not found");
      process.exit(1);
    }
    const { id, balance } = rows[0];
    await connection.query(
      "INSERT INTO credit_accounts (user_id, balance) VALUES (?, ?) ON DUPLICATE KEY UPDATE balance = balance + VALUES(balance)",
      [id, 1000]
    );
    console.log(`Added 1000 credits to guest-user (${id}). New balance: ${(balance || 0) + 1000}`);
  } finally {
    connection.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
