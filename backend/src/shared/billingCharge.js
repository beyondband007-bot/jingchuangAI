import { getPool } from "../db/pool.js";
import { debitCredits, refundCredits } from "./creditService.js";

export async function chargeCredits({ userId, taskId = null, amount, memo }) {
  const points = Math.max(0, Math.ceil(Number(amount) || 0));
  if (!points) return;
  const connection = await getPool().getConnection();
  try {
    await connection.beginTransaction();
    await debitCredits(connection, { userId, taskId, amount: points, memo });
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function refundChargedCredits({ userId, taskId = null, amount, memo }) {
  const points = Math.max(0, Math.ceil(Number(amount) || 0));
  if (!points) return;
  const connection = await getPool().getConnection();
  try {
    await connection.beginTransaction();
    await refundCredits(connection, { userId, taskId, amount: points, memo });
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
