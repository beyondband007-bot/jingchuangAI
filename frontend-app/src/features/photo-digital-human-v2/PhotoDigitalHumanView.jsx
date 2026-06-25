import React, { useEffect, useRef, useState } from "react";
import {
  Button,
  Input,
  Select,
  Slider,
} from "@arco-design/web-react";
import { ImagePlus, Loader2, Upload as UploadIcon, X } from "lucide-react";
import { imageDigitalHumanApi } from "../../api/imageDigitalHumanApi";
import { usePhotoDigitalHumanData } from "./hooks/usePhotoDigitalHumanData";
import {
  VOICE_UNAVAILABLE_HINT,
  isDigitalHumanVoiceEnabled,
  pickEnabledVoiceId,
} from "../digital-human-v2/utils";
import {
  PHOTO_ASPECT_RATIO_OPTIONS,
  PHOTO_RESOLUTION_OPTIONS,
  PHOTO_SCRIPT_MAX_LENGTH,
  estimatePhotoSpeechSeconds,
  formatPhotoModelLabel,
} from "./utils";
import "./photoDigitalHumanV2.scss";

const DEFAULT_SCRIPT =
  "大家好，欢迎来到我们的 AI 创作平台。今天我会用一张照片，为你生成自然口型的数字人视频。";
const MAX_AUDIO_BYTES = 20 * 1024 * 1024;

function formatAudioDuration(seconds = 0) {
  const value = Number(seconds || 0);
  if (!value) return "0s";
  return value >= 60
    ? `${Math.floor(value / 60)}m${Math.round(value % 60)}s`
    : `${Math.round(value)}s`;
}

function isAudioFile(file) {
  if (!file) return false;
  if (String(file.type || "").startsWith("audio/")) return true;
  return /\.(mp3|wav|m4a|aac|ogg|flac)$/i.test(String(file.name || ""));
}

export function PhotoDigitalHumanView({ isActive = true }) {
  const {
    options,
    voices,
    tasks,
    credits,
    loading,
    error,
    setError,
    refreshCredits,
  } = usePhotoDigitalHumanData({ isActive });

  const fileInputRef = useRef(null);
  const audioInputRef = useRef(null);
  const toastTimerRef = useRef(null);
  const [portraitFile, setPortraitFile] = useState(null);
  const [portraitPreview, setPortraitPreview] = useState("");
  const [audioFile, setAudioFile] = useState(null);
  const [audioDuration, setAudioDuration] = useState(0);
  const [text, setText] = useState(DEFAULT_SCRIPT);
  const [model, setModel] = useState("");
  const [voiceId, setVoiceId] = useState("");
  const [speed, setSpeed] = useState(1);
  const [resolution, setResolution] = useState(PHOTO_RESOLUTION_OPTIONS[0].value);
  const [aspectRatio, setAspectRatio] = useState(PHOTO_ASPECT_RATIO_OPTIONS[0].value);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTask, setActiveTask] = useState(null);
  const [toastMessage, setToastMessage] = useState("");

  const selectedModel =
    options.models.find((item) => item.value === model) || options.models[0];
  const costPoints = Number(selectedModel?.basePoints || 30);
  const durationSeconds = audioFile
    ? Math.max(1, Math.round(audioDuration) || estimatePhotoSpeechSeconds(text))
    : estimatePhotoSpeechSeconds(text);
  const canGenerate = Boolean(
    portraitFile &&
      (text.trim() || audioFile) &&
      model &&
      (audioFile || (voiceId && isDigitalHumanVoiceEnabled(voiceId))) &&
      !isSubmitting,
  );

  function showToast(message) {
    setToastMessage(message);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => {
      setToastMessage("");
      toastTimerRef.current = null;
    }, 2200);
  }

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!activeTask?.id) return;
    const latest = tasks.find((task) => String(task.id) === String(activeTask.id));
    if (latest) setActiveTask(latest);
  }, [activeTask?.id, tasks]);

  useEffect(() => {
    if (!model && (options.defaults?.model || options.models[0]?.value)) {
      setModel(options.defaults?.model || options.models[0].value);
    }
    const nextVoiceId = pickEnabledVoiceId(voices, voiceId);
    if (nextVoiceId && nextVoiceId !== voiceId) {
      setVoiceId(nextVoiceId);
    }
  }, [model, options, voiceId, voices]);

  useEffect(() => {
    return () => {
      if (portraitPreview.startsWith("blob:")) {
        window.URL.revokeObjectURL(portraitPreview);
      }
    };
  }, [portraitPreview]);

  function selectPortrait(file) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      showToast("请上传图片文件");
      return;
    }
    const maxBytes = options.limits?.maxImageBytes || 10 * 1024 * 1024;
    if (file.size > maxBytes) {
      showToast("图片大小不能超过 10MB");
      return;
    }
    if (portraitPreview.startsWith("blob:")) {
      window.URL.revokeObjectURL(portraitPreview);
    }
    setPortraitFile(file);
    setPortraitPreview(window.URL.createObjectURL(file));
    setError("");
  }

  function selectAudio(file) {
    if (!file) return;
    if (!isAudioFile(file)) {
      showToast("请上传音频文件");
      return;
    }
    if (file.size > MAX_AUDIO_BYTES) {
      showToast("音频大小不能超过 20MB");
      return;
    }

    setAudioFile(file);
    setAudioDuration(0);
    setError("");

    const previewUrl = URL.createObjectURL(file);
    const audio = new Audio();
    audio.preload = "metadata";
    audio.src = previewUrl;
    audio.addEventListener(
      "loadedmetadata",
      () => {
        setAudioDuration(Number(audio.duration || 0));
        URL.revokeObjectURL(previewUrl);
      },
      { once: true },
    );
    audio.addEventListener(
      "error",
      () => {
        URL.revokeObjectURL(previewUrl);
      },
      { once: true },
    );

    showToast(`已选择音频：${file.name}`);
  }

  function clearAudio() {
    setAudioFile(null);
    setAudioDuration(0);
  }

  async function handleGenerate() {
    if (!portraitFile) {
      showToast("请先上传人物正面图");
      return;
    }
    if (!text.trim() && !audioFile) {
      showToast("请先填写口播文案或上传音频");
      return;
    }
    if (!audioFile && !isDigitalHumanVoiceEnabled(voiceId)) {
      showToast(VOICE_UNAVAILABLE_HINT);
      return;
    }

    setError("");
    setIsSubmitting(true);
    try {
      const task = await imageDigitalHumanApi.createTask({
        portrait: portraitFile,
        text: text.trim(),
        voiceId,
        model,
        speed,
        volume: 1,
        pitch: 0,
        emotion: "",
        audio: audioFile,
      });
      await refreshCredits();
      setActiveTask(task);
      showToast("已提交生成任务");
    } catch (submitError) {
      showToast(submitError.message || "照片数字人创建失败");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (loading) {
    return (
      <section className="pdhv2-root">
        <div className="pdhv2-loading">加载照片数字人...</div>
      </section>
    );
  }

  return (
    <section className="pdhv2-root" aria-label="照片数字人">
      {error ? <div className="pdhv2-error">{error}</div> : null}

      <div className="pdhv2-scroll">
        <header className="pdhv2-hero">
          <h1>开启你的图片数字人</h1>
          <p>上传正面清晰人像照片，填写口播文案，一键生成对口型播报短视频</p>
        </header>

        <div className="pdhv2-workbench">
          <section className="pdhv2-step-card">
            <div className="pdhv2-step-card__head">
              <span className="pdhv2-step-index">1</span>
              <div>
                <strong>上传人物正面人像图</strong>
                <p>面部正对镜头，无遮挡，光线均匀，单人出镜效果更佳</p>
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/*"
              hidden
              onChange={(event) => {
                selectPortrait(event.target.files?.[0] || null);
                event.target.value = "";
              }}
            />

            <button
              type="button"
              className={`pdhv2-upload-zone${portraitPreview ? " has-image" : ""}`}
              onClick={() => fileInputRef.current?.click()}
            >
              {portraitPreview ? (
                <img src={portraitPreview} alt="已上传人物图" />
              ) : (
                <>
                  <ImagePlus size={34} />
                  <strong>上传正面人像图片</strong>
                  <span>支持 JPG / PNG / WebP</span>
                </>
              )}
            </button>
          </section>

          <section className="pdhv2-step-card">
            <div className="pdhv2-step-card__head pdhv2-step-card__head--split">
              <div className="pdhv2-step-card__title">
                <span className="pdhv2-step-index">2</span>
                <div>
                  <strong>口播脚本 & 音色配置</strong>
                  <p>填写台词并选择合适音色，支持调节语速</p>
                </div>
              </div>
              <input
                ref={audioInputRef}
                type="file"
                accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg,.flac"
                hidden
                onChange={(event) => {
                  selectAudio(event.target.files?.[0] || null);
                  event.target.value = "";
                }}
              />
              <Button
                type="outline"
                size="small"
                className="pdhv2-upload-audio-btn"
                icon={<UploadIcon size={14} />}
                onClick={() => audioInputRef.current?.click()}
              >
                上传音频
              </Button>
            </div>

            {audioFile ? (
              <div className="pdhv2-audio-selected">
                <div className="pdhv2-audio-selected__meta">
                  <strong>{audioFile.name}</strong>
                  <span>
                    {formatAudioDuration(audioDuration)}
                    {audioDuration ? "" : " · 正在读取时长"}
                  </span>
                </div>
                <button
                  type="button"
                  className="pdhv2-audio-selected__clear"
                  aria-label="移除音频"
                  onClick={clearAudio}
                >
                  <X size={14} />
                </button>
              </div>
            ) : null}

            <div className="pdhv2-script-field">
              <Input.TextArea
                value={text}
                maxLength={PHOTO_SCRIPT_MAX_LENGTH}
                placeholder="粘贴口播播报台词"
                onChange={setText}
                showWordLimit
                autoSize={{ minRows: 6, maxRows: 10 }}
              />
            </div>

            <div className="pdhv2-script-meta">
              <span>朗诵时长：{durationSeconds}s</span>
            </div>

            <div className="pdhv2-voice-row">
              <label className="pdhv2-field">
                <span>音色</span>
                <Select
                  value={voiceId}
                  onChange={setVoiceId}
                  options={voices.map((voice) => ({
                    value: voice.id,
                    label: voice.name,
                    disabled: !isDigitalHumanVoiceEnabled(voice.id),
                  }))}
                  placeholder="选择音色"
                />
              </label>
              <label className="pdhv2-field pdhv2-field--slider">
                <div className="pdhv2-field__slider-head">
                  <span>语速</span>
                  <strong>{speed.toFixed(1)}x</strong>
                </div>
                <Slider
                  min={0.5}
                  max={2}
                  step={0.1}
                  value={speed}
                  onChange={setSpeed}
                />
              </label>
            </div>
          </section>

          <section className="pdhv2-settings-row">
            <label className="pdhv2-field">
              <span>模型</span>
              <Select
                value={model}
                onChange={setModel}
                options={options.models.map((item) => ({
                  value: item.value,
                  label: formatPhotoModelLabel(item),
                }))}
              />
            </label>
            <label className="pdhv2-field">
              <span>分辨率</span>
              <Select
                value={resolution}
                onChange={setResolution}
                options={PHOTO_RESOLUTION_OPTIONS}
              />
            </label>
            <label className="pdhv2-field">
              <span>画面比例</span>
              <Select
                value={aspectRatio}
                onChange={setAspectRatio}
                options={PHOTO_ASPECT_RATIO_OPTIONS}
              />
            </label>
          </section>

          <footer className="pdhv2-footer">
            <p className="pdhv2-footer__cost">
              本次生成预计消耗 {costPoints} 积分
              {credits ? ` · 剩余 ${credits.balance} 积分` : ""}
            </p>
            <Button
              type="primary"
              className="pdhv2-generate-btn"
              disabled={!canGenerate}
              loading={isSubmitting}
              onClick={handleGenerate}
            >
              克隆音色并生成
            </Button>
          </footer>

          {activeTask ? (
            <section className="pdhv2-result">
              <div className="pdhv2-result__head">
                <strong>
                  {activeTask.status === "completed"
                    ? "生成完成"
                    : activeTask.status === "failed"
                      ? "生成失败"
                      : `生成中 ${activeTask.progress || 0}%`}
                </strong>
                <span>{activeTask.time || activeTask.createdAt}</span>
              </div>
              {activeTask.status === "completed" && activeTask.resultUrl ? (
                <video src={activeTask.resultUrl} controls playsInline />
              ) : activeTask.status === "failed" ? (
                <p>{activeTask.error || "请稍后重试"}</p>
              ) : (
                <div className="pdhv2-result__loading">
                  <Loader2 size={28} className="pdhv2-spinner" />
                </div>
              )}
            </section>
          ) : null}
        </div>
      </div>

      {toastMessage ? <div className="pdhv2-toast">{toastMessage}</div> : null}
    </section>
  );
}
