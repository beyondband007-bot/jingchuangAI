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
          </figure>
        ))}
      </div>
    </div>
  );
}
