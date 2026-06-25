import React, { useEffect, useState } from "react";
import { ImagePlus, Star, Wand2, X } from "lucide-react";
import { imageDigitalHumanApi } from "../../api/imageDigitalHumanApi";
import { CustomSelect } from "../../components/CustomSelect";
import "./ImageDigitalHumanShowcaseCard.css";

const emptyImageDigitalHumanOptions = {
  models: [],
  defaults: { model: "seedance-2.0", driveMode: "text" },
  limits: { maxImageBytes: 10 * 1024 * 1024, maxAudioMs: 15000, maxTextLength: 2000 }
};

const ttsEmotionOptions = [
  { value: "", label: "自动" },
  { value: "calm", label: "平静" },
  { value: "happy", label: "开心" },
  { value: "sad", label: "悲伤" },
  { value: "angry", label: "愤怒" },
  { value: "fearful", label: "紧张" },
  { value: "disgusted", label: "厌恶" },
  { value: "surprised", label: "惊讶" }
];

function ImageDigitalHumanShowcaseCard({
  portraitPreview,
  driveMode,
  onDriveModeChange,
  onSelectPortrait,
  onClearPortrait,
  modelOptions,
  voiceOptions,
  selectedModelValue,
  onModelChange,
  selectedVoiceValue,
  onVoiceChange,
  text,
  textLength,
  onTextChange,
  emotion,
  onEmotionChange,
  speed,
  onSpeedChange,
  volume,
  onVolumeChange,
  pitch,
  onPitchChange,
  notice,
  isSubmitting
}) {
  return (
    <section className="idh-showcase-card" aria-label="图片数字人展示卡">
      <div className="idh-showcase-hero">
        <div className="idh-showcase-copy">
          <strong>图片数字人生成</strong>
          <p>上传人物正面图，配置脚本与音色，快速生成口型自然的视频内容。</p>
        </div>
      </div>

      <div className="idh-showcase-frame">
        <div className="idh-showcase-stage">
          <div className={`idh-showcase-upload ${portraitPreview ? "has-image" : ""}`}>
            <div className="idh-showcase-upload-header">
              <div className="idh-showcase-upload-copy">
                <h3>上传人物图</h3>
                <p>建议使用正面、清晰、光线均匀的人像照片。</p>
              </div>
              <span className="idh-showcase-format-pill">JPG / PNG / WEBP</span>
            </div>
            <label className="idh-showcase-upload-input">
              <input
                type="file"
                accept="image/*"
                hidden
                onChange={(event) => {
                  onSelectPortrait?.(event.target.files?.[0] || null);
                  event.target.value = "";
                }}
              />
              {portraitPreview ? (
                <img src={portraitPreview} alt="当前上传人物图" />
              ) : (
                <div className="idh-showcase-placeholder">
                  <ImagePlus size={56} />
                  <strong>点击或拖拽图片到此处上传</strong>
                  <span>支持 JPG / PNG / WEBP，建议上传清晰正面照</span>
                </div>
              )}
            </label>
            {portraitPreview ? (
              <button className="idh-showcase-clear" type="button" onClick={onClearPortrait} aria-label="清空图片">
                <X size={14} />
              </button>
            ) : null}
          </div>

          <div className="idh-showcase-settings">
            <div className="idh-showcase-steps">
              <div className="is-active">
                <span>1</span>
                <div>
                  <strong>上传形象</strong>
                  <small>锁定人物正面图</small>
                </div>
              </div>
              <div className="is-active">
                <span>2</span>
                <div>
                  <strong>编辑脚本</strong>
                  <small>当前 {textLength} / 2000 字</small>
                </div>
              </div>
              <div className={isSubmitting ? "is-active" : ""}>
                <span>3</span>
                <div>
                  <strong>生成视频</strong>
                  <small>{isSubmitting ? "任务提交中" : "等待生成"}</small>
                </div>
              </div>
            </div>

            <div className="idh-showcase-drive-tabs">
              <button
                className={`idh-showcase-pill ${driveMode === "text" ? "is-active" : ""}`}
                type="button"
                onClick={() => onDriveModeChange?.("text")}
                aria-pressed={driveMode === "text"}
              >
                <span>文本驱动</span>
              </button>
              <button
                className={`idh-showcase-pill ${driveMode === "audio" ? "is-active" : ""}`}
                type="button"
                onClick={() => onDriveModeChange?.("audio")}
                aria-pressed={driveMode === "audio"}
              >
                <span>音频驱动</span>
              </button>
            </div>

            <label className="idh-showcase-field">
              <span>模型</span>
              <CustomSelect
                className="idh-showcase-select custom-select-theme-dh"
                ariaLabel="模型"
                value={selectedModelValue}
                onChange={onModelChange}
                options={modelOptions}
              />
            </label>

            <div className="idh-showcase-field-row">
              <label className="idh-showcase-field">
                <span>音色</span>
                <CustomSelect
                  className="idh-showcase-select custom-select-theme-dh"
                  ariaLabel="音色"
                  value={selectedVoiceValue}
                  onChange={onVoiceChange}
                  options={voiceOptions.map((item) => ({ value: item.id, label: item.name }))}
                />
              </label>

              <label className="idh-showcase-field">
                <span>音色情绪</span>
                <CustomSelect
                  className="idh-showcase-select custom-select-theme-dh"
                  ariaLabel="音色情绪"
                  value={emotion}
                  onChange={onEmotionChange}
                  options={ttsEmotionOptions}
                />
              </label>
            </div>

            <label className="idh-showcase-field idh-showcase-field--textarea">
              <span>脚本内容</span>
              <textarea value={text} maxLength={2000} onChange={(event) => onTextChange?.(event.target.value)} />
            </label>

            <div className="idh-showcase-tts-panel">
              <div className="idh-showcase-tts-head">
                <span>MiniMax TTS 参数</span>
                <strong>音量、语速、音调</strong>
              </div>
              <div className="idh-showcase-tts-controls">
                <div className="idh-showcase-tts-sliders">
                  <label className="idh-showcase-range-field">
                    <span>语速 <small>{speed.toFixed(2)}x</small></span>
                    <input type="range" min="0.5" max="2" step="0.05" value={speed} onChange={(event) => onSpeedChange?.(Number(event.target.value))} />
                  </label>
                  <label className="idh-showcase-range-field">
                    <span>音量 <small>{volume.toFixed(1)}</small></span>
                    <input type="range" min="0.1" max="10" step="0.1" value={volume} onChange={(event) => onVolumeChange?.(Number(event.target.value))} />
                  </label>
                  <label className="idh-showcase-range-field">
                    <span>音调 <small>{pitch > 0 ? `+${pitch}` : pitch}</small></span>
                    <input type="range" min="-12" max="12" step="1" value={pitch} onChange={(event) => onPitchChange?.(Number(event.target.value))} />
                  </label>
                </div>
                <div className="idh-showcase-tts-action">
                  <button className="idh-showcase-generate-voice dh-generate-button" type="button">
                    <Wand2 size={18} />
                    生成语音
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="idh-showcase-footer">
          {notice ? <div className="idh-showcase-footer-item is-notice">{notice}</div> : null}
        </div>
      </div>
    </section>
  );
}

export function ImageDigitalHumanView() {
  const [options, setOptions] = useState(emptyImageDigitalHumanOptions);
  const [voices, setVoices] = useState([]);
  const [credits, setCredits] = useState(null);
  const [viewTab, setViewTab] = useState("home");
  const [portraitPreview, setPortraitPreview] = useState("");
  const [driveMode, setDriveMode] = useState(emptyImageDigitalHumanOptions.defaults.driveMode);
  const [model, setModel] = useState("");
  const [voiceId, setVoiceId] = useState("");
  const [text, setText] = useState("大家好，欢迎来到我们的 AI 创作平台。今天我会用一张照片，为你生成自然口型的数字人视频。");
  const [emotion, setEmotion] = useState("");
  const [speed, setSpeed] = useState(1);
  const [volume, setVolume] = useState(1);
  const [pitch, setPitch] = useState(0);
  const [notice, setNotice] = useState("");
  const [isSubmitting] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const [modelData, voiceData, creditData] = await Promise.all([
          imageDigitalHumanApi.getModels(),
          imageDigitalHumanApi.getVoices(),
          imageDigitalHumanApi.getCredits().catch(() => null)
        ]);

        if (!mounted) return;
        setOptions(modelData);
        setVoices(voiceData.voices || []);
        setCredits(creditData);
        setDriveMode(modelData.defaults?.driveMode || emptyImageDigitalHumanOptions.defaults.driveMode);
      } catch (error) {
        if (mounted) setNotice(error.message || "加载图片数字人失败");
      }
    }

    load();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!model && (options.defaults?.model || options.models[0]?.value)) {
      setModel(options.defaults?.model || options.models[0].value);
    }

    if (!voiceId && voices[0]?.id) {
      setVoiceId(voices[0].id);
    }
  }, [model, options, voiceId, voices]);

  useEffect(() => () => {
    if (portraitPreview.startsWith("blob:")) {
      window.URL.revokeObjectURL(portraitPreview);
    }
  }, [portraitPreview]);

  function selectPortrait(file) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setNotice("请上传图片文件");
      return;
    }
    if (file.size > (options.limits?.maxImageBytes || 10 * 1024 * 1024)) {
      setNotice("图片大小不能超过 10MB");
      return;
    }
    if (portraitPreview.startsWith("blob:")) {
      window.URL.revokeObjectURL(portraitPreview);
    }
    setPortraitPreview(window.URL.createObjectURL(file));
    setNotice("");
  }

  function clearPortrait() {
    if (portraitPreview.startsWith("blob:")) {
      window.URL.revokeObjectURL(portraitPreview);
    }
    setPortraitPreview("");
    setNotice("");
  }

  return (
    <section className="idh-view-root idh-view-root--showcase-only">
      <div className="image-filter-tabs idh-filter-tabs">
        <button className={viewTab === "home" ? "selected" : ""} type="button" onClick={() => setViewTab("home")}>首页</button>
        <button className={viewTab === "recent" ? "selected" : ""} type="button" onClick={() => setViewTab("recent")}>最近生成</button>
        <button type="button" disabled>
          <Star size={17} fill="#f8d545" color="#161616" />
          收藏
        </button>
        {credits && <span className="credits-chip">积分 {credits.balance}</span>}
      </div>
      <ImageDigitalHumanShowcaseCard
        portraitPreview={portraitPreview}
        driveMode={driveMode}
        onDriveModeChange={setDriveMode}
        onSelectPortrait={selectPortrait}
        onClearPortrait={clearPortrait}
        modelOptions={options.models}
        voiceOptions={voices}
        selectedModelValue={model}
        onModelChange={setModel}
        selectedVoiceValue={voiceId}
        onVoiceChange={setVoiceId}
        text={text}
        textLength={text.length}
        onTextChange={setText}
        emotion={emotion}
        onEmotionChange={setEmotion}
        speed={speed}
        onSpeedChange={setSpeed}
        volume={volume}
        onVolumeChange={setVolume}
        pitch={pitch}
        onPitchChange={setPitch}
        notice={notice}
        isSubmitting={isSubmitting}
      />
    </section>
  );
}
