const currentLocation = globalThis.location;
const configuredApiBase = import.meta.env.VITE_API_BASE_URL?.trim();

function getDevApiBase() {
  const fallbackHost = currentLocation?.hostname || "127.0.0.1";
  const fallbackProtocol = currentLocation?.protocol === "https:" ? "https:" : "http:";
  return `${fallbackProtocol}//${fallbackHost}:3006`;
}

export const API_BASE = configuredApiBase || (import.meta.env.DEV ? getDevApiBase() : "");
