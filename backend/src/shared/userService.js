import { AsyncLocalStorage } from "async_hooks";
import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { getPool } from "../db/pool.js";

export const DEMO_USER = "demo-user";
export const GUEST_USER = "guest-user";
export const SESSION_COOKIE_NAME = "jc_session";
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const userContext = new AsyncLocalStorage();
const scrypt = promisify(scryptCallback);

export function getCurrentUser() {
  return userContext.getStore()?.user || null;
}

export function getCurrentExternalId() {
  return getCurrentUser()?.externalId || GUEST_USER;
}

export async function findUserByExternalId(externalId, connection = getPool()) {
  const [rows] = await connection.query(
    `SELECT id, external_id AS externalId, display_name AS displayName, username, phone, email
     FROM users
     WHERE external_id = ?
     LIMIT 1`,
    [externalId]
  );
  return rows[0] || null;
}

export async function findUserByUsername(username, connection = getPool()) {
  const [rows] = await connection.query(
    `SELECT id, external_id AS externalId, display_name AS displayName, username, phone, email,
       password_hash AS passwordHash
     FROM users
     WHERE username = ?
     LIMIT 1`,
    [username]
  );
  return rows[0] || null;
}

export async function findUserByPhone(phone, connection = getPool()) {
  const [rows] = await connection.query(
    `SELECT id, external_id AS externalId, display_name AS displayName, username, phone, email,
       password_hash AS passwordHash
     FROM users
     WHERE phone = ?
     LIMIT 1`,
    [phone]
  );
  return rows[0] || null;
}

export async function findUserByLoginIdentifier(identifier, connection = getPool()) {
  const [rows] = await connection.query(
    `SELECT id, external_id AS externalId, display_name AS displayName, username, phone, email,
       password_hash AS passwordHash
     FROM users
     WHERE username = ? OR phone = ? OR LOWER(email) = ?
     LIMIT 1`,
    [identifier, identifier, identifier]
  );
  return rows[0] || null;
}

export async function findUserById(userId, connection = getPool()) {
  const [rows] = await connection.query(
    `SELECT id, external_id AS externalId, display_name AS displayName, username, phone, email
     FROM users
     WHERE id = ?
     LIMIT 1`,
    [userId]
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
      displayName: currentUser.displayName,
      username: currentUser.username,
      phone: currentUser.phone,
      email: currentUser.email
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
    displayName: user.displayName,
    username: user.username,
    phone: user.phone,
    email: user.email
  };
}

export function parseCookies(cookieHeader = "") {
  return cookieHeader
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce((cookies, part) => {
      const index = part.indexOf("=");
      if (index === -1) return cookies;
      const key = part.slice(0, index);
      const value = part.slice(index + 1);
      try {
        cookies[key] = decodeURIComponent(value);
      } catch {
        cookies[key] = value;
      }
      return cookies;
    }, {});
}

export function getSessionTokenFromRequest(req) {
  return parseCookies(req.headers.cookie || "")[SESSION_COOKIE_NAME] || "";
}

function hashToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

export async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = await scrypt(password, salt, 64);
  return `scrypt:${salt}:${derivedKey.toString("hex")}`;
}

export async function verifyPassword(password, passwordHash) {
  const [algorithm, salt, storedKey] = String(passwordHash || "").split(":");
  if (algorithm !== "scrypt" || !salt || !storedKey) return false;
  const derivedKey = await scrypt(password, salt, 64);
  const storedBuffer = Buffer.from(storedKey, "hex");
  if (storedBuffer.length !== derivedKey.length) return false;
  return timingSafeEqual(storedBuffer, derivedKey);
}

export async function createSession(userId, connection = getPool()) {
  const token = randomBytes(32).toString("base64url");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await connection.query(
    `INSERT INTO auth_sessions (user_id, token_hash, expires_at)
     VALUES (?, ?, ?)`,
    [userId, tokenHash, expiresAt]
  );
  return { token, expiresAt };
}

export async function findUserBySessionToken(token, connection = getPool()) {
  if (!token) return null;
  const tokenHash = hashToken(token);
  const [rows] = await connection.query(
    `SELECT u.id, u.external_id AS externalId, u.display_name AS displayName, u.username, u.phone, u.email,
       s.id AS sessionId
     FROM auth_sessions s
     INNER JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = ? AND s.expires_at > CURRENT_TIMESTAMP
     LIMIT 1`,
    [tokenHash]
  );
  const user = rows[0] || null;
  if (user?.sessionId) {
    await connection.query("UPDATE auth_sessions SET last_seen_at = CURRENT_TIMESTAMP WHERE id = ?", [user.sessionId]);
  }
  return user;
}

export async function invalidateSessionToken(token, connection = getPool()) {
  if (!token) return;
  await connection.query("DELETE FROM auth_sessions WHERE token_hash = ?", [hashToken(token)]);
}

export async function invalidateUserSessions(userId, connection = getPool()) {
  await connection.query("DELETE FROM auth_sessions WHERE user_id = ?", [userId]);
}

export async function resolveCurrentUser(req) {
  const sessionUser = await findUserBySessionToken(getSessionTokenFromRequest(req));
  if (sessionUser?.id) {
    return {
      id: sessionUser.id,
      externalId: sessionUser.externalId,
      displayName: sessionUser.displayName,
      username: sessionUser.username,
      phone: sessionUser.phone,
      email: sessionUser.email,
      isGuest: false
    };
  }

  const user = await findUserByExternalId(GUEST_USER, getPool());
  if (!user) {
    throw new Error("guest-user not initialized. Run npm run db:init first.");
  }
  return {
    id: user.id,
    externalId: user.externalId,
    displayName: user.displayName || "游客",
    username: user.username,
    phone: user.phone,
    email: user.email,
    isGuest: true
  };
}

export async function attachCurrentUser(req, _res, next) {
  try {
    const currentUser = await resolveCurrentUser(req);
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
