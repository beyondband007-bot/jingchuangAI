import React, { useState } from "react";
import { Download, FileAudio, Mic2, Play } from "lucide-react";
import { CustomSelect } from "../../components/CustomSelect";
import "./voiceConversionWorkbenchCard.css";

const presetVoices = [
  { name: "清澈女声", desc: "明亮自然，适合旁白与短视频", active: true },
  { name: "磁性男声", desc: "低沉稳定，适合解说与课程", active: false },
  { name: "少年音色", desc: "清爽灵动，适合角色配音", active: false },
  { name: "主播音色", desc: "标准咬字，适合直播与口播", active: false }
];

const voiceConversionModelOptions = [
  { value: "voice-clone-pro", label: "Voice Clone Pro" },
  { value: "voice-clone-studio", label: "Voice Clone Studio" },
  { value: "voice-clone-fast", label: "Voice Clone Fast" }
];

const voiceConversionDenoiseOptions = [
  { value: "low", label: "低" },
  { value: "medium", label: "中等" },
  { value: "high", label: "高" },
  { value: "max", label: "最高" }
];

const voiceConversionEmotionOptions = [
  { value: "on", label: "开启" },
  { value: "off", label: "关闭" }
];

const voiceConversionFormatOptions = [
  { value: "mp3", label: "mp3" },
  { value: "m4a", label: "m4a" },
  { value: "wav", label: "wav" }
];

function UploadBox({ icon: Icon, title, note, fileState, accept, isUploading, onPick, onClear, tone = "default" }) {
  return (
    <label className={`voice-conversion-workbench__upload-box ${tone === "video" ? "is-video" : ""} ${fileState ? "has-file" : ""}`}>
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
        <Icon size={42} />
      </div>
      <h3>{fileState?.fileName || title}</h3>
      <p>
        {fileState
          ? `时长 ${Math.max(1, Math.round((fileState.durationMs || 0) / 1000))} 秒 · ${(fileState.size / 1024 / 1024).toFixed(1)}MB`
          : note}
      </p>
      {fileState ? (
        <div className="voice-conversion-workbench__upload-actions">
          <button
            type="button"
            className="voice-conversion-workbench__ghost is-secondary"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onClear();
            }}
          >
            清除音频
          </button>
        </div>
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

export function VoiceConversionWorkbenchCard({
  targetAudio,
  sourceAudio,
  speed,
  volume,
  pitch,
  notice,
  isConverting,
  demoAudio,
  resultAudio,
  onPickTarget,
  onClearTarget,
  onPickSource,
  onClearSource,
  onSpeedChange,
  onVolumeChange,
  onPitchChange,
  onConvert,
  onDownloadResult
}) {
  const [advancedModel, setAdvancedModel] = useState(voiceConversionModelOptions[0].value);
  const [denoiseLevel, setDenoiseLevel] = useState(voiceConversionDenoiseOptions[1].value);
  const [preserveEmotion, setPreserveEmotion] = useState(voiceConversionEmotionOptions[0].value);
  const [outputFormat, setOutputFormat] = useState(voiceConversionFormatOptions[0].value);

  return (
    <section className="voice-conversion-workbench">
      <div className="voice-conversion-workbench__shell">
        <div className="voice-conversion-workbench__workspace">
          <div className="voice-conversion-workbench__upload-grid">
            <div className="voice-conversion-workbench__upload-column">
              <div className="assets-section-title voice-conversion-workbench__upload-title">
                <span className="voice-conversion-workbench__upload-index is-photo">1</span>
                <strong>上传目标音色</strong>
              </div>
              <UploadBox
                icon={Mic2}
                title="点击或拖拽目标音色文件到此处上传"
                note="支持 mp3、m4a、wav"
                fileState={targetAudio}
                accept=".mp3,.m4a,.wav,audio/mpeg,audio/mp4,audio/wav"
                isUploading={false}
                onPick={onPickTarget}
                onClear={onClearTarget}
              />
            </div>

            <div className="voice-conversion-workbench__upload-column">
              <div className="assets-section-title voice-conversion-workbench__upload-title">
                <span className="voice-conversion-workbench__upload-index is-video">2</span>
                <strong>上传音频文件</strong>
              </div>
              <UploadBox
                icon={FileAudio}
                title="点击或拖拽源音频文件到此处上传"
                note="支持 mp3、m4a、wav、flac、webm"
                fileState={sourceAudio}
                tone="video"
                accept=".mp3,.m4a,.wav,.flac,.webm,audio/mpeg,audio/mp4,audio/wav,audio/flac,audio/webm,video/webm"
                isUploading={false}
                onPick={onPickSource}
                onClear={onClearSource}
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
                onChange={(event) => onSpeedChange(Number(event.target.value))}
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
                onChange={(event) => onVolumeChange(Number(event.target.value))}
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
                onChange={(event) => onPitchChange(Number(event.target.value))}
              />
            </div>

            <button
              type="button"
              className="voice-synthesis-workspace__generate-button dh-generate-button voice-conversion-workbench__generate"
              onClick={onConvert}
              disabled={isConverting || !targetAudio || !sourceAudio}
            >
              <Play size={18} />
              {isConverting ? "转换中..." : "开始转换"}
            </button>

            {resultAudio ? (
              <div className="voice-conversion-workbench__result-actions">
                <button type="button" className="voice-conversion-workbench__ghost" onClick={onDownloadResult}>
                  <Download size={16} />
                  下载结果
                </button>
              </div>
            ) : null}
          </section>

          {(demoAudio || resultAudio) ? (
            <div className="voice-conversion-workbench__audio-results">
              {demoAudio ? (
                <div>
                  <span>音色试听</span>
                  <audio src={demoAudio} controls />
                </div>
              ) : null}
              {resultAudio ? (
                <div>
                  <span>转换结果</span>
                  <audio src={resultAudio} controls />
                </div>
              ) : null}
            </div>
          ) : null}

          {notice ? <div className="composer-notice warning">{notice}</div> : null}
        </div>

        <aside className="voice-conversion-workbench__sidebar">
          <div className="voice-conversion-workbench__side-card">
            <div className="voice-conversion-workbench__side-head">
              <b>预设音色</b>
              <span>更多音色</span>
            </div>
            {presetVoices.map((item) => (
              <div className={`voice-conversion-workbench__preset ${item.active ? "is-active" : ""}`} key={item.name}>
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
          </div>

          <div className="voice-conversion-workbench__side-card">
            <div className="voice-conversion-workbench__side-head">
              <b>高级设置</b>
            </div>
            <label className="voice-conversion-workbench__advanced-field">
              <span>模型</span>
              <CustomSelect
                className="control-select"
                ariaLabel="转换模型"
                value={advancedModel}
                onChange={setAdvancedModel}
                options={voiceConversionModelOptions}
              />
            </label>
            <label className="voice-conversion-workbench__advanced-field">
              <span>降噪强度</span>
              <CustomSelect
                className="control-select"
                ariaLabel="降噪强度"
                value={denoiseLevel}
                onChange={setDenoiseLevel}
                options={voiceConversionDenoiseOptions}
              />
            </label>
            <label className="voice-conversion-workbench__advanced-field">
              <span>保留情绪</span>
              <CustomSelect
                className="control-select"
                ariaLabel="保留情绪"
                value={preserveEmotion}
                onChange={setPreserveEmotion}
                options={voiceConversionEmotionOptions}
              />
            </label>
            <label className="voice-conversion-workbench__advanced-field">
              <span>输出格式</span>
              <CustomSelect
                className="control-select"
                ariaLabel="输出格式"
                value={outputFormat}
                onChange={setOutputFormat}
                options={voiceConversionFormatOptions}
              />
            </label>
          </div>
        </aside>
      </div>
    </section>
  );
}
