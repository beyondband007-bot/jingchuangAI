const currentLocation = globalThis.location;
const fallbackHost = currentLocation?.hostname || "127.0.0.1";
const fallbackProtocol = currentLocation?.protocol === "https:" ? "https:" : "http:";
const configuredApiBase = import.meta.env.VITE_API_BASE_URL;

export const API_BASE = configuredApiBase ?? `${fallbackProtocol}//${fallbackHost}:3006`;
