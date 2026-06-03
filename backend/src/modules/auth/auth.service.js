import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from "crypto";
import https from "https";
import { config } from "../../config/index.js";
import { getPool } from "../../db/pool.js";
import { createHttpError } from "../../shared/http.js";
import {
  createSession,
  findUserByLoginIdentifier,
  findUserByPhone,
  getSessionTokenFromRequest,
  getUserCredits,
  hashPassword,
  invalidateSessionToken,
  invalidateUserSessions,
  resolveCurrentUser,
  verifyPassword
} from "../../shared/userService.js";

const REGISTER_GRANT_POINTS = 1000;
const SMS_SEND_INTERVAL_MS = 60 * 1000;
const SMS_MAX_ATTEMPTS = 5;
const SMS_SCENES = new Set(["register", "login", "password_reset"]);
const CAPTCHA_TYPE_SLIDER = 9;

function assertPassword(password) {
  const normalizedPassword = String(password || "");
  if (normalizedPassword.length < 6 || normalizedPassword.length > 128) {
    throw createHttpError("密码长度需为 6-128 个字符", 400);
  }
  return normalizedPassword;
}

function assertSmsCode(code) {
  const normalizedCode = String(code || "").trim();
  if (!/^\d{6}$/.test(normalizedCode)) {
    throw createHttpError("请输入 6 位验证码", 400);
  }
  return normalizedCode;
}

function normalizeSmsScene(scene) {
  const normalizedScene = String(scene || "").trim();
  if (!SMS_SCENES.has(normalizedScene)) {
    throw createHttpError("验证码场景无效", 400);
  }
  return normalizedScene;
}

export function normalizePhone(phone) {
  const value = String(phone || "").trim().replace(/[\s-]/g, "");
  if (/^1\d{10}$/.test(value)) return value;
  if (/^861\d{10}$/.test(value)) return value.slice(2);
  if (/^\+861\d{10}$/.test(value)) return value.slice(3);
  throw createHttpError("请输入有效的手机号", 400);
}

function normalizeEmail(email) {
  const value = String(email || "").trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? value : "";
}

function normalizeLoginIdentifier(identifier) {
  const value = String(identifier || "").trim();
  if (!value) {
    throw createHttpError("请输入手机号、邮箱或用户名", 400);
  }
  try {
    return normalizePhone(value);
  } catch {
    return normalizeEmail(value) || value;
  }
}

function toE164Phone(phone) {
  return `+86${phone}`;
}

function getSmsCodeTtlMs() {
  const minutes = Number(config.sms.codeExpireMinutes || 5);
  return (Number.isFinite(minutes) && minutes > 0 ? minutes : 5) * 60 * 1000;
}

function hashCode(scene, target, code, salt) {
  return createHash("sha256").update(`${salt}:${scene}:${target}:${code}`, "utf8").digest("hex");
}

function timingSafeEqualHex(left, right) {
  const leftBuffer = Buffer.from(String(left || ""), "hex");
  const rightBuffer = Buffer.from(String(right || ""), "hex");
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function publicUser(user, credits) {
  return {
    id: user.externalId,
    username: user.username || null,
    displayName: user.displayName || "游客",
    phone: user.phone || null,
    email: user.email || null,
    isGuest: Boolean(user.isGuest),
    credits
  };
}

async function grantInitialCredits(userId, connection) {
  await connection.query("INSERT INTO credit_accounts (user_id, balance) VALUES (?, ?)", [
    userId,
    REGISTER_GRANT_POINTS
  ]);
  await connection.query(
    `INSERT INTO credit_transactions (user_id, type, amount, balance_after, memo)
     VALUES (?, 'grant', ?, ?, 'register initial credits')`,
    [userId, REGISTER_GRANT_POINTS, REGISTER_GRANT_POINTS]
  );
}

function createRandomExternalId() {
  return `user_${randomBytes(6).toString("hex")}`;
}

function isExternalIdDuplicate(error) {
  const message = `${error?.message || ""} ${error?.sqlMessage || ""}`;
  return error?.code === "ER_DUP_ENTRY" && /external_id/i.test(message);
}

function isUserIdentityDuplicate(error) {
  const message = `${error?.message || ""} ${error?.sqlMessage || ""}`;
  return error?.code === "ER_DUP_ENTRY" && /(username|phone)/i.test(message);
}

async function createPhoneUser(phone, connection, passwordHash = null) {
  let result;
  let externalId;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    externalId = createRandomExternalId();
    try {
      [result] = await connection.query(
        `INSERT INTO users (external_id, username, phone, password_hash, display_name)
         VALUES (?, ?, ?, ?, ?)`,
        [externalId, phone, phone, passwordHash, phone]
      );
      break;
    } catch (error) {
      if (isExternalIdDuplicate(error)) continue;
      if (isUserIdentityDuplicate(error)) {
        throw createHttpError("手机号或用户名已被占用", 409);
      }
      throw error;
    }
  }
  if (!result) {
    throw createHttpError("用户 ID 生成失败，请重试", 500);
  }
  await grantInitialCredits(result.insertId, connection);
  return {
    id: result.insertId,
    externalId,
    username: phone,
    displayName: phone,
    phone,
    email: null,
    isGuest: false
  };
}

async function verifySmsCode(scene, phone, code, connection) {
  const normalizedCode = assertSmsCode(code);
  const [rows] = await connection.query(
    `SELECT id, code_hash AS codeHash, salt, expires_at AS expiresAt, attempts
     FROM auth_verification_codes
     WHERE channel = 'sms' AND scene = ? AND target = ? AND consumed_at IS NULL
     ORDER BY id DESC
     LIMIT 1
     FOR UPDATE`,
    [scene, phone]
  );
  const saved = rows[0] || null;
  if (!saved) {
    throw createHttpError("请先获取验证码", 400);
  }

  if (new Date(saved.expiresAt).getTime() < Date.now()) {
    await connection.query("UPDATE auth_verification_codes SET consumed_at = CURRENT_TIMESTAMP WHERE id = ?", [saved.id]);
    throw createHttpError("验证码已过期，请重新获取", 400);
  }

  if (Number(saved.attempts || 0) >= SMS_MAX_ATTEMPTS) {
    await connection.query("UPDATE auth_verification_codes SET consumed_at = CURRENT_TIMESTAMP WHERE id = ?", [saved.id]);
    throw createHttpError("验证码错误次数过多，请重新获取", 400);
  }

  const nextAttempts = Number(saved.attempts || 0) + 1;
  const expectedHash = hashCode(scene, phone, normalizedCode, saved.salt);
  if (!timingSafeEqualHex(expectedHash, saved.codeHash)) {
    await connection.query(
      `UPDATE auth_verification_codes
       SET attempts = ?, consumed_at = IF(? >= ?, CURRENT_TIMESTAMP, consumed_at)
       WHERE id = ?`,
      [nextAttempts, nextAttempts, SMS_MAX_ATTEMPTS, saved.id]
    );
    throw createHttpError(
      nextAttempts >= SMS_MAX_ATTEMPTS ? "验证码错误次数过多，请重新获取" : "验证码不正确",
      400
    );
  }

  await connection.query(
    "UPDATE auth_verification_codes SET attempts = ?, consumed_at = CURRENT_TIMESTAMP WHERE id = ?",
    [nextAttempts, saved.id]
  );
}

export async function getAuthState(req) {
  const user = await resolveCurrentUser(req);
  const credits = await getUserCredits(user.id);
  return { user: publicUser(user, credits.balance) };
}

export function getSecurityQuestions() {
  return { questions: [] };
}

export function getCaptchaClientConfig() {
  const provider = config.captcha.provider || "tencent";
  const enabled =
    provider === "tencent" &&
    Boolean(config.captcha.tencentAppId) &&
    (config.captcha.dryRun ||
      Boolean(
        config.captcha.tencentAppSecretKey &&
          config.tencentCloud.secretId &&
          config.tencentCloud.secretKey
      ));
  return {
    provider,
    appId: provider === "tencent" ? config.captcha.tencentAppId : "",
    enabled
  };
}

function getRequestIp(req) {
  const forwardedFor = String(req?.headers?.["x-forwarded-for"] || "")
    .split(",")[0]
    .trim();
  const value =
    forwardedFor ||
    String(req?.headers?.["x-real-ip"] || "").trim() ||
    req?.ip ||
    req?.socket?.remoteAddress ||
    "";
  return String(value).replace(/^::ffff:/, "") || "127.0.0.1";
}

function normalizeCaptchaPayload(payload) {
  const captcha = payload?.captcha || {};
  const provider = String(captcha.provider || "").trim();
  const ticket = String(captcha.ticket || "").trim();
  const randstr = String(captcha.randstr || "").trim();

  if (!provider && !ticket && !randstr) {
    throw createHttpError("请先完成验证码验证", 400);
  }
  if (provider !== "tencent") {
    throw createHttpError("验证码服务类型无效", 400);
  }
  if (!ticket || !randstr) {
    throw createHttpError("验证码参数不完整，请重新验证", 400);
  }
  return { ticket, randstr };
}

function assertTencentCaptchaConfigured() {
  if (
    config.captcha.provider !== "tencent" ||
    !config.tencentCloud.secretId ||
    !config.tencentCloud.secretKey ||
    !config.captcha.tencentAppId ||
    !config.captcha.tencentAppSecretKey
  ) {
    throw createHttpError("验证码服务未配置完整", 500);
  }
}

function getCaptchaAppIdPayloadValue() {
  const value = Number(config.captcha.tencentAppId);
  return Number.isFinite(value) ? value : config.captcha.tencentAppId;
}

function formatTencentCaptchaError(resultOrError) {
  const message = resultOrError?.CaptchaMsg || resultOrError?.message || "验证码验证失败";
  if (/AppId|appId|CaptchaAppId|not match|mismatch/i.test(message)) {
    return `验证码验证失败：CaptchaAppId 不匹配。腾讯云返回：${message}`;
  }
  if (/secret|AppSecret|key|permission|Unauthorized|AuthFailure/i.test(message)) {
    return `验证码验证失败：验证码密钥或腾讯云权限异常。腾讯云返回：${message}`;
  }
  if (/ticket|expired|expire|timeout|invalid|used|reuse|duplicate|重复|过期|无效/i.test(message)) {
    return `验证码已失效，请重新验证。腾讯云返回：${message}`;
  }
  return `验证码验证失败。腾讯云返回：${message}`;
}

async function verifyTencentCaptcha(payload, req) {
  if (config.captcha.dryRun) {
    return;
  }

  const captcha = normalizeCaptchaPayload(payload);
  assertTencentCaptchaConfigured();
  let response;
  try {
    response = await callTencentCloud({
      service: "captcha",
      host: "captcha.tencentcloudapi.com",
      version: "2019-07-22",
      action: "DescribeCaptchaResult",
      payload: {
        CaptchaType: CAPTCHA_TYPE_SLIDER,
        Ticket: captcha.ticket,
        UserIp: getRequestIp(req),
        Randstr: captcha.randstr,
        CaptchaAppId: getCaptchaAppIdPayloadValue(),
        AppSecretKey: config.captcha.tencentAppSecretKey
      }
    });
  } catch (error) {
    throw createHttpError(formatTencentCaptchaError(error), 500);
  }

  const result = response?.Response || {};
  if (Number(result.CaptchaCode) !== 1) {
    throw createHttpError(formatTencentCaptchaError(result), 400);
  }
}

export async function sendSmsCode(payload, req) {
  const scene = normalizeSmsScene(payload?.scene);
  const phone = normalizePhone(payload?.phone);
  const pool = getPool();

  const [recentRows] = await pool.query(
    `SELECT sent_at AS sentAt
     FROM auth_verification_codes
     WHERE channel = 'sms' AND scene = ? AND target = ? AND consumed_at IS NULL
     ORDER BY id DESC
     LIMIT 1`,
    [scene, phone]
  );
  const recent = recentRows[0] || null;
  if (recent) {
    const elapsed = Date.now() - new Date(recent.sentAt).getTime();
    if (elapsed < SMS_SEND_INTERVAL_MS) {
      const waitSeconds = Math.ceil((SMS_SEND_INTERVAL_MS - elapsed) / 1000);
      throw createHttpError(`请在 ${waitSeconds} 秒后再获取验证码`, 429);
    }
  }

  await verifyTencentCaptcha(payload, req);

  const code = String(randomInt(100000, 1000000));
  await sendVerificationSms(phone, code, scene);

  const salt = randomBytes(16).toString("hex");
  const expiresAt = new Date(Date.now() + getSmsCodeTtlMs());
  await pool.query(
    `INSERT INTO auth_verification_codes (channel, scene, target, code_hash, salt, expires_at, sent_at)
     VALUES ('sms', ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
    [scene, phone, hashCode(scene, phone, code, salt), salt, expiresAt]
  );

  return {
    ok: true,
    message: "短信验证码已发送",
    ...(config.sms.dryRun ? { debugCode: code } : {})
  };
}

export async function registerUser(payload) {
  const phone = normalizePhone(payload?.phone);
  const code = assertSmsCode(payload?.code);
  const password = assertPassword(payload?.password);
  const pool = getPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    const existing = await findUserByLoginIdentifier(phone, connection);
    if (existing) {
      throw createHttpError("该手机号已注册", 409);
    }

    await verifySmsCode("register", phone, code, connection);
    const passwordHash = await hashPassword(password);
    const user = await createPhoneUser(phone, connection, passwordHash);
    const session = await createSession(user.id, connection);
    await connection.commit();

    return {
      session,
      user: publicUser(user, REGISTER_GRANT_POINTS)
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function loginUser(payload) {
  const identifier = normalizeLoginIdentifier(payload?.identifier ?? payload?.username);
  const password = assertPassword(payload?.password);
  const user = await findUserByLoginIdentifier(identifier);
  if (!user) {
    throw createHttpError("账号或密码错误", 401);
  }
  if (!user.passwordHash) {
    throw createHttpError("该账号未设置密码，请使用手机号验证码登录或找回密码设置密码", 401);
  }
  if (!(await verifyPassword(password, user.passwordHash))) {
    throw createHttpError("账号或密码错误", 401);
  }

  const session = await createSession(user.id);
  const credits = await getUserCredits(user.id);
  return {
    session,
    user: publicUser({ ...user, isGuest: false }, credits.balance)
  };
}

export async function loginUserWithPhoneCode(payload) {
  const phone = normalizePhone(payload?.phone);
  const code = assertSmsCode(payload?.code);
  const pool = getPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    await verifySmsCode("login", phone, code, connection);

    let user = await findUserByPhone(phone, connection);
    let credits = REGISTER_GRANT_POINTS;
    if (!user) {
      user = await createPhoneUser(phone, connection);
    } else {
      credits = (await getUserCredits(user.id)).balance;
    }

    const session = await createSession(user.id, connection);
    await connection.commit();

    return {
      session,
      user: publicUser({ ...user, isGuest: false }, credits)
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function logoutUser(req) {
  await invalidateSessionToken(getSessionTokenFromRequest(req));
}

export async function createPasswordResetChallenge() {
  throw createHttpError("请使用手机号验证码找回密码", 410);
}

export async function resetPasswordWithSecurityAnswer(payload) {
  return resetPasswordWithSmsCode(payload);
}

export async function resetPasswordWithSmsCode(payload) {
  const phone = normalizePhone(payload?.phone);
  const code = assertSmsCode(payload?.code);
  const newPassword = assertPassword(payload?.newPassword);
  const pool = getPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    const user = await findUserByPhone(phone, connection);
    if (!user) {
      throw createHttpError("该手机号尚未注册", 404);
    }

    await verifySmsCode("password_reset", phone, code, connection);
    const passwordHash = await hashPassword(newPassword);
    await connection.query("UPDATE users SET password_hash = ? WHERE id = ?", [passwordHash, user.id]);
    await invalidateUserSessions(user.id, connection);
    await connection.commit();
    return { ok: true };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function sendVerificationSms(phone, code, scene) {
  const templateId =
    scene === "register"
      ? config.sms.registerTemplateId
      : scene === "password_reset"
        ? config.sms.reviseTemplateId
        : config.sms.loginTemplateId;

  if (config.sms.dryRun) {
    return;
  }

  if (
    !config.tencentCloud.secretId ||
    !config.tencentCloud.secretKey ||
    !config.sms.sdkAppId ||
    !templateId ||
    !config.sms.signName
  ) {
    throw createHttpError("短信服务未配置完整", 500);
  }

  const response = await callTencentCloud({
    service: "sms",
    host: "sms.tencentcloudapi.com",
    version: "2021-01-11",
    action: "SendSms",
    payload: {
      PhoneNumberSet: [toE164Phone(phone)],
      SmsSdkAppId: config.sms.sdkAppId,
      SignName: config.sms.signName,
      TemplateId: templateId,
      TemplateParamSet: getSmsTemplateParamSet(code)
    }
  }).catch((error) => {
    throw createHttpError(formatTencentSmsError(error), 500);
  });

  const status = response?.Response?.SendStatusSet?.[0];
  if (status?.Code && status.Code !== "Ok") {
    throw createHttpError(formatTencentSmsError(new Error(status.Message || status.Code)), 500);
  }
}

function getSmsTemplateParamSet(code) {
  if (config.sms.templateParamMode === "code") {
    return [code];
  }
  return [code, config.sms.codeExpireMinutes];
}

function formatTencentSmsError(error) {
  const message = error?.message || "短信验证码发送失败";
  if (/not authorized|UnauthorizedOperation|no permission|sms:SendSms/i.test(message)) {
    return "短信发送失败：当前腾讯云密钥没有 sms:SendSms 权限，请在 CAM 中给该用户授权短信发送权限";
  }
  if (/Template/i.test(message)) {
    return `短信发送失败：短信模板配置或审核状态异常。腾讯云返回：${message}`;
  }
  if (/Sign/i.test(message)) {
    return `短信发送失败：短信签名配置或审核状态异常。腾讯云返回：${message}`;
  }
  if (/Limit|Frequency|Rate/i.test(message)) {
    return `短信发送过于频繁，请稍后再试。腾讯云返回：${message}`;
  }
  return `短信验证码发送失败。腾讯云返回：${message}`;
}

function sha256Hex(value) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function hmac(key, value) {
  return createHmac("sha256", key).update(value, "utf8").digest();
}

function hmacHex(key, value) {
  return createHmac("sha256", key).update(value, "utf8").digest("hex");
}

function callTencentCloud({ service, host, version, action, payload }) {
  const body = JSON.stringify(payload);
  const algorithm = "TC3-HMAC-SHA256";
  const timestamp = Math.floor(Date.now() / 1000);
  const date = new Date(timestamp * 1000).toISOString().slice(0, 10);
  const hashedRequestPayload = sha256Hex(body);
  const canonicalHeaders = `content-type:application/json; charset=utf-8\nhost:${host}\nx-tc-action:${action.toLowerCase()}\n`;
  const signedHeaders = "content-type;host;x-tc-action";
  const canonicalRequest = [
    "POST",
    "/",
    "",
    canonicalHeaders,
    signedHeaders,
    hashedRequestPayload
  ].join("\n");
  const credentialScope = `${date}/${service}/tc3_request`;
  const stringToSign = [
    algorithm,
    timestamp,
    credentialScope,
    sha256Hex(canonicalRequest)
  ].join("\n");
  const secretDate = hmac(`TC3${config.tencentCloud.secretKey}`, date);
  const secretService = hmac(secretDate, service);
  const secretSigning = hmac(secretService, "tc3_request");
  const signature = hmacHex(secretSigning, stringToSign);
  const authorization = `${algorithm} Credential=${config.tencentCloud.secretId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  return new Promise((resolve, reject) => {
    const request = https.request(
      {
        method: "POST",
        host,
        path: "/",
        headers: {
          Authorization: authorization,
          "Content-Type": "application/json; charset=utf-8",
          Host: host,
          "X-TC-Action": action,
          "X-TC-Timestamp": String(timestamp),
          "X-TC-Version": version,
          "X-TC-Region": config.tencentCloud.region
        }
      },
      (response) => {
        let data = "";
        response.setEncoding("utf8");
        response.on("data", (chunk) => {
          data += chunk;
        });
        response.on("end", () => {
          let parsed = null;
          try {
            parsed = data ? JSON.parse(data) : null;
          } catch {
            parsed = null;
          }
          if (response.statusCode >= 400 || parsed?.Response?.Error) {
            reject(new Error(parsed?.Response?.Error?.Message || data || "腾讯云接口请求失败"));
            return;
          }
          resolve(parsed || data);
        });
      }
    );

    request.on("error", reject);
    request.write(body);
    request.end();
  });
}
