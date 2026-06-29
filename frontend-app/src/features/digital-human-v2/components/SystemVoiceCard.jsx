import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Message } from "@arco-design/web-react";
import { ChevronRight, Play, UserRound } from "lucide-react";
import { digitalHumanApi } from "../../../api/digitalHumanApi";
import { getVoiceEmotionValue, getVoiceMatchHint } from "../utils";
import { VoicePickerPanel } from "./VoicePickerPanel";

const VOICE_POPOVER_WIDTH = 400;

export function SystemVoiceCard({
  embedded = false,
  compact = false,
  selectedAvatar,
  voices = [],
  voiceId,
  onVoiceIdChange,
  voiceSpeed = 1,
  onVoiceSpeedChange,
  voiceEmotion = "中性",
  onVoiceEmotionChange,
}) {
  const audioRef = useRef(null);
  const voicePanelRef = useRef(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [showVoicePicker, setShowVoicePicker] = useState(false);
  const [voicePopoverStyle, setVoicePopoverStyle] = useState(null);
  const selectedVoice = voices.find((voice) => voice.id === voiceId);
  const voiceHint = selectedAvatar ? getVoiceMatchHint(selectedAvatar) : "";

  function updateVoicePopoverPosition() {
    if (compact) return;
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
    if (!compact) updateVoicePopoverPosition();
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

  if (compact) {
    return (
      <div className="dhv2-script-voice" ref={voicePanelRef}>
        <button
          type="button"
          className="dhv2-script-voice__trigger"
          aria-label="选择音色"
          onClick={openVoicePicker}
        >
          <span className="dhv2-script-voice__avatar" aria-hidden="true">
            <UserRound size={15} />
          </span>
          <span className="dhv2-script-voice__meta">
            <strong>{selectedVoice?.name || "未选择音色"}</strong>
            <span>语速 {Number(voiceSpeed).toFixed(1)}x</span>
          </span>
          <ChevronRight size={15} aria-hidden="true" />
        </button>

        {showVoicePicker
          ? createPortal(
              <div
                className="dhv2-voice-modal-backdrop"
                role="presentation"
                onMouseDown={(event) => {
                  if (event.target === event.currentTarget) closeVoicePicker();
                }}
              >
                <div className="dhv2-voice-modal" role="dialog" aria-modal="true" aria-label="选择音色">
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
              </div>,
              document.body,
            )
          : null}
      </div>
    );
  }

  return (
    <div className={`dhv2-sidebar-voice-panel${embedded ? " is-embedded" : ""}`} ref={voicePanelRef}>
      {!embedded ? (
        <div className="dhv2-sidebar-voice-panel__head">
          <strong>绑定音色</strong>
          <p>{voiceHint || "系统已根据形象特征自动推荐音色"}</p>
        </div>
      ) : null}
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
          onChange={(event) => onVoiceSpeedChange?.(Number(event.target.value))}
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
  );
}
