import { createSign, createVerify } from "crypto";
import { readFileSync } from "fs";
import { config } from "../../config/index.js";
import { createHttpError } from "../../shared/http.js";

const SANDBOX_GATEWAY = "https://openapi-sandbox.dl.alipaydev.com/gateway.do";
const PRODUCTION_GATEWAY = "https://openapi.alipay.com/gateway.do";

export function getAlipayAppId() {
  return config.alipay.appId;
}

export function getAlipaySellerId() {
  return config.alipay.sellerId;
}

export function isAlipayConfigured() {
  return Boolean(
    config.alipay.appId &&
      config.alipay.publicBaseUrl &&
      config.alipay.privateKeyPath &&
      config.alipay.publicKeyPath
  );
}

function getGateway() {
  return config.alipay.env === "production" ? PRODUCTION_GATEWAY : SANDBOX_GATEWAY;
}

function normalizePem(value, label) {
  const trimmed = String(value || "").trim().replace(/\\n/g, "\n");
  if (trimmed.includes("BEGIN")) return trimmed;
  const body = trimmed.replace(/\s+/g, "").match(/.{1,64}/g)?.join("\n") || "";
  return `-----BEGIN ${label}-----\n${body}\n-----END ${label}-----`;
}

function readPrivateKey() {
  return normalizePem(readFileSync(config.alipay.privateKeyPath, "utf8"), "PRIVATE KEY");
}

function readPublicKey() {
  return normalizePem(readFileSync(config.alipay.publicKeyPath, "utf8"), "PUBLIC KEY");
}

function formatTimestamp(date = new Date()) {
  const pad = (value) => String(value).padStart(2, "0");
  return [
    date.getFullYear(),
    "-",
    pad(date.getMonth() + 1),
    "-",
    pad(date.getDate()),
    " ",
    pad(date.getHours()),
    ":",
    pad(date.getMinutes()),
    ":",
    pad(date.getSeconds())
  ].join("");
}

function buildSignContent(params) {
  return Object.keys(params)
    .filter((key) => params[key] !== undefined && params[key] !== null && params[key] !== "")
    .filter((key) => key !== "sign")
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");
}

function signParams(params) {
  return createSign("RSA-SHA256").update(buildSignContent(params), "utf8").sign(readPrivateKey(), "base64");
}

function extractResponseSignContent(rawText, responseKey) {
  const keyIndex = rawText.indexOf(`"${responseKey}"`);
  if (keyIndex < 0) throw createHttpError("支付宝响应缺少业务体", 502);
  const colonIndex = rawText.indexOf(":", keyIndex + responseKey.length + 2);
  if (colonIndex < 0) throw createHttpError("支付宝响应格式错误", 502);

  let start = colonIndex + 1;
  while (start < rawText.length && /\s/.test(rawText[start])) start += 1;

  const opener = rawText[start];
  const closer = opener === "{" ? "}" : opener === "[" ? "]" : "";
  if (!closer) throw createHttpError("支付宝响应业务体格式不支持", 502);

  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = start; index < rawText.length; index += 1) {
    const char = rawText[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === "\"") inString = false;
      continue;
    }

    if (char === "\"") inString = true;
    else if (char === opener) depth += 1;
    else if (char === closer) {
      depth -= 1;
      if (depth === 0) return rawText.slice(start, index + 1);
    }
  }

  throw createHttpError("支付宝响应业务体未闭合", 502);
}

function verifyResponseSign(rawText, responseKey, signature) {
  return createVerify("RSA-SHA256")
    .update(extractResponseSignContent(rawText, responseKey), "utf8")
    .verify(readPublicKey(), signature, "base64");
}

function assertConfigured() {
  if (!isAlipayConfigured()) {
    throw createHttpError("支付宝支付未配置，请检查 ALIPAY_APP_ID、密钥路径和公网回调地址", 503);
  }
}

function buildBaseParams(method, extra) {
  return {
    app_id: config.alipay.appId,
    method,
    format: "JSON",
    charset: "utf-8",
    sign_type: "RSA2",
    timestamp: formatTimestamp(),
    version: "1.0",
    ...extra
  };
}

export function buildPrecreateParams(bizContent) {
  return buildBaseParams("alipay.trade.precreate", {
    notify_url: `${config.alipay.publicBaseUrl}/api/payment/alipay/notify`,
    biz_content: JSON.stringify(bizContent)
  });
}

export function buildQueryParams(bizContent) {
  return buildBaseParams("alipay.trade.query", {
    biz_content: JSON.stringify(bizContent)
  });
}

export async function callAlipay(params) {
  assertConfigured();
  const body = new URLSearchParams();
  const signedParams = { ...params, sign: signParams(params) };
  Object.entries(signedParams).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") body.append(key, String(value));
  });

  const response = await fetch(getGateway(), {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded; charset=utf-8" },
    body: body.toString()
  });
  const rawText = await response.text();
  const data = JSON.parse(rawText);
  const responseKey = Object.keys(data).find((key) => key.endsWith("_response"));
  if (!responseKey) throw createHttpError("支付宝响应无效", 502);
  if (typeof data.sign !== "string" || !verifyResponseSign(rawText, responseKey, data.sign)) {
    throw createHttpError("支付宝响应验签失败", 502);
  }

  const responseBody = data[responseKey];
  if (responseBody.code !== "10000") {
    const error = createHttpError(responseBody.sub_msg || responseBody.msg || "支付宝接口调用失败", 502);
    error.code = responseBody.code;
    error.subCode = responseBody.sub_code;
    error.subMsg = responseBody.sub_msg;
    throw error;
  }
  return responseBody;
}

export function verifyAlipayNotify(params) {
  if (!params?.sign || !config.alipay.publicKeyPath) return false;
  return createVerify("RSA-SHA256")
    .update(buildSignContent(params), "utf8")
    .verify(readPublicKey(), params.sign, "base64");
}
