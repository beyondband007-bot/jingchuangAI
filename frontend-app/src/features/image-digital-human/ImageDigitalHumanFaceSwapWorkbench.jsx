import React, { useEffect, useState } from "react";
import { ImagePlus, Loader2, LockKeyhole, Mic, Wand2, X } from "lucide-react";
import { imageDigitalHumanApi } from "../../api/imageDigitalHumanApi";
import { CustomSelect } from "../../components/CustomSelect";
import { useToast } from "../../hooks/useToast";
import "../face-swap/FaceSwapWorkbench.css";
import "./ImageDigitalHumanShowcaseCard.css";
import "./ImageDigitalHumanFaceSwapWorkbench.css";

const emptyImageDigitalHumanOptions = {
  models: [],
  defaults: { model: "kie-s2v-r2v", driveMode: "text" },
  limits: { maxImageBytes: 10 * 1024 * 1024, maxAudioMs: 15000, maxTextLength: 2000 },
};

const ttsEmotionOptions = [
  { value: "", label: "自动" },
  { value: "calm", label: "平静" },
  { value: "happy", label: "开心" },
  { value: "sad", label: "悲伤" },
  { value: "angry", label: "愤怒" },
  { value: "fearful", label: "紧张" },
  { value: "disgusted", label: "厌恶" },
  { value: "surprised", label: "惊讶" },
];

export function ImageDigitalHumanFaceSwapWorkbench({
  copy,
  heading = "图片数字人生成",
  authUser,
  onOpenAuth,
  onSubmit,
  isSubmitting,
}) {
  const isGuest = Boolean(authUser?.isGuest);
  const { message: toastMessage, showToast } = useToast();
  const [options, setOptions] = useState(emptyImageDigitalHumanOptions);
  const [voices, setVoices] = useState([]);
  const [portraitPreview, setPortraitPreview] = useState("");
  const [portraitFile, setPortraitFile] = useState(null);
  const [audioFile, setAudioFile] = useState(null);
  const [driveMode, setDriveMode] = useState(emptyImageDigitalHumanOptions.defaults.driveMode);
  const [model, setModel] = useState("");
  const [voiceId, setVoiceId] = useState("");
  const [text, setText] = useState("大家好，欢迎来到我们的 AI 创作平台。今天我会用一张照片，为你生成自然口型的数字人视频。");
  const [emotion, setEmotion] = useState("");
  const [speed, setSpeed] = useState(1);
  const [volume, setVolume] = useState(1);
  const [pitch, setPitch] = useState(0);
  const [notice, setNotice] = useState("");
  const [isPreviewingVoice, setIsPreviewingVoice] = useState(false);
  const ttsDisabled = Boolean(audioFile);
  const audioInputRef = React.useRef(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const [modelData, voiceData] = await Promise.all([
          imageDigitalHumanApi.getModels(),
          imageDigitalHumanApi.getVoices(),
        ]);

        if (!mounted) return;
        setOptions(modelData);
        setVoices(voiceData.voices || []);
        setDriveMode(modelData.defaults?.driveMode || emptyImageDigitalHumanOptions.defaults.driveMode);
      } catch (error) {
        if (mounted) setNotice(error.message || "加载图片数字人配置失败");
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

  function requireAuth() {
    if (!isGuest) return true;
    showToast("请先登录");
    onOpenAuth?.("login");
    return false;
  }

  function selectPortrait(file) {
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
    if (portraitPreview.startsWith("blob:")) {
      window.URL.revokeObjectURL(portraitPreview);
    }
    setPortraitFile(file);
    setPortraitPreview(window.URL.createObjectURL(file));
    setNotice("");
  }

  function clearPortrait() {
    if (portraitPreview.startsWith("blob:")) {
      window.URL.revokeObjectURL(portraitPreview);
    }
    setPortraitFile(null);
    setPortraitPreview("");
    setNotice("");
  }

  function selectAudio(file) {
    if (!file) return;
    if (!requireAuth()) return;
    if (!file.type.startsWith("audio/")) {
      setNotice("请上传音频文件");
      return;
    }
    setAudioFile(file);
    setDriveMode("audio");
    setNotice("");
  }

  function clearAudio() {
    setAudioFile(null);
    setDriveMode("text");
    setNotice("");
  }

  async function previewVoice() {
    if (!requireAuth()) return;
    if (audioFile) {
      setNotice("已上传音频，无需试听");
      return;
    }
    if (!text.trim()) {
      setNotice("请先填写脚本内容");
      return;
    }
    if (!voiceId) {
      setNotice("请先选择音色");
      return;
    }

    setNotice("");
    setIsPreviewingVoice(true);
    try {
      await imageDigitalHumanApi.previewVoice({
        text,
        voiceId,
        emotion,
        speed,
        volume,
        pitch,
      });
    } catch (error) {
      setNotice(error.message || "生成语音失败");
    } finally {
      setIsPreviewingVoice(false);
    }
  }

  function submit() {
    if (!requireAuth()) return;
    if (!portraitFile) {
      setNotice("请上传人物图");
      return;
    }
    if (driveMode === "text" && !text.trim()) {
      setNotice("请填写脚本内容");
      return;
    }
    if (driveMode === "audio" && !audioFile) {
      setNotice("请上传音频文件");
      return;
    }
    setNotice("");
    onSubmit?.({
      portrait: portraitFile,
      driveMode,
      text,
      audioFile,
      voiceId,
      model,
      speed,
      volume,
      pitch,
      emotion,
    });
  }

  return (
    <div className="face-swap-workbench image-digital-human-workbench">
      <div className="face-swap-workbench__hero">
        <div>
          <h1>{heading}</h1>
          <p>{copy.emptyDescription}</p>
        </div>
      </div>

      <div className="face-swap-workbench__upload-grid">
        <section className="face-swap-workbench__upload-card image-digital-human-workbench__card">
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
                  selectPortrait(event.target.files?.[0] || null);
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
              <button className="idh-showcase-clear" type="button" onClick={clearPortrait} aria-label="清空图片">
                <X size={14} />
              </button>
            ) : null}
          </div>
        </section>

        <section className="face-swap-workbench__upload-card image-digital-human-workbench__card">
          <div className="idh-showcase-settings">
            <div className="idh-showcase-drive-tabs">
              <button
                className={`idh-showcase-pill ${driveMode === "text" ? "is-active" : ""}`}
                type="button"
                onClick={() => { setDriveMode("text"); clearAudio(); }}
                aria-pressed={driveMode === "text"}
              >
                <span>文本驱动</span>
              </button>
              <button
                className={`idh-showcase-pill ${driveMode === "audio" ? "is-active" : ""}`}
                type="button"
                onClick={() => audioInputRef.current?.click()}
                aria-pressed={driveMode === "audio"}
              >
                <span>音频驱动</span>
              </button>
              <input
                ref={audioInputRef}
                type="file"
                accept="audio/*"
                hidden
                onChange={(event) => {
                  selectAudio(event.target.files?.[0] || null);
                  event.target.value = "";
                }}
              />
            </div>

            {audioFile && (
              <div className="idh-audio-upload is-compact">
                <span
                  className="upload-clear-button"
                  role="button"
                  tabIndex={0}
                  title="取消上传"
                  aria-label="取消上传"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    clearAudio();
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      event.stopPropagation();
                      clearAudio();
                    }
                  }}
                >
                  <X size={13} />
                </span>
                <Mic size={22} />
                <strong>{audioFile.name}</strong>
                <span>已选择音频，TTS 参数已禁用</span>
              </div>
            )}

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
                  <small>当前 {text.length} / 2000 字</small>
                </div>
              </div>
              <div>
                <span>3</span>
                <div>
                  <strong>生成视频</strong>
                  <small>等待生成</small>
                </div>
              </div>
            </div>

            <label className="idh-showcase-field idh-showcase-field--model">
              <span>模型</span>
              <CustomSelect
                className="idh-showcase-select custom-select-theme-dh"
                ariaLabel="模型"
                value={model}
                onChange={setModel}
                options={options.models}
              />
            </label>

            <div className="idh-showcase-field-row">
              <label className="idh-showcase-field">
                <span>音色</span>
                <CustomSelect
                  className="idh-showcase-select custom-select-theme-dh"
                  ariaLabel="音色"
                  value={voiceId}
                  onChange={setVoiceId}
                  options={voices.map((item) => ({ value: item.id, label: item.name }))}
                  disabled={ttsDisabled}
                />
              </label>
              <label className="idh-showcase-field">
                <span>音色情绪</span>
                <CustomSelect
                  className="idh-showcase-select custom-select-theme-dh"
                  ariaLabel="音色情绪"
                  value={emotion}
                  onChange={setEmotion}
                  options={ttsEmotionOptions}
                  disabled={ttsDisabled}
                />
              </label>
            </div>

            <label className={`idh-showcase-field idh-showcase-field--textarea ${ttsDisabled ? "is-disabled" : ""}`}>
              <span>脚本内容</span>
              <textarea value={text} maxLength={2000} onChange={(event) => setText(event.target.value)} disabled={ttsDisabled} />
            </label>

            <div className="idh-showcase-tts-panel">
              <div className="idh-showcase-tts-head">
                <span>MiniMax TTS 参数</span>
                <strong>音量、语速、音调</strong>
              </div>
              <div className="idh-showcase-tts-controls">
                <div className="idh-showcase-tts-sliders">
                  <label className={`idh-showcase-range-field ${ttsDisabled ? "is-disabled" : ""}`}>
                    <span>语速 <small>{speed.toFixed(2)}x</small></span>
                    <input type="range" min="0.5" max="2" step="0.05" value={speed} onChange={(event) => setSpeed(Number(event.target.value))} disabled={ttsDisabled} />
                  </label>
                  <label className={`idh-showcase-range-field ${ttsDisabled ? "is-disabled" : ""}`}>
                    <span>音量 <small>{volume.toFixed(1)}</small></span>
                    <input type="range" min="0.1" max="10" step="0.1" value={volume} onChange={(event) => setVolume(Number(event.target.value))} disabled={ttsDisabled} />
                  </label>
                  <label className={`idh-showcase-range-field ${ttsDisabled ? "is-disabled" : ""}`}>
                    <span>音调 <small>{pitch > 0 ? `+${pitch}` : pitch}</small></span>
                    <input type="range" min="-12" max="12" step="1" value={pitch} onChange={(event) => setPitch(Number(event.target.value))} disabled={ttsDisabled} />
                  </label>
                </div>
                <div className="idh-showcase-tts-action">
                  <button className="idh-showcase-generate-voice dh-generate-button" type="button" onClick={previewVoice} disabled={ttsDisabled || isPreviewingVoice}>
                    {isPreviewingVoice ? <Loader2 size={18} className="image-digital-human-workbench__spinner" /> : <Wand2 size={18} />}
                    试听音色
                  </button>
                  <button className="idh-showcase-generate-voice dh-generate-button" type="button" onClick={submit} disabled={isSubmitting || !portraitFile}>
                    {isSubmitting ? <Loader2 size={18} className="image-digital-human-workbench__spinner" /> : <Wand2 size={18} />}
                    生成数字人视频
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <section className="image-digital-human-workbench__preview">
        <div className="image-digital-human-workbench__preview-header">
          <h2>{"\u5f00\u542f\u4f60\u7684\u56fe\u7247\u6570\u5b57\u4eba"}</h2>
          <p>{"\u4e0a\u4f20\u6b63\u9762\u6e05\u6670\u4eba\u50cf\u7167\u7247\uff0c\u586b\u5199\u53e3\u64ad\u6587\u6848\uff0c\u4e00\u952e\u751f\u6210\u5bf9\u53e3\u578b\u64ad\u62a5\u77ed\u89c6\u9891"}</p>
        </div>
        <div className="image-digital-human-workbench__preview-media">
          <img src="/assets/digital-human/posters/时尚类女主播.jpg" alt={"\u56fe\u7247\u6570\u5b57\u4eba\u9884\u89c8"} />
        </div>
        <div className="image-digital-human-workbench__draft">
          {"\u6682\u65e0\u8349\u7a3f\uff0c\u7f16\u8f91\u5f62\u8c61\u6216\u914d\u97f3\u540e\u5c06\u81ea\u52a8\u4fdd\u5b58"}
        </div>
      </section>

      {notice ? <div className="face-swap-workbench__notice">{notice}</div> : null}
      {toastMessage && <div className="fm-floating-toast" role="alert">{toastMessage}</div>}

      <div className="image-digital-human-workbench__privacy-note">
        <LockKeyhole size={16} />
        您上传的内容仅用于生成数字人处理，不会被用于其他用途。
      </div>
    </div>
  );
}
