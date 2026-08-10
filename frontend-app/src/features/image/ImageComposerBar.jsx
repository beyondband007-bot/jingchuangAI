import { useEffect, useRef, useState } from "react";
import { imageApi } from "../../api/imageApi";
import { ImagePromptDialog } from "../chat/components/ImagePromptDialog";
import { ReferenceImageSlot } from "./imageSharedUi";
import { useToast } from "../../components/ToastProvider";
import { getFileSizeLimitError, UPLOAD_SIZE_LIMITS } from "../../utils/uploadLimits";

export function ComposerBar({
  options,
  onSubmit,
  placement = "sticky",
  collapsed = false,
  onFocus,
  onBlur,
  seed,
  resetSignal = 0,
  shellRef,
  onSeedApplied,
}) {
  const { showToast, dismissToast } = useToast();
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState(options.models[0]?.value || "");
  const [ratio, setRatio] = useState(options.ratios[0] || "");
  const [quality, setQuality] = useState(options.qualities[0]?.value || "");
  const [referenceImage, setReferenceImage] = useState(null);
  const [isUploadingReference, setIsUploadingReference] = useState(false);
  const referenceInputRef = useRef(null);
  const previousResetSignalRef = useRef(resetSignal);
  const appliedSeedIdRef = useRef(null);
  const selectedModel = options.models.find((item) => item.value === model);
  const ratioOptions = Array.isArray(selectedModel?.supportedRatios)
    ? options.ratios.filter((item) => selectedModel.supportedRatios.includes(item))
    : options.ratios;

  useEffect(() => {
    if (!seed) return;
    const seedId = seed.id || "__seed_without_id__";
    if (appliedSeedIdRef.current === seedId) return;
    appliedSeedIdRef.current = seedId;
    setPrompt(seed.prompt || "");
    setReferenceImage(seed.referenceImage?.url ? seed.referenceImage : null);
    if (
      seed.model &&
      options.models.some((item) => item.value === seed.model)
    ) {
      setModel(seed.model);
    }
    const seededModel = options.models.find((item) => item.value === (seed.model || model));
    const seededRatioOptions = Array.isArray(seededModel?.supportedRatios)
      ? options.ratios.filter((item) => seededModel.supportedRatios.includes(item))
      : options.ratios;
    if (seed.ratio && seededRatioOptions.includes(seed.ratio)) {
      setRatio(seed.ratio);
    }
    if (
      seed.quality &&
      options.qualities.some((item) => item.value === seed.quality)
    ) {
      setQuality(seed.quality);
    }
    if (seed.notice) {
      showToast(seed.notice);
    }
    onSeedApplied?.(seed);
  }, [onSeedApplied, options.models, options.qualities, options.ratios, seed]);

  useEffect(() => {
    if (previousResetSignalRef.current === resetSignal) return;
    previousResetSignalRef.current = resetSignal;
    if (seed?.prompt || seed?.referenceImage?.url) return;
    setPrompt("");
    setReferenceImage(null);
    dismissToast();
  }, [resetSignal, seed]);

  useEffect(() => {
    if (!model && options.models[0]) setModel(options.models[0].value);
    if (!ratioOptions.includes(ratio) && ratioOptions[0]) setRatio(ratioOptions[0]);
    if (!quality && options.qualities[0])
      setQuality(options.qualities[0].value);
  }, [model, options, quality, ratio, ratioOptions]);

  const count = 1;
  const price = imageApi.calculatePrice({
    model,
    quality,
    count,
    models: options.models,
    qualities: options.qualities,
  });
  const canSubmit = prompt.trim().length > 0 && !isUploadingReference;

  function clearPrompt() {
    setPrompt("");
    setReferenceImage(null);
  }

  function fillRandomPrompt() {
    setPrompt(imageApi.getRandomPrompt());
  }

  async function handleReferenceSelect(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const sizeError = getFileSizeLimitError(
      file,
      UPLOAD_SIZE_LIMITS.imageReference,
      "参考图",
    );
    if (sizeError) {
      showToast(sizeError);
      event.target.value = "";
      return;
    }

    setIsUploadingReference(true);
    try {
      const uploaded = await imageApi.uploadReference(file);
      setReferenceImage({
        url: uploaded.referenceImageUrl || uploaded.url,
        originalName: uploaded.originalName || file.name,
        size: uploaded.size || file.size,
        mimeType: uploaded.mimeType || file.type,
      });
    } catch (error) {
      showToast(error.message || "参考图上传失败，请重试");
    } finally {
      setIsUploadingReference(false);
      event.target.value = "";
    }
  }

  function handleAddPrompt() {
    referenceInputRef.current?.click();
  }

  function removeReferenceImage() {
    setReferenceImage(null);
  }

  function submitPrompt() {
    if (!canSubmit) {
      showToast(
        isUploadingReference ? "参考图上传完成后再生成" : "请先输入图片描述",
      );
      return;
    }

    if (referenceImage && selectedModel?.supportsReferenceImage === false) {
      showToast("当前模型不支持参考图");
      return;
    }

    onSubmit({
      prompt: prompt.trim(),
      model,
      ratio,
      quality,
      count,
      referenceImageUrl: referenceImage?.url || null,
    });
    setPrompt("");
    setReferenceImage(null);
  }

  return (
    <div
      ref={shellRef}
      className={`sowa-composer image-composer-shell is-${placement} ${collapsed ? "is-collapsed" : ""}`}
      aria-label="图片生成输入框"
      onPointerDown={onFocus}
      onFocus={onFocus}
      onBlur={onBlur}
    >
      <input
        ref={referenceInputRef}
        type="file"
        hidden
        accept="image/jpeg,image/png,image/webp"
        onChange={handleReferenceSelect}
      />
      <ImagePromptDialog
        ariaLabel="图片生成输入框"
        placeholder="选择模型后，释放你的创作灵感"
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
        ratioOptions={ratioOptions}
        quality={quality}
        onQualityChange={setQuality}
        qualityOptions={options.qualities}
        price={price}
        collapsed={collapsed}
        dropdownPlacement={placement === "inline" ? "bottom" : "top"}
        referenceSlot={
          <ReferenceImageSlot
            image={referenceImage}
            isUploading={isUploadingReference}
            onRemove={removeReferenceImage}
          />
        }
      />
    </div>
  );
}

export function ComposerBarPlaceholder({
  placement = "workbench",
  className = "image-composer-shell",
}) {
  return (
    <div
      className={`sowa-composer ${className} image-composer-placeholder is-${placement}`}
      aria-hidden="true"
    >
      <div className="image-composer-placeholder-dialog">
        <span className="image-composer-placeholder-line is-main" />
        <span className="image-composer-placeholder-line" />
      </div>
    </div>
  );
}
