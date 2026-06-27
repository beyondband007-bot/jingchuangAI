import React from "react";

export function ArticleStyleTemplatePreview({ items }) {
  return (
    <div className="article-fresh-template-preview">
      <div className="article-fresh-template-preview__track">
        {items.map((item) => (
          <figure className="article-fresh-template-preview__card" key={item.id}>
            <div className="article-fresh-template-preview__card-media">
              <img src={item.image} alt={item.label} loading="lazy" draggable="false" />
            </div>
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
