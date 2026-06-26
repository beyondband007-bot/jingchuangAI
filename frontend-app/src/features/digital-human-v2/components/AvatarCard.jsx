import React from "react";
import { getAvatarCategoryLabel, isVideoCover } from "../utils";
import { Play } from "lucide-react";

export function AvatarCard({
  avatar,
  selected,
  onSelect,
  variant = "default",
  showPlayIcon = false,
}) {
  const cover = avatar.cover;
  const isVideo = isVideoCover(cover);
  const category = getAvatarCategoryLabel(avatar);
  const overlayLabel =
    variant === "mine" ? `${avatar.name || "我的形象"} · ${category}` : category;

  return (
    <article
      className={`dhv2-avatar-card${selected ? " is-selected" : ""}${
        variant === "mine" ? " dhv2-avatar-card--mine" : ""
      }`}
    >
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
        {showPlayIcon ? (
          <span className="dhv2-avatar-card__play" aria-hidden="true">
            <Play size={18} fill="currentColor" />
          </span>
        ) : null}
        <span className="dhv2-avatar-card__tag">{overlayLabel}</span>
      </button>
      {variant === "default" ? (
        <strong className="dhv2-avatar-card__name">{avatar.name}</strong>
      ) : null}
    </article>
  );
}
