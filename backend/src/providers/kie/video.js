import { getKieTask, requestKie } from "./client.js";

function ratioToSora(ratio) {
  return ratio === "9:16" ? "portrait" : "landscape";
}

export function createJobsInput(
  model,
  {
    prompt,
    ratio,
    duration,
    resolution,
    referenceImageUrl,
    referenceVideoUrl,
    referenceAudioUrl
  }
) {
  if (model.provider_model.includes("sora-2")) {
    const input = {
      prompt,
      aspect_ratio: ratioToSora(ratio),
      n_frames: String(duration <= 10 ? 10 : 15),
      remove_watermark: true,
      upload_method: "s3"
    };
    if (referenceImageUrl) {
      input.image_url = referenceImageUrl;
    }
    if (referenceVideoUrl) {
      input.video_url = referenceVideoUrl;
    }
    return input;
  }

  if (model.provider_model.includes("seedance-2-mini")) {
    const input = {
      prompt,
      return_last_frame: false,
      generate_audio: true,
      resolution: String(resolution || "720P").toLowerCase(),
      aspect_ratio: ratio,
      duration: Number(duration),
      web_search: false
    };
    const hasMultimodalReferences = Boolean(referenceVideoUrl || referenceAudioUrl);
    if (referenceImageUrl && hasMultimodalReferences) {
      input.reference_image_urls = [referenceImageUrl];
    } else if (referenceImageUrl) {
      input.first_frame_url = referenceImageUrl;
    }
    if (referenceVideoUrl) {
      input.reference_video_urls = [referenceVideoUrl];
    }
    if (referenceAudioUrl) {
      input.reference_audio_urls = [referenceAudioUrl];
    }
    return input;
  }

  if (model.provider_model.includes("kling-3.0")) {
    const input = {
      prompt,
      sound: true,
      duration: String(duration),
      aspect_ratio: ratio,
      mode: resolution === "4K"
        ? "4K"
        : String(resolution || "").toUpperCase() === "1080P"
          ? "pro"
          : model.mode || "std",
      multi_shots: false
    };
    if (referenceImageUrl) {
      input.image_urls = [referenceImageUrl];
    }
    return input;
  }

  if (model.provider_model.includes("wan/2-7")) {
    const input = {
      prompt,
      resolution: "720p",
      ratio,
      duration: Number(duration),
      prompt_extend: true,
      watermark: false
    };
    if (referenceImageUrl) {
      input.image_url = referenceImageUrl;
    }
    if (referenceVideoUrl) {
      input.video_url = referenceVideoUrl;
    }
    return input;
  }

  const input = {
    prompt,
    duration: Number(duration),
    aspect_ratio: ratio
  };
  if (referenceImageUrl) {
    input.image_url = referenceImageUrl;
  }
  if (referenceVideoUrl) {
    input.video_url = referenceVideoUrl;
  }
  return input;
}

export async function createKieVideoTask({
  model,
  prompt,
  ratio,
  duration,
  resolution,
  referenceImageUrl,
  referenceVideoUrl,
  referenceAudioUrl
}) {
  if (model.provider_type === "veo") {
    const body = {
      prompt,
      model: model.provider_model,
      aspect_ratio: ratio,
      enableFallback: false,
      enableTranslation: true,
      generationType: "TEXT_2_VIDEO"
    };
    if (referenceImageUrl) {
      body.imageUrl = referenceImageUrl;
      body.generationType = "IMAGE_2_VIDEO";
    }
    const result = await requestKie("/api/v1/veo/generate", {
      method: "POST",
      body: JSON.stringify(body)
    });

    const taskId = result.data?.taskId;
    if (!taskId) {
      const error = new Error("Veo response missing taskId");
      error.status = 502;
      error.body = result;
      throw error;
    }

    return { taskId, raw: result };
  }

  const result = await requestKie("/api/v1/jobs/createTask", {
    method: "POST",
    body: JSON.stringify({
      model: model.provider_model,
      input: createJobsInput(model, {
        prompt,
        ratio,
        duration,
        resolution,
        referenceImageUrl,
        referenceVideoUrl,
        referenceAudioUrl
      })
    })
  });

  const taskId = result.data?.taskId;
  if (!taskId) {
    const error = new Error("video response missing taskId");
    error.status = 502;
    error.body = result;
    throw error;
  }

  return { taskId, raw: result };
}

export async function getKieVideoTask({ taskId, providerType }) {
  if (providerType === "veo") {
    return requestKie(`/api/v1/veo/record-info?taskId=${encodeURIComponent(taskId)}`, {
      method: "GET"
    });
  }

  return getKieTask(taskId);
}

export function mapKieVideoState(record, providerType) {
  if (providerType === "veo") {
    if (record.data?.successFlag === 1) return "completed";
    if (record.data?.successFlag === 2 || record.data?.successFlag === 3) return "failed";
    return "processing";
  }

  const state = record.data?.state;
  if (state === "success") return "completed";
  if (state === "fail") return "failed";
  return "processing";
}

export function extractVideoResultUrls(record, providerType) {
  if (providerType === "veo") {
    const response = record.data?.response || {};
    if (Array.isArray(response.resultUrls)) return response.resultUrls;
    if (Array.isArray(response.fullResultUrls)) return response.fullResultUrls;
    if (Array.isArray(response.originUrls)) return response.originUrls;
    return [];
  }

  const json = record?.data?.resultJson;
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    if (Array.isArray(parsed.resultUrls)) return parsed.resultUrls;
    if (Array.isArray(parsed.outputMediaUrls)) return parsed.outputMediaUrls.map((item) => item.mediaUrl).filter(Boolean);
    if (Array.isArray(parsed.videoUrls)) return parsed.videoUrls;
    if (Array.isArray(parsed.urls)) return parsed.urls;
    return [];
  } catch {
    return [];
  }
}
