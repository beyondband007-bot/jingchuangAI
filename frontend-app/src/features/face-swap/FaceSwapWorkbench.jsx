import React, { useEffect, useMemo, useRef, useState } from "react";
import {
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
import { useToast } from "../../hooks/useToast";
import "./FaceSwapWorkbench.css";

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
        {asset && <small>{asset.fileName} · {formatBytes(asset.sizeBytes)}</small>}
        {isUploading && (
          <span className="face-swap-workbench__uploading">
            <Loader2 size={14} />
            上传中
          </span>
        )}
      </button>
    </section>
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
  authUser,
  onOpenAuth,
}) {
  const isGuest = Boolean(authUser?.isGuest);
  const { message: toastMessage, showToast } = useToast();
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
  const [notice, setNotice] = useState("");
  const [uploading, setUploading] = useState("");

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
  const isConfigured = selectedModel?.configured !== false;
  const price = `${selectedModel?.basePoints || 0} 积分`;

  const resolutionOptions = useMemo(() => {
    const values = new Set();
    options.models.forEach((item) => {
      if (item.resolution) values.add(String(item.resolution));
    });
    if (options.defaults?.resolution) values.add(String(options.defaults.resolution));
    if (!values.size) values.add("720p");
    return Array.from(values).map((value) => ({ value, label: value }));
  }, [options.defaults?.resolution, options.models]);

  function requireAuth() {
    if (!isGuest) return true;
    showToast("请先登录");
    onOpenAuth?.("login");
    return false;
  }

  function requireConfigured() {
    if (isConfigured) return true;
    showToast("当前模型未配置，暂不可用");
    return false;
  }

  async function selectImage(file) {
    if (!file) return;
    if (!requireAuth()) return;
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
      setImageAsset(await api.uploadImage(file));
    } catch (error) {
      setImagePreview("");
      setNotice(error.message || "图片上传失败");
    } finally {
      setUploading("");
    }
  }

  async function selectVideo(file) {
    if (!file) return;
    if (!requireAuth()) return;
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
      setVideoAsset(await api.uploadVideo(file));
    } catch (error) {
      setVideoPreview("");
      setSourceDuration("");
      setNotice(error.message || "视频上传失败");
    } finally {
      setUploading("");
    }
  }

  function clearImage() {
    setImageAsset(null);
    if (imagePreview) window.URL.revokeObjectURL(imagePreview);
    setImagePreview("");
    setNotice("");
  }

  function clearVideo() {
    setVideoAsset(null);
    setSourceDuration("");
    if (videoPreview) window.URL.revokeObjectURL(videoPreview);
    setVideoPreview("");
    setNotice("");
  }

  function submit() {
    if (!requireAuth()) return;
    if (!imageAsset) {
      showToast(copy.imageRequired);
      return;
    }
    if (!videoAsset) {
      showToast(copy.videoRequired);
      return;
    }
    setNotice("");
    onSubmit({
      imageAssetId: imageAsset.id,
      videoAssetId: videoAsset.id,
      model,
      resolution,
      duration: Number(sourceDuration)
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
            <button className="face-swap-workbench__start-button" type="button" onClick={submit} disabled={isSubmitting || !!uploading}>
              {isSubmitting ? <Loader2 size={18} /> : <Sparkles size={18} />}
              {copy.submitLabel}
            </button>
          </div>
        </div>
      </section>

      <section className="face-swap-workbench__target-preview">
        <div className="face-swap-workbench__target-preview-header">
          <h2>{heading.includes("\u52a8\u4f5c") ? "\u8fc1\u79fb\u9884\u89c8" : "\u6362\u8138\u9884\u89c8"}</h2>
          {onViewHistory && (
            <button type="button" onClick={onViewHistory}>
              {"\u67e5\u770b\u5168\u90e8\u4f5c\u54c1 >"}
            </button>
          )}
        </div>
        <div className={`face-swap-workbench__target-preview-media ${videoPreview ? "has-preview" : ""}`}>
          {videoPreview ? (
            <video src={videoPreview} controls playsInline preload="metadata" />
          ) : (
            <img
              src={heading.includes("\u52a8\u4f5c") ? "/assets/motion/hot-3-motion.jpg" : "/assets/face-swap/hot-4-faceswap.jpg"}
              alt={heading.includes("\u52a8\u4f5c") ? "\u8fc1\u79fb\u9884\u89c8" : "\u6362\u8138\u9884\u89c8"}
            />
          )}
          <span className="face-swap-workbench__target-compare-line" />
          <span className="face-swap-workbench__target-compare-handle">{"< >"}</span>
          <div className="face-swap-workbench__target-player">
            <Play size={16} fill="currentColor" />
            <span>{videoPreview ? (sourceDuration ? `00:00 / 00:${String(sourceDuration).padStart(2, "0")}` : "\u5df2\u4e0a\u4f20\u89c6\u9891") : "\u8bf7\u5148\u4e0a\u4f20\u76ee\u6807\u89c6\u9891"}</span>
            <i />
            <span>{resolution}</span>
          </div>
        </div>
        <div className="face-swap-workbench__target-draft">
          {videoPreview
            ? "\u5df2\u52a0\u8f7d\u76ee\u6807\u89c6\u9891\u9884\u89c8\uff0c\u70b9\u51fb\u53f3\u4e0b\u89d2\u6309\u94ae\u5f00\u59cb\u751f\u6210"
            : "\u6682\u65e0\u8349\u7a3f\uff0c\u4e0a\u4f20\u7167\u7247\u6216\u89c6\u9891\u540e\u5c06\u81ea\u52a8\u4fdd\u5b58"}
        </div>
      </section>

      {notice && <div className="face-swap-workbench__notice">{notice}</div>}
      {toastMessage && <div className="fm-floating-toast" role="alert">{toastMessage}</div>}

      <div className="face-swap-workbench__privacy">
        <LockKeyhole size={16} />
        {privacyText}
      </div>
    </div>
  );
}
