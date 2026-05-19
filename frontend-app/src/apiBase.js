const currentLocation = globalThis.location;
const configuredApiBase = import.meta.env.VITE_API_BASE_URL?.trim();

function isLocalHostname(hostname) {
  return hostname === "127.0.0.1" || hostname === "localhost" || hostname === "::1";
}

function getFallbackApiBase() {
  const fallbackHost = currentLocation?.hostname || "127.0.0.1";
  const fallbackProtocol = currentLocation?.protocol === "https:" ? "https:" : "http:";
  if (isLocalHostname(fallbackHost)) {
    return `${fallbackProtocol}//${fallbackHost}:3006`;
  }
  return "";
}

export const API_BASE = configuredApiBase || getFallbackApiBase();
