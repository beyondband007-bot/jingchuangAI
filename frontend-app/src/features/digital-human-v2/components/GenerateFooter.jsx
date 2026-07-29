import React from "react";
import { Check, Loader2, Pause, Play, Volume2, Zap } from "lucide-react";
import { CustomSelect } from "../../../components/CustomSelect";
import { VIDEO_SPEC_OPTIONS } from "../utils";

export function VideoSpecField({ videoSpec, onVideoSpecChange }) {
  return (
    <div className="dhv2-video-spec">
      <CustomSelect
        className="dhv2-spec-select custom-select-theme-dh"
        value={videoSpec}
        onChange={onVideoSpecChange}
        options={VIDEO_SPEC_OPTIONS}
        ariaLabel="成片规格"
        showRatioIcon
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
  isAudioPlaying = false,
  isSpeechTooLong = false,
  onPreviewAudio,
  onConfirmAudio,
  onPlayAudio,
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
      {!isCloneMode && isPreviewed ? (
        <div className="dhv2-generate-footer__actions">
          <button
            type="button"
            className="dhv2-audio-listen-button"
            disabled={isAudioPreviewing}
            onClick={onPlayAudio}
          >
            {isAudioPlaying ? <Pause size={14} /> : <Play size={14} />}
            {isAudioPlaying ? "暂停试听" : "试听播放"}
          </button>
          <button
            type="button"
            className="dhv2-generate-button is-small"
            disabled={buttonDisabled}
            onClick={onConfirmAudio}
          >
            <Check size={14} />
            确认使用此音频
          </button>
        </div>
      ) : (
        <button
          type="button"
          className="dhv2-generate-button"
          disabled={buttonDisabled}
          onClick={handleClick}
        >
          {isSubmitting || (!isCloneMode && isAudioPreviewing) ? (
            <Loader2 size={18} className="dhv2-spinner" />
          ) : isCloneMode || isConfirmed ? (
            <Zap size={18} />
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
              ? "生成口播视频"
              : "试听配音"}
        </button>
      )}
    </footer>
  );
}
