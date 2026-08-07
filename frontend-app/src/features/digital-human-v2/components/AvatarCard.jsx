import React from "react";
import { isVideoCover } from "../utils";
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
  const isAiCustom = String(cover || "").includes("/digital-human/avatars/ai/");
  const name = avatar.name || (isAiCustom ? "AI 定制形象" : "我的形象");

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
        aria-label={`选择${name}`}
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
            <img src={cover} alt={name} loading="lazy" />
          )
        ) : (
          <span className="dhv2-avatar-card__placeholder" />
        )}
        {showPlayIcon ? (
          <span className="dhv2-avatar-card__play" aria-hidden="true">
            <Play size={18} fill="currentColor" />
          </span>
        ) : null}
      </button>
      {variant === "default" ? (
        <strong className="dhv2-avatar-card__name">{name}</strong>
      ) : null}
    </article>
  );
}
