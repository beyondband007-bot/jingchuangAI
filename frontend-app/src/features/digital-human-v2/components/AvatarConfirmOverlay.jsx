import React, { useEffect, useMemo, useRef, useState } from "react";
import { Message } from "@arco-design/web-react";
import { Play, Star, X } from "lucide-react";
import { digitalHumanApi } from "../../../api/digitalHumanApi";
import {
  getAvatarTags,
  getVoiceEmotionValue,
  getVoiceMatchHint,
  isVideoCover,
  matchVoiceForAvatar,
} from "../utils";
import { VoicePickerPanel } from "./VoicePickerPanel";

export function AvatarConfirmOverlay({
  avatar,
  voices = [],
  voiceId,
  onVoiceIdChange,
  voiceSpeed = 1,
  onVoiceSpeedChange,
  voiceEmotion = "中性",
  onVoiceEmotionChange,
  onClose,
  onConfirm,
}) {
  const audioRef = useRef(null);
  const [showVoicePicker, setShowVoicePicker] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);

  const tags = useMemo(() => getAvatarTags(avatar), [avatar]);
  const voiceHint = useMemo(() => getVoiceMatchHint(avatar), [avatar]);
  const selectedVoice = voices.find((voice) => voice.id === voiceId) || voices[0];

  useEffect(() => {
    const matched = matchVoiceForAvatar(avatar, voices);
    if (matched?.id) onVoiceIdChange?.(matched.id);
    setShowVoicePicker(false);
    onVoiceSpeedChange?.(1);
    onVoiceEmotionChange?.("中性");
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

  function handleConfirm() {
    if (!selectedVoice?.id) {
      Message.info("请先选择音色");
      return;
    }
    onConfirm?.({
      avatar,
      voiceId: selectedVoice.id,
      speed: voiceSpeed,
      emotion: voiceEmotion,
    });
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
          <VoicePickerPanel
            voices={voices}
            voiceId={voiceId}
            onVoiceIdChange={onVoiceIdChange}
            voiceSpeed={voiceSpeed}
            onVoiceSpeedChange={onVoiceSpeedChange}
            voiceEmotion={voiceEmotion}
            onVoiceEmotionChange={onVoiceEmotionChange}
            onClose={() => setShowVoicePicker(false)}
          />
        ) : null}
      </div>
    </div>
  );
}
