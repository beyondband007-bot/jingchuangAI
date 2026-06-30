import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ImagePlus, Minus, Plus, X } from "lucide-react";
import "./musicCoverCropModal.css";

const CANVAS_WIDTH = 320;
const CANVAS_HEIGHT = 240;
const CROP_SIZE = 240;
const CROP_LEFT = (CANVAS_WIDTH - CROP_SIZE) / 2;
const CROP_TOP = 0;
const MIN_ZOOM = 1;
const MAX_ZOOM = 2.5;
const ZOOM_STEP = 0.05;
const ZOOM_BUTTON_STEP = 0.1;
const OUTPUT_SIZE = 512;
const MAX_FILE_BYTES = 5 * 1024 * 1024;

function resetCropState(setters) {
  setters.setZoom(MIN_ZOOM);
  setters.setOffset({ x: 0, y: 0 });
  setters.setDragState(null);
}

function getBaseScale(naturalWidth, naturalHeight) {
  return Math.max(
    CROP_SIZE / naturalWidth,
    CROP_SIZE / naturalHeight,
  );
}

function getImageDisplaySize(naturalWidth, naturalHeight, zoom) {
  const scale = getBaseScale(naturalWidth, naturalHeight) * zoom;
  return {
    scale,
    width: naturalWidth * scale,
    height: naturalHeight * scale,
  };
}

function getImageLayout(naturalWidth, naturalHeight, zoom, offset) {
  const { width, height } = getImageDisplaySize(naturalWidth, naturalHeight, zoom);
  return {
    width,
    height,
    left: CANVAS_WIDTH / 2 - width / 2 + offset.x,
    top: CANVAS_HEIGHT / 2 - height / 2 + offset.y,
  };
}

function clampOffset(offset, zoom, naturalWidth, naturalHeight) {
  const { width: imgW, height: imgH } = getImageDisplaySize(
    naturalWidth,
    naturalHeight,
    zoom,
  );
  const canvasCenterX = CANVAS_WIDTH / 2;
  const canvasCenterY = CANVAS_HEIGHT / 2;
  const cropRight = CROP_LEFT + CROP_SIZE;
  const cropBottom = CROP_TOP + CROP_SIZE;

  const minX = cropRight - imgW / 2 - canvasCenterX;
  const maxX = CROP_LEFT + imgW / 2 - canvasCenterX;
  const minY = cropBottom - imgH / 2 - canvasCenterY;
  const maxY = CROP_TOP + imgH / 2 - canvasCenterY;

  function clampValue(value, lower, upper) {
    if (lower > upper) return 0;
    return Math.min(Math.max(value, lower), upper);
  }

  return {
    x: clampValue(offset.x, minX, maxX),
    y: clampValue(offset.y, minY, maxY),
  };
}

function drawCroppedCoverBlob(image, { zoom, offset }) {
  return new Promise((resolve, reject) => {
    if (!image?.naturalWidth || !image?.naturalHeight) {
      reject(new Error("请先上传封面图片"));
      return;
    }

    const { scale } = getImageDisplaySize(
      image.naturalWidth,
      image.naturalHeight,
      zoom,
    );
    const cropCenterX = CROP_LEFT + CROP_SIZE / 2;
    const cropCenterY = CROP_TOP + CROP_SIZE / 2;
    const canvasCenterX = CANVAS_WIDTH / 2;
    const canvasCenterY = CANVAS_HEIGHT / 2;
    const imageCenterX = canvasCenterX + offset.x;
    const imageCenterY = canvasCenterY + offset.y;
    const sourceSize = CROP_SIZE / scale;
    const imageCenterInSourceX =
      (cropCenterX - imageCenterX) / scale + image.naturalWidth / 2;
    const imageCenterInSourceY =
      (cropCenterY - imageCenterY) / scale + image.naturalHeight / 2;
    const half = sourceSize / 2;
    const sourceX = Math.min(
      Math.max(0, imageCenterInSourceX - half),
      image.naturalWidth - sourceSize,
    );
    const sourceY = Math.min(
      Math.max(0, imageCenterInSourceY - half),
      image.naturalHeight - sourceSize,
    );

    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const context = canvas.getContext("2d");
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(
      image,
      sourceX,
      sourceY,
      sourceSize,
      sourceSize,
      0,
      0,
      OUTPUT_SIZE,
      OUTPUT_SIZE,
    );

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("封面裁剪失败，请重试"));
          return;
        }
        resolve(blob);
      },
      "image/jpeg",
      0.92,
    );
  });
}

export function MusicCoverCropModal({
  open,
  initialPreview = "",
  onClose,
  onConfirm,
}) {
  const fileInputRef = useRef(null);
  const imageRef = useRef(null);
  const [imageSrc, setImageSrc] = useState("");
  const [zoom, setZoom] = useState(MIN_ZOOM);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragState, setDragState] = useState(null);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [imageMetrics, setImageMetrics] = useState({
    width: 0,
    height: 0,
    left: 0,
    top: 0,
  });
  const ownedBlobRef = useRef("");
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  function syncImageMetrics(
    naturalWidth = imageRef.current?.naturalWidth,
    naturalHeight = imageRef.current?.naturalHeight,
    nextZoom = zoom,
    nextOffset = offset,
  ) {
    if (!naturalWidth || !naturalHeight) return;
    setImageMetrics(
      getImageLayout(naturalWidth, naturalHeight, nextZoom, nextOffset),
    );
  }

  useEffect(() => {
    if (!open) return undefined;

    setError("");
    resetCropState({ setZoom, setOffset, setDragState });
    if (initialPreview) {
      setImageSrc(initialPreview);
    } else {
      setImageSrc("");
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") onCloseRef.current?.();
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, initialPreview]);

  useEffect(
    () => () => {
      if (ownedBlobRef.current) {
        URL.revokeObjectURL(ownedBlobRef.current);
        ownedBlobRef.current = "";
      }
    },
    [],
  );

  function loadFile(file) {
    if (!file) return;
    if (!/^image\/(jpeg|png|webp|gif)$/i.test(file.type || "")) {
      setError("请选择 JPG、PNG 或 WebP 图片");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setError("封面图片大小不能超过 5MB");
      return;
    }

    setError("");
    resetCropState({ setZoom, setOffset, setDragState });
    if (ownedBlobRef.current) {
      URL.revokeObjectURL(ownedBlobRef.current);
    }
    const nextSrc = URL.createObjectURL(file);
    ownedBlobRef.current = nextSrc;
    setImageSrc(nextSrc);
  }

  function updateZoom(nextZoom) {
    const clamped = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, nextZoom));
    setZoom(clamped);
    if (imageRef.current?.naturalWidth && imageRef.current?.naturalHeight) {
      setOffset((prev) => {
        const nextOffset = clampOffset(
          prev,
          clamped,
          imageRef.current.naturalWidth,
          imageRef.current.naturalHeight,
        );
        syncImageMetrics(
          imageRef.current.naturalWidth,
          imageRef.current.naturalHeight,
          clamped,
          nextOffset,
        );
        return nextOffset;
      });
    }
  }

  function handleReset() {
    resetCropState({ setZoom, setOffset, setDragState });
    if (imageRef.current?.naturalWidth && imageRef.current?.naturalHeight) {
      syncImageMetrics(
        imageRef.current.naturalWidth,
        imageRef.current.naturalHeight,
        MIN_ZOOM,
        { x: 0, y: 0 },
      );
    }
  }

  async function handleConfirm() {
    if (!imageSrc) {
      setError("请先上传封面图片");
      return;
    }

    setIsSaving(true);
    setError("");
    try {
      const blob = await drawCroppedCoverBlob(imageRef.current, {
        zoom,
        offset,
      });
      if (blob.size > MAX_FILE_BYTES) {
        throw new Error("封面图片大小不能超过 5MB");
      }
      const file = new File([blob], `music-cover-${Date.now()}.jpg`, {
        type: "image/jpeg",
        lastModified: Date.now(),
      });
      onConfirm?.(file);
      onClose?.();
    } catch (nextError) {
      setError(nextError.message || "封面裁剪失败，请重试");
    } finally {
      setIsSaving(false);
    }
  }

  if (!open) return null;

  return createPortal(
    <div
      className="music-cover-crop-modal__backdrop"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="music-cover-crop-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="music-cover-crop-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="music-cover-crop-modal__head">
          <h2 id="music-cover-crop-modal-title">编辑封面</h2>
          <button
            type="button"
            className="music-cover-crop-modal__close"
            aria-label="关闭"
            onClick={onClose}
          >
            <X size={22} strokeWidth={1.5} />
          </button>
        </header>

        <div className="music-cover-crop-modal__body">
          <div
            className={`music-cover-crop-modal__stage${
              imageSrc ? "" : " is-empty"
            }`}
          >
            {imageSrc ? (
              <div
                className="music-cover-crop-modal__canvas"
                onPointerDown={(event) => {
                  event.currentTarget.setPointerCapture(event.pointerId);
                  setDragState({
                    x: event.clientX,
                    y: event.clientY,
                    offset,
                  });
                }}
                onPointerMove={(event) => {
                  if (!dragState) return;
                  const nextOffset = {
                    x: dragState.offset.x + event.clientX - dragState.x,
                    y: dragState.offset.y + event.clientY - dragState.y,
                  };
                  if (
                    imageRef.current?.naturalWidth &&
                    imageRef.current?.naturalHeight
                  ) {
                    const clampedOffset = clampOffset(
                      nextOffset,
                      zoom,
                      imageRef.current.naturalWidth,
                      imageRef.current.naturalHeight,
                    );
                    setOffset(clampedOffset);
                    syncImageMetrics(
                      imageRef.current.naturalWidth,
                      imageRef.current.naturalHeight,
                      zoom,
                      clampedOffset,
                    );
                  } else {
                    setOffset(nextOffset);
                  }
                }}
                onPointerUp={() => setDragState(null)}
                onPointerCancel={() => setDragState(null)}
              >
                <img
                  ref={imageRef}
                  src={imageSrc}
                  alt="封面裁剪预览"
                  draggable="false"
                  onLoad={() => {
                    if (!imageRef.current?.naturalWidth) return;
                    const nextOffset = clampOffset(
                      { x: 0, y: 0 },
                      zoom,
                      imageRef.current.naturalWidth,
                      imageRef.current.naturalHeight,
                    );
                    setOffset(nextOffset);
                    syncImageMetrics(
                      imageRef.current.naturalWidth,
                      imageRef.current.naturalHeight,
                      zoom,
                      nextOffset,
                    );
                  }}
                  style={{
                    width: `${imageMetrics.width}px`,
                    height: `${imageMetrics.height}px`,
                    left: `${imageMetrics.left}px`,
                    top: `${imageMetrics.top}px`,
                  }}
                />
                <span
                  className="music-cover-crop-modal__crop-frame"
                  aria-hidden="true"
                />
              </div>
            ) : (
              <button
                type="button"
                className="music-cover-crop-modal__empty"
                onClick={() => fileInputRef.current?.click()}
              >
                <ImagePlus size={28} />
                <strong>点击上传图片</strong>
                <span>JPG / PNG / WebP，最大 5MB</span>
              </button>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/*"
            hidden
            onChange={(event) => {
              loadFile(event.target.files?.[0] || null);
              event.target.value = "";
            }}
          />

          {imageSrc ? (
            <>
              <div className="music-cover-crop-modal__zoom">
                <button
                  type="button"
                  className="music-cover-crop-modal__zoom-btn"
                  aria-label="缩小"
                  disabled={zoom <= MIN_ZOOM}
                  onClick={() => updateZoom(zoom - ZOOM_BUTTON_STEP)}
                >
                  <Minus size={16} />
                </button>
                <input
                  type="range"
                  min={MIN_ZOOM}
                  max={MAX_ZOOM}
                  step={ZOOM_STEP}
                  value={zoom}
                  onChange={(event) => updateZoom(Number(event.target.value))}
                />
                <button
                  type="button"
                  className="music-cover-crop-modal__zoom-btn"
                  aria-label="放大"
                  disabled={zoom >= MAX_ZOOM}
                  onClick={() => updateZoom(zoom + ZOOM_BUTTON_STEP)}
                >
                  <Plus size={16} />
                </button>
              </div>
              <p className="music-cover-crop-modal__hint">
                拖动图片调整位置，封面将按 1:1 比例裁剪
              </p>
            </>
          ) : null}

          {error ? (
            <p className="music-cover-crop-modal__error">{error}</p>
          ) : null}
        </div>

        <footer className="music-cover-crop-modal__foot">
          <button
            type="button"
            className="music-cover-crop-modal__btn is-primary"
            disabled={!imageSrc || isSaving}
            onClick={handleConfirm}
          >
            {isSaving ? "处理中..." : "确定"}
          </button>
          <button
            type="button"
            className="music-cover-crop-modal__btn is-ghost"
            disabled={!imageSrc || isSaving}
            onClick={handleReset}
          >
            重设图片
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
