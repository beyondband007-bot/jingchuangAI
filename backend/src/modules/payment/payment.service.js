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
const FINAL_ORDER_STATUSES = new Set(["PAID", "CANCELED", "CLOSED", "REFUNDED", "AMOUNT_MISMATCH"]);
const SUPPORTED_PAYMENT_PROVIDERS = new Set(["alipay", "wechat"]);

function hashToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

function generateOutTradeNo() {
  return `RC${Date.now()}${randomBytes(4).toString("hex").toUpperCase()}`;
}

function normalizeAmount(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || !Number.isInteger(amount) || amount < 1) {
    throw createHttpError("充值金额不能低于 1 元，且必须为整数元", 400);
  }
  return amount;
}

function normalizeProvider(value) {
  const provider = String(value || "alipay").trim().toLowerCase();
  if (!SUPPORTED_PAYMENT_PROVIDERS.has(provider)) {
    throw createHttpError("暂不支持该支付方式", 400);
  }
  return provider;
}

function amountsMatch(left, right) {
  return Number(left).toFixed(2) === Number(right).toFixed(2);
}

function isAlipayTradeNotExist(error) {
  return error?.subCode === "ACQ.TRADE_NOT_EXIST";
}

function toClientOrder(order) {
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
    createdAt: order.created_at
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
  if (!rows[0]) throw createHttpError("订单不存在", 404);
  return rows[0];
}

async function findOrderById(orderId, connection = getPool()) {
  const [rows] = await connection.query("SELECT * FROM payment_orders WHERE id = ? LIMIT 1", [orderId]);
  if (!rows[0]) throw createHttpError("订单不存在", 404);
  return rows[0];
}

function assertOrderToken(order, orderToken) {
  if (!orderToken || !order.client_token_hash || hashToken(orderToken) !== order.client_token_hash) {
    throw createHttpError("订单校验失败", 403);
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
           status_message = '\u652f\u4ed8\u6210\u529f\uff0c\u79ef\u5206\u5df2\u5230\u8d26',
           paid_at = COALESCE(paid_at, NOW()),
           last_checked_at = NOW(),
           alipay_trade_no = ?,
           alipay_trade_status = ?,
           wechat_transaction_id = ?,
           wechat_trade_state = ?
       WHERE id = ?`,
      [
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
    await markAmountMismatch(order.id, "支付宝查询订单号不一致");
    return findOrderById(order.id);
  }
  if (result.total_amount && !amountsMatch(result.total_amount, order.total_amount)) {
    await markAmountMismatch(order.id, "支付宝查询金额不一致");
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
           status_message = '交易已关闭',
           closed_at = COALESCE(closed_at, NOW()),
           last_checked_at = NOW(),
           alipay_trade_status = ?
       WHERE id = ?`,
      [result.trade_status, order.id]
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
      [scanned ? "SCANNED" : "WAITING_PAYMENT", scanned ? "用户已扫码，等待确认支付" : "等待用户扫码支付", result.trade_status, order.id]
    );
  }

  return findOrderById(order.id);
}

async function applyWechatPayTradeStatus(orderId, result) {
  const order = await findOrderById(orderId);
  if (result.out_trade_no && result.out_trade_no !== order.out_trade_no) {
    await markAmountMismatch(order.id, "微信支付订单号不一致");
    return findOrderById(order.id);
  }
  if (result.mchid && result.mchid !== getWechatPayMchId()) {
    await markAmountMismatch(order.id, "微信支付商户号不一致");
    return findOrderById(order.id);
  }
  if (result.appid && result.appid !== getWechatPayAppId()) {
    await markAmountMismatch(order.id, "微信支付 appid 不一致");
    return findOrderById(order.id);
  }
  if (result.amount?.total !== undefined && Math.round(Number(order.total_amount) * 100) !== Number(result.amount.total)) {
    await markAmountMismatch(order.id, "微信支付金额不一致");
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
      [result.trade_state_desc || "交易已关闭", result.transaction_id || order.wechat_transaction_id, result.trade_state, order.id]
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
      [result.trade_state_desc || "用户已扫码，等待确认支付", result.transaction_id || order.wechat_transaction_id, result.trade_state, order.id]
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
      [result.trade_state_desc || "等待用户扫码支付", result.transaction_id || order.wechat_transaction_id, result.trade_state, order.id]
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
  if (user?.isGuest) throw createHttpError("????????", 401);
  const provider = normalizeProvider(input.provider);
  const amount = normalizeAmount(input.amount);
  if (provider === "alipay" && !isAlipayConfigured()) throw createHttpError("?????????????????", 503);
  if (provider === "wechat" && !isWechatPayConfigured()) throw createHttpError("????????????????", 503);
  const outTradeNo = generateOutTradeNo();
  const orderToken = randomBytes(24).toString("base64url");
  const points = amount * POINTS_PER_YUAN;
  const subject = `???? ${amount} ?`;

  await getPool().query(
    `INSERT INTO payment_orders (
       user_id, out_trade_no, provider, subject, total_amount, points,
       status, status_message, client_token_hash
     ) VALUES (?, ?, ?, ?, ?, ?, 'CREATED', '?????', ?)`,
    [user.id, outTradeNo, provider, subject, amount.toFixed(2), points, hashToken(orderToken)]
  );

  const order = await findOrderForUser(user.id, outTradeNo);
  return { order: toClientOrder(order), orderToken };
}
export async function getPaymentQrCode(user, outTradeNo, orderToken) {
  if (user?.isGuest) throw createHttpError("????????", 401);
  const order = await findOrderForUser(user.id, outTradeNo);
  assertOrderToken(order, orderToken);
  if (FINAL_ORDER_STATUSES.has(order.status)) throw createHttpError("??????????", 400);

  if (order.qr_code) {
    const qrCodeDataUrl = order.qr_code_data_url || await QRCode.toDataURL(order.qr_code, { margin: 1, width: 240 });
    if (!order.qr_code_data_url) {
      await getPool().query("UPDATE payment_orders SET qr_code_data_url = ? WHERE id = ?", [qrCodeDataUrl, order.id]);
    }
    return { order: toClientOrder(order), qrCode: order.qr_code, qrCodeDataUrl };
  }

  let qrCode;
  let eventType;
  let eventPayload;
  if (order.provider === "wechat") {
    const result = await createWechatNativeOrder({
      outTradeNo: order.out_trade_no,
      totalAmount: Number(order.total_amount).toFixed(2),
      subject: order.subject
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
      timeout_express: "5m",
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

  if (!qrCode) throw createHttpError("??????????", 502);
  const qrCodeDataUrl = await QRCode.toDataURL(qrCode, { margin: 1, width: 240 });

  await getPool().query(
    `UPDATE payment_orders
     SET qr_code = ?,
         qr_code_data_url = ?,
         status = 'QR_READY',
         status_message = '?????????????'
     WHERE id = ?`,
    [qrCode, qrCodeDataUrl, order.id]
  );
  const updatedOrder = await findOrderForUser(user.id, outTradeNo);
  await recordPaymentEvent(updatedOrder.id, eventType, order.provider, eventPayload);

  return { order: toClientOrder(updatedOrder), qrCode, qrCodeDataUrl };
}
export async function syncPaymentOrder(user, outTradeNo, orderToken) {
  if (user?.isGuest) throw createHttpError("????????", 401);
  const order = await findOrderForUser(user.id, outTradeNo);
  assertOrderToken(order, orderToken);
  if (FINAL_ORDER_STATUSES.has(order.status)) return toClientOrder(order);

  if (order.provider === "wechat") {
    let result;
    try {
      result = await queryWechatOrder(order.out_trade_no);
    } catch (error) {
      if (!String(error.message || "").includes("ORDERNOTEXIST")) throw error;
      await getPool().query(
        `UPDATE payment_orders
         SET status = 'WAITING_PAYMENT',
             status_message = '????????',
             last_checked_at = NOW()
         WHERE id = ?`,
        [order.id]
      );
      const updatedOrder = await findOrderById(order.id);
      if (updatedOrder.status !== order.status) {
        await recordPaymentEvent(updatedOrder.id, "wechatpay.query", "wechat", {
          previousStatus: order.status,
          nextStatus: updatedOrder.status,
          code: "ORDERNOTEXIST"
        });
      }
      return toClientOrder(updatedOrder);
    }

    const updatedOrder = await applyWechatPayTradeStatus(order.id, result);
    await recordPaymentEvent(updatedOrder.id, "wechatpay.query", "wechat", {
      previousStatus: order.status,
      nextStatus: updatedOrder.status,
      ...result
    });
    return toClientOrder(updatedOrder);
  }

  let result;
  try {
    result = await callAlipay(buildQueryParams({ out_trade_no: order.out_trade_no }));
  } catch (error) {
    if (!isAlipayTradeNotExist(error)) throw error;
    await getPool().query(
      `UPDATE payment_orders
       SET status = 'WAITING_PAYMENT',
           status_message = '????????',
           last_checked_at = NOW()
       WHERE id = ?`,
      [order.id]
    );
    const updatedOrder = await findOrderById(order.id);
    if (updatedOrder.status !== order.status) {
      await recordPaymentEvent(updatedOrder.id, "alipay.query", "alipay", {
        previousStatus: order.status,
        nextStatus: updatedOrder.status,
        subCode: "ACQ.TRADE_NOT_EXIST"
      });
    }
    return toClientOrder(updatedOrder);
  }

  const updatedOrder = await applyAlipayTradeStatus(order.id, result);
  await recordPaymentEvent(updatedOrder.id, "alipay.query", "alipay", {
    previousStatus: order.status,
    nextStatus: updatedOrder.status,
    ...result
  });
  return toClientOrder(updatedOrder);
}
export async function handleAlipayNotify(params) {
  if (!verifyAlipayNotify(params)) return false;

  const [rows] = await getPool().query("SELECT * FROM payment_orders WHERE out_trade_no = ? LIMIT 1", [params.out_trade_no]);
  const order = rows[0];
  if (!order) return false;
  if (order.provider !== "alipay") return false;

  if (params.app_id !== getAlipayAppId()) {
    await markAmountMismatch(order.id, "支付宝通知 app_id 不一致");
    return false;
  }
  if (getAlipaySellerId() && params.seller_id !== getAlipaySellerId()) {
    await markAmountMismatch(order.id, "支付宝通知 seller_id 不一致");
    return false;
  }
  if (!amountsMatch(params.total_amount, order.total_amount)) {
    await markAmountMismatch(order.id, "支付宝通知金额不一致");
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
    await markAmountMismatch(order.id, "微信支付通知 appid 不一致");
    return false;
  }
  if (resource.mchid !== getWechatPayMchId()) {
    await markAmountMismatch(order.id, "微信支付通知商户号不一致");
    return false;
  }
  if (resource.amount?.total !== undefined && Math.round(Number(order.total_amount) * 100) !== Number(resource.amount.total)) {
    await markAmountMismatch(order.id, "微信支付通知金额不一致");
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

export async function listCreditTransactions(userId) {
  const [rows] = await getPool().query(
    `SELECT id, type, amount, balance_after AS balanceAfter, memo, created_at AS createdAt
     FROM credit_transactions
     WHERE user_id = ?
     ORDER BY created_at DESC
     LIMIT 100`,
    [userId]
  );
  return { transactions: rows.map((row) => ({ ...row, memo: localizeCreditMemo(row.memo) })) };
}
