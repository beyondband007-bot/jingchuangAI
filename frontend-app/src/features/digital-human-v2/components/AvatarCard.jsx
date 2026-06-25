import React from "react";
import { isVideoCover } from "../utils";

export function AvatarCard({ avatar, selected, onSelect }) {
  const cover = avatar.cover;
  const isVideo = isVideoCover(cover);
  const tag = avatar.category || avatar.language || "数字人";

  return (
    <article className={`dhv2-avatar-card ${selected ? "is-selected" : ""}`}>
      <button
        type="button"
        className="dhv2-avatar-card__cover"
        onClick={() => onSelect?.(avatar)}
        aria-label={`选择 ${avatar.name}`}
      >
        {cover ? (
          isVideo ? (
            <video
              src={cover}
              poster={avatar.poster || undefined}
              muted
              playsInline
              preload="metadata"
            />
          ) : (
            <img src={cover} alt={avatar.name} loading="lazy" />
          )
        ) : (
          <span className="dhv2-avatar-card__placeholder" />
        )}
        <span className="dhv2-avatar-card__tag">{tag}</span>
      </button>
      <strong className="dhv2-avatar-card__name">{avatar.name}</strong>
    </article>
  );
}
