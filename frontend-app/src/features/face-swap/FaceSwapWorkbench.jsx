import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Clock3,
  ImagePlus,
  Loader2,
  LockKeyhole,
  Play,
  Settings,
  Sparkles,
  Video,
  X
} from "lucide-react";
import { CustomSelect } from "../../components/CustomSelect";
import BillingPoints from "../../components/BillingPoints.jsx";
import { useToast } from "../../components/ToastProvider";
import "./faceSwapStyles.css";

const faceSamples = [
  "/assets/faceswap/face-sample-1.jpg",
  "/assets/faceswap/face-sample-2.jpg",
  "/assets/faceswap/face-sample-3.jpg",
  "/assets/faceswap/face-sample-4.jpg"
];

const videoSamples = [
  { img: "/assets/faceswap/video-sample-1.jpg", time: "00:30" },
  { img: "/assets/faceswap/video-sample-2.jpg", time: "00:45" },
  { img: "/assets/faceswap/video-sample-3.jpg", time: "01:15" }
];

function formatBytes(bytes) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let index = 0;
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }
  const rounded = value >= 100 || index === 0 ? Math.round(value) : value.toFixed(1);
  return `${rounded} ${units[index]}`;
}

function normalizeSourceDuration(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return "";
  return String(Math.max(2, Math.ceil(number)));
}

function cleanDisplayName(value, fallback = "素材文件") {
  const text = String(value || "").trim();
  if (!text) return fallback;
  const suspiciousCount = (text.match(/[\uFFFD\u951F]/g) || []).length;
  if (suspiciousCount >= 2 || /[ãÂ]/.test(text)) return fallback;
  return text;
}

function readVideoFileDuration(file) {
  if (typeof document === "undefined" || typeof window === "undefined") return Promise.resolve("");

  return new Promise((resolve) => {
    const url = window.URL.createObjectURL(file);
    const video = document.createElement("video");

    function cleanup() {
      window.URL.revokeObjectURL(url);
      video.removeAttribute("src");
      video.load();
    }

    video.preload = "metadata";
    video.onloadedmetadata = () => {
      const duration = normalizeSourceDuration(video.duration);
      cleanup();
      resolve(duration);
    };
    video.onerror = () => {
      cleanup();
      resolve("");
    };
    video.src = url;
  });
}

function UploadCard({
  type,
  title,
  hint,
  asset,
  previewUrl,
  isUploading,
  accept,
  sampleItems,
  onSelect,
  onClear
}) {
  const isPhoto = type === "photo";
  const inputRef = useRef(null);
  const Icon = isPhoto ? ImagePlus : Video;

  function clearFile(event) {
    event.preventDefault();
    event.stopPropagation();
    onClear?.();
  }

  return (
    <section className="face-swap-workbench__upload-card">
      <div className="face-swap-workbench__card-header">
        <div className={`face-swap-workbench__step-badge ${isPhoto ? "is-photo" : "is-video"}`}>
          {isPhoto ? "1" : "2"}
        </div>
        <div className="face-swap-workbench__card-copy">
          <h2>{title}</h2>
          <p>{hint}</p>
        </div>
        <span className="face-swap-workbench__format-pill">
          {isPhoto ? "JPG / PNG / WEBP" : "MP4 / MOV / AVI / MKV"}
        </span>
      </div>

      <button
        className={`face-swap-workbench__drop-zone ${isPhoto ? "is-photo" : "is-video"} ${previewUrl ? "has-preview" : ""}`}
        type="button"
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          hidden
          onChange={(event) => {
            onSelect?.(event.target.files?.[0] || null);
            event.target.value = "";
          }}
        />
        {previewUrl ? (
          isPhoto ? (
            <img src={previewUrl} alt={title} />
          ) : (
            <video src={previewUrl} muted playsInline preload="metadata" />
          )
        ) : (
          <>
            <Icon size={56} />
            <strong>{isPhoto ? "点击或拖拽照片到此处上传" : "点击或拖拽视频到此处上传"}</strong>
            <span>{isPhoto ? "建议使用正面、光线充足的照片" : "建议视频中主体清晰，时长不超过 15 秒"}</span>
          </>
        )}
        {previewUrl && !isUploading && (
          <span
            className="face-swap-workbench__clear-button"
            role="button"
            tabIndex={0}
            aria-label="清除已上传素材"
            onClick={clearFile}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") clearFile(event);
            }}
          >
            <X size={14} />
          </span>
        )}
        {asset && !isUploading && <small>{cleanDisplayName(asset.fileName, isPhoto ? "image asset" : "video asset")} · {formatBytes(asset.sizeBytes)}</small>}
        {isUploading && (
          <div className="face-swap-workbench__upload-overlay" aria-live="polite">
            <span className="face-swap-workbench__upload-spinner" aria-hidden="true" />
            <strong>{isPhoto ? "正在上传图片..." : "正在上传视频..."}</strong>
          </div>
        )}
      </button>
    </section>
  );
}

function ValidationDialog({ message, onClose }) {
  if (!message) return null;

  return (
    <div className="face-swap-workbench__dialog-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="face-swap-workbench__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="face-swap-validation-title"
        aria-describedby="face-swap-validation-desc"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button className="face-swap-workbench__dialog-close" type="button" aria-label="关闭提示" onClick={onClose}>
          <X size={18} />
        </button>
        <div className="face-swap-workbench__dialog-icon">
          <AlertCircle size={24} />
        </div>
        <div className="face-swap-workbench__dialog-copy">
          <h2 id="face-swap-validation-title">素材还未上传完整</h2>
          <p id="face-swap-validation-desc">{message}</p>
          <span>请先补充必需素材，再生成换脸视频。</span>
        </div>
        <div className="face-swap-workbench__dialog-actions">
          <button type="button" onClick={onClose}>
            我知道了
          </button>
        </div>
      </section>
    </div>
  );
}

export function FaceSwapWorkbench({
  options,
  onSubmit,
  isSubmitting,
  api,
  copy,
  heading = "AI 换脸工具",
  privacyText = "您上传的内容仅用于处理，不会被用于其他用途。",
  onViewHistory,
  isActive = true,
  resultVideoUrl = "",
  taskStatus = "idle",
  taskError = "",
  taskProgress = 0
}) {
  const { showToast: showTemporaryNotice, dismissToast } = useToast();
  const [imageAsset, setImageAsset] = useState(null);
  const [videoAsset, setVideoAsset] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [videoPreview, setVideoPreview] = useState("");
  const [model, setModel] = useState(options.defaults?.model || options.models[0]?.value || "");
  const [resolution, setResolution] = useState(options.defaults?.resolution || options.models[0]?.resolution || "720p");
  const [sourceDuration, setSourceDuration] = useState("");
  const [faceStrength, setFaceStrength] = useState(80);
  const [enhanceQuality, setEnhanceQuality] = useState(true);
  const [faceOptimize, setFaceOptimize] = useState(true);
  const [uploading, setUploading] = useState("");
  const [resultDismissed, setResultDismissed] = useState(false);
  const activeRef = useRef(isActive);

  useEffect(() => {
    activeRef.current = isActive;
    if (isActive) return;
    setImageAsset(null);
    setVideoAsset(null);
    setSourceDuration("");
    if (imagePreview) window.URL.revokeObjectURL(imagePreview);
    if (videoPreview) window.URL.revokeObjectURL(videoPreview);
    setImagePreview("");
    setVideoPreview("");
    dismissToast();
    setUploading("");
    setResultDismissed(false);
  }, [isActive, imagePreview, videoPreview]);

  useEffect(() => {
    if (resultVideoUrl) setResultDismissed(false);
  }, [resultVideoUrl]);

  const previewResultUrl = resultDismissed ? "" : resultVideoUrl;
  const isProcessingResult =
    taskStatus === "processing" || (isSubmitting && taskStatus !== "failed");
  const isMotionPreview = heading.includes("动作");
  const previewTitle = isMotionPreview ? "迁移预览" : "换脸预览";
  const previewEmptyLabel = isMotionPreview ? "等待动作视频" : "等待换脸结果";
  const previewDraftText = previewResultUrl
    ? isMotionPreview
      ? "动作迁移视频已生成，可在上方预览或前往历史记录查看"
      : "换脸视频已生成，可在上方预览或前往历史记录查看"
    : isProcessingResult
      ? isMotionPreview
        ? "正在生成动作迁移视频，完成后将自动展示在预览区"
        : "正在生成换脸视频，完成后将自动展示在预览区"
      : taskStatus === "failed"
        ? taskError || (isMotionPreview ? "动作迁移失败，请调整素材后重试" : "换脸生成失败，请调整素材后重试")
        : isMotionPreview
          ? "暂无草稿，上传素材后点击开始生成"
          : "暂无草稿，上传照片和视频后点击生成换脸视频";

  useEffect(() => {
    if (!model && (options.defaults?.model || options.models[0]?.value)) {
      setModel(options.defaults?.model || options.models[0].value);
    }
  }, [model, options.defaults?.model, options.models]);

  useEffect(() => {
    return () => {
      if (imagePreview) window.URL.revokeObjectURL(imagePreview);
      if (videoPreview) window.URL.revokeObjectURL(videoPreview);
    };
  }, [imagePreview, videoPreview]);

  const selectedModel = options.models.find((item) => item.value === model) || options.models[0] || null;
  const estimatedDurationSeconds = videoAsset && sourceDuration ? Number(sourceDuration) : 0;
  const billingFeature = isMotionPreview ? "motion-transfer" : "face-swap";
  const fallbackPoints =
    Number(selectedModel?.estimatedPoints ?? selectedModel?.points ?? selectedModel?.basePoints ?? 0) || null;
  const price = estimatedDurationSeconds
    ? (
        <>
          <BillingPoints
            feature={billingFeature}
            payload={{ durationSeconds: estimatedDurationSeconds }}
            fallbackPoints={fallbackPoints}
          />
          {" 积分"}
        </>
      )
    : "上传视频后预估";

  const resolutionOptions = useMemo(() => {
    const values = new Set();
    options.models.forEach((item) => {
      if (item.resolution) values.add(String(item.resolution));
    });
    if (options.defaults?.resolution) values.add(String(options.defaults.resolution));
    if (!values.size) values.add("720p");
    return Array.from(values).map((value) => ({ value, label: value }));
  }, [options.defaults?.resolution, options.models]);

  async function selectImage(file) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setNotice("请上传图片文件");
      return;
    }
    if (file.size > (options.limits?.maxImageBytes || 10 * 1024 * 1024)) {
      setNotice("图片大小不能超过 10MB");
      return;
    }
    if (imagePreview) window.URL.revokeObjectURL(imagePreview);
    setImagePreview(window.URL.createObjectURL(file));
    setImageAsset(null);
    setUploading("image");
    setNotice("");
    try {
      const uploadedAsset = await api.uploadImage(file);
      if (!activeRef.current) return;
      setImageAsset({ ...uploadedAsset, fileName: file.name || uploadedAsset.fileName });
    } catch (error) {
      if (!activeRef.current) return;
      setImagePreview("");
      setNotice(error.message || "图片上传失败");
    } finally {
      if (activeRef.current) setUploading("");
    }
  }

  async function selectVideo(file) {
    if (!file) return;
    if (!file.type.startsWith("video/")) {
      setNotice("请上传视频文件");
      return;
    }
    if (file.size > (options.limits?.maxVideoBytes || 200 * 1024 * 1024)) {
      setNotice("视频大小不能超过 200MB");
      return;
    }
    setVideoAsset(null);
    setSourceDuration("");
    setUploading("video");
    setNotice("");
    try {
      const detectedDuration = await readVideoFileDuration(file);
      if (!detectedDuration) {
        throw new Error("无法读取视频时长，请更换视频后重试");
      }
      if (Number(detectedDuration) > 15) {
        throw new Error("视频时长不能超过 15 秒");
      }
      if (videoPreview) window.URL.revokeObjectURL(videoPreview);
      setVideoPreview(window.URL.createObjectURL(file));
      setSourceDuration(detectedDuration);
      const uploadedAsset = await api.uploadVideo(file);
      if (!activeRef.current) return;
      setVideoAsset({ ...uploadedAsset, fileName: file.name || uploadedAsset.fileName });
    } catch (error) {
      if (!activeRef.current) return;
      setVideoPreview("");
      setSourceDuration("");
      setNotice(error.message || "视频上传失败");
    } finally {
      if (activeRef.current) setUploading("");
    }
  }

  function clearImage() {
    setImageAsset(null);
    if (imagePreview) window.URL.revokeObjectURL(imagePreview);
    setImagePreview("");
    setResultDismissed(true);
    setNotice("");
  }

  function clearVideo() {
    setVideoAsset(null);
    setSourceDuration("");
    if (videoPreview) window.URL.revokeObjectURL(videoPreview);
    setVideoPreview("");
    setResultDismissed(true);
    setNotice("");
  }

  function submit() {
    if (!imageAsset) {
      showTemporaryNotice(copy.imageRequired);
      return;
    }
    if (!videoAsset) {
      showTemporaryNotice(copy.videoRequired);
      return;
    }
    setNotice("");
    onSubmit({
      imageAssetId: imageAsset.id,
      videoAssetId: videoAsset.id,
      model,
      resolution
    });
  }

  return (
    <div className="face-swap-workbench">
      <div className="face-swap-workbench__hero">
        <div>
          <h1>{heading}</h1>
          <p>{copy.emptyDescription}</p>
        </div>
      </div>

      <div className="face-swap-workbench__upload-grid">
        <UploadCard
          type="photo"
          title={copy.imageTitle}
          hint={copy.imageHint}
          asset={imageAsset}
          previewUrl={imagePreview}
          isUploading={uploading === "image"}
          accept="image/*"
          sampleItems={faceSamples}
          onSelect={selectImage}
          onClear={clearImage}
        />
        <UploadCard
          type="video"
          title={copy.videoTitle}
          hint="仅支持 15 秒以内，生成时长自动跟随源视频"
          asset={videoAsset}
          previewUrl={videoPreview}
          isUploading={uploading === "video"}
          accept="video/*"
          sampleItems={videoSamples}
          onSelect={selectVideo}
          onClear={clearVideo}
        />
      </div>

      <section className="face-swap-workbench__settings">
        <div className="face-swap-workbench__settings-title"> 
          <Settings size={20} />
          高级设置
          <span className="face-swap-workbench__action-meta-inline">
            <span className="face-swap-workbench__price">{price}</span>
            <span className="face-swap-workbench__estimate">
              <Clock3 size={14} />
              预计处理时间 1-3 分钟
            </span>
          </span>
        </div>

        <div className="face-swap-workbench__settings-body">
          <div className="face-swap-workbench__settings-controls">
            <label className="face-swap-workbench__setting face-swap-workbench__setting--wide">
              <span>换脸强度</span>
              <input
                type="range"
                min="40"
                max="100"
                step="1"
                value={faceStrength}
                onChange={(event) => setFaceStrength(Number(event.target.value))}
              />
              <b>{faceStrength}%</b>
            </label>

            <label className="face-swap-workbench__setting face-swap-workbench__setting--model">
              <span>模型</span>
              <CustomSelect ariaLabel="模型" value={model} onChange={setModel} options={options.models} />
            </label>

            <label className="face-swap-workbench__setting face-swap-workbench__setting--compact">
              <span>分辨率</span>
              <CustomSelect className="content-fit-select" ariaLabel="分辨率" value={resolution} onChange={setResolution} options={resolutionOptions} />
            </label>

            <label className="face-swap-workbench__toggle face-swap-workbench__toggle--top face-swap-workbench__toggle--enhance">
              <span>画质增强</span>
              <input type="checkbox" checked={enhanceQuality} onChange={() => setEnhanceQuality((value) => !value)} />
            </label>

            <label className="face-swap-workbench__toggle face-swap-workbench__toggle--top face-swap-workbench__toggle--optimize">
              <span>人脸优化</span>
              <input type="checkbox" checked={faceOptimize} onChange={() => setFaceOptimize((value) => !value)} />
            </label>
          </div>

          <div className="face-swap-workbench__action-area">
            <span className="face-swap-workbench__dynamic-price">
              {estimatedDurationSeconds ? <>预计消耗 {price}</> : "上传视频后预估积分消耗"}
            </span>
            <button className="face-swap-workbench__start-button" type="button" onClick={submit} disabled={isSubmitting || !!uploading}>
              {isSubmitting ? <Loader2 size={18} /> : <Sparkles size={18} />}
              {copy.submitLabel}
            </button>
          </div>
        </div>
      </section>

      <section className="face-swap-workbench__target-preview">
        <div className="face-swap-workbench__target-preview-header">
          <h2>{previewTitle}</h2>
          {onViewHistory && (
            <button type="button" onClick={onViewHistory}>
              查看全部作品 &gt;
            </button>
          )}
        </div>
        <div
          className={`face-swap-workbench__target-preview-media ${
            previewResultUrl
              ? "has-preview"
              : isProcessingResult
                ? "is-processing"
                : "is-empty"
          }`}
        >
          {previewResultUrl ? (
            <video src={previewResultUrl} controls playsInline preload="metadata" />
          ) : isProcessingResult ? (
            <div className="face-swap-workbench__target-processing">
              <span className="face-swap-workbench__upload-spinner" aria-hidden="true" />
              <strong>{copy.processingGenerate || "正在生成换脸视频"}</strong>
              <small>{taskProgress ? `${taskProgress}%` : "任务处理中，请稍候"}</small>
            </div>
          ) : (
            <div className="face-swap-workbench__target-empty">
              <Video size={34} />
              <span>{previewEmptyLabel}</span>
            </div>
          )}
          <span className="face-swap-workbench__target-compare-line" />
          <span className="face-swap-workbench__target-compare-handle">{"< >"}</span>
          <div className="face-swap-workbench__target-player">
            <Play size={16} fill="currentColor" />
            <span>
              {previewResultUrl
                ? isMotionPreview
                  ? "迁移结果"
                  : "换脸结果"
                : isProcessingResult
                  ? "生成中"
                  : isMotionPreview
                    ? "等待迁移结果"
                    : "等待换脸结果"}
            </span>
            <i />
            <span>{resolution}</span>
          </div>
        </div>
        <div className="face-swap-workbench__target-draft">{previewDraftText}</div>
      </section>

      <div className="face-swap-workbench__privacy">
        <LockKeyhole size={16} />
        {privacyText}
      </div>
    </div>
  );
}
