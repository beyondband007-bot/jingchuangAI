import React, { useEffect, useRef, useState } from "react";
import { Message } from "@arco-design/web-react";
import { Loader2, Pause, Play, Sparkles } from "lucide-react";
import { digitalHumanApi } from "../../../api/digitalHumanApi";
import {
  SCRIPT_MAX_LENGTH,
  VOICE_UNAVAILABLE_HINT,
  estimateSpeechSeconds,
  formatSpeechDurationFromMs,
  formatVoiceDuration,
  getVoiceEmotionValue,
  isDigitalHumanVoiceEnabled,
} from "../utils";

const DEFAULT_PLACEHOLDER = "请输入你希望角色说的内容";

export function ScriptCard({
  text,
  onTextChange,
  onOptimizeRequest,
  voiceId,
  voiceSpeed = 1,
  voiceEmotion = "中性",
}) {
  const textareaRef = useRef(null);
  const audioRef = useRef(null);
  const lastPreviewKeyRef = useRef("");
  const [selection, setSelection] = useState({ start: 0, end: 0, text: "" });
  const [previewDurationMs, setPreviewDurationMs] = useState(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const estimatedSeconds = estimateSpeechSeconds(text);
  const canOptimize = Boolean(selection.text.trim());

  useEffect(() => {
    setPreviewDurationMs(null);
    lastPreviewKeyRef.current = "";
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsPlaying(false);
  }, [text, voiceId, voiceSpeed, voiceEmotion]);

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

  async function previewScript({ shouldPlay = false } = {}) {
    const trimmed = text.trim();
    if (!trimmed) {
      setPreviewDurationMs(null);
      if (shouldPlay) {
        Message.info("请先输入配音内容");
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
      shouldPlay &&
      previewDurationMs &&
      lastPreviewKeyRef.current === previewKey &&
      audioRef.current
    ) {
      await playPreviewAudio();
      return;
    }

    if (isPreviewing) return;

    setIsPreviewing(true);
    try {
      const result = await digitalHumanApi.previewVoice({
        text: trimmed,
        voiceId,
        speed: voiceSpeed,
        emotion: getVoiceEmotionValue(voiceEmotion),
      });
      lastPreviewKeyRef.current = previewKey;
      setPreviewDurationMs(result.durationMs || 0);

      if (audioRef.current) {
        audioRef.current.pause();
      }
      if (result.audioDataUrl) {
        bindPreviewAudio(new Audio(result.audioDataUrl));
        if (shouldPlay) {
          await playPreviewAudio();
        }
      }

      if (result.isTooLong) {
        Message.warning("配音时长过长，请缩短文案");
      }
    } catch (error) {
      Message.error(error?.message || "试听失败");
    } finally {
      setIsPreviewing(false);
    }
  }

  function handleBlur() {
    if (!text.trim()) return;
    previewScript({ shouldPlay: false });
  }

  function handlePreviewClick() {
    if (isPlaying) {
      audioRef.current?.pause();
      return;
    }
    previewScript({ shouldPlay: true });
  }

  const durationLabel = previewDurationMs
    ? `说话时长 ${formatSpeechDurationFromMs(previewDurationMs)}`
    : "试听后可获取准确的说话时长";

  return (
    <section className="dhv2-card dhv2-script-card" aria-label="配音内容">
      <header className="dhv2-card__head">
        <h2>配音内容</h2>
      </header>

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
          onBlur={handleBlur}
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

      <button
        type="button"
        className={`dhv2-script-preview${previewDurationMs ? " has-duration" : ""}${
          isPlaying ? " is-playing" : ""
        }`}
        disabled={isPreviewing || !text.trim()}
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
        <span>{isPreviewing ? "正在生成试听..." : durationLabel}</span>
      </button>

      <footer className="dhv2-script-meta">
        <span>
          {previewDurationMs
            ? `试听时长 ${formatSpeechDurationFromMs(previewDurationMs)}`
            : `预估时长 ${formatVoiceDuration(estimatedSeconds)}`}
        </span>
        <span>
          {text.length} / {SCRIPT_MAX_LENGTH}
        </span>
      </footer>
    </section>
  );
}
