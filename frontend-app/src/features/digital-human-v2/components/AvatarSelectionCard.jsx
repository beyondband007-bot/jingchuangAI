import React from "react";
import { Drama, UserRound } from "lucide-react";
import {
  getAvatarTags,
  isVideoCover,
} from "../utils";

export function AvatarSelectionCard({
  selectedAvatar,
}) {
  const cover = selectedAvatar?.cover;
  const isVideo = isVideoCover(cover);
  const tags = selectedAvatar ? getAvatarTags(selectedAvatar) : [];

  return (
    <section className="dhv2-card dhv2-avatar-card-panel" aria-label="选择形象">
      <header className="dhv2-card__head">
        <h2>选择官方形象</h2>
      </header>

      <div className={`dhv2-avatar-preview ${selectedAvatar ? "has-avatar" : ""}`}>
        {selectedAvatar ? (
          <>
            <div className="dhv2-avatar-preview__media">
              {cover ? (
                isVideo ? (
                  <video
                    src={cover}
                    poster={selectedAvatar.poster || undefined}
                    muted
                    playsInline
                    controls
                  />
                ) : (
                  <img src={cover} alt={selectedAvatar.name} />
                )
              ) : (
                <div className="dhv2-avatar-preview__empty">
                  <UserRound size={40} />
                </div>
              )}
            </div>

            <div className="dhv2-avatar-preview__summary">
              <strong>{selectedAvatar.name}</strong>
              <div className="dhv2-avatar-preview__tags">
                {tags.map((tag) => (
                  <span key={tag}>{tag}</span>
                ))}
              </div>
            </div>

            <p className="dhv2-avatar-preview__official-hint">
              选择形象后，可在下方配置系统音色
            </p>
          </>
        ) : (
          <div className="dhv2-avatar-preview__placeholder">
            <Drama size={36} />
            <p>选择形象后，可在此配置配音及口型</p>
          </div>
        )}
      </div>
    </section>
  );
}
