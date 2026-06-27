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
              aria-label="选择该视觉模板"
              className="article-fresh-template-preview__button"
              type="button"
              onClick={() => onSelect?.(item.id)}
            >
              <span className="article-fresh-template-preview__card-media">
                <img src={item.image} alt={item.label} loading="lazy" draggable="false" />
              </span>
            </button>
          </figure>
        ))}
      </div>
    </div>
  );
}
