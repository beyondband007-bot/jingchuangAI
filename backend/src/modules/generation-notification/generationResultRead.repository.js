import { getPool } from "../../db/pool.js";

export function createGenerationResultReadRepository(pool) {
  if (!pool || typeof pool.query !== "function") {
    throw new TypeError("Generation result read repository requires a database pool");
  }

  return Object.freeze({
    async listReadResourceKeys({ userId, sourceType, resourceKeys }) {
      const uniqueResourceKeys = [...new Set(resourceKeys || [])];
      if (uniqueResourceKeys.length === 0) return new Set();

      const placeholders = uniqueResourceKeys.map(() => "?").join(",");
      const [rows] = await pool.query(
        `SELECT resource_key
         FROM generation_result_reads
         WHERE user_id = ? AND source_type = ? AND resource_key IN (${placeholders})`,
        [userId, sourceType, ...uniqueResourceKeys],
      );
      return new Set(rows.map((row) => row.resource_key));
    },

    async insertReadReceipt({ userId, sourceType, resourceKey }) {
      await pool.query(
        `INSERT INTO generation_result_reads (user_id, source_type, resource_key)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE read_at = read_at`,
        [userId, sourceType, resourceKey],
      );
    },
  });
}

function getDefaultRepository() {
  return createGenerationResultReadRepository(getPool());
}

export async function listReadResourceKeys(input) {
  return getDefaultRepository().listReadResourceKeys(input);
}

export async function insertReadReceipt(input) {
  return getDefaultRepository().insertReadReceipt(input);
}
