import { useEffect, useRef, useState } from "react";
import { videoApi } from "../../api/videoApi";
import { VideoPromptDialog } from "../chat/components/VideoPromptDialog";
import { ReferenceMediaSlot } from "../image/imageSharedUi";
import { useToast } from "../../components/ToastProvider";
import { getFileSizeLimitError, UPLOAD_SIZE_LIMITS } from "../../utils/uploadLimits";

function getVideoModelOptions(options, modelKey) {
  const selectedModel =
    options.models.find((item) => item.value === modelKey) || options.models[0];
  return {
    model: selectedModel || null,
    ratios: selectedModel?.ratios?.length
      ? selectedModel.ratios
      : options.ratios || [],
    durations: selectedModel?.durations?.length
      ? selectedModel.durations
      : options.durations || [],
  };
}

function pickDefaultVideoModel(models = []) {
  return (
    models.find((item) => item.value === "seedance_2_0_720p")?.value ||
    models.find((item) => item.value === "seedance_2_0_mini")?.value ||
    models.find((item) => item.value === "kling_3_std")?.value ||
    models.find((item) => item.value === "kling_v1")?.value ||
    models.find((item) => item.value === "seedance_2_lite_t2v")?.value ||
    models[0]?.value ||
    ""
  );
}

export function VideoComposerBar({
  options,
  onSubmit,
  resetSignal = 0,
  seed,
  placement = "inline",
  collapsed = false,
  shellRef,
  onFocus,
  onBlur,
}) {
  const { showToast: showVideoComposerToast, dismissToast } = useToast();
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState(() =>
    pickDefaultVideoModel(options.models),
  );
  const modelOptions = getVideoModelOptions(options, model);
  const [ratio, setRatio] = useState(
    modelOptions.model?.defaultRatio || modelOptions.ratios[0] || "",
  );
  const [duration, setDuration] = useState(
    modelOptions.model?.defaultDuration || modelOptions.durations[0] || "",
  );
  const [referenceImage, setReferenceImage] = useState(null);
  const [referenceVideo, setReferenceVideo] = useState(null);
  const [isUploadingReference, setIsUploadingReference] = useState(false);
  const referenceInputRef = useRef(null);

  useEffect(() => {
    const hasSelectedModel = options.models.some((item) => item.value === model);
    if (!model || !hasSelectedModel) {
      const defaultModel = pickDefaultVideoModel(options.models);
      if (defaultModel) setModel(defaultModel);
      return;
    }

    const nextOptions = getVideoModelOptions(options, model);
    if (nextOptions.model) {
      if (!nextOptions.ratios.includes(ratio))
        setRatio(nextOptions.model.defaultRatio || nextOptions.ratios[0] || "");
      if (!nextOptions.durations.includes(Number(duration)))
        setDuration(
          nextOptions.model.defaultDuration || nextOptions.durations[0] || "",
        );
    }
  }, [duration, model, options, ratio]);

  useEffect(() => {
    setPrompt("");
    setReferenceImage(null);
    setReferenceVideo(null);
    dismissToast();
  }, [resetSignal]);

  useEffect(() => {
    if (!seed) return;
    setPrompt(seed.prompt || "");
    setReferenceImage(seed.referenceImage || null);
    setReferenceVideo(seed.referenceVideo || null);
    if (seed.notice) showVideoComposerToast(seed.notice);
  }, [seed]);

  const count = 1;
  const price = videoApi.calculatePrice({
    model,
    duration,
    count,
    models: options.models,
  });
  const rmb = videoApi.calculateRmb({
    model,
    duration,
    count,
    models: options.models,
  });
  const canSubmit =
    prompt.trim().length > 0 &&
    model &&
    ratio &&
    duration &&
    !isUploadingReference;

  function clearPrompt() {
    setPrompt("");
    setReferenceImage(null);
    setReferenceVideo(null);
    showVideoComposerToast("已清空提示词");
  }

  function fillRandomPrompt() {
    setPrompt(videoApi.getRandomPrompt());
    showVideoComposerToast("已填入随机提示词");
  }

  function handleAddPrompt() {
    referenceInputRef.current?.click();
  }

  async function handleReferenceSelect(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const isImage = String(file.type || "").startsWith("image/");
    const isVideo = String(file.type || "").startsWith("video/");
    const sizeError = isImage
      ? getFileSizeLimitError(file, UPLOAD_SIZE_LIMITS.videoReferenceImage, "参考图片")
      : isVideo
        ? getFileSizeLimitError(file, UPLOAD_SIZE_LIMITS.videoReferenceVideo, "参考视频")
        : "";
    if (sizeError) {
      showVideoComposerToast(sizeError);
      event.target.value = "";
      return;
    }

    setIsUploadingReference(true);
    try {
      if (String(file.type || "").startsWith("image/")) {
        const uploaded = await videoApi.uploadReferenceImage(file);
        setReferenceImage(uploaded);
        setReferenceVideo(null);
        showVideoComposerToast("参考图片已添加");
      } else if (String(file.type || "").startsWith("video/")) {
        const uploaded = await videoApi.uploadReferenceVideo(file);
        setReferenceVideo(uploaded);
        setReferenceImage(null);
        showVideoComposerToast("参考视频已添加");
      } else {
        showVideoComposerToast("仅支持图片或视频文件");
      }
    } catch (error) {
      showVideoComposerToast(error.message || "素材上传失败，请重试");
    } finally {
      setIsUploadingReference(false);
      event.target.value = "";
    }
  }

  function submitPrompt() {
    if (!canSubmit) {
      showVideoComposerToast("请先输入视频描述");
      return;
    }

    onSubmit({
      prompt: prompt.trim(),
      model,
      ratio,
      duration: Number(duration),
      mode: "first-frame",
      count,
      referenceImageUrl: referenceImage?.url || null,
      referenceVideoUrl: referenceVideo?.url || null,
    });
    showVideoComposerToast("已创建视频生成任务");
    setPrompt("");
    setReferenceImage(null);
    setReferenceVideo(null);
  }

  return (
    <div
      ref={shellRef}
      className={`sowa-composer video-composer is-${placement} ${collapsed ? "is-collapsed" : ""}`}
      aria-label="视频生成输入框"
      onFocus={onFocus}
      onBlur={onBlur}
    >
      <input
        ref={referenceInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm,video/x-msvideo"
        hidden
        onChange={handleReferenceSelect}
      />
      <VideoPromptDialog
        ariaLabel="视频生成输入框"
        placeholder="请描述你想生成的视频..."
        value={prompt}
        onChange={(value) => {
          setPrompt(value);
          dismissToast();
        }}
        onSubmit={submitPrompt}
        canSubmit={canSubmit}
        notice=""
        onAdd={handleAddPrompt}
        onRandom={fillRandomPrompt}
        onClear={clearPrompt}
        model={model}
        onModelChange={setModel}
        modelOptions={options.models}
        ratio={ratio}
        onRatioChange={setRatio}
        ratioOptions={modelOptions.ratios}
        duration={duration}
        onDurationChange={setDuration}
        durationOptions={modelOptions.durations}
        price={price}
        rmb={rmb}
        referenceSlot={
          <ReferenceMediaSlot
            image={referenceImage}
            video={referenceVideo}
            isUploading={isUploadingReference}
            onRemoveImage={() => {
              setReferenceImage(null);
              showVideoComposerToast("已移除参考图片");
            }}
            onRemoveVideo={() => {
              setReferenceVideo(null);
              showVideoComposerToast("已移除参考视频");
            }}
          />
        }
        collapsed={collapsed}
        dropdownPlacement={placement === "inline" ? "bottom" : "top"}
      />
    </div>
  );
}
