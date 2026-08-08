import React from "react";
import { isVideoCover } from "../utils";
import { Pencil, Play, Trash2 } from "lucide-react";

export function AvatarCard({
  avatar,
  selected,
  onSelect,
  variant = "default",
  showPlayIcon = false,
  onRename,
  onDelete,
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
      {variant === "mine" ? (
        <div className="dhv2-avatar-card__actions">
          <button type="button" aria-label={`修改${name}名称`} onClick={() => onRename?.(avatar)}>
            <Pencil size={14} />
          </button>
          <button type="button" aria-label={`删除${name}`} onClick={() => onDelete?.(avatar)}>
            <Trash2 size={14} />
          </button>
        </div>
      ) : null}
    </article>
  );
}
