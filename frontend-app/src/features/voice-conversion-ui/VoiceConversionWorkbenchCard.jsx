import React from "react";
import { ChevronDown, FileAudio, Mic2, Play, ShieldCheck, SlidersHorizontal, Upload, Wand2 } from "lucide-react";
import "./voiceConversionWorkbenchCard.css";

const presetVoices = [
  { name: "清澈女声", desc: "明亮自然，适合旁白与短视频", active: true },
  { name: "磁性男声", desc: "低沉稳定，适合解说与课程" },
  { name: "少年音色", desc: "清爽灵动，适合角色配音" },
  { name: "主播音色", desc: "标准咬字，适合直播与口播" }
];

function UploadBox({ icon: Icon, title, note, fileState, accept, isUploading, onPick, onClear }) {
  return (
    <label className={`voice-conversion-workbench__upload-box ${fileState ? "has-file" : ""}`}>
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
      <div className="voice-conversion-workbench__upload-glow" />
      <Icon size={34} />
      <strong>{fileState?.fileName || title}</strong>
      <span>{fileState ? `${Math.max(1, Math.round((fileState.durationMs || 0) / 1000))} 秒 · ${(fileState.size / 1024 / 1024).toFixed(1)}MB` : note}</span>
      <div className="voice-conversion-workbench__upload-actions">
        <button type="button" className="voice-conversion-workbench__ghost" onClick={(event) => event.preventDefault()}>
          <Upload size={16} />
          选择文件
        </button>
        {fileState ? (
          <button
            type="button"
            className="voice-conversion-workbench__ghost is-secondary"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onClear();
            }}
          >
            清除
          </button>
        ) : null}
      </div>
    </label>
  );
}

function Slider({ label, value, displayValue, min, max, step, onChange }) {
  const percent = ((value - min) / (max - min)) * 100;
  return (
    <label className="voice-conversion-workbench__slider-item">
      <div className="voice-conversion-workbench__slider-top">
        <span>{label}</span>
        <b>{displayValue}</b>
      </div>
      <div className="voice-conversion-workbench__track">
        <i style={{ width: `${percent}%` }} />
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={onChange} />
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
  return (
    <section className="voice-conversion-workbench">
      <div className="voice-conversion-workbench__hero">
        <div className="voice-conversion-workbench__hero-icon"><Mic2 size={32} /></div>
        <div>
          <h2>音色转换工作台</h2>
          <p>上传目标音色和源音频，自动提取语音内容并转换成目标声音。</p>
        </div>
      </div>

      <div className="voice-conversion-workbench__shell">
        <div className="voice-conversion-workbench__workspace">
          <div className="voice-conversion-workbench__card-title">
            <Wand2 size={18} />
            音色转换
          </div>

          <div className="voice-conversion-workbench__upload-grid">
            <UploadBox
              icon={Mic2}
              title="目标音色"
              note="参考音频 10 秒到 5 分钟，支持 mp3 / wav / m4a"
              fileState={targetAudio}
              accept=".mp3,.m4a,.wav,audio/mpeg,audio/mp4,audio/wav"
              isUploading={false}
              onPick={onPickTarget}
              onClear={onClearTarget}
            />
            <UploadBox
              icon={FileAudio}
              title="源音频"
              note="待转换音频 6 秒到 6 分钟，支持人声与歌曲"
              fileState={sourceAudio}
              accept=".mp3,.m4a,.wav,.flac,.webm,audio/mpeg,audio/mp4,audio/wav,audio/flac,audio/webm,video/webm"
              isUploading={false}
              onPick={onPickSource}
              onClear={onClearSource}
            />
          </div>

          <div className="voice-conversion-workbench__control-panel">
            <Slider label="语速" value={speed} displayValue={`${speed.toFixed(2)}x`} min={0.5} max={2} step={0.05} onChange={(event) => onSpeedChange(Number(event.target.value))} />
            <Slider label="音量" value={volume} displayValue={volume.toFixed(1)} min={0.1} max={10} step={0.1} onChange={(event) => onVolumeChange(Number(event.target.value))} />
            <Slider label="音调" value={pitch} displayValue={pitch > 0 ? `+${pitch}` : String(pitch)} min={-12} max={12} step={1} onChange={(event) => onPitchChange(Number(event.target.value))} />
          </div>

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

          <div className="voice-conversion-workbench__bottom-bar">
            <span>{notice || "目标音色支持 mp3、m4a、wav；源音频支持 mp3、wav、flac、m4a、webm"}</span>
            <div className="voice-conversion-workbench__bottom-actions">
              {resultAudio ? (
                <button type="button" className="voice-conversion-workbench__ghost" onClick={onDownloadResult}>
                  下载结果
                </button>
              ) : null}
              <button className="voice-conversion-workbench__generate" type="button" onClick={onConvert} disabled={isConverting || !targetAudio || !sourceAudio}>
                <Play size={18} />
                {isConverting ? "转换中..." : "开始转换"}
              </button>
            </div>
          </div>
        </div>

        <aside className="voice-conversion-workbench__sidebar">
          <div className="voice-conversion-workbench__side-card">
            <div className="voice-conversion-workbench__side-head">
              <b>预设音色</b>
              <span>更多音色</span>
            </div>
            {presetVoices.map((item) => (
              <div className={`voice-conversion-workbench__preset ${item.active ? "is-active" : ""}`} key={item.name}>
                <div className="voice-conversion-workbench__avatar"><Mic2 size={18} /></div>
                <div>
                  <b>{item.name}</b>
                  <span>{item.desc}</span>
                </div>
                <button type="button"><Play size={14} /></button>
              </div>
            ))}
          </div>

          <div className="voice-conversion-workbench__side-card">
            <div className="voice-conversion-workbench__side-head">
              <b><SlidersHorizontal size={16} /> 高级设置</b>
            </div>
            {["转换模型：Voice Clone Pro", "降噪强度：中等", "保留情绪：开启", "输出格式：MP3"].map((item) => (
              <div className="voice-conversion-workbench__select" key={item}>{item}<span>⌄</span></div>
            ))}
          </div>

          <div className="voice-conversion-workbench__privacy">
            <ShieldCheck size={20} />
            <div>
              <b>隐私与安全</b>
              <p>上传音频仅用于本次转换处理，不会公开展示。</p>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
