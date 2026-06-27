import React, { useEffect, useRef, useState } from "react";
import { IconWifi } from "@arco-design/web-react/icon";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Heart,
  MessageCircle,
  Pencil,
  Share2,
  Star,
} from "lucide-react";

/** 笔记预览中竖图展示上限（宽/高），高于此比例的竖图（如 9:16）缩放在 3:4 框内 */
const NOTE_PREVIEW_MAX_PORTRAIT_RATIO = 3 / 4;

function parseRatioString(ratioStr) {
  if (!ratioStr || typeof ratioStr !== "string") return null;
  const [width, height] = ratioStr.split(":").map(Number);
  if (!width || !height) return null;
  return { width, height };
}

function getNotePreviewDisplayAspect(naturalWidth, naturalHeight, ratioFallback) {
  let width = naturalWidth;
  let height = naturalHeight;

  if (!width || !height) {
    const parsed = parseRatioString(ratioFallback);
    if (parsed) {
      width = parsed.width;
      height = parsed.height;
    } else {
      return { width: 3, height: 4, isCapped: false };
    }
  }

  if (width / height < NOTE_PREVIEW_MAX_PORTRAIT_RATIO) {
    return { width: 3, height: 4, isCapped: true };
  }

  return { width, height, isCapped: false };
}

function probeImageRatio(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      resolve({
        width: img.naturalWidth,
        height: img.naturalHeight,
        ratio: img.naturalWidth / img.naturalHeight,
      });
    };
    img.onerror = () => resolve({ width: 3, height: 4, ratio: 3 / 4 });
    img.src = src;
  });
}

function useImageRatios(images) {
  const imageKey = images.map((item) => item.image).join("|");
  const [ratioById, setRatioById] = useState({});

  useEffect(() => {
    if (!images.length) {
      setRatioById({});
      return undefined;
    }

    let cancelled = false;
    Promise.all(
      images.map(async (item) => ({
        id: item.id,
        ratio: await probeImageRatio(item.image),
      })),
    ).then((results) => {
      if (cancelled) return;
      const next = {};
      results.forEach((item) => {
        next[item.id] = item.ratio;
      });
      setRatioById(next);
    });

    return () => {
      cancelled = true;
    };
  }, [imageKey, images]);

  return ratioById;
}

/**
 * @typedef {{ id: string, image: string, title?: string }} NotePreviewImage
 */

/**
 * 小红书笔记详情页 1:1 复刻预览。
 * @param {{
 *   images: NotePreviewImage[],
 *   title: string,
 *   body?: string,
 *   tags?: string[],
 *   createdAt?: string,
 *   authorName?: string,
 *   authorAvatar?: string,
 *   activeIndex: number,
 *   onActiveIndexChange: (index: number) => void,
 *   stageClassName?: string,
 *   ratioFallback?: string,
 * }} props
 */
export function ArticleXhsNotePreview({
  images,
  title,
  body = "",
  tags = [],
  createdAt = "刚刚",
  authorName = "Facemini AI",
  authorAvatar,
  activeIndex,
  onActiveIndexChange,
  stageClassName = "",
  ratioFallback,
}) {
  const carouselRef = useRef(null);
  const slideRefs = useRef([]);
  const dragRef = useRef(null);
  const ratioById = useImageRatios(images);
  const paragraphs = body.split(/\n+/).filter(Boolean);

  function scrollToIndex(index, behavior = "smooth") {
    const safeIndex = Math.max(0, Math.min(images.length - 1, index));
    const slide = slideRefs.current[safeIndex];
    if (slide) {
      slide.scrollIntoView({
        behavior,
        block: "nearest",
        inline: "start",
      });
    }
    onActiveIndexChange(safeIndex);
  }

  useEffect(() => {
    const carousel = carouselRef.current;
    const slide = slideRefs.current[activeIndex];
    if (!carousel || !slide) return;
    const carouselRect = carousel.getBoundingClientRect();
    const slideRect = slide.getBoundingClientRect();
    if (Math.abs(slideRect.left - carouselRect.left) > 2) {
      slide.scrollIntoView({
        behavior: "auto",
        block: "nearest",
        inline: "start",
      });
    }
  }, [activeIndex, images]);

  function handleCarouselScroll(event) {
    const carousel = event.currentTarget;
    if (!carousel.clientWidth) return;
    const nextIndex = Math.round(carousel.scrollLeft / carousel.clientWidth);
    if (nextIndex !== activeIndex && images[nextIndex]) {
      onActiveIndexChange(nextIndex);
    }
  }

  function handlePointerDown(event) {
    if (event.button !== 0) return;
    if (event.target.closest(".xhs-note-carousel-btn")) return;
    const carousel = event.currentTarget;
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      scrollLeft: carousel.scrollLeft,
    };
    carousel.setPointerCapture(event.pointerId);
    carousel.classList.add("is-dragging");
  }

  function handlePointerMove(event) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    event.currentTarget.scrollLeft =
      drag.scrollLeft - (event.clientX - drag.startX);
  }

  function handlePointerEnd(event) {
    const carousel = event.currentTarget;
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    carousel.classList.remove("is-dragging");
    if (carousel.hasPointerCapture(event.pointerId)) {
      carousel.releasePointerCapture(event.pointerId);
    }
    const nextIndex = Math.max(
      0,
      Math.min(
        images.length - 1,
        Math.round(carousel.scrollLeft / carousel.clientWidth),
      ),
    );
    scrollToIndex(nextIndex);
  }

  const stageClass = ["xhs-note-stage", stageClassName].filter(Boolean).join(" ");
  const avatarInitial = (authorName?.[0] || "F").toUpperCase();

  return (
    <div className={stageClass}>
      <article className="xhs-note-phone">
        <div className="xhs-note-statusbar">
          <span className="xhs-note-time">9:41</span>
          <span className="xhs-note-status-icons">
            <i className="xhs-note-signal" />
            <IconWifi className="xhs-note-wifi-icon" />
            <i className="xhs-note-battery" />
          </span>
        </div>

        <header className="xhs-note-authorbar">
          <button type="button" className="xhs-note-back">
            <ArrowLeft size={22} strokeWidth={2.2} />
          </button>
          {authorAvatar ? (
            <img
              className="xhs-note-avatar"
              src={authorAvatar}
              alt={authorName}
            />
          ) : (
            <span className="xhs-note-avatar">{avatarInitial}</span>
          )}
          <span className="xhs-note-author-name">{authorName}</span>
          <button type="button" className="xhs-note-follow">
            关注
          </button>
          <button type="button" className="xhs-note-share">
            <Share2 size={22} strokeWidth={2} />
          </button>
        </header>

        <div className="xhs-note-body">
          <div className="xhs-note-carousel-shell">
            {images.length > 1 && (
              <>
                <button
                  type="button"
                  className="xhs-note-carousel-btn is-prev"
                  onClick={(event) => {
                    event.stopPropagation();
                    scrollToIndex(
                      activeIndex > 0 ? activeIndex - 1 : images.length - 1,
                    );
                  }}
                  aria-label="上一张"
                >
                  <ChevronLeft size={24} strokeWidth={2} />
                </button>
                <button
                  type="button"
                  className="xhs-note-carousel-btn is-next"
                  onClick={(event) => {
                    event.stopPropagation();
                    scrollToIndex(
                      activeIndex < images.length - 1 ? activeIndex + 1 : 0,
                    );
                  }}
                  aria-label="下一张"
                >
                  <ChevronRight size={24} strokeWidth={2} />
                </button>
              </>
            )}
            <div
              className="xhs-note-carousel"
              ref={carouselRef}
              onScroll={handleCarouselScroll}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerEnd}
              onPointerCancel={handlePointerEnd}
            >
              {images.map((item, index) => {
                const ratio = ratioById[item.id];
                const display = getNotePreviewDisplayAspect(
                  ratio?.width,
                  ratio?.height,
                  ratioFallback,
                );
                const aspectRatio = `${display.width} / ${display.height}`;
                return (
                  <figure
                    className={[
                      "xhs-note-image-wrap",
                      display.isCapped ? "is-aspect-capped" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    style={{ aspectRatio }}
                    key={item.id}
                    ref={(node) => {
                      slideRefs.current[index] = node;
                    }}
                    data-slide-index={index}
                  >
                    <img
                      src={item.image}
                      alt={item.title || title}
                      draggable="false"
                    />
                    {images.length > 1 && (
                      <span className="xhs-note-page-badge">
                        {index + 1}/{images.length}
                      </span>
                    )}
                  </figure>
                );
              })}
            </div>
          </div>

          {images.length > 1 && (
            <div className="xhs-note-dots">
              {images.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  className={index === activeIndex ? "is-active" : ""}
                  onClick={() => scrollToIndex(index)}
                  aria-label={`查看第 ${index + 1} 张`}
                />
              ))}
            </div>
          )}

          <div className="xhs-note-copy">
            {title && <h2 className="xhs-note-title">{title}</h2>}
            {paragraphs.map((paragraph, index) => (
              <p key={`${paragraph}-${index}`} className="xhs-note-paragraph">
                {paragraph}
              </p>
            ))}
            {tags.length > 0 && (
              <div className="xhs-note-tags">
                {tags.map((tag) => (
                  <span key={tag}>#{tag}</span>
                ))}
              </div>
            )}
            <p className="xhs-note-meta">编辑于 {createdAt}</p>
          </div>

          <div className="xhs-note-comment-prompt">
            {authorAvatar ? (
              <img
                className="xhs-note-avatar is-small"
                src={authorAvatar}
                alt={authorName}
              />
            ) : (
              <span className="xhs-note-avatar is-small">{avatarInitial}</span>
            )}
            <p>说点什么，让 TA 也认识看笔记的你</p>
          </div>

          <div className="xhs-note-empty-comments">
            <MessageCircle size={40} strokeWidth={1.2} />
            <p>
              这是一片荒草地，<strong>分享笔记</strong>
            </p>
          </div>
        </div>

        <footer className="xhs-note-toolbar">
          <div className="xhs-note-comment-box">
            <Pencil size={13} strokeWidth={1.8} />
            <span className="xhs-note-comment-placeholder">说点什么...</span>
          </div>
          <button type="button" className="xhs-note-action">
            <Heart size={22} strokeWidth={1.8} />
            <span>点赞</span>
          </button>
          <button type="button" className="xhs-note-action">
            <Star size={22} strokeWidth={1.8} />
            <span>收藏</span>
          </button>
          <button type="button" className="xhs-note-action">
            <MessageCircle size={22} strokeWidth={1.8} />
            <span>评论</span>
          </button>
        </footer>

        <span className="xhs-note-home-indicator" />
      </article>
    </div>
  );
}
