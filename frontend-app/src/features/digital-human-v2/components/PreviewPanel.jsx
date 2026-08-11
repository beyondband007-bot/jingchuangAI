import React from "react";
import { HistoryEmptyState } from "../../../components/HistoryEmptyState";
import {
  Bot,
  Download,
  Loader2,
  RefreshCcw,
  Trash2,
  Undo2,
  X,
} from "lucide-react";
import {
  formatDraftTime,
  getAvatarTags,
  getVideoResolutionLabel,
  isVideoCover,
} from "../utils";

function GeneratingState({ task }) {
  return (
    <div className="dhv2-preview__generating">
      <Loader2 size={40} className="dhv2-spinner" />
      <strong>正在生成口播视频</strong>
      <p>{task?.avatarName || "数字人"} · {task?.progress || 0}%</p>
    </div>
  );
}

function DraftThumb({ draft }) {
  const cover = draft.avatar?.cover || draft.avatar?.poster;
  const coverIsVideo = isVideoCover(cover);

  if (!cover) {
    return (
      <span className="dhv2-preview__draft-thumb dhv2-preview__draft-thumb--empty">
        <Bot size={18} />
      </span>
    );
  }

  if (coverIsVideo) {
    return (
      <video
        className="dhv2-preview__draft-thumb"
        src={cover}
        poster={draft.avatar?.poster || undefined}
        muted
        playsInline
        preload="metadata"
      />
    );
  }

  return <img className="dhv2-preview__draft-thumb" src={cover} alt={draft.avatar?.name || ""} />;
}

export function PreviewPanel({
  selectedAvatar,
  activeTask,
  isSubmitting = false,
  onDeleteTask,
  onRegenerateTask,
  onReset,
  onSaveDraft,
  drafts = [],
  avatarSource,
  onApplyDraft,
  onDeleteDraft,
  onOpenAssets,
  scriptText,
  videoSpec,
}) {
  const cover = selectedAvatar?.cover;
  const coverIsVideo = isVideoCover(cover);
  const isProcessing =
    activeTask && !["completed", "failed"].includes(activeTask.status);
  const isGenerating = isSubmitting || isProcessing;
  const isFailed = activeTask?.status === "failed";
  const resultUrl = !isGenerating ? activeTask?.resultUrl : null;
  const displayScript = (activeTask?.text || scriptText || "").trim();
  const resolutionLabel = getVideoResolutionLabel(videoSpec);
  const canApplyDraft = avatarSource === "official";
  const generatingProgress = isSubmitting ? 0 : activeTask?.progress || 0;
  const avatarTags = selectedAvatar ? getAvatarTags(selectedAvatar) : [];
  const showAvatarMeta = avatarSource === "official" && selectedAvatar?.name;
  const avatarSourceLabel = avatarSource === "mine" ? "我的形象" : "官方形象";
  const generatingTask = {
    avatarName: activeTask?.avatarName || selectedAvatar?.name || "数字人",
    progress: generatingProgress,
  };

  return (
    <main
      className={`dhv2-preview${isGenerating ? " dhv2-preview--generating" : ""}`}
      aria-label="预览区"
    >
      <header className="dhv2-preview__top">
          <div className="dhv2-preview__toolbar">
          <div className="dhv2-preview__title-group">
            <h2>{avatarSourceLabel} | {resolutionLabel}</h2>
            {showAvatarMeta ? (
              <div className="dhv2-preview__avatar-meta">
                <strong>{selectedAvatar.name}</strong>
                <span className="dhv2-preview__avatar-tags">
                  {avatarTags.map((tag) => (
                    <span key={tag}>{tag}</span>
                  ))}
                </span>
              </div>
            ) : null}
            {isGenerating ? (
              <span className="dhv2-preview__status">
                {isSubmitting ? "提交中..." : `生成中 ${generatingProgress}%`}
              </span>
            ) : activeTask ? (
              <span className="dhv2-preview__status">
                {isFailed ? "失败" : "完成"}
              </span>
            ) : null}
          </div>
          <div className="dhv2-preview__top-actions">
            <button
              type="button"
              aria-label="返回并重置"
              title="返回编辑并恢复默认配置"
              onClick={() => onReset?.()}
            >
              <Undo2 size={15} />
            </button>
            <button
              type="button"
              className="dhv2-preview__asset-btn"
              title="打开我的资产"
              onClick={() => onOpenAssets?.()}
            >
              我的资产
            </button>
          </div>
        </div>

        <section className="dhv2-preview__info">
          <p className="dhv2-preview__script-line">
            <span className="dhv2-preview__label">口播文案</span>
            <span className="dhv2-preview__script-text">
              {displayScript || "暂无，左侧填写后会同步显示"}
            </span>
          </p>
        </section>
      </header>

      <div className="dhv2-preview__media">
        {isGenerating ? (
          <GeneratingState task={generatingTask} />
        ) : resultUrl ? (
          <video src={resultUrl} controls playsInline preload="metadata" />
        ) : isFailed ? (
          <HistoryEmptyState
            className="dhv2-preview__empty"
            title="生成失败"
            compact
            borderless
          />
        ) : selectedAvatar && cover ? (
          coverIsVideo ? (
            <video
              src={cover}
              poster={selectedAvatar.poster || undefined}
              controls
              playsInline
              preload="metadata"
            />
          ) : (
            <img src={cover} alt={selectedAvatar.name} />
          )
        ) : (
          <HistoryEmptyState
            className="dhv2-preview__empty"
            title="尚未生成数字人视频"
            compact
            borderless
          />
        )}
      </div>

      {activeTask && activeTask.status === "completed" && resultUrl && !isGenerating ? (
        <footer className="dhv2-preview__actions">
          <button type="button" onClick={() => onRegenerateTask?.(activeTask.id)} aria-label="重新生成">
            <RefreshCcw size={18} />
          </button>
          <a href={resultUrl} download target="_blank" rel="noreferrer" aria-label="下载">
            <Download size={18} />
          </a>
          <button type="button" onClick={() => onDeleteTask?.(activeTask.id)} aria-label="删除">
            <Trash2 size={18} />
          </button>
        </footer>
      ) : null}

      {!isGenerating ? (
        <footer className="dhv2-preview__drafts">
          <div className="dhv2-preview__drafts-head">
            <strong>草稿</strong>
            <span>{drafts.length ? `共 ${drafts.length} 条` : "暂无草稿"}</span>
          </div>
          {drafts.length ? (
            <div className="dhv2-preview__draft-list" role="list">
              {drafts.map((draft) => {
                const scriptPreview = (draft.text || "").trim();
                const voiceLabel = draft.voiceName || "默认音色";
                return (
                  <article
                    key={draft.id}
                    className={`dhv2-preview__draft-item${canApplyDraft ? "" : " is-disabled"}`}
                    role="listitem"
                  >
                    <button
                      type="button"
                      className="dhv2-preview__draft-main"
                      onClick={() => onApplyDraft?.(draft)}
                      aria-label={`恢复草稿 ${draft.avatar?.name || "未命名形象"}`}
                    >
                      <DraftThumb draft={draft} />
                      <div className="dhv2-preview__draft-meta">
                        <strong>{draft.avatar?.name || "未命名形象"}</strong>
                        <p>{scriptPreview || "暂无配音内容"}</p>
                        <span>
                          {voiceLabel} · {Number(draft.voiceSpeed || 1).toFixed(1)}x ·{" "}
                          {formatDraftTime(draft.createdAt)}
                        </span>
                      </div>
                    </button>
                    <button
                      type="button"
                      className="dhv2-preview__draft-remove"
                      aria-label="删除草稿"
                      onClick={(event) => {
                        event.stopPropagation();
                        onDeleteDraft?.(draft.id);
                      }}
                    >
                      <X size={14} />
                    </button>
                  </article>
                );
              })}
            </div>
          ) : (
            <p className="dhv2-preview__draft-empty">
              点击顶部复制按钮，可将左侧配置保存为草稿
            </p>
          )}
          {!canApplyDraft && drafts.length ? (
            <p className="dhv2-preview__draft-hint">切换到官方形象后可点击草稿恢复配置</p>
          ) : null}
        </footer>
      ) : null}
    </main>
  );
}
