import React, { useEffect, useRef, useState } from "react";
import { Message } from "@arco-design/web-react";
import { Drama, History, Play, Plus, Upload, UserRound } from "lucide-react";
import { digitalHumanApi } from "../../../api/digitalHumanApi";
import {
  getAvatarTags,
  getVoiceEmotionValue,
  getVoiceMatchHint,
  isVideoCover,
} from "../utils";
import { VoicePickerPanel } from "./VoicePickerPanel";

const VOICE_POPOVER_WIDTH = 400;

export function AvatarSelectionCard({
  avatarSource,
  onAvatarSourceChange,
  selectedAvatar,
  voices = [],
  voiceId,
  onVoiceIdChange,
  voiceSpeed = 1,
  onVoiceSpeedChange,
  voiceEmotion = "中性",
  onVoiceEmotionChange,
  onOpenCreate,
}) {
  const audioRef = useRef(null);
  const voicePanelRef = useRef(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [showVoicePicker, setShowVoicePicker] = useState(false);
  const [voicePopoverStyle, setVoicePopoverStyle] = useState(null);
  const isMine = avatarSource === "mine";
  const cover = selectedAvatar?.cover;
  const isVideo = isVideoCover(cover);
  const selectedVoice = voices.find((voice) => voice.id === voiceId);
  const tags = selectedAvatar ? getAvatarTags(selectedAvatar) : [];
  const voiceHint = selectedAvatar ? getVoiceMatchHint(selectedAvatar) : "";

  function updateVoicePopoverPosition() {
    const node = voicePanelRef.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    const maxLeft = window.innerWidth - VOICE_POPOVER_WIDTH - 12;
    const left = Math.min(rect.right + 12, maxLeft);
    setVoicePopoverStyle({
      top: Math.max(12, Math.min(rect.top, window.innerHeight - 720)),
      left: Math.max(12, left),
    });
  }

  function openVoicePicker() {
    updateVoicePopoverPosition();
    setShowVoicePicker(true);
  }

  function closeVoicePicker() {
    setShowVoicePicker(false);
  }

  useEffect(() => {
    if (!showVoicePicker) return undefined;
    updateVoicePopoverPosition();
    const handleLayoutChange = () => updateVoicePopoverPosition();
    window.addEventListener("resize", handleLayoutChange);
    window.addEventListener("scroll", handleLayoutChange, true);
    return () => {
      window.removeEventListener("resize", handleLayoutChange);
      window.removeEventListener("scroll", handleLayoutChange, true);
    };
  }, [showVoicePicker]);

  async function previewVoice() {
    if (!voiceId) {
      Message.info("暂无可试听音色");
      return;
    }

    setIsPreviewing(true);
    try {
      const result = await digitalHumanApi.previewVoice({
        text: "你好，这是当前音色的试听效果。",
        voiceId,
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

  return (
    <section className="dhv2-card dhv2-avatar-card-panel" aria-label="选择形象">
      <header className="dhv2-card__head">
        <div>
          <h2>{isMine ? "上传正面人像照片" : "选择官方形象"}</h2>
          <p>
            {isMine
              ? "建议上传半身 / 全身正面照，数字人还原效果更好"
              : "官方形象已配置好音色，选择后即可使用"}
          </p>
        </div>
      </header>

      <div className="dhv2-segmented-tabs" role="tablist" aria-label="形象来源">
        <button
          type="button"
          role="tab"
          className={!isMine ? "is-active" : ""}
          aria-selected={!isMine}
          onClick={() => onAvatarSourceChange?.("official")}
        >
          官方形象
        </button>
        <button
          type="button"
          role="tab"
          className={isMine ? "is-active" : ""}
          aria-selected={isMine}
          onClick={() => onAvatarSourceChange?.("mine")}
        >
          我的形象
          <span className="dhv2-badge">AI 定制</span>
        </button>
      </div>

      {isMine && !selectedAvatar ? (
        <div className="dhv2-mine-actions">
          <button type="button" onClick={() => onOpenCreate?.("ai")}>
            <Plus size={15} />
            AI 定制
          </button>
          <button type="button" onClick={() => onOpenCreate?.("upload")}>
            <Upload size={15} />
            本地上传
          </button>
          <button type="button" onClick={() => onOpenCreate?.("history")}>
            <History size={15} />
            从历史作品选择
          </button>
        </div>
      ) : (
        <div className={`dhv2-avatar-preview ${selectedAvatar ? "has-avatar" : ""}`}>
          {selectedAvatar ? (
            <>
              <div className="dhv2-avatar-preview__media">
                {cover ? (
                  isVideo ? (
                    <video
                      src={cover}
                      poster={selectedAvatar.poster || undefined}
                      muted
                      playsInline
                      controls
                    />
                  ) : (
                    <img src={cover} alt={selectedAvatar.name} />
                  )
                ) : (
                  <div className="dhv2-avatar-preview__empty">
                    <UserRound size={40} />
                  </div>
                )}
              </div>

              <div className="dhv2-avatar-preview__summary">
                <strong>{selectedAvatar.name}</strong>
                <div className="dhv2-avatar-preview__tags">
                  {tags.map((tag) => (
                    <span key={tag}>{tag}</span>
                  ))}
                </div>
              </div>

              <div className="dhv2-sidebar-voice-panel" ref={voicePanelRef}>
                <div className="dhv2-sidebar-voice-panel__head">
                  <strong>绑定音色</strong>
                  <p>{voiceHint}</p>
                </div>
                <div className="dhv2-sidebar-voice-panel__voice-row">
                  <div className="dhv2-sidebar-voice-panel__voice-current">
                    <span>{selectedVoice?.name || "未选择音色"}</span>
                    <button
                      type="button"
                      className="dhv2-sidebar-voice-panel__play"
                      aria-label="试听音色"
                      disabled={!selectedVoice || isPreviewing}
                      onClick={previewVoice}
                    >
                      <Play size={12} />
                    </button>
                  </div>
                  <button
                    type="button"
                    className={`dhv2-sidebar-voice-panel__change${showVoicePicker ? " is-active" : ""}`}
                    onClick={() => (showVoicePicker ? closeVoicePicker() : openVoicePicker())}
                  >
                    更换音色
                  </button>
                </div>

                <div className="dhv2-sidebar-voice-panel__speed">
                  <div className="dhv2-sidebar-voice-panel__speed-head">
                    <span>语速</span>
                    <strong>{Number(voiceSpeed).toFixed(1)}x</strong>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="2"
                    step="0.1"
                    value={voiceSpeed}
                    aria-label="语速"
                    onChange={(event) =>
                      onVoiceSpeedChange?.(Number(event.target.value))
                    }
                  />
                </div>

                <div className="dhv2-sidebar-voice-panel__params">
                  <span>语速 {Number(voiceSpeed).toFixed(1)}x</span>
                  <span>情感 {voiceEmotion}</span>
                </div>

                {showVoicePicker && voicePopoverStyle ? (
                  <>
                    <button
                      type="button"
                      className="dhv2-voice-popover-backdrop"
                      aria-label="关闭音色选择"
                      onClick={closeVoicePicker}
                    />
                    <div className="dhv2-voice-popover" style={voicePopoverStyle}>
                      <VoicePickerPanel
                        voices={voices}
                        voiceId={voiceId}
                        onVoiceIdChange={onVoiceIdChange}
                        voiceSpeed={voiceSpeed}
                        onVoiceSpeedChange={onVoiceSpeedChange}
                        voiceEmotion={voiceEmotion}
                        onVoiceEmotionChange={onVoiceEmotionChange}
                        onClose={closeVoicePicker}
                      />
                    </div>
                  </>
                ) : null}
              </div>
            </>
          ) : (
            <div className="dhv2-avatar-preview__placeholder">
              <Drama size={36} />
              <p>选择形象后，可在此配置配音及口型</p>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
