import React from "react";
import { Select } from "@arco-design/web-react";
import { Loader2, Zap } from "lucide-react";
import { VIDEO_SPEC_OPTIONS } from "../utils";

export function GenerateFooter({
  videoSpec,
  onVideoSpecChange,
  canGenerate,
  isSubmitting,
  onGenerate,
}) {
  return (
    <footer className="dhv2-generate-footer">
      <Select
        className="dhv2-spec-select"
        value={videoSpec}
        onChange={onVideoSpecChange}
        options={VIDEO_SPEC_OPTIONS}
        aria-label="成片规格"
      />
      <button
        type="button"
        className="dhv2-generate-button"
        disabled={!canGenerate || isSubmitting}
        onClick={onGenerate}
      >
        {isSubmitting ? <Loader2 size={18} className="dhv2-spinner" /> : <Zap size={18} />}
        生成口播视频
      </button>
    </footer>
  );
}
