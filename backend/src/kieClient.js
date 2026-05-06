import { config } from "./config.js";

function ensureKey() {
  if (!config.kie.apiKey) {
    const error = new Error("KIE_API_KEY is not configured");
    error.status = 500;
    throw error;
  }
}

async function request(path, options = {}) {
  ensureKey();
  const headers = {
    Authorization: `Bearer ${config.kie.apiKey}`,
    ...(options.body ? { "Content-Type": "application/json" } : {}),
    ...(options.headers || {})
  };

  const response = await fetch(`${config.kie.baseUrl}${path}`, {
    ...options,
    headers
  });

  const text = await response.text();
  let body;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { raw: text };
  }

  if (!response.ok || (body.code && body.code !== 200)) {
    const error = new Error(body.msg || body.error || `KIE request failed with ${response.status}`);
    error.status = response.status || 502;
    error.body = body;
    throw error;
  }

  return body;
}

export function mapModelToKie(modelKey) {
  const modelMap = {
    gpt_image_2: "gpt-image-2",
    four_o_image: "4o-image",
    nano_banana_pro: "nano-banana-pro",
    flux_2_pro: "flux-2-pro",
    imagen_4_fast: "imagen-4-fast",
    seedream_4_5: "seedream-4.5",
    nano_banana2: "nano-banana-2"
  };
  return modelMap[modelKey] || config.kie.imageModel;
}

export async function createKieImageTask({ prompt, modelKey, ratio, quality }) {
  const body = {
    model: mapModelToKie(modelKey),
    input: {
      prompt,
      aspect_ratio: ratio || "auto",
      resolution: quality || "2K",
      output_format: "jpg",
      google_search: false,
      image_input: []
    }
  };

  const result = await request("/api/v1/jobs/createTask", {
    method: "POST",
    body: JSON.stringify(body)
  });

  const taskId = result.data?.taskId;
  if (!taskId) {
    const error = new Error("KIE response missing taskId");
    error.status = 502;
    error.body = result;
    throw error;
  }

  return { taskId, raw: result };
}

export async function getKieTask(taskId) {
  return request(`/api/v1/jobs/recordInfo?taskId=${encodeURIComponent(taskId)}`, {
    method: "GET"
  });
}

export function mapKieState(state) {
  if (state === "success") return "completed";
  if (state === "fail") return "failed";
  return "processing";
}

export function extractResultUrls(record) {
  const json = record?.data?.resultJson;
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    if (Array.isArray(parsed.resultUrls)) return parsed.resultUrls;
    if (Array.isArray(parsed.outputMediaUrls)) return parsed.outputMediaUrls.map((item) => item.mediaUrl).filter(Boolean);
    if (Array.isArray(parsed.urls)) return parsed.urls;
    return [];
  } catch {
    return [];
  }
}
