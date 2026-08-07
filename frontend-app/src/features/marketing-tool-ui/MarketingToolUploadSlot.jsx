import React, { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { Loader2, X } from "lucide-react";

export const MarketingToolUploadSlot = forwardRef(function MarketingToolUploadSlot(
  {
    accept,
    disabled = false,
    dragDrop = false,
    className = "",
    hasPreview = false,
    hasFile = false,
    emptyTitle,
    emptyHint,
    previewUrl = "",
    isVideo = false,
    onSelect,
    onClear,
    isBusy = false,
    busyLabel = "上传中",
    previewMeta = "",
    previewBadge = null,
    overlay = null,
    renderPreview = null,
    ariaBusy = false,
  },
  ref,
) {
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const isInteractive = !disabled && !isBusy;

  useImperativeHandle(ref, () => ({
    openFilePicker() {
      if (!isInteractive) return;
      inputRef.current?.click();
    },
  }), [isInteractive]);

  function openFilePicker() {
    if (!isInteractive) return;
    inputRef.current?.click();
  }

  function handleFileChange(event) {
    const file = event.target.files?.[0] || null;
    event.target.value = "";
    if (file) onSelect?.(file);
  }

  function clearFile(event) {
    event.preventDefault();
    event.stopPropagation();
    onClear?.();
  }

  const slotClassName = [
    "marketing-composer__upload",
    "marketing-tool-upload",
    dragDrop ? "marketing-tool-upload--drag" : "",
    dragOver && isInteractive ? "drag-over" : "",
    hasFile ? "has-file" : "",
    hasPreview ? "has-preview" : "",
    isBusy ? "is-busy" : "",
    className,
  ].filter(Boolean).join(" ");

  const fileInput = (
    <input
      ref={inputRef}
      type="file"
      accept={accept}
      hidden={!dragDrop}
      style={dragDrop ? { display: "none" } : undefined}
      disabled={!isInteractive}
      onChange={handleFileChange}
    />
  );

  const emptyContent = (
    <>
      <span className="marketing-upload-icon" aria-hidden="true">
        <img src="/assets/marketing/upload.svg" alt="" />
      </span>
      <strong>{emptyTitle}</strong>
      <span>{emptyHint}</span>
    </>
  );

  const defaultPreview = previewUrl ? (
    isVideo ? (
      <video src={previewUrl} muted playsInline preload="metadata" />
    ) : (
      <img src={previewUrl} alt="上传素材预览" />
    )
  ) : null;

  const previewContent = renderPreview
    ? renderPreview({ previewUrl, isVideo })
    : defaultPreview;

  const clearButton = hasPreview && isInteractive ? (
    <span
      className="ui-upload-clear-button"
      role="button"
      tabIndex={0}
      aria-label="取消上传"
      onClick={clearFile}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") clearFile(event);
      }}
    >
      <X size={13} />
    </span>
  ) : null;

  const busyOverlay = isBusy ? (
    <span className="marketing-tool-upload__busy">
      <Loader2 size={16} className="is-spinning" />
      {busyLabel}
    </span>
  ) : null;

  if (dragDrop) {
    return (
      <div
        className={slotClassName}
        aria-disabled={!isInteractive}
        aria-busy={ariaBusy}
        onDragOver={(event) => {
          if (!isInteractive) return;
          event.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => {
          if (!isInteractive) return;
          setDragOver(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setDragOver(false);
          if (!isInteractive) return;
          const file = event.dataTransfer.files?.[0];
          if (file) onSelect?.(file);
        }}
      >
        {fileInput}
        {hasPreview ? (
          <>
            {previewContent}
            {overlay}
            {clearButton}
          </>
        ) : (
          <button
            type="button"
            className="marketing-tool-upload__empty"
            onClick={openFilePicker}
            disabled={!isInteractive}
          >
            {emptyContent}
          </button>
        )}
        {previewMeta ? <small>{previewMeta}</small> : null}
        {previewBadge}
        {busyOverlay}
      </div>
    );
  }

  return (
    <button
      className={slotClassName}
      type="button"
      onClick={openFilePicker}
      disabled={!isInteractive}
      aria-busy={ariaBusy}
    >
      {fileInput}
      {hasPreview ? previewContent : emptyContent}
      {clearButton}
      {previewMeta ? <small>{previewMeta}</small> : null}
      {previewBadge}
      {overlay}
      {busyOverlay}
    </button>
  );
});
