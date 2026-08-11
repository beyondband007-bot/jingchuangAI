import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

export function MarketingPreviewLightbox({ url, title = "素材预览", video = false, onClose }) {
  useEffect(() => {
    const onKeyDown = (event) => event.key === "Escape" && onClose?.();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  if (!url) return null;
  return createPortal(
    <div className="marketing-preview-lightbox" role="dialog" aria-modal="true" aria-label={`预览${title}`}>
      <button type="button" className="marketing-preview-lightbox__backdrop" aria-label="关闭预览" onClick={onClose} />
      <figure className="marketing-preview-lightbox__panel" onClick={(event) => event.stopPropagation()}>
        <button type="button" className="marketing-preview-lightbox__close" aria-label="关闭" onClick={onClose}><X size={18} /></button>
        {video ? <video src={url} controls autoPlay playsInline preload="metadata" /> : <img src={url} alt={title} />}
      </figure>
    </div>,
    document.body,
  );
}
