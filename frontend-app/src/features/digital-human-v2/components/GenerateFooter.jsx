import React from "react";
import { Select } from "@arco-design/web-react";
import { Loader2, Zap } from "lucide-react";
import { VIDEO_SPEC_OPTIONS } from "../utils";

export function GenerateFooter({
  videoSpec,
  onVideoSpecChange,
  canGenerate,
  isSubmitting,
  isCloneMode = false,
  credits,
  onGenerate,
}) {
  return (
    <footer className="dhv2-generate-footer">
      <div className="dhv2-generate-footer__left">
        <Select
          className="dhv2-spec-select"
          value={videoSpec}
          onChange={onVideoSpecChange}
          options={VIDEO_SPEC_OPTIONS}
          aria-label="成片规格"
        />
        {typeof credits === "number" ? (
          <p className="dhv2-generate-footer__credits">剩余 {credits.toLocaleString()} 积分</p>
        ) : null}
      </div>
      <button
        type="button"
        className="dhv2-generate-button"
        disabled={!canGenerate || isSubmitting}
        onClick={onGenerate}
      >
        {isSubmitting ? <Loader2 size={18} className="dhv2-spinner" /> : <Zap size={18} />}
        {isCloneMode ? "克隆音色并生成" : "生成口播视频"}
      </button>
    </footer>
  );
}
