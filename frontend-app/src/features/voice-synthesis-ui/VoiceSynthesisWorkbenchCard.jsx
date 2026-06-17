import React, { useRef } from "react";
import { Clipboard, Mic2, SmilePlus, Trash2, Upload, Wand2 } from "lucide-react";
import "./voiceSynthesisWorkbenchCard.css";

function SliderField({ label, displayValue, minLabel, maxLabel, ...props }) {
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

export function VoiceSynthesisWorkbenchCard({
  cloneAudio,
  text,
  speed,
  volume,
  pitch,
  uploading,
  isGenerating,
  notice,
  demoAudio,
  resultAudio,
  onPickCloneAudio,
  onClearCloneAudio,
  onTextChange,
  onClearText,
  onPasteText,
  onInsertPause,
  onSpeedChange,
  onVolumeChange,
  onPitchChange,
  onGenerate,
  onDownloadResult
}) {
  const cloneInputRef = useRef(null);
  const hasCloneAudio = Boolean(cloneAudio);

  function pickCloneFile(file) {
    if (file && !uploading) onPickCloneAudio(file);
  }

  function handleCloneDrop(event) {
    event.preventDefault();
    event.stopPropagation();
    pickCloneFile(event.dataTransfer.files?.[0]);
  }

  return (
    <section className="voice-synthesis-workspace">
      <div className="voice-synthesis-workspace__layout">
        <div className="voice-synthesis-workspace__main">
          <div className="voice-synthesis-workspace__top">
            <section className="voice-synthesis-workspace__panel voice-synthesis-workspace__panel--voice">
              <div className="voice-synthesis-workspace__step">
                <span>1</span>
                <h2>选择目标音色</h2>
                <span className="voice-synthesis-workspace__format-pill">MP3/M4A/WAV</span>
              </div>

              <div className="voice-synthesis-workspace__upload-grid">
                <button
                  className={`voice-synthesis-workspace__dropzone ${hasCloneAudio ? "has-file" : ""}`}
                  type="button"
                  onClick={() => cloneInputRef.current?.click()}
                  onDragOver={(event) => {
                    event.preventDefault();
                  }}
                  onDrop={handleCloneDrop}
                  disabled={uploading}
                >
                  <input
                    ref={cloneInputRef}
                    type="file"
                    accept=".mp3,.m4a,.wav,audio/mpeg,audio/mp4,audio/wav"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      event.target.value = "";
                      pickCloneFile(file);
                    }}
                    disabled={uploading}
                  />
                  <div className="voice-synthesis-workspace__dropzone-icon">
                    {uploading ? <Upload size={42} /> : <Mic2 size={42} />}
                  </div>
                  <h3>{cloneAudio ? cloneAudio.fileName : "点击或拖拽音频文件到此处上传"}</h3>
                  <p>{cloneAudio ? `时长 ${Math.max(1, Math.round((cloneAudio.durationMs || 0) / 1000))} 秒` : "支持 mp3、m4a、wav，建议 10 秒到 5 分钟"}</p>
                  <div className="voice-synthesis-workspace__dropzone-actions">
                    {cloneAudio && (
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          onClearCloneAudio();
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            event.stopPropagation();
                            onClearCloneAudio();
                          }
                        }}
                      >
                        清除音频
                      </span>
                    )}
                  </div>
                </button>

                <aside className="voice-synthesis-workspace__requirements">
                  <h3>音色要求</h3>
                  <ul>
                    <li>人声清晰，尽量避免噪声和混响。</li>
                    <li>建议使用单人独白音频，情绪稳定。</li>
                    <li>语速适中，口齿清楚，更利于克隆。</li>
                    <li>上传后将用于生成相似音色，不会展示。</li>
                  </ul>
                </aside>
              </div>
            </section>

            <div className="voice-synthesis-workspace__right">
              <section className="voice-synthesis-workspace__panel">
                <div className="voice-synthesis-workspace__step">
                  <span>2</span>
                  <h2>输入文本</h2>
                </div>

                <textarea
                  className="voice-synthesis-workspace__textarea"
                  value={text}
                  onChange={(event) => onTextChange(event.target.value)}
                  placeholder="欢迎使用 Facemini AI 语音合成，现在开始生成属于你的专属声音。"
                  maxLength={2000}
                />

                <div className="voice-synthesis-workspace__text-tools">
                  <button type="button" onClick={onClearText}>
                    <Trash2 size={15} />
                    清空文本
                  </button>
                  <button type="button" onClick={onPasteText}>
                    <Clipboard size={15} />
                    粘贴文本
                  </button>
                  <button type="button" onClick={onInsertPause}>
                    <SmilePlus size={15} />
                    插入停顿
                  </button>
                  <span>{text.length} / 2000</span>
                </div>
              </section>

              <section className="voice-synthesis-workspace__panel">
                <div className="voice-synthesis-workspace__step">
                  <span>3</span>
                  <h2>生成设置</h2>
                </div>

                <div className="voice-synthesis-workspace__sliders">
                  <SliderField
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
                  <SliderField
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
                  <SliderField
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
                  className="voice-synthesis-workspace__generate-button dh-generate-button"
                  onClick={onGenerate}
                  disabled={isGenerating || uploading || !cloneAudio || !text.trim()}
                >
                  <Wand2 size={18} />
                  {isGenerating ? "生成中..." : "生成语音"}
                </button>
                <p className="voice-synthesis-workspace__settings-note">{notice || "目标音色支持 mp3、m4a、wav，建议时长 10 秒到 5 分钟。"}</p>
              </section>
            </div>
          </div>

          {(demoAudio || resultAudio) && (
            <section className="voice-synthesis-workspace__panel voice-synthesis-workspace__audio-panel">
              {demoAudio && (
                <div>
                  <span>音色试听</span>
                  <audio src={demoAudio} controls />
                </div>
              )}
              {resultAudio && (
                <div>
                  <span>合成结果</span>
                  <audio src={resultAudio} controls />
                </div>
              )}
            </section>
          )}

          {resultAudio ? (
            <section className="voice-synthesis-workspace__footer">
              <div className="voice-synthesis-workspace__footer-actions">
                <button type="button" className="is-secondary" onClick={onDownloadResult}>
                  下载结果
                </button>
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </section>
  );
}
