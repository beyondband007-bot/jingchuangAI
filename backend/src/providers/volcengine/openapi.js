import crypto from "crypto";
import { config } from "../../config/index.js";

const safeRetryActions = new Set(["GetAsset", "ListAssets", "ListAssetGroups"]);
const retryableHttpStatuses = new Set([408, 425, 429, 500, 502, 503, 504]);
const retryableNetworkCodes = new Set([
  "ECONNRESET",
  "ETIMEDOUT",
  "ECONNREFUSED",
  "EAI_AGAIN",
  "UND_ERR_CONNECT_TIMEOUT",
  "UND_ERR_HEADERS_TIMEOUT",
  "UND_ERR_SOCKET"
]);

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getErrorCode(error) {
  return String(error?.code || error?.cause?.code || error?.status || "unknown");
}

export function isRetryableArkOpenApiError(error) {
  if (!error) return false;
  if (error.retryable === true) return true;
  const code = error.code || error.cause?.code;
  if (retryableNetworkCodes.has(code)) return true;
  if (retryableHttpStatuses.has(Number(error.status))) return true;
  return /fetch failed|network|socket|timeout|ECONNRESET/i.test(String(error.message || ""));
}

function markArkOpenApiError(error, { action, status } = {}) {
  const normalized = error instanceof Error ? error : new Error(String(error || "Ark OpenAPI request failed"));
  normalized.action = action;
  if (status && !normalized.status) normalized.status = status;
  normalized.retryable = isRetryableArkOpenApiError(normalized);
  return normalized;
}

export async function retryArkCreateWithReconciliation({
  label,
  create,
  findExisting,
  maxAttempts = 3,
  recoveryDelaysMs = [500, 1000, 2000],
  sleep = delay
}) {
  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const existing = await findExisting();
      if (existing) return existing;
    } catch (error) {
      if (!isRetryableArkOpenApiError(error)) throw error;
      console.warn(
        `[ark-openapi] ${label} reconciliation lookup failed (${getErrorCode(error)}); continuing with guarded create`
      );
    }

    try {
      return await create();
    } catch (error) {
      const normalized = markArkOpenApiError(error, { action: label });
      if (!isRetryableArkOpenApiError(normalized) || attempt >= maxAttempts) throw normalized;
      lastError = normalized;

      // A transport error is ambiguous: Ark may have accepted the create request
      // even though this process never received the response. Reconcile for a few
      // seconds before sending another non-idempotent create request.
      for (const waitMs of recoveryDelaysMs) {
        await sleep(waitMs);
        try {
          const existing = await findExisting();
          if (existing) {
            console.warn(
              `[ark-openapi] ${label} response was lost, but the remote resource was recovered by reconciliation`
            );
            return existing;
          }
        } catch (lookupError) {
          if (!isRetryableArkOpenApiError(lookupError)) throw lookupError;
        }
      }

      console.warn(
        `[ark-openapi] transient ${label} failure (${getErrorCode(normalized)}); retrying guarded create ${attempt + 1}/${maxAttempts}`
      );
    }
  }

  throw lastError || new Error(`${label} failed after guarded retries`);
}

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

export async function requestArkOpenApi(action, body = {}, options = {}) {
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

  const maxAttempts = Number(options.maxAttempts || (safeRetryActions.has(action) ? 3 : 1));

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
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
    } catch (error) {
      const normalized = markArkOpenApiError(error, { action });
      if (!isRetryableArkOpenApiError(normalized) || attempt >= maxAttempts) throw normalized;
      const waitMs = 400 * 2 ** (attempt - 1);
      console.warn(
        `[ark-openapi] transient ${action} failure (${getErrorCode(normalized)}); retrying ${attempt + 1}/${maxAttempts} in ${waitMs}ms`
      );
      await delay(waitMs);
    }
  }

  throw new Error(`Ark OpenAPI ${action} exhausted retries`);
}
