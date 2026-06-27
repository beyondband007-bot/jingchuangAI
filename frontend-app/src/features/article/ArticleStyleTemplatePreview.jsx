import React from "react";

export function ArticleStyleTemplatePreview({ items, selectedId, onSelect }) {
  return (
    <div className="article-fresh-template-preview">
      <div className="article-fresh-template-preview__track">
        {items.map((item) => (
          <figure
            className={`article-fresh-template-preview__card${
              item.id === selectedId ? " is-selected" : ""
            }`}
            key={item.id}
          >
            <button
              aria-label={`选择${item.title || item.label || "视觉模板"}`}
              className="article-fresh-template-preview__button"
              type="button"
              onClick={() => onSelect?.(item.id)}
            >
              <span className="article-fresh-template-preview__card-media">
                <img src={item.image} alt={item.label} loading="lazy" draggable="false" />
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
        ))}
      </div>
    </div>
  );
}
