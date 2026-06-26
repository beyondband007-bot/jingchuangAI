import React, { useEffect, useRef, useState } from "react";
import { IconWifi } from "@arco-design/web-react/icon";
import {
  ArrowLeft,
  Bookmark,
  Heart,
  MessageCircle,
  Share2,
} from "lucide-react";

function probeImageRatio(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      resolve({
        width: img.naturalWidth,
        height: img.naturalHeight,
        ratio: img.naturalWidth / img.naturalHeight,
        isPortrait: img.naturalHeight >= img.naturalWidth,
      });
    };
    img.onerror = () =>
      resolve({ width: 3, height: 4, ratio: 3 / 4, isPortrait: true });
    img.src = src;
  });
}

function useXhsImageRatios(images) {
  const imageKey = images.map((item) => item.image).join("|");
  const [infoById, setInfoById] = useState({});

  useEffect(() => {
    if (!images.length) {
      setInfoById({});
      return undefined;
    }

    let cancelled = false;
    Promise.all(
      images.map(async (item) => ({
        id: item.id,
        info: await probeImageRatio(item.image),
      })),
    ).then((results) => {
      if (cancelled) return;
      const next = {};
      results.forEach((item) => {
        next[item.id] = item.info;
      });
      setInfoById(next);
    });

    return () => {
      cancelled = true;
    };
  }, [imageKey, images]);

  return infoById;
}

/**
 * @typedef {{ id: string, image: string, title?: string }} ArticlePreviewImage
 */

/**
 * 小红书风格手机预览（历史预览 / 结果页共用）。
 * @param {{
 *   images: ArticlePreviewImage[],
 *   title: string,
 *   body?: string,
 *   tags?: string[],
 *   createdAt?: string,
 *   authorName?: string,
 *   authorAvatar?: string,
 *   activeIndex: number,
 *   onActiveIndexChange: (index: number) => void,
 *   stageClassName?: string,
 *   mode?: "note" | "feed",
 * }} props
 */
export function ArticleXhsPhonePreview({
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
  mode = "note",
}) {
  const carouselRef = useRef(null);
  const dragRef = useRef(null);
  const imageInfoById = useXhsImageRatios(images);
  const paragraphs = body.split(/\n+/).filter(Boolean);
  const isNoteMode = mode === "note";

  function scrollToIndex(index, behavior = "smooth") {
    const carousel = carouselRef.current;
    if (!carousel) return;
    carousel.scrollTo({
      left: carousel.clientWidth * index,
      behavior,
    });
    onActiveIndexChange(index);
  }

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

  const stageClass = ["article-xhs-preview-stage", stageClassName]
    .filter(Boolean)
    .join(" ");
  const phoneClass = [
    "article-xhs-phone",
    isNoteMode ? "is-note-mode" : "is-feed-mode",
  ].join(" ");

  const avatarInitial = (authorName?.[0] || "F").toUpperCase();

  return (
    <div className={stageClass}>
      <article className={phoneClass}>
        <div className="article-xhs-statusbar">
          <strong>9:41</strong>
          <span className="article-xhs-status-icons">
            <i className="is-signal" />
            <IconWifi className="is-wifi-icon" />
            <i className="is-battery" />
          </span>
        </div>
        <header className="article-xhs-authorbar">
          <ArrowLeft size={24} />
          {authorAvatar ? (
            <img
              className="article-xhs-avatar"
              src={authorAvatar}
              alt={authorName}
            />
          ) : (
            <span className="article-xhs-avatar">{avatarInitial}</span>
          )}
          <strong>{authorName}</strong>
          <button type="button">关注</button>
          <Share2 size={22} />
        </header>
        <div className="article-xhs-scroll-content">
          <div
            className="article-xhs-image-carousel"
            ref={carouselRef}
            onScroll={handleCarouselScroll}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerEnd}
            onPointerCancel={handlePointerEnd}
          >
            {images.map((item, index) => {
              const info = imageInfoById[item.id];
              const isPortrait = info ? info.isPortrait : true;
              const aspectRatio = info
                ? `${info.width} / ${info.height}`
                : "3 / 4";
              return (
                <figure
                  className={`article-xhs-image-wrap${isPortrait ? " is-portrait" : " is-landscape"}`}
                  style={{ aspectRatio }}
                  key={item.id}
                >
                  <img
                    src={item.image}
                    alt={item.title || title}
                    draggable="false"
                  />
                  {isNoteMode && images.length > 1 && (
                    <span className="article-xhs-page-badge">
                      {index + 1}/{images.length}
                    </span>
                  )}
                  {!isNoteMode && <span>AI生成</span>}
                </figure>
              );
            })}
          </div>
          {images.length > 1 && (
            <div className="article-xhs-image-dots">
              {images.map((item, index) => (
                <button
                  className={index === activeIndex ? "is-active" : ""}
                  type="button"
                  key={item.id}
                  onClick={() => scrollToIndex(index)}
                  aria-label={`查看第 ${index + 1} 张`}
                />
              ))}
            </div>
          )}
          <p className="article-xhs-publish-time">编辑于 {createdAt}</p>
          {!isNoteMode && (
            <>
              <div className="article-xhs-caption">
                <h2>{title}</h2>
                {paragraphs.map((paragraph, index) => (
                  <p key={`${paragraph}-${index}`}>{paragraph}</p>
                ))}
                <div>
                  {tags.map((tag) => (
                    <span key={tag}>#{tag}</span>
                  ))}
                </div>
              </div>
              <div className="article-xhs-comment-prompt">
                <span className="article-xhs-avatar is-small">{avatarInitial}</span>
                <p>说点什么，让 TA 也认识爱创作的你</p>
              </div>
              <div className="article-xhs-empty-comments">
                <MessageCircle size={35} />
                <p>
                  这是一片荒草地，<strong>分享笔记</strong>
                </p>
              </div>
            </>
          )}
        </div>
        <footer className="article-xhs-toolbar">
          <button type="button" className="article-xhs-comment-input">
            {authorAvatar ? (
              <img
                className="article-xhs-toolbar-avatar"
                src={authorAvatar}
                alt={authorName}
              />
            ) : (
              <span className="article-xhs-avatar is-small">{avatarInitial}</span>
            )}
            <span>说点什么...</span>
          </button>
          <button type="button">
            <Heart size={24} />
            <span>点赞</span>
          </button>
          <button type="button">
            <Bookmark size={24} />
            <span>收藏</span>
          </button>
          <button type="button">
            <MessageCircle size={24} />
            <span>评论</span>
          </button>
        </footer>
        <span className="article-xhs-home-indicator" />
      </article>
    </div>
  );
}
