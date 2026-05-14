import { AsyncLocalStorage } from "async_hooks";
import { getPool } from "../db/pool.js";

export const DEMO_USER = "demo-user";
const userContext = new AsyncLocalStorage();

export function getCurrentUser() {
  return userContext.getStore()?.user || null;
}

export function getCurrentExternalId() {
  return getCurrentUser()?.externalId || DEMO_USER;
}

export async function findUserByExternalId(externalId, connection = getPool()) {
  const [rows] = await connection.query(
    "SELECT id, external_id AS externalId, display_name AS displayName FROM users WHERE external_id = ? LIMIT 1",
    [externalId]
  );
  return rows[0] || null;
}

export async function getDemoUser(connection) {
  const currentUser = getCurrentUser();
  if (currentUser?.id) {
    return {
      id: currentUser.id,
      external_id: currentUser.externalId,
      externalId: currentUser.externalId,
      displayName: currentUser.displayName
    };
  }

  const user = await findUserByExternalId(DEMO_USER, connection);
  if (!user) {
    throw new Error("demo-user not initialized. Run npm run db:init first.");
  }
  return {
    id: user.id,
    external_id: user.externalId,
    externalId: user.externalId,
    displayName: user.displayName
  };
}

export async function attachCurrentUser(req, _res, next) {
  try {
    const user = await getDemoUser(getPool());
    const currentUser = {
      id: user.id,
      externalId: user.externalId || user.external_id,
      displayName: user.displayName
    };
    req.user = currentUser;
    userContext.run({ user: currentUser }, next);
  } catch (error) {
    next(error);
  }
}

export async function getUserCredits(userId) {
  const [rows] = await getPool().query(
    `SELECT u.external_id AS userId, ca.balance
     FROM users u
     INNER JOIN credit_accounts ca ON ca.user_id = u.id
     WHERE u.id = ?
     LIMIT 1`,
    [userId]
  );
  if (rows.length === 0) {
    throw new Error("user credit account not initialized.");
  }
  return { userId: rows[0].userId, balance: rows[0].balance };
}

export async function getDemoUserCredits() {
  const user = await getDemoUser(getPool());
  return getUserCredits(user.id);
}
