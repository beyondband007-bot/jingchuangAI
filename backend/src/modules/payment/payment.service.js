import { createHash, randomBytes } from "crypto";
import QRCode from "qrcode";
import { getPool } from "../../db/pool.js";
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

const POINTS_PER_YUAN = 100;
const FINAL_ORDER_STATUSES = new Set(["PAID", "CANCELED", "CLOSED", "REFUNDED", "AMOUNT_MISMATCH"]);

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
    if (!order) throw createHttpError("订单不存在", 404);
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

    await connection.query("UPDATE credit_accounts SET balance = ? WHERE user_id = ?", [balanceAfter, order.user_id]);
    await connection.query(
      `INSERT INTO credit_transactions (user_id, task_id, type, amount, balance_after, memo)
       VALUES (?, NULL, 'recharge', ?, ?, ?)`,
      [order.user_id, Number(order.points || 0), balanceAfter, `支付宝充值订单 ${order.out_trade_no}`]
    );
    await connection.query(
      `UPDATE payment_orders
       SET status = 'PAID',
           status_message = '支付成功，积分已到账',
           paid_at = COALESCE(paid_at, NOW()),
           last_checked_at = NOW(),
           alipay_trade_no = ?,
           alipay_trade_status = ?
       WHERE id = ?`,
      [data.alipayTradeNo || order.alipay_trade_no, data.alipayTradeStatus || order.alipay_trade_status, order.id]
    );
    await recordPaymentEvent(order.id, "alipay.paid", "alipay", data, connection);

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
  if (user?.isGuest) throw createHttpError("请先登录后再充值", 401);
  if (input.provider && input.provider !== "alipay") throw createHttpError("暂不支持该支付方式", 400);
  const amount = normalizeAmount(input.amount);
  if (!isAlipayConfigured()) throw createHttpError("支付宝支付未配置，请先配置后再充值", 503);
  const outTradeNo = generateOutTradeNo();
  const orderToken = randomBytes(24).toString("base64url");
  const points = amount * POINTS_PER_YUAN;
  const subject = `积分充值 ${amount} 元`;

  await getPool().query(
    `INSERT INTO payment_orders (
       user_id, out_trade_no, provider, subject, total_amount, points,
       status, status_message, client_token_hash
     ) VALUES (?, ?, 'alipay', ?, ?, ?, 'CREATED', '订单已创建', ?)`,
    [user.id, outTradeNo, subject, amount.toFixed(2), points, hashToken(orderToken)]
  );

  const order = await findOrderForUser(user.id, outTradeNo);
  return { order: toClientOrder(order), orderToken };
}

export async function getAlipayQrCode(user, outTradeNo, orderToken) {
  if (user?.isGuest) throw createHttpError("请先登录后再充值", 401);
  const order = await findOrderForUser(user.id, outTradeNo);
  assertOrderToken(order, orderToken);
  if (FINAL_ORDER_STATUSES.has(order.status)) throw createHttpError("订单当前状态不可支付", 400);

  if (order.qr_code) {
    const qrCodeDataUrl = order.qr_code_data_url || await QRCode.toDataURL(order.qr_code, { margin: 1, width: 240 });
    if (!order.qr_code_data_url) {
      await getPool().query("UPDATE payment_orders SET qr_code_data_url = ? WHERE id = ?", [qrCodeDataUrl, order.id]);
    }
    return { order: toClientOrder(order), qrCode: order.qr_code, qrCodeDataUrl };
  }

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
  const qrCodeDataUrl = await QRCode.toDataURL(result.qr_code, { margin: 1, width: 240 });

  await getPool().query(
    `UPDATE payment_orders
     SET qr_code = ?,
         qr_code_data_url = ?,
         status = 'QR_READY',
         status_message = '订单码已生成，等待支付'
     WHERE id = ?`,
    [result.qr_code, qrCodeDataUrl, order.id]
  );
  const updatedOrder = await findOrderForUser(user.id, outTradeNo);
  await recordPaymentEvent(updatedOrder.id, "alipay.precreate", "alipay", result);

  return { order: toClientOrder(updatedOrder), qrCode: result.qr_code, qrCodeDataUrl };
}

export async function syncAlipayOrder(user, outTradeNo, orderToken) {
  if (user?.isGuest) throw createHttpError("请先登录后再充值", 401);
  const order = await findOrderForUser(user.id, outTradeNo);
  assertOrderToken(order, orderToken);
  if (FINAL_ORDER_STATUSES.has(order.status)) return toClientOrder(order);

  let result;
  try {
    result = await callAlipay(buildQueryParams({ out_trade_no: order.out_trade_no }));
  } catch (error) {
    if (!isAlipayTradeNotExist(error)) throw error;
    await getPool().query(
      `UPDATE payment_orders
       SET status = 'WAITING_PAYMENT',
           status_message = '等待用户扫码支付',
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

export async function listCreditTransactions(userId) {
  const [rows] = await getPool().query(
    `SELECT id, type, amount, balance_after AS balanceAfter, memo, created_at AS createdAt
     FROM credit_transactions
     WHERE user_id = ?
     ORDER BY created_at DESC
     LIMIT 100`,
    [userId]
  );
  return { transactions: rows };
}
