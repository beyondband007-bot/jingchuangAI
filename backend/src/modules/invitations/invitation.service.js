import { randomBytes } from "crypto";
import { getPool } from "../../db/pool.js";
import { createHttpError } from "../../shared/http.js";

export const INVITE_REWARD_POINTS = 200;

const INVITE_CODE_PATTERN = /^[A-Z0-9]{6,32}$/;
const EVENT_TYPE_PATTERN = /^[a-z0-9_.:-]{1,64}$/i;

function createInviteCode() {
  return randomBytes(5).toString("base64url").replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 8);
}

export function normalizeInviteCode(value) {
  const code = String(value || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  return INVITE_CODE_PATTERN.test(code) ? code : "";
}

function buildInviteLink(origin, inviteCode) {
  const base = String(origin || "").replace(/\/+$/, "");
  return `${base || "http://127.0.0.1:8088"}/#/home?invite=${encodeURIComponent(inviteCode)}`;
}

async function createUniqueInviteCode(connection) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const code = createInviteCode();
    const [rows] = await connection.query("SELECT id FROM users WHERE invite_code = ? LIMIT 1", [code]);
    if (rows.length === 0) return code;
  }
  throw new Error("Failed to generate unique invite code.");
}

export async function ensureUserInviteCode(userId, connection = getPool()) {
  const [users] = await connection.query("SELECT invite_code AS inviteCode FROM users WHERE id = ? LIMIT 1", [userId]);
  const existingCode = normalizeInviteCode(users[0]?.inviteCode);
  if (existingCode) return existingCode;

  const inviteCode = await createUniqueInviteCode(connection);
  await connection.query("UPDATE users SET invite_code = ? WHERE id = ? AND (invite_code IS NULL OR invite_code = '')", [
    inviteCode,
    userId
  ]);
  return inviteCode;
}

export async function getInvitationProfile(user, origin) {
  if (!user?.id || user.isGuest) {
    throw createHttpError("请先登录", 401);
  }
  const inviteCode = await ensureUserInviteCode(user.id);
  return {
    inviteCode,
    inviteLink: buildInviteLink(origin, inviteCode),
    rewardPoints: INVITE_REWARD_POINTS
  };
}

export async function trackInvitationEvent({ eventType, inviteCode, userId = null, payload = null }, connection = getPool()) {
  const type = String(eventType || "").trim();
  if (!EVENT_TYPE_PATTERN.test(type)) return { ok: false };
  const code = normalizeInviteCode(inviteCode) || null;
  const safePayload = payload && typeof payload === "object" ? payload : {};
  await connection.query(
    `INSERT INTO invite_events (event_type, invite_code, user_id, payload_json)
     VALUES (?, ?, ?, ?)`,
    [type, code, userId || null, JSON.stringify(safePayload)]
  );
  return { ok: true };
}

async function addInviteCredits(connection, { userId, relatedUserId, bindingId, memo }) {
  const [accounts] = await connection.query("SELECT balance FROM credit_accounts WHERE user_id = ? FOR UPDATE", [userId]);
  if (accounts.length === 0) {
    await connection.query("INSERT INTO credit_accounts (user_id, balance) VALUES (?, 0)", [userId]);
    accounts.push({ balance: 0 });
  }
  const balanceAfter = Number(accounts[0].balance || 0) + INVITE_REWARD_POINTS;
  await connection.query("UPDATE credit_accounts SET balance = ? WHERE user_id = ?", [balanceAfter, userId]);
  await connection.query(
    `INSERT INTO credit_transactions
       (user_id, task_id, type, amount, balance_after, memo, related_user_id, invite_binding_id)
     VALUES (?, NULL, 'invitegift', ?, ?, ?, ?, ?)`,
    [userId, INVITE_REWARD_POINTS, balanceAfter, memo, relatedUserId, bindingId]
  );
  return balanceAfter;
}

export async function grantInvitationRewardForNewUser(connection, { inviteCode, inviteeUser }) {
  const code = normalizeInviteCode(inviteCode);
  if (!code || !inviteeUser?.id) return { granted: false, inviteeBalance: null };

  const [inviters] = await connection.query(
    "SELECT id FROM users WHERE invite_code = ? LIMIT 1 FOR UPDATE",
    [code]
  );
  const inviter = inviters[0] || null;
  if (!inviter || Number(inviter.id) === Number(inviteeUser.id)) {
    return { granted: false, inviteeBalance: null };
  }

  try {
    const [result] = await connection.query(
      `INSERT INTO invite_bindings
         (inviter_user_id, invitee_user_id, invite_code, reward_status, reward_points)
       VALUES (?, ?, ?, 'pending', ?)`,
      [inviter.id, inviteeUser.id, code, INVITE_REWARD_POINTS]
    );
    const bindingId = result.insertId;

    await addInviteCredits(connection, {
      userId: inviter.id,
      relatedUserId: inviteeUser.id,
      bindingId,
      memo: "邀请有礼奖励"
    });
    const inviteeBalance = await addInviteCredits(connection, {
      userId: inviteeUser.id,
      relatedUserId: inviter.id,
      bindingId,
      memo: "受邀注册奖励"
    });
    await connection.query(
      "UPDATE invite_bindings SET reward_status = 'granted', rewarded_at = CURRENT_TIMESTAMP WHERE id = ?",
      [bindingId]
    );
    await trackInvitationEvent({
      eventType: "invite.reward_granted",
      inviteCode: code,
      userId: inviter.id,
      payload: {
        bindingId,
        inviterUserId: inviter.id,
        inviteeUserId: inviteeUser.id,
        rewardPoints: INVITE_REWARD_POINTS
      }
    }, connection);
    return { granted: true, inviteeBalance, bindingId, inviterUserId: inviter.id };
  } catch (error) {
    if (error?.code === "ER_DUP_ENTRY") {
      return { granted: false, inviteeBalance: null };
    }
    throw error;
  }
}
