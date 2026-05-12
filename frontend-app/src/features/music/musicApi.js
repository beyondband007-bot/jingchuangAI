const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:3006";

function toApiUrl(url) {
  if (!url) return "";
  if (/^https?:\/\//i.test(url) || url.startsWith("data:")) return url;
  return `${API_BASE}${url.startsWith("/") ? "" : "/"}${url}`;
}

async function request(path, options = {}) {
  const isFormData = options.body instanceof FormData;
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...(options.body && !isFormData ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {})
    }
  });

  const text = await response.text();
  const body = text ? JSON.parse(text) : {};

  if (!response.ok) {
    throw new Error(body.error || body.message || `Request failed with ${response.status}`);
  }

  return body;
}

export const musicApi = {
  async generate({ prompt, lyrics, model = "music-2.6-free", isInstrumental, lyricsOptimizer }) {
    const result = await request("/api/music/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, lyrics, model, isInstrumental, lyricsOptimizer })
    });
    return {
      ...result,
      audioUrl: toApiUrl(result.audioUrl)
    };
  }
};
