import { config } from "../../config/index.js";
import { requestKie } from "./client.js";

export function mapImageModelToKie(modelKey) {
  const modelMap = {
    gpt_image_2: "gpt-image-2-text-to-image",
    four_o_image: "4o-image",
    nano_banana_pro: "nano-banana-pro",
    flux_2_pro: "flux-2/pro-text-to-image",
    imagen_4_fast: "google/imagen4-fast",
    seedream_4_5: "seedream/4.5-text-to-image",
    nano_banana2: "nano-banana-2"
  };
  return modelMap[modelKey] || config.kie.imageModel;
}

export async function createKieImageTask({ prompt, modelKey, ratio, quality }) {
  const body = {
    model: mapImageModelToKie(modelKey),
    input: {
      prompt,
      aspect_ratio: ratio || "auto",
      resolution: quality || "2K",
      output_format: "jpg",
      google_search: false,
      image_input: []
    }
  };

  const result = await requestKie("/api/v1/jobs/createTask", {
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
