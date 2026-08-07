import React, { useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { Star, X } from "lucide-react";
import { getAvatarTags, isVideoCover } from "../utils";

const REQUIRED_VIEW_TYPES = ["front", "side", "back", "face"];
const VIEW_LABELS = {
  front: "正视图",
  side: "侧视图",
  back: "背视图",
  face: "面部图",
};

function getAvatarViews(avatar) {
  const viewsByType = new Map(
    (Array.isArray(avatar?.views) ? avatar.views : [])
      .filter((item) => item?.type)
      .map((item) => [item.type, item]),
  );

  return REQUIRED_VIEW_TYPES.map((type) => {
    const item = viewsByType.get(type);
    return {
      type,
      label: item?.label || VIEW_LABELS[type],
      url: item?.url || "",
    };
  });
}

export function AvatarConfirmOverlay({ avatar, onClose, onConfirm }) {
  const videoRef = useRef(null);
  const tags = useMemo(() => getAvatarTags(avatar), [avatar]);
  const views = useMemo(() => getAvatarViews(avatar), [avatar]);

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === "Escape") onClose?.();
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    const video = videoRef.current;
    return () => {
      if (!video) return;
      video.pause();
      video.currentTime = 0;
    };
  }, [avatar?.id]);

  function handleConfirm() {
    onConfirm?.(avatar);
  }

  return createPortal(
    <div
      className="dhv2-avatar-confirm-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="形象确认"
      onClick={onClose}
    >
      <div
        className="dhv2-avatar-confirm-stage"
        onClick={(event) => event.stopPropagation()}
      >
        <section className="dhv2-avatar-confirm">
          <button
            type="button"
            className="dhv2-avatar-confirm__close"
            aria-label="关闭形象确认"
            onClick={onClose}
          >
            <X size={18} />
          </button>
          <div className="dhv2-avatar-confirm__body">
            <div className="dhv2-avatar-confirm__left">
              <header className="dhv2-avatar-confirm__head">
                <div className="dhv2-avatar-confirm__title-block">
                  <strong>{avatar.name}</strong>
                  <div className="dhv2-avatar-confirm__tags">
                    {tags.map((tag) => (
                      <span key={tag}>{tag}</span>
                    ))}
                  </div>
                </div>
                <button type="button" className="dhv2-avatar-confirm__icon-btn" aria-label="收藏">
                  <Star size={14} />
                </button>
              </header>

              <div className="dhv2-avatar-confirm__media">
                <span className="dhv2-avatar-confirm__badge">适配视频 / 直播</span>
                {isVideoCover(avatar.cover) ? (
                  <video
                    ref={videoRef}
                    src={avatar.cover}
                    poster={avatar.poster || undefined}
                    controls
                    playsInline
                    preload="metadata"
                  />
                ) : (
                  <img src={avatar.cover} alt={avatar.name} />
                )}
              </div>
            </div>

            <aside className="dhv2-avatar-confirm__aside" aria-label="数字人四视图">
              <div className="dhv2-avatar-confirm__views-head">
                <strong>数字人四视图</strong>
                <span>正视、侧视、背视、面部特写</span>
              </div>
              <div className="dhv2-avatar-confirm__views-grid">
                {views.map((view, index) => (
                  <figure className="dhv2-avatar-confirm__view" key={view.type}>
                    <div className="dhv2-avatar-confirm__view-media">
                      {view.url ? (
                        <img src={view.url} alt={`${avatar.name} ${view.label}`} />
                      ) : (
                        <span>暂缺视图</span>
                      )}
                    </div>
                    <figcaption>
                      <span>{index + 1}</span>
                      {view.label}
                    </figcaption>
                  </figure>
                ))}
              </div>
            </aside>
          </div>

          <footer className="dhv2-avatar-confirm__actions">
            <button type="button" className="dhv2-avatar-confirm__ghost" onClick={onClose}>
              重新选形象
            </button>
            <button type="button" className="dhv2-avatar-confirm__primary" onClick={handleConfirm}>
              确认使用
            </button>
          </footer>
        </section>
      </div>
    </div>,
    document.body,
  );
}
