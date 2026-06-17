import { getPool } from "../src/db/pool.js";

async function main() {
  const pool = getPool();
  const [rows] = await pool.query(
    "SELECT id, feature, public_url, provider_asset_id, status, error_message, created_at FROM ark_virtual_assets WHERE feature LIKE 'face-swap%' ORDER BY id DESC LIMIT 10"
  );
  console.table(rows);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
