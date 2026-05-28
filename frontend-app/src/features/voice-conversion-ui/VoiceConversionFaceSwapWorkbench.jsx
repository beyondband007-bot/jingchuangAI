import React, { useEffect, useRef, useState } from "react";
import {
  FileAudio,
  Loader2,
  LockKeyhole,
  Mic2,
  Sparkles,
  X,
} from "lucide-react";
import { CustomSelect } from "../../components/CustomSelect";
import "./VoiceConversionFaceSwapWorkbench.css";

const voiceConversionModelOptions = [
  { value: "voice-clone-pro", label: "Voice Clone Pro" },
  { value: "voice-clone-studio", label: "Voice Clone Studio" },
  { value: "voice-clone-fast", label: "Voice Clone Fast" },
];

const voiceConversionDenoiseOptions = [
  { value: "low", label: "低" },
  { value: "medium", label: "中等" },
  { value: "high", label: "高" },
  { value: "max", label: "最高" },
];

const voiceConversionEmotionOptions = [
  { value: "on", label: "开启" },
  { value: "off", label: "关闭" },
];

const voiceConversionFormatOptions = [
  { value: "mp3", label: "mp3" },
  { value: "m4a", label: "m4a" },
  { value: "wav", label: "wav" },
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
  const rounded =
    value >= 100 || index === 0 ? Math.round(value) : value.toFixed(1);
  return `${rounded} ${units[index]}`;
}

function SettingsSlider({ label, displayValue, minLabel, maxLabel, ...props }) {
  return (
    <label className="voice-conversion-face-swap-workbench__slider">
      <span className="voice-conversion-face-swap-workbench__slider-header">
        <span>{label}</span>
        <strong>{displayValue}</strong>
      </span>
      <input {...props} />
      <span className="voice-conversion-face-swap-workbench__slider-range">
        <small>{minLabel}</small>
        <small>{maxLabel}</small>
      </span>
    </label>
  );
}

function UploadCard({
  type,
  title,
  asset,
  previewUrl,
  isUploading,
  accept,
  onSelect,
  onClear,
}) {
  const isTarget = type === "target";
  const inputRef = useRef(null);
  const Icon = isTarget ? Mic2 : FileAudio;
  const formatText = isTarget ? "MP3/M4A/WAV" : "MP3/M4A/WAV/FLAC/WEBM";
  const uploadTitle = isTarget
    ? "点击或拖拽目标音色文件到此处上传"
    : "点击或拖拽源音频文件到此处上传";
  const uploadNote = isTarget
    ? "支持 mp3、m4a、wav"
    : "支持 mp3、m4a、wav、flac、webm";

  function clearFile(event) {
    event.preventDefault();
    event.stopPropagation();
    onClear?.();
  }

  return (
    <section className="face-swap-workbench__upload-card">
      <div className="assets-section-title voice-conversion-workbench__upload-title">
        <span
          className={`voice-conversion-workbench__upload-index ${
            isTarget ? "is-photo" : "is-video"
          }`}
        >
          {isTarget ? "1" : "2"}
        </span>
        <strong>{title}</strong>
        <span className="voice-conversion-workbench__format-pill">
          {formatText}
        </span>
      </div>

      <button
        className={`voice-conversion-workbench__upload-box ${
          isTarget ? "" : "is-video"
        } ${previewUrl ? "has-file" : ""}`}
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
          isTarget ? (
            <img src={previewUrl} alt={title} />
          ) : (
            <video src={previewUrl} muted playsInline preload="metadata" />
          )
        ) : (
          <>
            <div className="voice-conversion-workbench__upload-icon">
              <Icon size={56} />
            </div>
            <strong className="voice-conversion-workbench__upload-strong">
              {uploadTitle}
            </strong>
            <span className="voice-conversion-workbench__upload-note">
              {uploadNote}
            </span>
          </>
        )}

        {previewUrl && !isUploading && (
          <span
            className="voice-conversion-workbench__upload-clear"
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

        {asset && (
          <span className="voice-conversion-face-swap-workbench__upload-meta">
            {asset.fileName} · {formatBytes(asset.sizeBytes)}
          </span>
        )}

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

export function VoiceConversionFaceSwapWorkbench({
  options,
  onSubmit,
  isSubmitting,
  api,
  copy,
  heading = "音色转换",
  privacyText = "您上传的内容仅用于处理，不会被用于其他用途。",
}) {
  const [imageAsset, setImageAsset] = useState(null);
  const [videoAsset, setVideoAsset] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [videoPreview, setVideoPreview] = useState("");
  const [model, setModel] = useState(
    options?.defaults?.model || options?.models?.[0]?.value || "",
  );
  const [speed, setSpeed] = useState(1);
  const [volume, setVolume] = useState(1);
  const [pitch, setPitch] = useState(0);
  const [advancedModel, setAdvancedModel] = useState(
    voiceConversionModelOptions[0].value,
  );
  const [denoiseLevel, setDenoiseLevel] = useState(
    voiceConversionDenoiseOptions[1].value,
  );
  const [preserveEmotion, setPreserveEmotion] = useState(
    voiceConversionEmotionOptions[0].value,
  );
  const [outputFormat, setOutputFormat] = useState(
    voiceConversionFormatOptions[0].value,
  );
  const [notice, setNotice] = useState("");
  const [uploading, setUploading] = useState("");

  useEffect(() => {
    if (!model && (options?.defaults?.model || options?.models?.[0]?.value)) {
      setModel(options.defaults?.model || options.models[0].value);
    }
  }, [model, options]);

  useEffect(() => {
    return () => {
      if (imagePreview) window.URL.revokeObjectURL(imagePreview);
      if (videoPreview) window.URL.revokeObjectURL(videoPreview);
    };
  }, [imagePreview, videoPreview]);

  async function selectImage(file) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setNotice("请上传图片文件");
      return;
    }
    if (file.size > (options?.limits?.maxImageBytes || 10 * 1024 * 1024)) {
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
    if (file.size > (options?.limits?.maxVideoBytes || 200 * 1024 * 1024)) {
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
      speed,
      volume,
      pitch,
      advancedModel,
      denoiseLevel,
      preserveEmotion,
      outputFormat,
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
          type="target"
          title="上传目标音色"
          asset={imageAsset}
          previewUrl={imagePreview}
          isUploading={uploading === "image"}
          accept="image/*"
          onSelect={selectImage}
          onClear={clearImage}
        />
        <UploadCard
          type="source"
          title="上传音频文件"
          asset={videoAsset}
          previewUrl={videoPreview}
          isUploading={uploading === "video"}
          accept="video/*"
          onSelect={selectVideo}
          onClear={clearVideo}
        />
      </div>

      <section className="face-swap-workbench__settings">
        <div className="face-swap-workbench__settings-title">生成设置</div>

        <div className="face-swap-workbench__settings-body">
          <div className="voice-conversion-face-swap-workbench__settings-block">
            <div className="voice-conversion-face-swap-workbench__sliders">
              <SettingsSlider
                label="语速"
                displayValue={`${speed.toFixed(2)}x`}
                min="0.5"
                max="2"
                step="0.05"
                minLabel="0.5x"
                maxLabel="2.0x"
                type="range"
                value={speed}
                onChange={(event) => setSpeed(Number(event.target.value))}
              />
              <SettingsSlider
                label="音量"
                displayValue={volume.toFixed(1)}
                min="0.1"
                max="10"
                step="0.1"
                minLabel="0.1"
                maxLabel="10"
                type="range"
                value={volume}
                onChange={(event) => setVolume(Number(event.target.value))}
              />
              <SettingsSlider
                label="音调"
                displayValue={pitch > 0 ? `+${pitch}` : String(pitch)}
                min="-12"
                max="12"
                step="1"
                minLabel="-12"
                maxLabel="+12"
                type="range"
                value={pitch}
                onChange={(event) => setPitch(Number(event.target.value))}
              />
            </div>

            <div className="voice-conversion-face-swap-workbench__advanced-head">
              高级设置
            </div>

            <div className="voice-conversion-face-swap-workbench__advanced-grid">
              <label className="voice-conversion-face-swap-workbench__advanced-field">
                <span>模型</span>
                <CustomSelect
                  ariaLabel="转换模型"
                  className="idh-showcase-select custom-select-theme-dh"
                  value={advancedModel}
                  onChange={setAdvancedModel}
                  options={voiceConversionModelOptions}
                />
              </label>

              <label className="voice-conversion-face-swap-workbench__advanced-field">
                <span>降噪强度</span>
                <CustomSelect
                  ariaLabel="降噪强度"
                  className="idh-showcase-select custom-select-theme-dh"
                  value={denoiseLevel}
                  onChange={setDenoiseLevel}
                  options={voiceConversionDenoiseOptions}
                />
              </label>

              <label className="voice-conversion-face-swap-workbench__advanced-field">
                <span>保留情绪</span>
                <CustomSelect
                  ariaLabel="保留情绪"
                  className="idh-showcase-select custom-select-theme-dh"
                  value={preserveEmotion}
                  onChange={setPreserveEmotion}
                  options={voiceConversionEmotionOptions}
                />
              </label>

              <label className="voice-conversion-face-swap-workbench__advanced-field">
                <span>输出格式</span>
                <CustomSelect
                  ariaLabel="输出格式"
                  className="idh-showcase-select custom-select-theme-dh"
                  value={outputFormat}
                  onChange={setOutputFormat}
                  options={voiceConversionFormatOptions}
                />
              </label>
            </div>

            <div className="face-swap-workbench__action-area voice-conversion-face-swap-workbench__action-area">
              <button
                className="face-swap-workbench__start-button"
                type="button"
                onClick={submit}
                disabled={isSubmitting || !!uploading}
              >
                {isSubmitting ? <Loader2 size={18} /> : <Sparkles size={18} />}
                {copy.submitLabel}
              </button>
            </div>
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
