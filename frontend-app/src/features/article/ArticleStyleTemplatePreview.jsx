import React from "react";
import "./articleWorkbenchStyles/article-fresh-template-preview.css";

function parseRatio(ratio) {
  const [width, height] = String(ratio || "3:4")
    .split(":")
    .map(Number);

  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return { width: 3, height: 4, orientation: "portrait" };
  }

  return {
    width,
    height,
    orientation: width > height ? "landscape" : height > width ? "portrait" : "square",
  };
}

function buildPreviewSlots(items, cardIndex, imageCount) {
  const pool = items.length ? items : [];
  const count = Math.max(1, Math.min(Number(imageCount) || 1, 4));

  return Array.from({ length: count }, (_, slotIndex) => {
    const fallback = pool[cardIndex] || pool[0] || {};
    return pool[(slotIndex + cardIndex) % pool.length] || fallback;
  });
}

export function ArticleStyleTemplatePreview({
  items = [],
  onSelect,
  imageCount = 1,
  ratio = "3:4",
}) {
  const visibleItems = items.slice(0, 2);
  const ratioMeta = parseRatio(ratio);

  return (
    <div className="article-fresh-template-preview">
      <div className="article-fresh-template-preview__track">
        {visibleItems.map((item, cardIndex) => {
          const slots = buildPreviewSlots(items, cardIndex, imageCount);

          return (
            <figure
              className={`article-fresh-template-preview__card count-${slots.length} is-${ratioMeta.orientation}`}
              key={item.id}
            >
              <button
                aria-label={`选择${item.title || item.label || "视觉模板"}`}
                className="article-fresh-template-preview__button"
                type="button"
                onClick={() => onSelect?.(item.id)}
              >
                <span
                  className="article-fresh-template-preview__card-media"
                  style={{ "--template-preview-aspect": `${ratioMeta.width} / ${ratioMeta.height}` }}
                >
                  <span className="article-fresh-template-preview__mosaic">
                    {slots.map((slot, slotIndex) => (
                      <span
                        className="article-fresh-template-preview__slot"
                        key={`${item.id}-${slot.id || slot.image}-${slotIndex}`}
                      >
                        <img
                          src={slot.image || item.image}
                          alt={slot.label || slot.title || item.label}
                          loading="lazy"
                          draggable="false"
                        />
                      </span>
                    ))}
                  </span>
                </span>
              </button>
              <figcaption className="article-fresh-template-preview__copy">
                <strong>{item.title || item.label}</strong>
                <p>{item.summary}</p>
                {item.tags?.length > 0 && (
                  <div className="article-fresh-template-preview__tags">
                    {item.tags.map((tag) => (
                      <span key={tag}>#{tag}</span>
                    ))}
                  </div>
                )}
              </figcaption>
            </figure>
          );
        })}
      </div>
    </div>
  );
}
