import { createHmac, randomUUID, timingSafeEqual } from "crypto";
import { config } from "../../config/index.js";
import { getPool } from "../../db/pool.js";
import { createHttpError } from "../../shared/http.js";
import {
  createSession,
  findUserByUsername,
  getSessionTokenFromRequest,
  getUserCredits,
  hashPassword,
  invalidateSessionToken,
  invalidateUserSessions,
  resolveCurrentUser,
  verifyPassword
} from "../../shared/userService.js";

const REGISTER_GRANT_POINTS = 1000;
const SECURITY_QUESTION_COUNT = 3;
const PASSWORD_RESET_CHALLENGE_TTL_MS = 10 * 60 * 1000;

const SECURITY_QUESTIONS = [
  { key: "first_school", text: "你的第一所学校叫什么？" },
  { key: "childhood_friend", text: "你童年最好的朋友叫什么？" },
  { key: "favorite_teacher", text: "你印象最深的老师叫什么？" },
  { key: "birth_city", text: "你出生的城市是哪里？" },
  { key: "first_pet", text: "你的第一只宠物叫什么？" },
  { key: "favorite_book", text: "你最喜欢的一本书叫什么？" },
  { key: "mother_hometown", text: "你母亲的家乡在哪里？" },
  { key: "first_job", text: "你的第一份工作或实习单位叫什么？" }
];

const SECURITY_QUESTION_MAP = new Map(SECURITY_QUESTIONS.map((question) => [question.key, question]));

function normalizeUsername(username) {
  return String(username || "").trim();
}

function normalizeSecurityAnswer(answer) {
  return String(answer || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
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

function assertNewPassword(password) {
  const normalizedPassword = String(password || "");
  if (normalizedPassword.length < 6 || normalizedPassword.length > 128) {
    throw createHttpError("密码长度需为 6-128 个字符", 400);
  }
  return normalizedPassword;
}

function assertSecurityQuestions(securityQuestions) {
  if (!Array.isArray(securityQuestions) || securityQuestions.length !== SECURITY_QUESTION_COUNT) {
    throw createHttpError("请设置 3 个安全问题", 400);
  }

  const seen = new Set();
  return securityQuestions.map((item) => {
    const questionKey = String(item?.questionKey || "").trim();
    const answer = normalizeSecurityAnswer(item?.answer);

    if (!SECURITY_QUESTION_MAP.has(questionKey)) {
      throw createHttpError("安全问题无效", 400);
    }
    if (seen.has(questionKey)) {
      throw createHttpError("安全问题不能重复", 400);
    }
    if (answer.length < 2 || answer.length > 80) {
      throw createHttpError("安全问题答案需为 2-80 个字符", 400);
    }

    seen.add(questionKey);
    return { questionKey, answer };
  });
}

function getResetChallengeSecret() {
  return (
    process.env.AUTH_RESET_SECRET ||
    process.env.SESSION_SECRET ||
    config.db.password ||
    "jingchuang-ai-password-reset-dev-secret"
  );
}

function signResetChallenge(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", getResetChallengeSecret()).update(body).digest("base64url");
  return `${body}.${signature}`;
}

function readResetChallenge(challengeId) {
  const [body, signature] = String(challengeId || "").split(".");
  if (!body || !signature) {
    throw createHttpError("找回密码验证已失效，请重新获取问题", 400);
  }

  const expected = createHmac("sha256", getResetChallengeSecret()).update(body).digest("base64url");
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (signatureBuffer.length !== expectedBuffer.length || !timingSafeEqual(signatureBuffer, expectedBuffer)) {
    throw createHttpError("找回密码验证已失效，请重新获取问题", 400);
  }

  let payload;
  try {
    payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch {
    throw createHttpError("找回密码验证已失效，请重新获取问题", 400);
  }

  if (!payload?.userId || Number(payload.expiresAt) < Date.now()) {
    throw createHttpError("找回密码验证已失效，请重新获取问题", 400);
  }
  return payload;
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

export function getSecurityQuestions() {
  return { questions: SECURITY_QUESTIONS };
}

export async function registerUser(payload) {
  const { username, password } = assertCredentials(payload);
  const securityQuestions = assertSecurityQuestions(payload?.securityQuestions);
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

    for (const question of securityQuestions) {
      const answerHash = await hashPassword(question.answer);
      await connection.query(
        `INSERT INTO user_security_questions (user_id, question_key, answer_hash)
         VALUES (?, ?, ?)`,
        [userId, question.questionKey, answerHash]
      );
    }

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

export async function createPasswordResetChallenge(payload) {
  const username = normalizeUsername(payload?.username);
  if (!username) {
    throw createHttpError("请输入用户名", 400);
  }

  const user = await findUserByUsername(username);
  if (!user) {
    throw createHttpError("账号未设置安全问题，无法通过此方式找回密码", 404);
  }

  const [rows] = await getPool().query(
    `SELECT question_key AS questionKey
     FROM user_security_questions
     WHERE user_id = ?`,
    [user.id]
  );
  if (rows.length === 0) {
    throw createHttpError("账号未设置安全问题，无法通过此方式找回密码", 404);
  }

  const candidates = rows.filter((row) => SECURITY_QUESTION_MAP.has(row.questionKey));
  if (candidates.length === 0) {
    throw createHttpError("账号未设置安全问题，无法通过此方式找回密码", 404);
  }

  const challengeId = signResetChallenge({
    userId: user.id,
    username,
    expiresAt: Date.now() + PASSWORD_RESET_CHALLENGE_TTL_MS
  });

  return {
    challengeId,
    questions: candidates.map((candidate) => {
      const question = SECURITY_QUESTION_MAP.get(candidate.questionKey);
      return {
        questionKey: candidate.questionKey,
        questionText: question.text
      };
    })
  };
}

export async function resetPasswordWithSecurityAnswer(payload) {
  const username = normalizeUsername(payload?.username);
  const questionKey = String(payload?.questionKey || "").trim();
  const newPassword = assertNewPassword(payload?.newPassword);
  const answer = normalizeSecurityAnswer(payload?.answer);
  if (!username) {
    throw createHttpError("请输入用户名", 400);
  }
  if (!SECURITY_QUESTION_MAP.has(questionKey)) {
    throw createHttpError("请选择安全问题", 400);
  }
  if (answer.length < 2 || answer.length > 80) {
    throw createHttpError("安全问题答案错误", 401);
  }

  const challenge = readResetChallenge(payload?.challengeId);
  if (challenge.username !== username) {
    throw createHttpError("找回密码验证已失效，请重新获取问题", 400);
  }

  const user = await findUserByUsername(username);
  if (!user || Number(user.id) !== Number(challenge.userId)) {
    throw createHttpError("安全问题答案错误", 401);
  }

  const [rows] = await getPool().query(
    `SELECT answer_hash AS answerHash
     FROM user_security_questions
     WHERE user_id = ? AND question_key = ?
     LIMIT 1`,
    [user.id, questionKey]
  );
  const securityQuestion = rows[0] || null;
  if (!securityQuestion || !(await verifyPassword(answer, securityQuestion.answerHash))) {
    throw createHttpError("安全问题答案错误", 401);
  }

  const passwordHash = await hashPassword(newPassword);
  const pool = getPool();
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.query("UPDATE users SET password_hash = ? WHERE id = ?", [passwordHash, user.id]);
    await invalidateUserSessions(user.id, connection);
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  return { ok: true };
}
