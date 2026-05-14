const currentLocation = globalThis.location;
const fallbackHost = currentLocation?.hostname || "127.0.0.1";
const fallbackProtocol = currentLocation?.protocol || "http:";

export const API_BASE = import.meta.env.VITE_API_BASE_URL || `${fallbackProtocol}//${fallbackHost}:3006`;
