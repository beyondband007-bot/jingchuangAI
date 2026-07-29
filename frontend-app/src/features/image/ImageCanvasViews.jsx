import { useEffect, useState } from "react";
import {
  CheckCircle2,
  Download,
  Loader2,
  RefreshCcw,
  Sparkles,
  Star,
  Trash2,
} from "lucide-react";
import { formatBeijingDateTime } from "../../utils/time";
import { FaceminiInspirationModal } from "./FaceminiInspirationModal";
import "../history/historyRail.css";

export function ExampleCanvas({ exampleImages }) {
  return (
    <div className="image-canvas example-canvas" aria-label="图片生成案例">
      <div className="example-canvas-copy">
        <span>图片生成</span>
        <h1>选择一个方向，或直接输入你的图片描述</h1>
      </div>
      <div className="example-card-grid">
        {exampleImages.map((item) => (
          <button className="example-card" key={item.src} type="button">
            <span className="example-card-preview">
              <img src={item.src} alt={item.label} />
            </span>
            <span className="example-card-tags">
              <span>{item.model}</span>
              <span>{item.ratio}</span>
              <span>{item.quality}</span>
            </span>
            <span className="example-card-meta">
              <span>{item.label}</span>
              <strong>{item.price}</strong>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function ImageGeneratingSpinner({ size = 32, className = "" }) {
  return (
    <img
      className={["image-generating-spinner", className].filter(Boolean).join(" ")}
      src="/assets/svg/脸谱facemini定(1).svg"
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      style={{ width: size, height: size }}
    />
  );
}

function GeneratingCanvas({ prompt }) {
  return (
    <div className="image-canvas chat-canvas" aria-live="polite">
      <div className="chat-thread">
        {prompt && (
          <div className="chat-row user">
            <div className="chat-bubble">{prompt}</div>
          </div>
        )}
        <div className="chat-row assistant">
          <div className="assistant-avatar">
            <Sparkles size={17} />
          </div>
          <div className="chat-bubble waiting">
            <div className="chat-waiting-title">
              <ImageGeneratingSpinner size={28} />
              <span>已收到你的请求，正在为你生成图片</span>
            </div>
            <div className="chat-waiting-card">
              <span />
              <span />
              <span />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ImageGeneratingFeedState({ prompt }) {
  return (
    <div
      className="image-generating-feed-state"
      role="status"
      aria-live="polite"
    >
      <div className="image-generating-orbit" aria-hidden="true">
        <ImageGeneratingSpinner size={48} />
      </div>
      <div>
        <strong>图片正在生成中</strong>
        <p>
          {prompt
            ? `正在处理：“${prompt}”`
            : "已收到你的请求，正在为你生成图片。"}
        </p>
      </div>
    </div>
  );
}

export function ImageCompletedNotice({ task, onReveal }) {
  if (!task?.image) return null;

  return (
    <button
      className="image-completed-notice"
      type="button"
      onClick={() => onReveal(task)}
      aria-label="查看生成结果"
    >
      <div className="image-completed-mark" aria-hidden="true">
        <CheckCircle2 size={32} />
      </div>
      <div>
        <strong>生图已完成，点击查看结果</strong>
        <p>{task.prompt}</p>
      </div>
    </button>
  );
}

function CompletedCanvas({ task, onPreview }) {
  return (
    <div className="image-canvas chat-canvas">
      <div className="chat-thread">
        <div className="chat-row user">
          <div className="chat-bubble">{task.prompt}</div>
        </div>
        <div className="chat-row assistant">
          <div className="assistant-avatar">
            <CheckCircle2 size={17} />
          </div>
          <div className="chat-bubble result">
            <span>已为你生成图片</span>
            <button
              className="chat-result-image"
              type="button"
              onClick={() => onPreview(task)}
              aria-label="查看生成图片"
            >
              <img src={task.imageUrl || task.image} alt={task.prompt} />
            </button>
            <div className="chat-result-actions">
              <a href={task.imageUrl || task.image} download>
                <Download size={15} />
                下载
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FailedCanvas({ task, prompt, error, onRetry }) {
  const message = task?.error || error || "图片生成遇到问题，请稍后重试。";

  return (
    <div className="image-canvas chat-canvas" role="status">
      <div className="chat-thread">
        {(task?.prompt || prompt) && (
          <div className="chat-row user">
            <div className="chat-bubble">{task?.prompt || prompt}</div>
          </div>
        )}
        <div className="chat-row assistant">
          <div className="assistant-avatar error">
            <Sparkles size={17} />
          </div>
          <div className="chat-bubble failed">
            <strong>这次没有生成成功</strong>
            <p>{message}</p>
            {task && (
              <button type="button" onClick={() => onRetry(task.id)}>
                <RefreshCcw size={17} />
                再次生成
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function ImageWorkspaceCanvas({
  status,
  selectedTask,
  activePrompt,
  submitError,
  exampleImages,
  onRetry,
  onPreview,
}) {
  if (status === "generating") {
    return <GeneratingCanvas prompt={selectedTask?.prompt || activePrompt} />;
  }

  if (status === "completed" && selectedTask?.image) {
    return <CompletedCanvas task={selectedTask} onPreview={onPreview} />;
  }

  if (status === "failed") {
    return (
      <FailedCanvas
        task={selectedTask}
        prompt={activePrompt}
        error={submitError}
        onRetry={onRetry}
      />
    );
  }

  return <ExampleCanvas exampleImages={exampleImages} />;
}

export function PreviewDrawer({ task, onClose }) {
  const previewUrl = task?.imageUrl || task?.image;
  if (!previewUrl) return null;

  return (
    <aside className="preview-drawer" aria-label="生成图片预览画布">
      <div className="preview-drawer-header">
        <div>
          <span>预览</span>
          <strong>{task.prompt}</strong>
        </div>
        <button type="button" onClick={onClose} aria-label="关闭预览">
          关闭
        </button>
      </div>
      <div className="preview-drawer-stage">
        <img src={previewUrl} alt={task.prompt} />
      </div>
      <div className="preview-drawer-actions">
        <a href={previewUrl} download>
          <Download size={16} />
          下载
        </a>
      </div>
    </aside>
  );
}

export function ImagePreviewLightbox({
  task,
  getInitialFavorite,
  onClose,
  onCopyPrompt,
  onRemix,
  onReference,
  onFavorite,
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setCopied(false);
  }, [task?.id]);

  const previewUrl = task?.hdSrc || task?.imageUrl || task?.image;
  const fallbackUrl = task?.hdFallbackSrc;

  useEffect(() => {
    if (!previewUrl) return undefined;
    function handleKeyDown(event) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose, previewUrl]);

  if (!previewUrl) return null;

  async function copyPrompt() {
    await onCopyPrompt?.(task);
    setCopied(true);
  }

  return (
    <FaceminiInspirationModal
      getInitialFavorite={getInitialFavorite}
      item={{
        id: task.id,
        title: task.title || "AI 图片创作",
        category: "图片灵感",
        prompt: task.prompt,
        image: previewUrl,
        imageUrl: previewUrl,
        hdSrc: previewUrl,
        hdFallbackSrc: fallbackUrl,
        ratio: task.ratio,
        width: task.width,
        height: task.height,
        resolution: task.resolution,
        model: task.model || task.modelKey || "Kling Image",
        material: "高清原图",
        favorite: Boolean(task.favorite),
      }}
      onClose={onClose}
      onRemix={() => onRemix?.(task)}
      onReference={() => onReference?.(task)}
      onFavorite={onFavorite ? () => onFavorite(task) : undefined}
      onCopyPrompt={copyPrompt}
      copied={copied}
    />
  );
}

export function HistoryRail({
  cards,
  selectedTaskId,
  onSelect,
  onDelete,
  onFavorite,
  onRegenerate,
}) {
  if (!cards.length) return null;

  return (
    <aside className="history-rail" aria-label="图片生成历史">
      <div className="history-rail-header">
        <span>历史结果</span>
        <strong>{cards.length}</strong>
      </div>
      <div className="history-list">
        {cards.map((card) => {
          const isSelected = selectedTaskId === card.id;
          const isProcessing =
            card.status === "pending" || card.status === "processing";
          const isFailed = card.status === "failed";
          const isCompleted = card.status === "completed" && Boolean(card.image);
          const canUseCompletedActions = isCompleted;
          const canRetryOrDelete = isCompleted || isFailed;

          return (
            <article
              className={`history-item ${isSelected ? "is-selected" : ""} status-${card.status}`}
              key={card.id}
            >
              <button
                className="history-preview"
                type="button"
                onClick={() => onSelect(card.id)}
                aria-label={`查看 ${card.prompt}`}
              >
                {card.image && !isFailed ? (
                  <img src={card.image} alt={card.prompt} />
                ) : null}
                {isProcessing && (
                  <span className="history-processing">
                    <Loader2 size={18} />
                  </span>
                )}
                {isFailed && <span className="history-failed">失败</span>}
                {!card.image && !isProcessing && !isFailed && (
                  <span className="broken-image-mark" aria-hidden="true" />
                )}
              </button>
              <div className="history-meta">
                <button
                  className="history-title"
                  type="button"
                  onClick={() => onSelect(card.id)}
                >
                  {card.prompt}
                </button>
                <div className="history-tags">
                  <span>{card.ratio}</span>
                  <span>{card.quality}</span>
                  <span>
                    {formatBeijingDateTime(
                      card.createdAt || card.created_at || card.time,
                    ) || card.time}
                  </span>
                </div>
                <div className="history-actions">
                  <button
                    type="button"
                    onClick={() => onFavorite(card.id)}
                    aria-label="收藏"
                    disabled={!canUseCompletedActions}
                  >
                    <Star size={15} fill={card.favorite ? "#f8d545" : "none"} />
                  </button>
                  {canUseCompletedActions ? (
                    <a
                      href={card.imageUrl || card.image}
                      download
                      aria-label="下载图片"
                    >
                      <Download size={15} />
                    </a>
                  ) : (
                    <button type="button" aria-label="下载图片" disabled>
                      <Download size={15} />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onRegenerate(card.id)}
                    aria-label="再次生成"
                    disabled={!canRetryOrDelete}
                  >
                    <RefreshCcw size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(card.id)}
                    aria-label="删除"
                    disabled={!canRetryOrDelete}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </aside>
  );
}
