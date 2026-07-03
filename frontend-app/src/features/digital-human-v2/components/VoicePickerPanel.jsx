import React, { useEffect, useMemo, useRef, useState } from "react";
import { Message } from "@arco-design/web-react";
import { Play, X } from "lucide-react";
import { digitalHumanApi } from "../../../api/digitalHumanApi";
import {
  VOICE_CATEGORIES,
  VOICE_EMOTION_OPTIONS,
  VOICE_UNAVAILABLE_HINT,
  filterVoicesByAvatarGender,
  filterVoicesByCategory,
  getVoiceEmotionValue,
  isDigitalHumanVoiceEnabled,
} from "../utils";

export function VoicePickerPanel({
  voices = [],
  avatar,
  voiceId,
  onVoiceIdChange,
  voiceSpeed = 1,
  onVoiceSpeedChange,
  voiceEmotion = "中性",
  onVoiceEmotionChange,
  onClose,
  className = "",
}) {
  const audioRef = useRef(null);
  const [voiceCategory, setVoiceCategory] = useState("all");
  const [isPreviewing, setIsPreviewing] = useState(false);
  const genderFilteredVoices = useMemo(
    () => filterVoicesByAvatarGender(voices, avatar),
    [voices, avatar],
  );
  const filteredVoices = useMemo(
    () => filterVoicesByCategory(genderFilteredVoices, voiceCategory),
    [voiceCategory, genderFilteredVoices],
  );

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  async function previewVoice(targetVoiceId = voiceId) {
    if (!targetVoiceId) {
      Message.info("暂无可试听音色");
      return;
    }

    setIsPreviewing(true);
    try {
      const result = await digitalHumanApi.previewVoice({
        text: "你好，这是当前音色的试听效果。",
        voiceId: targetVoiceId,
        speed: voiceSpeed,
        volume: 1,
        pitch: 0,
        emotion: getVoiceEmotionValue(voiceEmotion),
      });
      if (audioRef.current) {
        audioRef.current.pause();
      }
      const audio = new Audio(result.audioDataUrl);
      audioRef.current = audio;
      await audio.play();
    } catch (error) {
      Message.error(error?.message || "音色试听失败");
    } finally {
      setIsPreviewing(false);
    }
  }

  const panelClass = ["dhv2-voice-picker", className].filter(Boolean).join(" ");

  return (
    <aside className={panelClass} aria-label="选择音色">
      <header className="dhv2-voice-picker__head">
        <strong>选择音色</strong>
        <button
          type="button"
          className="dhv2-avatar-confirm__icon-btn"
          aria-label="关闭音色选择"
          onClick={onClose}
        >
          <X size={14} />
        </button>
      </header>

      <div className="dhv2-voice-picker__tabs">
        {VOICE_CATEGORIES.map((category) => (
          <button
            key={category.id}
            type="button"
            className={voiceCategory === category.id ? "is-active" : ""}
            onClick={() => setVoiceCategory(category.id)}
          >
            {category.label}
          </button>
        ))}
      </div>

      <div className="dhv2-voice-picker__list">
        {filteredVoices.map((voice) => {
          const isActive = voice.id === voiceId;
          const isEnabled = isDigitalHumanVoiceEnabled(voice.id);
          return (
            <div
              key={voice.id}
              className={`dhv2-voice-picker__item${isActive ? " is-active" : ""}${isEnabled ? "" : " is-disabled"}`}
              title={isEnabled ? undefined : VOICE_UNAVAILABLE_HINT}
            >
              <button
                type="button"
                className="dhv2-voice-picker__item-main"
                disabled={!isEnabled}
                aria-disabled={!isEnabled}
                title={isEnabled ? undefined : VOICE_UNAVAILABLE_HINT}
                onClick={() => {
                  if (!isEnabled) return;
                  onVoiceIdChange?.(voice.id);
                }}
              >
                <span className="dhv2-voice-picker__avatar" aria-hidden="true" />
                <span className="dhv2-voice-picker__meta">
                  <strong>{voice.name}</strong>
                  <em>{isEnabled ? voice.description : VOICE_UNAVAILABLE_HINT}</em>
                </span>
              </button>
              <button
                type="button"
                className="dhv2-voice-picker__play"
                aria-label={`试听${voice.name}`}
                disabled={isPreviewing}
                onClick={() => previewVoice(voice.id)}
              >
                <Play size={14} />
              </button>
            </div>
          );
        })}
        {!filteredVoices.length ? (
          <p className="dhv2-voice-picker__empty">该分类暂无音色</p>
        ) : null}
      </div>

      <div className="dhv2-voice-picker__controls">
        <div className="dhv2-voice-picker__control">
          <div className="dhv2-voice-picker__control-head">
            <span>语速</span>
            <strong>{Number(voiceSpeed).toFixed(1)}x</strong>
          </div>
          <input
            type="range"
            min="0.5"
            max="2"
            step="0.1"
            value={voiceSpeed}
            onChange={(event) => onVoiceSpeedChange?.(Number(event.target.value))}
          />
        </div>
        <div className="dhv2-voice-picker__control">
          <span>情感</span>
          <div className="dhv2-voice-picker__emotions">
            {VOICE_EMOTION_OPTIONS.map((item) => (
              <button
                key={item}
                type="button"
                className={voiceEmotion === item ? "is-active" : ""}
                onClick={() => onVoiceEmotionChange?.(item)}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
}
