import React, { useEffect, useMemo, useRef, useState } from "react";
import { Message } from "@arco-design/web-react";
import { Play, Star, X } from "lucide-react";
import { digitalHumanApi } from "../../../api/digitalHumanApi";
import {
  VOICE_CATEGORIES,
  filterVoicesByCategory,
  getAvatarTags,
  getVoiceMatchHint,
  isVideoCover,
  matchVoiceForAvatar,
} from "../utils";

const EMOTION_OPTIONS = ["中性", "高兴", "愤怒", "悲伤", "害怕", "厌恶", "惊讶"];
const EMOTION_VALUE_MAP = {
  中性: "",
  高兴: "happy",
  愤怒: "angry",
  悲伤: "sad",
  害怕: "fear",
  厌恶: "disgust",
  惊讶: "surprised",
};

export function AvatarConfirmOverlay({
  avatar,
  voices = [],
  voiceId,
  onVoiceIdChange,
  onClose,
  onConfirm,
}) {
  const audioRef = useRef(null);
  const [showVoicePicker, setShowVoicePicker] = useState(false);
  const [voiceCategory, setVoiceCategory] = useState("all");
  const [speed, setSpeed] = useState(1);
  const [emotion, setEmotion] = useState("中性");
  const [isPreviewing, setIsPreviewing] = useState(false);

  const tags = useMemo(() => getAvatarTags(avatar), [avatar]);
  const voiceHint = useMemo(() => getVoiceMatchHint(avatar), [avatar]);
  const selectedVoice = voices.find((voice) => voice.id === voiceId) || voices[0];
  const filteredVoices = useMemo(
    () => filterVoicesByCategory(voices, voiceCategory),
    [voiceCategory, voices],
  );

  useEffect(() => {
    const matched = matchVoiceForAvatar(avatar, voices);
    if (matched?.id) onVoiceIdChange?.(matched.id);
    setShowVoicePicker(false);
    setVoiceCategory("all");
    setSpeed(1);
    setEmotion("中性");
  }, [avatar, voices]);

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
        speed,
        volume: 1,
        pitch: 0,
        emotion: EMOTION_VALUE_MAP[emotion] || "",
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

  function handleConfirm() {
    if (!selectedVoice?.id) {
      Message.info("请先选择音色");
      return;
    }
    onConfirm?.({ avatar, voiceId: selectedVoice.id });
  }

  return (
    <div
      className="dhv2-library__overlay"
      role="dialog"
      aria-modal="true"
      aria-label="形象确认"
      onClick={onClose}
    >
      <div className="dhv2-avatar-confirm-stage" onClick={(event) => event.stopPropagation()}>
        <section className="dhv2-avatar-confirm">
          <header className="dhv2-avatar-confirm__head">
            <div className="dhv2-avatar-confirm__title-block">
              <strong>{avatar.name}</strong>
              <div className="dhv2-avatar-confirm__tags">
                {tags.map((tag) => (
                  <span key={tag}>{tag}</span>
                ))}
              </div>
            </div>
            <div className="dhv2-avatar-confirm__head-actions">
              <button type="button" className="dhv2-avatar-confirm__icon-btn" aria-label="收藏">
                <Star size={14} />
              </button>
              <button
                type="button"
                className="dhv2-avatar-confirm__icon-btn"
                aria-label="关闭"
                onClick={onClose}
              >
                <X size={14} />
              </button>
            </div>
          </header>

          <div className="dhv2-avatar-confirm__media">
            <span className="dhv2-avatar-confirm__badge">适配视频 / 直播</span>
            {isVideoCover(avatar.cover) ? (
              <video
                src={avatar.cover}
                poster={avatar.poster || undefined}
                muted
                playsInline
                autoPlay
                loop
              />
            ) : (
              <img src={avatar.cover} alt={avatar.name} />
            )}
          </div>

          <div className="dhv2-avatar-confirm__voice-panel">
            <div className="dhv2-avatar-confirm__voice-head">
              <strong>绑定音色</strong>
              <p>{voiceHint}</p>
            </div>
            <div className="dhv2-avatar-confirm__voice-row">
              <div className="dhv2-avatar-confirm__voice-current">
                <span>{selectedVoice?.name || "未选择音色"}</span>
                <button
                  type="button"
                  className="dhv2-avatar-confirm__voice-play"
                  aria-label="试听音色"
                  disabled={!selectedVoice || isPreviewing}
                  onClick={() => previewVoice(selectedVoice?.id)}
                >
                  <Play size={12} />
                </button>
              </div>
              <button
                type="button"
                className="dhv2-avatar-confirm__voice-change"
                onClick={() => setShowVoicePicker((current) => !current)}
              >
                更换音色
              </button>
            </div>
          </div>

          <footer className="dhv2-avatar-confirm__actions">
            <button type="button" className="dhv2-avatar-confirm__ghost" onClick={onClose}>
              重新选形象
            </button>
            <button type="button" className="dhv2-avatar-confirm__primary" onClick={handleConfirm}>
              确认使用
            </button>
          </footer>
        </section>

        {showVoicePicker ? (
          <aside className="dhv2-voice-picker" aria-label="选择音色">
            <header className="dhv2-voice-picker__head">
              <strong>选择音色</strong>
              <button
                type="button"
                className="dhv2-avatar-confirm__icon-btn"
                aria-label="关闭音色选择"
                onClick={() => setShowVoicePicker(false)}
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
                return (
                  <div
                    key={voice.id}
                    className={`dhv2-voice-picker__item${isActive ? " is-active" : ""}`}
                  >
                    <button
                      type="button"
                      className="dhv2-voice-picker__item-main"
                      onClick={() => onVoiceIdChange?.(voice.id)}
                    >
                      <span className="dhv2-voice-picker__avatar" aria-hidden="true" />
                      <span className="dhv2-voice-picker__meta">
                        <strong>{voice.name}</strong>
                        <em>{voice.description}</em>
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
                  <strong>{speed.toFixed(1)}x</strong>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="2"
                  step="0.1"
                  value={speed}
                  onChange={(event) => setSpeed(Number(event.target.value))}
                />
              </div>
              <div className="dhv2-voice-picker__control">
                <span>情感</span>
                <div className="dhv2-voice-picker__emotions">
                  {EMOTION_OPTIONS.map((item) => (
                    <button
                      key={item}
                      type="button"
                      className={emotion === item ? "is-active" : ""}
                      onClick={() => setEmotion(item)}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </aside>
        ) : null}
      </div>
    </div>
  );
}
