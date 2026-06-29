import React, { useEffect, useRef, useState } from "react";
import { Message } from "@arco-design/web-react";
import { Loader2, Pause, Play, RotateCcw, Sparkles, Upload } from "lucide-react";
import { digitalHumanApi } from "../../../api/digitalHumanApi";
import { voiceApi } from "../../voice/voiceApi";
import {
  SCRIPT_MAX_LENGTH,
  VOICE_UNAVAILABLE_HINT,
  formatSpeechDurationFromMs,
  getVoiceEmotionValue,
  isDigitalHumanVoiceEnabled,
} from "../utils";
import { VOICE_DUBBING_MODES } from "./VoiceDubbingModeCard";
import { SystemVoiceCard } from "./SystemVoiceCard";

const DEFAULT_PLACEHOLDER = "请输入你希望角色说的内容";
const CLONE_AUDIO_ACCEPT = "audio/mpeg,audio/mp3,audio/wav,audio/x-wav,audio/mp4,audio/x-m4a,.mp3,.wav,.m4a";
const CLONE_AUDIO_MIN_MS = 10000;
const CLONE_AUDIO_MAX_MS = 5 * 60 * 1000;

export function ScriptCard({
  text,
  onTextChange,
  onOptimizeRequest,
  voiceId,
  voiceSpeed = 1,
  voiceEmotion = "中性",
  voiceMode = VOICE_DUBBING_MODES.system,
  showCloneUpload = false,
  cloneAudio,
  onCloneAudioChange,
  onSpeechDurationMsChange,
  selectedAvatar,
  voices = [],
  onVoiceIdChange,
  onVoiceSpeedChange,
  onVoiceEmotionChange,
  previewRequestId = 0,
  previewPhase = "draft",
  onPreviewStateChange,
  onRegeneratePreview,
}) {
  const textareaRef = useRef(null);
  const audioRef = useRef(null);
  const cloneInputRef = useRef(null);
  const lastPreviewKeyRef = useRef("");
  const [selection, setSelection] = useState({ start: 0, end: 0, text: "" });
  const [previewDurationMs, setPreviewDurationMs] = useState(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isUploadingClone, setIsUploadingClone] = useState(false);
  const canOptimize = Boolean(selection.text.trim());
  const isCloneMode = showCloneUpload && voiceMode === VOICE_DUBBING_MODES.clone;

  function updatePreviewDurationMs(value) {
    const durationMs = Number(value || 0);
    setPreviewDurationMs(durationMs > 0 ? durationMs : null);
    onSpeechDurationMsChange?.(durationMs > 0 ? durationMs : 0);
  }

  useEffect(() => {
    updatePreviewDurationMs(0);
    lastPreviewKeyRef.current = "";
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsPlaying(false);
  }, [text, voiceId, voiceSpeed, voiceEmotion, voiceMode, isCloneMode]);

  useEffect(() => {
    if (isCloneMode && cloneAudio?.durationMs) {
      updatePreviewDurationMs(cloneAudio.durationMs);
    }
  }, [cloneAudio?.durationMs, isCloneMode]);

  function openCloneFilePicker() {
    cloneInputRef.current?.click();
  }

  function readAudioDurationMs(file) {
    return new Promise((resolve) => {
      const url = URL.createObjectURL(file);
      const audio = new Audio(url);
      audio.addEventListener("loadedmetadata", () => {
        const durationMs = Math.round(Number(audio.duration || 0) * 1000);
        URL.revokeObjectURL(url);
        resolve(durationMs > 0 ? durationMs : 0);
      });
      audio.addEventListener("error", () => {
        URL.revokeObjectURL(url);
        resolve(0);
      });
    });
  }

  async function handleCloneFileChange(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!/\.(mp3|wav|m4a)$/i.test(file.name) && !/^audio\//i.test(file.type)) {
      Message.warning("请上传 MP3、WAV 或 M4A 格式音频");
      return;
    }

    setIsUploadingClone(true);
    try {
      const durationMs = await readAudioDurationMs(file);
      if (durationMs > 0 && durationMs < CLONE_AUDIO_MIN_MS) {
        Message.warning("参考音频建议不少于 10 秒");
        return;
      }
      if (durationMs > CLONE_AUDIO_MAX_MS) {
        Message.warning("参考音频不能超过 5 分钟");
        return;
      }
      const uploaded = await voiceApi.uploadCloneAudio(file, durationMs);
      if (uploaded.cachedVoice) {
        onCloneAudioChange?.({
          fileId: uploaded.cachedVoice.id,
          audioHash: uploaded.audioHash,
          name: uploaded.cachedVoice.name || file.name,
          durationMs: uploaded.durationMs || durationMs,
          cachedVoice: uploaded.cachedVoice,
          reused: true,
        });
      } else {
        onCloneAudioChange?.({
          fileId: uploaded.fileId || uploaded.file_id,
          audioHash: uploaded.audioHash,
          name: uploaded.localName || file.name,
          durationMs: uploaded.durationMs || durationMs,
          mimeType: uploaded.mimeType,
          size: uploaded.size,
        });
      }
      Message.success("参考音频上传成功");
    } catch (error) {
      Message.error(error?.message || "音频上传失败");
    } finally {
      setIsUploadingClone(false);
    }
  }

  function clearCloneAudio() {
    onCloneAudioChange?.(null);
  }

  function bindPreviewAudio(audio) {
    audioRef.current = audio;
    audio.onplay = () => setIsPlaying(true);
    audio.onpause = () => setIsPlaying(false);
    audio.onended = () => setIsPlaying(false);
  }

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  function syncSelection() {
    const element = textareaRef.current;
    if (!element) return;
    const start = element.selectionStart ?? 0;
    const end = element.selectionEnd ?? 0;
    setSelection({
      start,
      end,
      text: text.slice(start, end),
    });
  }

  function handleOptimizeClick() {
    if (!canOptimize) return;
    onOptimizeRequest?.({
      segment: selection.text.trim(),
      start: selection.start,
      end: selection.end,
    });
  }

  function getPreviewKey(trimmed = text.trim()) {
    return `${trimmed}|${voiceId}|${voiceSpeed}|${voiceEmotion}`;
  }

  async function playPreviewAudio() {
    if (!audioRef.current) return;
    audioRef.current.currentTime = 0;
    await audioRef.current.play().catch(() => {});
  }

  async function previewScript({
    shouldPlay = false,
    notifyParent = false,
    forceGenerate = false,
  } = {}) {
    const trimmed = text.trim();
    if (!trimmed) {
      updatePreviewDurationMs(0);
      if (shouldPlay) {
        Message.info("请先输入配音内容");
      }
      return;
    }
    if (isCloneMode) {
      if (cloneAudio?.durationMs) {
        updatePreviewDurationMs(cloneAudio.durationMs);
      }
      if (shouldPlay) {
        Message.info("音色克隆模式下请使用参考音频驱动口播");
      }
      return;
    }
    if (!voiceId || !isDigitalHumanVoiceEnabled(voiceId)) {
      if (shouldPlay) {
        Message.info(VOICE_UNAVAILABLE_HINT);
      }
      return;
    }

    const previewKey = getPreviewKey(trimmed);
    if (
      !forceGenerate &&
      shouldPlay &&
      previewDurationMs &&
      lastPreviewKeyRef.current === previewKey &&
      audioRef.current
    ) {
      await playPreviewAudio();
      if (notifyParent) {
        onPreviewStateChange?.({
          status: "ready",
          isPreviewing: false,
          durationMs: previewDurationMs,
        });
      }
      return;
    }

    if (isPreviewing) return;

    setIsPreviewing(true);
    if (notifyParent) {
      onPreviewStateChange?.({ status: "loading", isPreviewing: true });
    }
    try {
      const result = await digitalHumanApi.previewVoice({
        text: trimmed,
        voiceId,
        speed: voiceSpeed,
        emotion: getVoiceEmotionValue(voiceEmotion),
      });
      lastPreviewKeyRef.current = previewKey;
      updatePreviewDurationMs(result.durationMs || 0);

      if (audioRef.current) {
        audioRef.current.pause();
      }
      if (result.audioDataUrl) {
        bindPreviewAudio(new Audio(result.audioDataUrl));
        if (shouldPlay) {
          await playPreviewAudio();
        }
      }

      if (notifyParent) {
        onPreviewStateChange?.({
          status: "ready",
          isPreviewing: false,
          durationMs: result.durationMs || 0,
        });
      }

      if (result.isTooLong) {
        Message.warning("配音时长过长，请缩短文案");
      }
    } catch (error) {
      Message.error(error?.message || "试听失败");
    } finally {
      setIsPreviewing(false);
      if (notifyParent) {
        onPreviewStateChange?.({ isPreviewing: false });
      }
    }
  }

  useEffect(() => {
    if (!previewRequestId) return;
    previewScript({ shouldPlay: true, notifyParent: true, forceGenerate: true });
  }, [previewRequestId]);

  function handlePreviewClick() {
    if (isPlaying) {
      audioRef.current?.pause();
      return;
    }
    playPreviewAudio();
  }

  const durationLabel = previewDurationMs
    ? `说话时长 ${formatSpeechDurationFromMs(previewDurationMs)}`
    : isCloneMode
      ? "上传参考音频后可查看时长和消耗积分"
      : "试听后可获取准确的说话时长和消耗积分";

  const hasGeneratedPreview = previewPhase === "previewed" || previewPhase === "confirmed";

  return (
    <section className="dhv2-card dhv2-script-card" aria-label="配音内容">
      <header className="dhv2-card__head dhv2-script-card__head">
        <h2>配音内容</h2>
        {!isCloneMode ? (
          <SystemVoiceCard
            compact
            selectedAvatar={selectedAvatar}
            voices={voices}
            voiceId={voiceId}
            onVoiceIdChange={onVoiceIdChange}
            voiceSpeed={voiceSpeed}
            onVoiceSpeedChange={onVoiceSpeedChange}
            voiceEmotion={voiceEmotion}
            onVoiceEmotionChange={onVoiceEmotionChange}
          />
        ) : null}
        {isCloneMode ? (
          <button
            type="button"
            className="dhv2-script-upload-btn"
            disabled={isUploadingClone}
            onClick={openCloneFilePicker}
          >
            <Upload size={14} />
            {isUploadingClone ? "上传中..." : "上传音频"}
          </button>
        ) : null}
      </header>

      <input
        ref={cloneInputRef}
        type="file"
        accept={CLONE_AUDIO_ACCEPT}
        hidden
        onChange={handleCloneFileChange}
      />

      {isCloneMode ? (
        <button
          type="button"
          className={`dhv2-clone-audio-upload${cloneAudio ? " has-file" : ""}`}
          disabled={isUploadingClone}
          onClick={openCloneFilePicker}
        >
          <span className="dhv2-clone-audio-upload__icon" aria-hidden="true">
            <Upload size={18} />
          </span>
          <span className="dhv2-clone-audio-upload__text">
            {cloneAudio ? (
              <>
                <strong>{cloneAudio.name}</strong>
                <span>
                  {cloneAudio.durationMs
                    ? formatSpeechDurationFromMs(cloneAudio.durationMs)
                    : "已上传参考音频"}
                </span>
              </>
            ) : (
              <>
                <strong>上传本人人声参考音频，复刻专属音色</strong>
                <span>支持 MP3、WAV、M4A 格式，建议 10 秒以上</span>
              </>
            )}
          </span>
          {cloneAudio ? (
            <span
              className="dhv2-clone-audio-upload__clear"
              role="button"
              tabIndex={0}
              onClick={(event) => {
                event.stopPropagation();
                clearCloneAudio();
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  event.stopPropagation();
                  clearCloneAudio();
                }
              }}
            >
              移除
            </span>
          ) : null}
        </button>
      ) : null}

      <div className="dhv2-script-field">
        <textarea
          ref={textareaRef}
          value={text}
          maxLength={SCRIPT_MAX_LENGTH}
          placeholder={DEFAULT_PLACEHOLDER}
          onChange={(event) => onTextChange?.(event.target.value)}
          onSelect={syncSelection}
          onMouseUp={syncSelection}
          onKeyUp={syncSelection}
        />
        <button
          type="button"
          className="dhv2-script-optimize"
          disabled={!canOptimize}
          title={canOptimize ? "根据选中台词生成优化模板" : "请先选中需要优化的台词"}
          onClick={handleOptimizeClick}
        >
          <Sparkles size={12} />
          AI 优化台词
        </button>
      </div>

      <div className="dhv2-script-preview-row">
        <button
          type="button"
          className={`dhv2-script-preview${previewDurationMs ? " has-duration" : ""}${
            isPlaying ? " is-playing" : ""
          }`}
          disabled={isPreviewing || !hasGeneratedPreview || !audioRef.current}
          aria-label={isPlaying ? "暂停试听" : "播放试听"}
          onClick={handlePreviewClick}
        >
          <span className="dhv2-script-preview__icon" aria-hidden="true">
            {isPreviewing ? (
              <Loader2 size={12} className="dhv2-spinner" />
            ) : isPlaying ? (
              <Pause size={12} fill="currentColor" />
            ) : (
              <Play size={12} fill="currentColor" />
            )}
          </span>
          <span className="dhv2-script-preview__text">
            {isPreviewing ? "正在生成试听..." : durationLabel}
          </span>
        </button>
        {hasGeneratedPreview ? (
          <button
            type="button"
            className="dhv2-script-regenerate"
            disabled={isPreviewing}
            onClick={onRegeneratePreview}
          >
            <RotateCcw size={12} />
            重新生成
          </button>
        ) : null}
        <span className="dhv2-script-count">
          {text.length} / {SCRIPT_MAX_LENGTH}
        </span>
      </div>

    </section>
  );
}
