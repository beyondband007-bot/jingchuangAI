import crypto from "crypto";
import { config } from "../../config/index.js";

function ensureOpenApiCredentials() {
  if (!config.ark.accessKeyId || !config.ark.secretAccessKey) {
    const error = new Error("VOLC_ACCESS_KEY_ID / VOLC_SECRET_ACCESS_KEY is not configured");
    error.status = 500;
    throw error;
  }
}

function hmac(key, data, encoding) {
  return crypto.createHmac("sha256", key).update(data, "utf8").digest(encoding);
}

function sha256(data, encoding = "hex") {
  return crypto.createHash("sha256").update(data || "", "utf8").digest(encoding);
}

function amzDate(date = new Date()) {
  return date.toISOString().replace(/[:-]|\.\d{3}/g, "");
}

function encodeRFC3986(value) {
  return encodeURIComponent(value).replace(/[!'()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
}

function canonicalQuery(params) {
  return Object.keys(params)
    .sort()
    .map((key) => `${encodeRFC3986(key)}=${encodeRFC3986(String(params[key]))}`)
    .join("&");
}

function getSigningKey(secret, date, region, service) {
  const kDate = hmac(secret, date);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, service);
  return hmac(kService, "request");
}

function parseResponseBody(text) {
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { raw: text };
  }
}

function getOpenApiError(body, fallback) {
  return (
    body?.ResponseMetadata?.Error?.Message ||
    body?.ResponseMetadata?.Error?.Code ||
    body?.Error?.Message ||
    body?.Error?.Code ||
    body?.Message ||
    body?.Code ||
    fallback
  );
}

export async function requestArkOpenApi(action, body = {}) {
  ensureOpenApiCredentials();

  const service = "ark";
  const method = "POST";
  const endpoint = config.ark.openApiEndpoint;
  const host = new URL(endpoint).host;
  const query = canonicalQuery({ Action: action, Version: "2024-01-01" });
  const payload = JSON.stringify(body);
  const xDate = amzDate();
  const date = xDate.slice(0, 8);
  const payloadHash = sha256(payload);
  const canonicalHeaders = `content-type:application/json\nhost:${host}\nx-content-sha256:${payloadHash}\nx-date:${xDate}\n`;
  const signedHeaders = "content-type;host;x-content-sha256;x-date";
  const canonicalRequest = [method, "/", query, canonicalHeaders, signedHeaders, payloadHash].join("\n");
  const credentialScope = `${date}/${config.ark.region}/${service}/request`;
  const stringToSign = ["HMAC-SHA256", xDate, credentialScope, sha256(canonicalRequest)].join("\n");
  const signature = hmac(
    getSigningKey(config.ark.secretAccessKey, date, config.ark.region, service),
    stringToSign,
    "hex"
  );
  const authorization =
    `HMAC-SHA256 Credential=${config.ark.accessKeyId}/${credentialScope}, ` +
    `SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const response = await fetch(`${endpoint}/?${query}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Host: host,
      "X-Date": xDate,
      "X-Content-Sha256": payloadHash,
      Authorization: authorization
    },
    body: payload
  });

  const text = await response.text();
  const responseBody = parseResponseBody(text);
  const apiError = responseBody?.ResponseMetadata?.Error || responseBody?.Error;

  if (!response.ok || apiError) {
    const error = new Error(getOpenApiError(responseBody, `Ark OpenAPI ${action} failed with ${response.status}`));
    error.status = response.ok ? 502 : response.status;
    error.body = responseBody;
    throw error;
  }

  return responseBody.Result ?? responseBody.result ?? responseBody;
}
