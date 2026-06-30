import React from "react";
import { Select } from "@arco-design/web-react";
import { Check, Loader2, Volume2, Zap } from "lucide-react";
import { VIDEO_SPEC_OPTIONS } from "../utils";

export function VideoSpecField({ videoSpec, onVideoSpecChange }) {
  return (
    <div className="dhv2-video-spec">
      <Select
        className="dhv2-spec-select"
        value={videoSpec}
        onChange={onVideoSpecChange}
        options={VIDEO_SPEC_OPTIONS}
        aria-label="成片规格"
      />
    </div>
  );
}

export function GenerateFooter({
  canGenerate,
  isSubmitting,
  isCloneMode = false,
  estimatedCredits = 0,
  audioPreviewPhase = "draft",
  isAudioPreviewing = false,
  isSpeechTooLong = false,
  onPreviewAudio,
  onConfirmAudio,
  onGenerate,
}) {
  const isPreviewed = audioPreviewPhase === "previewed";
  const isConfirmed = audioPreviewPhase === "confirmed";
  const buttonDisabled = isCloneMode
    ? !canGenerate || isSubmitting
    : isSpeechTooLong || (isConfirmed
      ? !canGenerate || isSubmitting
      : !canGenerate || isAudioPreviewing);
  const handleClick = isCloneMode
    ? onGenerate
    : isConfirmed
      ? onGenerate
      : isPreviewed
        ? onConfirmAudio
        : onPreviewAudio;

  return (
    <footer className="dhv2-generate-footer">
      <div className="dhv2-generate-footer__estimate">
        <span>预计消耗</span>
        <strong>{Number(estimatedCredits || 0).toLocaleString()}</strong>
        <span>积分</span>
      </div>
      <button
        type="button"
        className="dhv2-generate-button"
        disabled={buttonDisabled}
        onClick={handleClick}
      >
        {isSubmitting || (!isCloneMode && isAudioPreviewing) ? (
          <Loader2 size={18} className="dhv2-spinner" />
        ) : isCloneMode ? (
          <Zap size={18} />
        ) : isConfirmed ? (
          <Zap size={18} />
        ) : isPreviewed ? (
          <Check size={18} />
        ) : (
          <Volume2 size={18} />
        )}
        {isCloneMode
          ? isSpeechTooLong
            ? "口播预计超过 15 秒"
            : isSubmitting
            ? "正在克隆并生成..."
            : "克隆音色并生成"
          : isAudioPreviewing
          ? "正在生成试听..."
          : isConfirmed
            ? isCloneMode
              ? "克隆音色并生成"
              : "生成口播视频"
            : isPreviewed
              ? "确认使用此音频"
              : "试听配音"}
      </button>
    </footer>
  );
}
