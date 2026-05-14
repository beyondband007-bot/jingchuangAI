import { randomUUID } from "crypto";
import { getPool } from "../../db/pool.js";
import { createHttpError } from "../../shared/http.js";
import {
  createSession,
  findUserByUsername,
  getSessionTokenFromRequest,
  getUserCredits,
  hashPassword,
  invalidateSessionToken,
  resolveCurrentUser,
  verifyPassword
} from "../../shared/userService.js";

const REGISTER_GRANT_POINTS = 1000;

function normalizeUsername(username) {
  return String(username || "").trim();
}

function assertCredentials({ username, password }) {
  const normalizedUsername = normalizeUsername(username);
  const normalizedPassword = String(password || "");

  if (normalizedUsername.length < 3 || normalizedUsername.length > 32) {
    throw createHttpError("用户名长度需为 3-32 个字符", 400);
  }
  if (normalizedPassword.length < 6 || normalizedPassword.length > 128) {
    throw createHttpError("密码长度需为 6-128 个字符", 400);
  }

  return { username: normalizedUsername, password: normalizedPassword };
}

function publicUser(user, credits) {
  return {
    id: user.externalId,
    username: user.username || user.displayName || "游客",
    displayName: user.displayName || user.username || "游客",
    isGuest: Boolean(user.isGuest),
    credits
  };
}

export async function getAuthState(req) {
  const user = await resolveCurrentUser(req);
  const credits = await getUserCredits(user.id);
  return { user: publicUser(user, credits.balance) };
}

export async function registerUser(payload) {
  const { username, password } = assertCredentials(payload);
  const pool = getPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const existing = await findUserByUsername(username, connection);
    if (existing) {
      throw createHttpError("用户名已存在", 409);
    }

    const passwordHash = await hashPassword(password);
    const externalId = `user-${randomUUID()}`;
    const [result] = await connection.query(
      `INSERT INTO users (external_id, username, password_hash, display_name)
       VALUES (?, ?, ?, ?)`,
      [externalId, username, passwordHash, username]
    );
    const userId = result.insertId;

    await connection.query("INSERT INTO credit_accounts (user_id, balance) VALUES (?, ?)", [
      userId,
      REGISTER_GRANT_POINTS
    ]);
    await connection.query(
      `INSERT INTO credit_transactions (user_id, type, amount, balance_after, memo)
       VALUES (?, 'grant', ?, ?, 'register initial credits')`,
      [userId, REGISTER_GRANT_POINTS, REGISTER_GRANT_POINTS]
    );

    const session = await createSession(userId, connection);
    await connection.commit();

    return {
      session,
      user: publicUser(
        {
          id: userId,
          externalId,
          username,
          displayName: username,
          isGuest: false
        },
        REGISTER_GRANT_POINTS
      )
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function loginUser(payload) {
  const { username, password } = assertCredentials(payload);
  const user = await findUserByUsername(username);
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    throw createHttpError("用户名或密码错误", 401);
  }

  const session = await createSession(user.id);
  const credits = await getUserCredits(user.id);
  return {
    session,
    user: publicUser({ ...user, isGuest: false }, credits.balance)
  };
}

export async function logoutUser(req) {
  await invalidateSessionToken(getSessionTokenFromRequest(req));
}
