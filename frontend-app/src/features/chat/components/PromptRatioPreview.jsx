import React from "react";

export function PromptRatioPreview({ ratio, selected = false }) {
  const [width = 1, height = 1] = String(ratio || "1:1")
    .split(":")
    .map((part) => Number(part) || 1);
  const isPortrait = height > width;
  const isSquare = width === height;
  const previewWidth = isSquare ? "18px" : isPortrait ? "12px" : "24px";
  const previewHeight = isSquare ? "18px" : isPortrait ? "24px" : "12px";

  return (
    <span className="prompt-ratio-preview" aria-hidden="true">
      <span
        className={`prompt-ratio-preview__shape ${selected ? "is-selected" : ""}`}
        style={{
          "--prompt-ratio-preview-height": previewHeight,
          "--prompt-ratio-preview-width": previewWidth,
        }}
      />
    </span>
  );
}
