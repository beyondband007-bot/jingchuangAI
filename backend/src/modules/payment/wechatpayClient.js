import { createDecipheriv, createSign, createVerify, randomBytes } from "crypto";
import { readFileSync } from "fs";
import { config } from "../../config/index.js";
import { createHttpError } from "../../shared/http.js";

function normalizePem(value, label) {
  const trimmed = String(value || "").trim().replace(/\\n/g, "\n");
  if (trimmed.includes("BEGIN")) return trimmed;
  const body = trimmed.replace(/\s+/g, "").match(/.{1,64}/g)?.join("\n") || "";
  return `-----BEGIN ${label}-----\n${body}\n-----END ${label}-----`;
}

function readTextFile(filePath) {
  return readFileSync(filePath, "utf8").trim();
}

function readMerchantPrivateKey() {
  return normalizePem(readTextFile(config.wechatPay.privateKeyPath), "PRIVATE KEY");
}

function readPlatformPublicKey() {
  return normalizePem(readTextFile(config.wechatPay.platformPublicKeyPath), "PUBLIC KEY");
}

function getApiV3Key() {
  const key = config.wechatPay.apiV3Key || (config.wechatPay.apiV3KeyPath ? readTextFile(config.wechatPay.apiV3KeyPath) : "");
  return key.trim();
}

export function getWechatPayAppId() {
  return config.wechatPay.appId;
}

export function getWechatPayMchId() {
  return config.wechatPay.mchId;
}

export function isWechatPayConfigured() {
  return Boolean(
    config.wechatPay.appId &&
      config.wechatPay.mchId &&
      config.wechatPay.merchantSerialNo &&
      config.wechatPay.privateKeyPath &&
      config.wechatPay.platformPublicKeyPath &&
      config.wechatPay.notifyUrl &&
      (config.wechatPay.apiV3Key || config.wechatPay.apiV3KeyPath)
  );
}

function assertConfigured() {
  if (!isWechatPayConfigured()) {
    throw createHttpError("微信支付未配置，请检查 WECHAT_PAY_* 环境变量和密钥路径", 503);
  }
  const apiV3Key = getApiV3Key();
  if (Buffer.byteLength(apiV3Key, "utf8") !== 32) {
    throw createHttpError("微信支付 API v3 key 必须是 32 字节", 503);
  }
}

function buildNonce() {
  return randomBytes(16).toString("hex");
}

function signRequest({ method, pathWithQuery, timestamp, nonce, body }) {
  const message = `${method}\n${pathWithQuery}\n${timestamp}\n${nonce}\n${body}\n`;
  return createSign("RSA-SHA256").update(message, "utf8").sign(readMerchantPrivateKey(), "base64");
}

function buildAuthorization({ method, pathWithQuery, body = "" }) {
  const timestamp = String(Math.floor(Date.now() / 1000));
  const nonce = buildNonce();
  const signature = signRequest({ method, pathWithQuery, timestamp, nonce, body });
  const token = [
    `mchid="${config.wechatPay.mchId}"`,
    `nonce_str="${nonce}"`,
    `timestamp="${timestamp}"`,
    `serial_no="${config.wechatPay.merchantSerialNo}"`,
    `signature="${signature}"`
  ].join(",");
  return `WECHATPAY2-SHA256-RSA2048 ${token}`;
}

async function callWechatPay({ method, pathWithQuery, bodyObject }) {
  assertConfigured();
  const body = bodyObject ? JSON.stringify(bodyObject) : "";
  const response = await fetch(`${config.wechatPay.apiBaseUrl}${pathWithQuery}`, {
    method,
    headers: {
      accept: "application/json",
      authorization: buildAuthorization({ method, pathWithQuery, body }),
      "content-type": "application/json",
      "user-agent": "jingchuang-ai-workbench"
    },
    body: body || undefined
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : {};
  if (!response.ok) {
    throw createHttpError(data.message || data.code || "微信支付接口调用失败", 502);
  }
  return data;
}

export async function createWechatNativeOrder({ outTradeNo, totalAmount, subject, expireAt }) {
  const totalCents = Math.round(Number(totalAmount) * 100);
  return callWechatPay({
    method: "POST",
    pathWithQuery: "/v3/pay/transactions/native",
    bodyObject: {
      appid: config.wechatPay.appId,
      mchid: config.wechatPay.mchId,
      description: subject,
      out_trade_no: outTradeNo,
      notify_url: config.wechatPay.notifyUrl,
      ...(expireAt ? { time_expire: expireAt } : {}),
      amount: {
        total: totalCents,
        currency: "CNY"
      }
    }
  });
}

export async function queryWechatOrder(outTradeNo) {
  const pathWithQuery = `/v3/pay/transactions/out-trade-no/${encodeURIComponent(outTradeNo)}?mchid=${encodeURIComponent(config.wechatPay.mchId)}`;
  return callWechatPay({ method: "GET", pathWithQuery });
}

export function verifyWechatPayNotify(headers, rawBody) {
  const timestamp = headers["wechatpay-timestamp"];
  const nonce = headers["wechatpay-nonce"];
  const signature = headers["wechatpay-signature"];
  if (!timestamp || !nonce || !signature || !rawBody) return false;
  const message = `${timestamp}\n${nonce}\n${rawBody}\n`;
  return createVerify("RSA-SHA256").update(message, "utf8").verify(readPlatformPublicKey(), signature, "base64");
}

export function decryptWechatPayResource(resource) {
  assertConfigured();
  if (!resource?.ciphertext || !resource?.nonce) {
    throw createHttpError("微信支付通知资源缺少密文", 400);
  }
  const encrypted = Buffer.from(resource.ciphertext, "base64");
  const authTag = encrypted.subarray(encrypted.length - 16);
  const cipherText = encrypted.subarray(0, encrypted.length - 16);
  const decipher = createDecipheriv("aes-256-gcm", Buffer.from(getApiV3Key(), "utf8"), Buffer.from(resource.nonce, "utf8"));
  if (resource.associated_data) {
    decipher.setAAD(Buffer.from(resource.associated_data, "utf8"));
  }
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(cipherText), decipher.final()]);
  return JSON.parse(decrypted.toString("utf8"));
}
