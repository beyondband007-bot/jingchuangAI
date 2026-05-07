import { createHttpError } from "./http.js";

export async function debitCredits(connection, { userId, taskId, amount, memo }) {
  const [accounts] = await connection.query("SELECT balance FROM credit_accounts WHERE user_id = ? FOR UPDATE", [userId]);
  if (accounts.length === 0 || accounts[0].balance < amount) {
    throw createHttpError("insufficient credits", 402);
  }

  const balanceAfter = accounts[0].balance - amount;
  await connection.query("UPDATE credit_accounts SET balance = ? WHERE user_id = ?", [balanceAfter, userId]);
  await connection.query(
    `INSERT INTO credit_transactions (user_id, task_id, type, amount, balance_after, memo)
     VALUES (?, ?, 'debit', ?, ?, ?)`,
    [userId, taskId, -amount, balanceAfter, memo]
  );

  return balanceAfter;
}

export async function refundCredits(connection, { userId, taskId, amount, memo }) {
  const [accounts] = await connection.query("SELECT balance FROM credit_accounts WHERE user_id = ? FOR UPDATE", [userId]);
  const balanceAfter = accounts[0].balance + amount;

  await connection.query("UPDATE credit_accounts SET balance = ? WHERE user_id = ?", [balanceAfter, userId]);
  await connection.query(
    `INSERT INTO credit_transactions (user_id, task_id, type, amount, balance_after, memo)
     VALUES (?, ?, 'refund', ?, ?, ?)`,
    [userId, taskId, amount, balanceAfter, memo]
  );

  return balanceAfter;
}
