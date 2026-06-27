import React from "react";
import { Select } from "@arco-design/web-react";
import { Loader2, Zap } from "lucide-react";
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
  credits,
  onGenerate,
}) {
  return (
    <footer className="dhv2-generate-footer">
      <button
        type="button"
        className="dhv2-generate-button"
        disabled={!canGenerate || isSubmitting}
        onClick={onGenerate}
      >
        {typeof credits === "number" ? (
          <span className="dhv2-generate-button__credits">
            剩余 {credits.toLocaleString()} 积分
          </span>
        ) : null}
        {isSubmitting ? <Loader2 size={18} className="dhv2-spinner" /> : <Zap size={18} />}
        {isCloneMode ? "克隆音色并生成" : "生成口播视频"}
      </button>
    </footer>
  );
}
