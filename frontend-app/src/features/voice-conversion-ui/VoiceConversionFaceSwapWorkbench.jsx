import React, { useState } from "react";
import {
  Download,
  FileAudio,
  LockKeyhole,
  Mic2,
  Play,
} from "lucide-react";
import { CustomSelect } from "../../components/CustomSelect";
import { formatBeijingStamp } from "../../utils/time";
import { voiceConvertApi } from "../voice-convert/voiceConvertApi";
import "./voiceConversionWorkbenchCard.css";
import "./VoiceConversionFaceSwapWorkbench.css";

const presetVoices = [
  { name: "清澈女声", desc: "明亮自然，适合旁白与短视频", active: true },
  { name: "磁性男声", desc: "低沉稳定，适合解说与课程", active: false },
  { name: "少年音色", desc: "清爽灵动，适合角色配音", active: false },
  { name: "主播音色", desc: "标准咬字，适合直播与口播", active: false },
];

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

function makeVoiceId() {
  return `VoiceConvert_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function makeVoiceDownloadName(prefix = "voice-convert") {
  return `${prefix}-${formatBeijingStamp()}.mp3`;
}

function readAudioDuration(file) {
  return new Promise((resolve) => {
    const audio = document.createElement("audio");
    const url = URL.createObjectURL(file);
    const cleanup = () => URL.revokeObjectURL(url);
    audio.preload = "metadata";
    audio.onloadedmetadata = () => {
      const durationMs = Number.isFinite(audio.duration) ? audio.duration * 1000 : 0;
      cleanup();
      resolve(durationMs);
    };
    audio.onerror = () => {
      cleanup();
      resolve(0);
    };
    audio.src = url;
  });
}

async function downloadVoiceFile({ audioDataUrl, audioUrl, fileName }) {
  let href = audioDataUrl || "";
  let shouldRevoke = false;

  if (!href && audioUrl) {
    const response = await fetch(audioUrl);
    if (!response.ok) throw new Error("下载音频失败");
    href = URL.createObjectURL(await response.blob());
    shouldRevoke = true;
  }

  if (!href) throw new Error("暂无可下载音频");

  const link = document.createElement("a");
  link.href = href;
  link.download = fileName || makeVoiceDownloadName();
  document.body.appendChild(link);
  link.click();
  link.remove();

  if (shouldRevoke) URL.revokeObjectURL(href);
}

function UploadBox({
  icon: Icon,
  title,
  note,
  fileState,
  accept,
  isUploading,
  onPick,
  onClear,
  tone = "default",
}) {
  function clearFile(event) {
    event.preventDefault();
    event.stopPropagation();
    onClear();
  }

  return (
    <label
      className={`voice-conversion-workbench__upload-box ${
        tone === "video" ? "is-video" : ""
      } ${fileState ? "has-file" : ""}`}
    >
      <input
        type="file"
        accept={accept}
        hidden
        disabled={isUploading}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) onPick(file);
        }}
      />
      <div className="voice-conversion-workbench__upload-icon">
        <Icon size={56} />
      </div>
      <strong className="voice-conversion-workbench__upload-strong">
        {fileState?.fileName || title}
      </strong>
      <span className="voice-conversion-workbench__upload-note">
        {fileState
          ? `时长 ${Math.max(
              1,
              Math.round((fileState.durationMs || 0) / 1000),
            )} 秒 · ${(fileState.size / 1024 / 1024).toFixed(1)}MB`
          : note}
      </span>
      {fileState ? (
        <button
          type="button"
          className="voice-conversion-workbench__upload-clear"
          aria-label="清除已上传音频"
          onClick={clearFile}
        >
          ×
        </button>
      ) : null}
    </label>
  );
}

function SettingsSlider({ label, displayValue, minLabel, maxLabel, ...props }) {
  return (
    <label className="voice-synthesis-workspace__slider">
      <span className="voice-synthesis-workspace__slider-header">
        <span>{label}</span>
        <strong>{displayValue}</strong>
      </span>
      <input {...props} />
      <span className="voice-synthesis-workspace__slider-range">
        <small>{minLabel}</small>
        <small>{maxLabel}</small>
      </span>
    </label>
  );
}

export function VoiceConversionFaceSwapWorkbench({
  copy,
  heading = "音色转换",
  privacyText = "您上传的内容仅用于音色转换处理，不会被用于其他用途。",
}) {
  const [targetAudio, setTargetAudio] = useState(null);
  const [sourceAudio, setSourceAudio] = useState(null);
  const [uploading, setUploading] = useState("");
  const [notice, setNotice] = useState("");
  const [speed, setSpeed] = useState(1);
  const [volume, setVolume] = useState(1);
  const [pitch, setPitch] = useState(0);
  const [isConverting, setIsConverting] = useState(false);
  const [demoAudio, setDemoAudio] = useState("");
  const [resultAudio, setResultAudio] = useState("");
  const [resultUrl, setResultUrl] = useState("");
  const [resultFileName, setResultFileName] = useState("voice-convert.mp3");
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

  async function uploadTargetFile(file) {
    setNotice("");
    setUploading("target");
    try {
      const durationMs = await readAudioDuration(file);
      if (durationMs && (durationMs < 10000 || durationMs > 5 * 60 * 1000)) {
        throw new Error("目标音色需为 10 秒到 5 分钟的 mp3、m4a 或 wav。");
      }

      const result = await voiceConvertApi.uploadTargetAudio(file, durationMs);
      setTargetAudio({
        ...result,
        fileName: file.name,
        size: file.size,
        durationMs,
      });
      setDemoAudio("");
      setResultAudio("");
      setResultUrl("");
      setNotice("目标音色上传完成。");
    } catch (error) {
      setNotice(error.message || "目标音色上传失败");
    } finally {
      setUploading("");
    }
  }

  function clearTargetAudio() {
    setTargetAudio(null);
    setDemoAudio("");
    setResultAudio("");
    setResultUrl("");
    setNotice("");
  }

  function clearSourceAudio() {
    setSourceAudio(null);
    setResultAudio("");
    setResultUrl("");
    setNotice("");
  }

  async function pickSourceFile(file) {
    setNotice("");
    try {
      if (file.size > 50 * 1024 * 1024) {
        throw new Error("源音频需小于 50MB。");
      }
      const durationMs = await readAudioDuration(file);
      if (durationMs && (durationMs < 6000 || durationMs > 6 * 60 * 1000)) {
        throw new Error("源音频需为 6 秒到 6 分钟的 mp3、wav、flac、m4a 或 webm。");
      }
      setSourceAudio({
        file,
        fileName: file.name,
        size: file.size,
        durationMs,
      });
      setResultAudio("");
      setResultUrl("");
      setNotice("源音频已选择。");
    } catch (error) {
      setNotice(error.message || "源音频选择失败");
    }
  }

  async function convertVoice() {
    if (!targetAudio?.fileId) {
      setNotice("请先上传目标音色。");
      return;
    }
    if (!sourceAudio?.file) {
      setNotice("请先上传源音频。");
      return;
    }

    setNotice("");
    setIsConverting(true);
    try {
      const result = await voiceConvertApi.convert({
        sourceAudio: sourceAudio.file,
        cloneAudioFileId: targetAudio.fileId,
        generatedVoiceId: makeVoiceId(),
        name: targetAudio.fileName
          ? targetAudio.fileName.replace(/\.[^.]+$/, "")
          : "目标音色",
        sourceDurationMs: sourceAudio.durationMs,
        speed,
        volume,
        pitch,
        model: advancedModel,
        denoiseLevel,
        preserveEmotion,
        outputFormat,
      });
      const fileName = makeVoiceDownloadName();
      setDemoAudio(result.demoAudio || "");
      setResultAudio(result.audioDataUrl || "");
      setResultUrl(result.audioUrl || "");
      setResultFileName(fileName);
      setNotice(
        result.rhythmMeta?.adjusted
          ? "转换完成，已按源音频时长自动校准语速。"
          : "转换完成。",
      );
    } catch (error) {
      setNotice(error.message || "音色转换失败");
    } finally {
      setIsConverting(false);
    }
  }

  async function handleDownloadResult() {
    try {
      await downloadVoiceFile({
        audioDataUrl: resultAudio,
        audioUrl: resultUrl,
        fileName: resultFileName,
      });
    } catch (error) {
      setNotice(error.message || "下载音频失败");
    }
  }

  return (
    <div className="face-swap-workbench voice-conversion-face-swap-workbench">
      <div className="face-swap-workbench__hero">
        <div>
          <h1>{heading}</h1>
          <p>{copy?.emptyDescription || "上传目标音色和源音频，自动提取内容并转换成目标声音"}</p>
        </div>
      </div>

      <div className="face-swap-workbench__upload-grid">
        <section className="face-swap-workbench__upload-card voice-conversion-face-swap-workbench__card">
          <div className="voice-conversion-face-swap-workbench__workspace">
            <div className="voice-conversion-workbench__upload-grid">
              <div className="voice-conversion-workbench__upload-column">
                <div className="assets-section-title voice-conversion-workbench__upload-title">
                  <span className="voice-conversion-workbench__upload-index is-photo">
                    1
                  </span>
                  <strong>上传目标音色</strong>
                  <span className="voice-conversion-workbench__format-pill">
                    MP3/M4A/WAV
                  </span>
                </div>
                <UploadBox
                  icon={Mic2}
                  title="点击或拖拽目标音色文件到此处上传"
                  note="支持 mp3、m4a、wav"
                  fileState={targetAudio}
                  accept=".mp3,.m4a,.wav,audio/mpeg,audio/mp4,audio/wav"
                  isUploading={uploading === "target"}
                  onPick={uploadTargetFile}
                  onClear={clearTargetAudio}
                />
              </div>

              <div className="voice-conversion-workbench__upload-column">
                <div className="assets-section-title voice-conversion-workbench__upload-title">
                  <span className="voice-conversion-workbench__upload-index is-video">
                    2
                  </span>
                  <strong>上传音频文件</strong>
                  <span className="voice-conversion-workbench__format-pill">
                    MP3/M4A/WAV/FLAC/WEBM
                  </span>
                </div>
                <UploadBox
                  icon={FileAudio}
                  title="点击或拖拽源音频文件到此处上传"
                  note="支持 mp3、m4a、wav、flac、webm"
                  fileState={sourceAudio}
                  tone="video"
                  accept=".mp3,.m4a,.wav,.flac,.webm,audio/mpeg,audio/mp4,audio/wav,audio/flac,audio/webm,video/webm"
                  isUploading={uploading === "source"}
                  onPick={pickSourceFile}
                  onClear={clearSourceAudio}
                />
              </div>
            </div>

            <section className="voice-synthesis-workspace__panel voice-conversion-workbench__settings-panel">
              <div className="voice-synthesis-workspace__step">
                <span>3</span>
                <h2>生成设置</h2>
              </div>

              <div className="voice-synthesis-workspace__sliders">
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

              <button
                type="button"
                className="voice-synthesis-workspace__generate-button dh-generate-button voice-conversion-workbench__generate"
                onClick={convertVoice}
                disabled={isConverting || !targetAudio || !sourceAudio}
              >
                <Play size={18} />
                {isConverting ? "转换中..." : "开始转换"}
              </button>

              {resultAudio ? (
                <div className="voice-conversion-workbench__result-actions">
                  <button
                    type="button"
                    className="voice-conversion-workbench__ghost"
                    onClick={handleDownloadResult}
                  >
                    <Download size={16} />
                    下载结果
                  </button>
                </div>
              ) : null}
            </section>

            {demoAudio || resultAudio ? (
              <div className="voice-conversion-workbench__audio-results">
                {demoAudio ? (
                  <div>
                    <span>音色试听</span>
                    <audio src={demoAudio} controls />
                  </div>
                ) : null}
                {resultAudio || resultUrl ? (
                  <div>
                    <span>转换结果</span>
                    <audio src={resultAudio || resultUrl} controls />
                  </div>
                ) : null}
              </div>
            ) : null}

            {notice ? <div className="composer-notice warning">{notice}</div> : null}
          </div>
        </section>

        <section className="voice-conversion-face-swap-workbench__card voice-conversion-face-swap-workbench__card--plain">
          <aside className="voice-conversion-face-swap-workbench__sidebar">
            <section className="voice-conversion-workbench__side-card voice-conversion-face-swap-workbench__panel">
              <div className="voice-conversion-workbench__side-head">
                <b>预设音色</b>
                <span>更多音色</span>
              </div>
              {presetVoices.map((item) => (
                <div
                  className={`voice-conversion-workbench__preset ${
                    item.active ? "is-active" : ""
                  }`}
                  key={item.name}
                >
                  <div className="voice-conversion-workbench__avatar">
                    <Mic2 size={18} />
                  </div>
                  <div>
                    <b>{item.name}</b>
                    <span>{item.desc}</span>
                  </div>
                  <button type="button" aria-label={`试听${item.name}`}>
                    <Play size={14} />
                  </button>
                </div>
              ))}
            </section>

            <section className="voice-conversion-workbench__side-card voice-conversion-face-swap-workbench__panel">
              <div className="voice-conversion-workbench__side-head">
                <b>高级设置</b>
              </div>

              <label className="voice-conversion-workbench__advanced-field">
                <span>模型</span>
                <CustomSelect
                  value={advancedModel}
                  onChange={setAdvancedModel}
                  options={voiceConversionModelOptions}
                  ariaLabel="模型"
                />
              </label>

              <label className="voice-conversion-workbench__advanced-field">
                <span>降噪等级</span>
                <CustomSelect
                  value={denoiseLevel}
                  onChange={setDenoiseLevel}
                  options={voiceConversionDenoiseOptions}
                  ariaLabel="降噪等级"
                />
              </label>

              <label className="voice-conversion-workbench__advanced-field">
                <span>保留情绪</span>
                <CustomSelect
                  value={preserveEmotion}
                  onChange={setPreserveEmotion}
                  options={voiceConversionEmotionOptions}
                  ariaLabel="保留情绪"
                />
              </label>

              <label className="voice-conversion-workbench__advanced-field">
                <span>输出格式</span>
                <CustomSelect
                  value={outputFormat}
                  onChange={setOutputFormat}
                  options={voiceConversionFormatOptions}
                  ariaLabel="输出格式"
                />
              </label>
            </section>
          </aside>
        </section>
      </div>

      <div className="voice-conversion-face-swap-workbench__privacy-note">
        <LockKeyhole size={16} />
        {privacyText}
      </div>
    </div>
  );
}
