import { createHash, randomBytes } from "crypto";
import QRCode from "qrcode";
import { getPool } from "../../db/pool.js";
import { localizeCreditMemo } from "../../shared/creditService.js";
import { createHttpError } from "../../shared/http.js";
import {
  buildPrecreateParams,
  buildQueryParams,
  callAlipay,
  getAlipayAppId,
  getAlipaySellerId,
  isAlipayConfigured,
  verifyAlipayNotify
} from "./alipayClient.js";
import {
  createWechatNativeOrder,
  decryptWechatPayResource,
  getWechatPayAppId,
  getWechatPayMchId,
  isWechatPayConfigured,
  queryWechatOrder,
  verifyWechatPayNotify
} from "./wechatpayClient.js";

const POINTS_PER_YUAN = 100;
const ORDER_TTL_SECONDS = 3 * 60;
const ORDER_TTL_MS = ORDER_TTL_SECONDS * 1000;
const FINAL_ORDER_STATUSES = new Set(["PAID", "CANCELED", "CLOSED", "REFUNDED", "AMOUNT_MISMATCH"]);
const SUPPORTED_PAYMENT_PROVIDERS = new Set(["alipay", "wechat"]);
const WAITING_PAYMENT_MESSAGE = "\u7b49\u5f85\u7528\u6237\u626b\u7801\u652f\u4ed8";
const EXPIRED_MESSAGE = "\u8ba2\u5355\u5df2\u8d85\u65f6\uff0c\u672a\u5b8c\u6210\u652f\u4ed8";

function hashToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

function generateOutTradeNo() {
  return `RC${Date.now()}${randomBytes(4).toString("hex").toUpperCase()}`;
}

function normalizeAmount(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || !Number.isInteger(amount) || amount < 1) {
    throw createHttpError("\u5145\u503c\u91d1\u989d\u4e0d\u80fd\u4f4e\u4e8e 1 \u5143\uff0c\u4e14\u5fc5\u987b\u4e3a\u6574\u6570\u5143", 400);
  }
  return amount;
}

function normalizeProvider(value) {
  const provider = String(value || "alipay").trim().toLowerCase();
  if (!SUPPORTED_PAYMENT_PROVIDERS.has(provider)) {
    throw createHttpError("\u6682\u4e0d\u652f\u6301\u8be5\u652f\u4ed8\u65b9\u5f0f", 400);
  }
  return provider;
}

function amountsMatch(left, right) {
  return Number(left).toFixed(2) === Number(right).toFixed(2);
}

function isAlipayTradeNotExist(error) {
  return error?.subCode === "ACQ.TRADE_NOT_EXIST";
}

async function getOrderAgeSeconds(order, connection = getPool()) {
  const [rows] = await connection.query(
    `SELECT TIMESTAMPDIFF(SECOND, created_at, NOW()) AS ageSeconds
     FROM payment_orders
     WHERE id = ?
     LIMIT 1`,
    [order.id]
  );
  return Number(rows[0]?.ageSeconds || 0);
}

async function getOrderExpiresInSeconds(order, connection = getPool()) {
  const ageSeconds = await getOrderAgeSeconds(order, connection);
  return Math.max(0, ORDER_TTL_SECONDS - ageSeconds);
}

async function isOrderExpired(order, connection = getPool()) {
  return await getOrderAgeSeconds(order, connection) >= ORDER_TTL_SECONDS;
}

function toClientOrder(order, expiresInSeconds = null) {
  return {
    outTradeNo: order.out_trade_no,
    provider: order.provider,
    subject: order.subject,
    totalAmount: Number(order.total_amount).toFixed(2),
    points: Number(order.points || 0),
    status: order.status,
    statusMessage: order.status_message,
    paidAt: order.paid_at,
    closedAt: order.closed_at,
    lastCheckedAt: order.last_checked_at,
    createdAt: order.created_at,
    expiresInSeconds
  };
}

async function findOrderForUser(userId, outTradeNo, connection = getPool()) {
  const [rows] = await connection.query(
    `SELECT *
     FROM payment_orders
     WHERE user_id = ? AND out_trade_no = ?
     LIMIT 1`,
    [userId, outTradeNo]
  );
  if (!rows[0]) throw createHttpError("\u8ba2\u5355\u4e0d\u5b58\u5728", 404);
  return rows[0];
}

async function findOrderById(orderId, connection = getPool()) {
  const [rows] = await connection.query("SELECT * FROM payment_orders WHERE id = ? LIMIT 1", [orderId]);
  if (!rows[0]) throw createHttpError("\u8ba2\u5355\u4e0d\u5b58\u5728", 404);
  return rows[0];
}

function assertOrderToken(order, orderToken) {
  if (!orderToken || !order.client_token_hash || hashToken(orderToken) !== order.client_token_hash) {
    throw createHttpError("\u8ba2\u5355\u6821\u9a8c\u5931\u8d25", 403);
  }
}

async function recordPaymentEvent(orderId, eventType, provider, payload, connection = getPool()) {
  await connection.query(
    `INSERT INTO payment_events (order_id, event_type, provider, payload_json)
     VALUES (?, ?, ?, ?)`,
    [orderId, eventType, provider, JSON.stringify(payload || {})]
  );
}

async function markAmountMismatch(orderId, message) {
  await getPool().query(
    `UPDATE payment_orders
     SET status = 'AMOUNT_MISMATCH',
         status_message = ?,
         last_checked_at = NOW()
     WHERE id = ?`,
    [message, orderId]
  );
}

async function markOrderExpired(order, connection = getPool()) {
  if (FINAL_ORDER_STATUSES.has(order.status)) return order;
  await connection.query(
    `UPDATE payment_orders
     SET status = 'CLOSED',
         status_message = ?,
         closed_at = COALESCE(closed_at, NOW()),
         last_checked_at = NOW()
     WHERE id = ? AND status NOT IN ('PAID', 'CANCELED', 'CLOSED', 'REFUNDED', 'AMOUNT_MISMATCH')`,
    [EXPIRED_MESSAGE, order.id]
  );
  await recordPaymentEvent(order.id, "payment.expired", order.provider, { previousStatus: order.status }, connection);
  return findOrderById(order.id, connection);
}

async function markOrderPaid(orderId, data = {}) {
  const connection = await getPool().getConnection();
  try {
    await connection.beginTransaction();

    const [orders] = await connection.query("SELECT * FROM payment_orders WHERE id = ? FOR UPDATE", [orderId]);
    const order = orders[0];
    if (!order) throw createHttpError("\u8ba2\u5355\u4e0d\u5b58\u5728", 404);
    if (order.status === "PAID") {
      await connection.commit();
      return;
    }

    const [accounts] = await connection.query("SELECT * FROM credit_accounts WHERE user_id = ? FOR UPDATE", [order.user_id]);
    if (!accounts[0]) {
      await connection.query("INSERT INTO credit_accounts (user_id, balance) VALUES (?, 0)", [order.user_id]);
    }
    const [lockedAccounts] = await connection.query("SELECT * FROM credit_accounts WHERE user_id = ? FOR UPDATE", [order.user_id]);
    const account = lockedAccounts[0];
    const balanceAfter = Number(account.balance || 0) + Number(order.points || 0);
    const providerLabel = order.provider === "wechat" ? "\u5fae\u4fe1\u652f\u4ed8" : "\u652f\u4ed8\u5b9d";

    await connection.query("UPDATE credit_accounts SET balance = ? WHERE user_id = ?", [balanceAfter, order.user_id]);
    await connection.query(
      `INSERT INTO credit_transactions (user_id, task_id, type, amount, balance_after, memo)
       VALUES (?, NULL, 'recharge', ?, ?, ?)`,
      [order.user_id, Number(order.points || 0), balanceAfter, `${providerLabel}\u5145\u503c\u8ba2\u5355 ${order.out_trade_no}`]
    );
    await connection.query(
      `UPDATE payment_orders
       SET status = 'PAID',
           status_message = ?,
           paid_at = COALESCE(paid_at, NOW()),
           last_checked_at = NOW(),
           alipay_trade_no = ?,
           alipay_trade_status = ?,
           wechat_transaction_id = ?,
           wechat_trade_state = ?
       WHERE id = ?`,
      [
        "\u652f\u4ed8\u6210\u529f\uff0c\u79ef\u5206\u5df2\u5230\u8d26",
        data.alipayTradeNo || order.alipay_trade_no,
        data.alipayTradeStatus || order.alipay_trade_status,
        data.wechatTransactionId || order.wechat_transaction_id,
        data.wechatTradeState || order.wechat_trade_state,
        order.id
      ]
    );
    await recordPaymentEvent(order.id, `${order.provider === "wechat" ? "wechatpay" : "alipay"}.paid`, order.provider, data, connection);

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function applyAlipayTradeStatus(orderId, result) {
  const order = await findOrderById(orderId);
  if (result.out_trade_no && result.out_trade_no !== order.out_trade_no) {
    await markAmountMismatch(order.id, "\u652f\u4ed8\u5b9d\u67e5\u8be2\u8ba2\u5355\u53f7\u4e0d\u4e00\u81f4");
    return findOrderById(order.id);
  }
  if (result.total_amount && !amountsMatch(result.total_amount, order.total_amount)) {
    await markAmountMismatch(order.id, "\u652f\u4ed8\u5b9d\u67e5\u8be2\u91d1\u989d\u4e0d\u4e00\u81f4");
    return findOrderById(order.id);
  }

  if (["TRADE_SUCCESS", "TRADE_FINISHED"].includes(result.trade_status)) {
    await markOrderPaid(order.id, {
      alipayTradeNo: result.trade_no,
      alipayTradeStatus: result.trade_status
    });
  } else if (result.trade_status === "TRADE_CLOSED") {
    await getPool().query(
      `UPDATE payment_orders
       SET status = 'CLOSED',
           status_message = ?,
           closed_at = COALESCE(closed_at, NOW()),
           last_checked_at = NOW(),
           alipay_trade_status = ?
       WHERE id = ?`,
      ["\u4ea4\u6613\u5df2\u5173\u95ed", result.trade_status, order.id]
    );
  } else if (result.trade_status === "WAIT_BUYER_PAY") {
    const scanned = Boolean(result.buyer_logon_id || result.buyer_user_id || result.buyer_open_id);
    await getPool().query(
      `UPDATE payment_orders
       SET status = ?,
           status_message = ?,
           last_checked_at = NOW(),
           alipay_trade_status = ?
       WHERE id = ?`,
      [scanned ? "SCANNED" : "WAITING_PAYMENT", scanned ? "\u7528\u6237\u5df2\u626b\u7801\uff0c\u7b49\u5f85\u786e\u8ba4\u652f\u4ed8" : WAITING_PAYMENT_MESSAGE, result.trade_status, order.id]
    );
  }

  return findOrderById(order.id);
}

async function applyWechatPayTradeStatus(orderId, result) {
  const order = await findOrderById(orderId);
  if (result.out_trade_no && result.out_trade_no !== order.out_trade_no) {
    await markAmountMismatch(order.id, "\u5fae\u4fe1\u652f\u4ed8\u8ba2\u5355\u53f7\u4e0d\u4e00\u81f4");
    return findOrderById(order.id);
  }
  if (result.mchid && result.mchid !== getWechatPayMchId()) {
    await markAmountMismatch(order.id, "\u5fae\u4fe1\u652f\u4ed8\u5546\u6237\u53f7\u4e0d\u4e00\u81f4");
    return findOrderById(order.id);
  }
  if (result.appid && result.appid !== getWechatPayAppId()) {
    await markAmountMismatch(order.id, "\u5fae\u4fe1\u652f\u4ed8 appid \u4e0d\u4e00\u81f4");
    return findOrderById(order.id);
  }
  if (result.amount?.total !== undefined && Math.round(Number(order.total_amount) * 100) !== Number(result.amount.total)) {
    await markAmountMismatch(order.id, "\u5fae\u4fe1\u652f\u4ed8\u91d1\u989d\u4e0d\u4e00\u81f4");
    return findOrderById(order.id);
  }

  if (result.trade_state === "SUCCESS") {
    await markOrderPaid(order.id, {
      wechatTransactionId: result.transaction_id,
      wechatTradeState: result.trade_state
    });
  } else if (["CLOSED", "REVOKED"].includes(result.trade_state)) {
    await getPool().query(
      `UPDATE payment_orders
       SET status = 'CLOSED',
           status_message = ?,
           closed_at = COALESCE(closed_at, NOW()),
           last_checked_at = NOW(),
           wechat_transaction_id = ?,
           wechat_trade_state = ?
       WHERE id = ?`,
      [result.trade_state_desc || "\u4ea4\u6613\u5df2\u5173\u95ed", result.transaction_id || order.wechat_transaction_id, result.trade_state, order.id]
    );
  } else if (result.trade_state === "USERPAYING") {
    await getPool().query(
      `UPDATE payment_orders
       SET status = 'SCANNED',
           status_message = ?,
           last_checked_at = NOW(),
           wechat_transaction_id = ?,
           wechat_trade_state = ?
       WHERE id = ?`,
      [result.trade_state_desc || "\u7528\u6237\u5df2\u626b\u7801\uff0c\u7b49\u5f85\u786e\u8ba4\u652f\u4ed8", result.transaction_id || order.wechat_transaction_id, result.trade_state, order.id]
    );
  } else if (["NOTPAY", "ACCEPT"].includes(result.trade_state)) {
    await getPool().query(
      `UPDATE payment_orders
       SET status = 'WAITING_PAYMENT',
           status_message = ?,
           last_checked_at = NOW(),
           wechat_transaction_id = ?,
           wechat_trade_state = ?
       WHERE id = ?`,
      [result.trade_state_desc || WAITING_PAYMENT_MESSAGE, result.transaction_id || order.wechat_transaction_id, result.trade_state, order.id]
    );
  } else if (result.trade_state) {
    await getPool().query(
      `UPDATE payment_orders
       SET status_message = ?,
           last_checked_at = NOW(),
           wechat_transaction_id = ?,
           wechat_trade_state = ?
       WHERE id = ?`,
      [result.trade_state_desc || result.trade_state, result.transaction_id || order.wechat_transaction_id, result.trade_state, order.id]
    );
  }

  return findOrderById(order.id);
}

export async function listRechargeOrders(userId) {
  const [rows] = await getPool().query(
    `SELECT *
     FROM payment_orders
     WHERE user_id = ?
     ORDER BY created_at DESC
     LIMIT 20`,
    [userId]
  );
  return { orders: rows.map(toClientOrder) };
}

export async function createRechargeOrder(user, input) {
  if (user?.isGuest) throw createHttpError("\u8bf7\u5148\u767b\u5f55\u540e\u518d\u5145\u503c", 401);
  const provider = normalizeProvider(input.provider);
  const amount = normalizeAmount(input.amount);
  if (provider === "alipay" && !isAlipayConfigured()) throw createHttpError("\u652f\u4ed8\u5b9d\u652f\u4ed8\u672a\u914d\u7f6e\uff0c\u8bf7\u5148\u914d\u7f6e\u540e\u518d\u5145\u503c", 503);
  if (provider === "wechat" && !isWechatPayConfigured()) throw createHttpError("\u5fae\u4fe1\u652f\u4ed8\u672a\u914d\u7f6e\uff0c\u8bf7\u5148\u914d\u7f6e\u540e\u518d\u5145\u503c", 503);

  const outTradeNo = generateOutTradeNo();
  const orderToken = randomBytes(24).toString("base64url");
  const points = amount * POINTS_PER_YUAN;
  const subject = `\u79ef\u5206\u5145\u503c ${amount} \u5143`;

  await getPool().query(
    `INSERT INTO payment_orders (
       user_id, out_trade_no, provider, subject, total_amount, points,
       status, status_message, client_token_hash
     ) VALUES (?, ?, ?, ?, ?, ?, 'CREATED', ?, ?)`,
    [user.id, outTradeNo, provider, subject, amount.toFixed(2), points, "\u8ba2\u5355\u5df2\u521b\u5efa", hashToken(orderToken)]
  );

  const order = await findOrderForUser(user.id, outTradeNo);
  return { order: toClientOrder(order), orderToken };
}

export async function getPaymentQrCode(user, outTradeNo, orderToken) {
  if (user?.isGuest) throw createHttpError("\u8bf7\u5148\u767b\u5f55\u540e\u518d\u5145\u503c", 401);
  const order = await findOrderForUser(user.id, outTradeNo);
  assertOrderToken(order, orderToken);
  if (FINAL_ORDER_STATUSES.has(order.status)) throw createHttpError("\u8ba2\u5355\u5f53\u524d\u72b6\u6001\u4e0d\u53ef\u652f\u4ed8", 400);
  if (await isOrderExpired(order)) {
    const expiredOrder = await markOrderExpired(order);
    return { order: toClientOrder(expiredOrder, 0), qrCode: null, qrCodeDataUrl: null };
  }

  if (order.qr_code) {
    const qrCodeDataUrl = order.qr_code_data_url || await QRCode.toDataURL(order.qr_code, { margin: 1, width: 240 });
    if (!order.qr_code_data_url) {
      await getPool().query("UPDATE payment_orders SET qr_code_data_url = ? WHERE id = ?", [qrCodeDataUrl, order.id]);
    }
    return { order: toClientOrder(order, await getOrderExpiresInSeconds(order)), qrCode: order.qr_code, qrCodeDataUrl };
  }

  let qrCode;
  let eventType;
  let eventPayload;
  if (order.provider === "wechat") {
    const result = await createWechatNativeOrder({
      outTradeNo: order.out_trade_no,
      totalAmount: Number(order.total_amount).toFixed(2),
      subject: order.subject,
      expireAt: new Date(Date.now() + ORDER_TTL_MS).toISOString()
    });
    qrCode = result.code_url;
    eventType = "wechatpay.native";
    eventPayload = result;
  } else {
    const result = await callAlipay(buildPrecreateParams({
      out_trade_no: order.out_trade_no,
      total_amount: Number(order.total_amount).toFixed(2),
      subject: order.subject,
      product_code: "QR_CODE_OFFLINE",
      timeout_express: "3m",
      goods_detail: [{
        goods_id: "jingchuang-ai-credits",
        goods_name: order.subject,
        quantity: 1,
        price: Number(order.total_amount).toFixed(2)
      }]
    }));
    qrCode = result.qr_code;
    eventType = "alipay.precreate";
    eventPayload = result;
  }

  if (!qrCode) throw createHttpError("\u8ba2\u5355\u7801\u751f\u6210\u5931\u8d25\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5", 502);
  const qrCodeDataUrl = await QRCode.toDataURL(qrCode, { margin: 1, width: 240 });

  await getPool().query(
    `UPDATE payment_orders
     SET qr_code = ?,
         qr_code_data_url = ?,
         status = 'QR_READY',
         status_message = ?
     WHERE id = ?`,
    [qrCode, qrCodeDataUrl, "\u8ba2\u5355\u7801\u5df2\u751f\u6210\uff0c\u7b49\u5f85\u652f\u4ed8", order.id]
  );
  const updatedOrder = await findOrderForUser(user.id, outTradeNo);
  await recordPaymentEvent(updatedOrder.id, eventType, order.provider, eventPayload);

  return { order: toClientOrder(updatedOrder, await getOrderExpiresInSeconds(updatedOrder)), qrCode, qrCodeDataUrl };
}

export async function syncPaymentOrder(user, outTradeNo, orderToken) {
  if (user?.isGuest) throw createHttpError("\u8bf7\u5148\u767b\u5f55\u540e\u518d\u5145\u503c", 401);
  const order = await findOrderForUser(user.id, outTradeNo);
  assertOrderToken(order, orderToken);
  if (FINAL_ORDER_STATUSES.has(order.status)) return toClientOrder(order, 0);
  if (await isOrderExpired(order)) {
    const expiredOrder = await markOrderExpired(order);
    return toClientOrder(expiredOrder, 0);
  }

  if (order.provider === "wechat") {
    let result;
    try {
      result = await queryWechatOrder(order.out_trade_no);
    } catch (error) {
      if (!String(error.message || "").includes("ORDERNOTEXIST")) throw error;
      await getPool().query(
        `UPDATE payment_orders
         SET status = 'WAITING_PAYMENT',
             status_message = ?,
             last_checked_at = NOW()
         WHERE id = ?`,
        [WAITING_PAYMENT_MESSAGE, order.id]
      );
      const updatedOrder = await findOrderById(order.id);
      if (updatedOrder.status !== order.status) {
        await recordPaymentEvent(updatedOrder.id, "wechatpay.query", "wechat", {
          previousStatus: order.status,
          nextStatus: updatedOrder.status,
          code: "ORDERNOTEXIST"
        });
      }
      return toClientOrder(updatedOrder, await getOrderExpiresInSeconds(updatedOrder));
    }

    const updatedOrder = await applyWechatPayTradeStatus(order.id, result);
    await recordPaymentEvent(updatedOrder.id, "wechatpay.query", "wechat", {
      previousStatus: order.status,
      nextStatus: updatedOrder.status,
      ...result
    });
    return toClientOrder(updatedOrder, await getOrderExpiresInSeconds(updatedOrder));
  }

  let result;
  try {
    result = await callAlipay(buildQueryParams({ out_trade_no: order.out_trade_no }));
  } catch (error) {
    if (!isAlipayTradeNotExist(error)) throw error;
    await getPool().query(
      `UPDATE payment_orders
       SET status = 'WAITING_PAYMENT',
           status_message = ?,
           last_checked_at = NOW()
       WHERE id = ?`,
      [WAITING_PAYMENT_MESSAGE, order.id]
    );
    const updatedOrder = await findOrderById(order.id);
    if (updatedOrder.status !== order.status) {
      await recordPaymentEvent(updatedOrder.id, "alipay.query", "alipay", {
        previousStatus: order.status,
        nextStatus: updatedOrder.status,
        subCode: "ACQ.TRADE_NOT_EXIST"
      });
    }
    return toClientOrder(updatedOrder, await getOrderExpiresInSeconds(updatedOrder));
  }

  const updatedOrder = await applyAlipayTradeStatus(order.id, result);
  await recordPaymentEvent(updatedOrder.id, "alipay.query", "alipay", {
    previousStatus: order.status,
    nextStatus: updatedOrder.status,
    ...result
  });
  return toClientOrder(updatedOrder, await getOrderExpiresInSeconds(updatedOrder));
}

export async function handleAlipayNotify(params) {
  if (!verifyAlipayNotify(params)) return false;

  const [rows] = await getPool().query("SELECT * FROM payment_orders WHERE out_trade_no = ? LIMIT 1", [params.out_trade_no]);
  const order = rows[0];
  if (!order || order.provider !== "alipay") return false;

  if (params.app_id !== getAlipayAppId()) {
    await markAmountMismatch(order.id, "\u652f\u4ed8\u5b9d\u901a\u77e5 app_id \u4e0d\u4e00\u81f4");
    return false;
  }
  if (getAlipaySellerId() && params.seller_id !== getAlipaySellerId()) {
    await markAmountMismatch(order.id, "\u652f\u4ed8\u5b9d\u901a\u77e5 seller_id \u4e0d\u4e00\u81f4");
    return false;
  }
  if (!amountsMatch(params.total_amount, order.total_amount)) {
    await markAmountMismatch(order.id, "\u652f\u4ed8\u5b9d\u901a\u77e5\u91d1\u989d\u4e0d\u4e00\u81f4");
    return false;
  }

  await recordPaymentEvent(order.id, "alipay.notify", "alipay", params);
  if (["TRADE_SUCCESS", "TRADE_FINISHED"].includes(params.trade_status)) {
    await markOrderPaid(order.id, {
      alipayTradeNo: params.trade_no,
      alipayTradeStatus: params.trade_status
    });
  }

  return true;
}

export async function handleWechatPayNotify({ headers, rawBody, body }) {
  const bodyText = rawBody || JSON.stringify(body || {});
  if (!verifyWechatPayNotify(headers, bodyText)) return false;

  const payload = body || JSON.parse(bodyText);
  const resource = decryptWechatPayResource(payload.resource);
  const [rows] = await getPool().query("SELECT * FROM payment_orders WHERE out_trade_no = ? LIMIT 1", [resource.out_trade_no]);
  const order = rows[0];
  if (!order || order.provider !== "wechat") return false;

  if (resource.appid !== getWechatPayAppId()) {
    await markAmountMismatch(order.id, "\u5fae\u4fe1\u652f\u4ed8\u901a\u77e5 appid \u4e0d\u4e00\u81f4");
    return false;
  }
  if (resource.mchid !== getWechatPayMchId()) {
    await markAmountMismatch(order.id, "\u5fae\u4fe1\u652f\u4ed8\u901a\u77e5\u5546\u6237\u53f7\u4e0d\u4e00\u81f4");
    return false;
  }
  if (resource.amount?.total !== undefined && Math.round(Number(order.total_amount) * 100) !== Number(resource.amount.total)) {
    await markAmountMismatch(order.id, "\u5fae\u4fe1\u652f\u4ed8\u901a\u77e5\u91d1\u989d\u4e0d\u4e00\u81f4");
    return false;
  }

  await recordPaymentEvent(order.id, "wechatpay.notify", "wechat", resource);
  if (resource.trade_state === "SUCCESS") {
    await markOrderPaid(order.id, {
      wechatTransactionId: resource.transaction_id,
      wechatTradeState: resource.trade_state
    });
  } else {
    await applyWechatPayTradeStatus(order.id, resource);
  }

  return true;
}

export async function listCreditTransactions(userId, options = {}) {
  const page = Math.max(1, Number.parseInt(options.page || "1", 10) || 1);
  const pageSize = Math.min(100, Math.max(1, Number.parseInt(options.pageSize || "20", 10) || 20));
  const type = String(options.type || "all").trim().toLowerCase();
  const keyword = String(options.keyword || "").trim();
  const startDate = String(options.startDate || "").trim();
  const endDate = String(options.endDate || "").trim();
  const where = ["user_id = ?"];
  const params = [userId];

  if (type && type !== "all") {
    where.push("type = ?");
    params.push(type);
  }
  if (keyword) {
    where.push("(memo LIKE ? OR type LIKE ?)");
    params.push(`%${keyword}%`, `%${keyword}%`);
  }
  if (startDate) {
    where.push("created_at >= ?");
    params.push(`${startDate} 00:00:00`);
  }
  if (endDate) {
    where.push("created_at <= ?");
    params.push(`${endDate} 23:59:59`);
  }

  const whereSql = where.join(" AND ");
  const joinedWhereSql = whereSql.replace(/\buser_id\b/g, "ct.user_id");
  const [[countRow]] = await getPool().query(
    `SELECT COUNT(*) AS total FROM credit_transactions WHERE ${whereSql}`,
    params
  );
  const total = Number(countRow?.total || 0);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const offset = (safePage - 1) * pageSize;
  const [rows] = await getPool().query(
    `SELECT ct.id, ct.type, ct.amount, ct.balance_after AS balanceAfter, ct.memo,
       ct.related_user_id AS relatedUserId, ct.invite_binding_id AS inviteBindingId, ct.created_at AS createdAt,
       image_task.source AS imageSource,
       chat_conversation.source AS chatSource,
       video_task.source AS videoSource
     FROM credit_transactions ct
     LEFT JOIN image_generation_tasks image_task
       ON image_task.id = CAST(ct.task_id AS UNSIGNED)
       AND ct.memo IN ('image generation debit', 'image generation refund', '图片生成扣费', '图片生成退款')
     LEFT JOIN chat_messages chat_message
       ON chat_message.id = CAST(ct.task_id AS UNSIGNED)
       AND ct.memo IN ('chat completion debit', 'AI 对话扣费')
     LEFT JOIN chat_conversations chat_conversation
       ON chat_conversation.id = chat_message.conversation_id
     LEFT JOIN video_generation_tasks video_task
       ON video_task.id = CAST(ct.task_id AS UNSIGNED)
       AND ct.memo IN ('video generation debit', 'video generation refund', '视频生成扣费', '视频生成退款')
     WHERE ${joinedWhereSql}
     ORDER BY ct.created_at DESC, ct.id DESC
     LIMIT ? OFFSET ?`,
    [...params, pageSize, offset]
  );
  return {
    transactions: rows.map(({ imageSource, chatSource, videoSource, ...row }) => ({
      ...row,
      memo: localizeCreditMemo(row.memo, { imageSource, chatSource, videoSource })
    })),
    page: safePage,
    pageSize,
    total,
    totalPages
  };
}
