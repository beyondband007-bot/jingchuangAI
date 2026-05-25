import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Clock3,
  ImagePlus,
  Loader2,
  LockKeyhole,
  Play,
  Settings,
  Sparkles,
  UploadCloud,
  Video,
  X
} from "lucide-react";
import { CustomSelect } from "../../components/CustomSelect";
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
            <span>{isPhoto ? "建议使用正面、光线充足的照片" : "建议视频中主体清晰，时长不超过 10 分钟"}</span>
            <UploadCloud className="face-swap-workbench__upload-cloud" size={20} />
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

      <div className="face-swap-workbench__sample-title">{isPhoto ? "示例照片" : "示例视频"}</div>
      <div className={`face-swap-workbench__samples ${isPhoto ? "is-photo" : "is-video"}`}>
        {sampleItems.map((item, index) => (
          <div className="face-swap-workbench__sample" key={`${type}-${index}`}>
            <img src={isPhoto ? item : item.img} alt={`${type}-sample-${index + 1}`} />
            {!isPhoto && (
              <>
                <Play className="face-swap-workbench__sample-play" size={16} />
                <span className="face-swap-workbench__sample-time">{item.time}</span>
              </>
            )}
          </div>
        ))}
      </div>
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
  privacyText = "您上传的内容仅用于处理，不会被用于其他用途。"
}) {
  const [imageAsset, setImageAsset] = useState(null);
  const [videoAsset, setVideoAsset] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [videoPreview, setVideoPreview] = useState("");
  const [model, setModel] = useState(options.defaults?.model || options.models[0]?.value || "");
  const [resolution, setResolution] = useState(options.defaults?.resolution || options.models[0]?.resolution || "720p");
  const [duration, setDuration] = useState(String(options.defaults?.duration || options.models[0]?.duration || 5));
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

  const durationOptions = useMemo(() => {
    const values = new Set();
    options.models.forEach((item) => {
      if (item.duration) values.add(String(item.duration));
    });
    if (options.defaults?.duration) values.add(String(options.defaults.duration));
    if (!values.size) ["5", "10", "15"].forEach((value) => values.add(value));
    return Array.from(values)
      .sort((left, right) => Number(left) - Number(right))
      .map((value) => ({ value, label: `${value}s` }));
  }, [options.defaults?.duration, options.models]);

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
    if (!file.type.startsWith("video/")) {
      setNotice("请上传视频文件");
      return;
    }
    if (file.size > (options.limits?.maxVideoBytes || 200 * 1024 * 1024)) {
      setNotice("视频大小不能超过 200MB");
      return;
    }
    if (videoPreview) window.URL.revokeObjectURL(videoPreview);
    setVideoPreview(window.URL.createObjectURL(file));
    setVideoAsset(null);
    setUploading("video");
    setNotice("");
    try {
      setVideoAsset(await api.uploadVideo(file));
    } catch (error) {
      setVideoPreview("");
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
    if (videoPreview) window.URL.revokeObjectURL(videoPreview);
    setVideoPreview("");
    setNotice("");
  }

  function submit() {
    if (!imageAsset) {
      setNotice(copy.imageRequired);
      return;
    }
    if (!videoAsset) {
      setNotice(copy.videoRequired);
      return;
    }
    setNotice("");
    onSubmit({
      imageAssetId: imageAsset.id,
      videoAssetId: videoAsset.id,
      model,
      resolution,
      duration: Number(duration)
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
          hint={`建议 ${options.limits?.recommendedVideoSeconds || 15} 秒内，主体清晰稳定`}
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
              <CustomSelect ariaLabel="分辨率" value={resolution} onChange={setResolution} options={resolutionOptions} />
            </label>

            <label className="face-swap-workbench__setting face-swap-workbench__setting--duration">
              <span>时长</span>
              <CustomSelect ariaLabel="时长" value={duration} onChange={setDuration} options={durationOptions} />
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

      {notice && <div className="face-swap-workbench__notice">{notice}</div>}

      <div className="face-swap-workbench__privacy">
        <LockKeyhole size={16} />
        {privacyText}
      </div>
    </div>
  );
}
