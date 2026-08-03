import { config } from "../../config/index.js";
import { requestKie } from "./client.js";

export function mapImageModelToKie(modelKey) {
  const modelMap = {
    gpt_image_1_5_i2i: "gpt-image/1.5-image-to-image",
    gpt_image_2: "gpt-image-2-text-to-image",
    gpt_image_2_i2i: "gpt-image-2-image-to-image",
    four_o_image: "4o-image",
    nano_banana_pro: "nano-banana-pro",
    flux_2_pro: "flux-2/pro-text-to-image",
    seedream_4_5: "seedream/4.5-text-to-image",
    nano_banana2: "nano-banana-2"
  };
  return modelMap[modelKey] || config.kie.imageModel;
}

function mapGptImageQuality(quality) {
  const qualityMap = {
    "1K": "low",
    "2K": "medium",
    "4K": "high"
  };
  return qualityMap[quality] || "medium";
}

export function buildKieImageInput({ prompt, modelKey, ratio, quality, referenceImageUrls = [] }) {
  if (modelKey === "flux_2_pro") {
    return {
      prompt,
      aspect_ratio: ratio || "1:1",
      resolution: quality === "2K" ? "2K" : "1K",
      nsfw_checker: false
    };
  }

  if (modelKey === "seedream_4_5") {
    return {
      prompt,
      aspect_ratio: ratio || "1:1",
      // Kie Seedream 4.5 exposes basic (2K) and high (4K). The product's
      // current 1K/2K choices both belong to the non-4K tier.
      quality: "basic",
      nsfw_checker: false
    };
  }

  const isGptImage15ImageToImage = modelKey === "gpt_image_1_5_i2i";
  const isGptImage2ImageToImage = modelKey === "gpt_image_2_i2i";
  const isGptImage2 = modelKey === "gpt_image_2" || isGptImage2ImageToImage;
  return isGptImage15ImageToImage
    ? {
        prompt,
        input_urls: referenceImageUrls,
        aspect_ratio: ratio || "auto",
        quality: mapGptImageQuality(quality)
      }
    : isGptImage2ImageToImage
      ? {
          prompt,
          input_urls: referenceImageUrls,
          aspect_ratio: ratio || "auto",
          resolution: quality || "2K"
        }
      : {
          prompt,
          aspect_ratio: ratio || "auto",
          resolution: quality || "2K",
          ...(isGptImage2 ? {} : {
            output_format: "jpg",
            google_search: false,
            image_input: referenceImageUrls
          })
        };
}

export async function createKieImageTask({ prompt, modelKey, ratio, quality, referenceImageUrls = [] }) {
  const input = buildKieImageInput({ prompt, modelKey, ratio, quality, referenceImageUrls });

  const body = {
    model: mapImageModelToKie(modelKey),
    input
  };

  const result = await requestKie("/api/v1/jobs/createTask", {
    method: "POST",
    body: JSON.stringify(body)
  });

  const taskId = result.data?.taskId;
  if (!taskId) {
    const error = new Error("response missing taskId");
    error.status = 502;
    error.body = result;
    throw error;
  }

  return { taskId, raw: result };
}
