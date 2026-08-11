import { useEffect, useId, useRef, useState } from "react";
import { Download, Loader2, Play, RefreshCcw, Star, Trash2 } from "lucide-react";
import { LazyPreviewVideo } from "../../components/LazyPreviewVideo";
import { formatBeijingDateTime } from "../../utils/time";
import { getFrontendModelDisplayName } from "../../utils/modelDisplayNames.js";
import { FaceminiInspirationModal } from "../image/FaceminiInspirationModal";
import "./videoCards.css";

export function VideoPreview({ task, onOpen }) {
  const isProcessing =
    task.status === "pending" || task.status === "processing";
  const isFailed = task.status === "failed";

  if (task.video && !isFailed) {
    return (
      <button
        className="video-preview-open"
        type="button"
        onClick={() => onOpen?.(task)}
        aria-label="查看视频详情"
      >
        <video
          src={task.video}
          muted
          playsInline
          preload="metadata"
        />
        <span className="video-preview-play">
          <Play size={18} fill="currentColor" />
        </span>
      </button>
    );
  }

  return (
    <div className={`video-placeholder ${isFailed ? "is-failed" : ""}`}>
      {isProcessing ? (
        <Loader2 size={24} />
      ) : (
        <Play size={34} fill="currentColor" />
      )}
      {(isFailed || isProcessing) && (
        <span>{isFailed ? "生成失败" : "生成中"}</span>
      )}
    </div>
  );
}

function normalizeVideoResultMessage(card) {
  const message = String(card?.error || "").trim();
  if (
    /copyright/i.test(message) ||
    /版权/.test(message) ||
    /明确 IP|标志性设定/.test(message)
  ) {
    return "AI模型判断提示词可能涉及版权问题，请调整后再上传";
  }
  return message || card?.prompt || "";
}

function hasVideoReferenceImage(card) {
  if (card?.referenceImageUrl || card?.firstFrameImageUrl) return true;
  if (Array.isArray(card?.referenceImageUrls)) {
    return card.referenceImageUrls.some((url) => Boolean(String(url || "").trim()));
  }
  return false;
}

function getVideoGenerationTypeLabel(card) {
  return hasVideoReferenceImage(card) ? "图生视频" : "文生视频";
}

function VideoResultPrompt({ text }) {
  const [isOpen, setIsOpen] = useState(false);
  const wrapRef = useRef(null);
  const bubbleId = useId();

  useEffect(() => {
    if (!isOpen) return undefined;

    function handlePointerDown(event) {
      if (!wrapRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") setIsOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  if (!text) {
    return (
      <div className="video-result-prompt-wrap">
        <p className="video-result-prompt" />
      </div>
    );
  }

  return (
    <div
      ref={wrapRef}
      className={`video-result-prompt-wrap has-tooltip${isOpen ? " is-open" : ""}`}
    >
      <button
        type="button"
        className="video-result-prompt"
        aria-expanded={isOpen}
        aria-controls={bubbleId}
        onClick={() => setIsOpen((open) => !open)}
      >
        {text}
      </button>
      <div
        id={bubbleId}
        className="video-result-prompt-bubble"
        role="tooltip"
        aria-hidden={!isOpen}
      >
        {text}
      </div>
    </div>
  );
}

export function VideoResultCard({
  card,
  onDelete,
  onFavorite,
  onRegenerate,
  onOpen,
  isExample = false,
}) {
  const isCompleted = card.status === "completed" && Boolean(card.video);
  const isFailed = card.status === "failed";
  const canUseCompletedActions = !isExample && isCompleted;
  const canRetryOrDelete = !isExample && (isCompleted || isFailed);
  const promptText = normalizeVideoResultMessage(card);
  const generationTypeLabel = getVideoGenerationTypeLabel(card);
  return (
    <article
      className={`result-card video-result-card status-${card.status} ${isExample ? "is-example" : ""}`}
    >
      <div className="result-preview video-result-preview">
        <VideoPreview task={card} onOpen={isCompleted ? onOpen : undefined} />
        <span className="video-duration-badge">{card.duration}s</span>
      </div>
      <div className="result-meta">
        <div className="tag-row">
          <span className="model-tag">
            {getFrontendModelDisplayName(card.model)}
          </span>
          <span className="ratio-tag">{card.ratio}</span>
          <span className="quality-tag">{card.duration}秒</span>
          <span className="count-tag">{generationTypeLabel}</span>
        </div>
        <div className="time-row">
          <span>
            {formatBeijingDateTime(
              card.createdAt || card.created_at || card.time,
            ) || card.time}
          </span>
        </div>
        <VideoResultPrompt text={promptText} />
        <div className="card-actions">
          <button
            className={`icon-circle ${card.favorite ? "is-favorite" : ""}`}
            type="button"
            onClick={() => onFavorite(card.id)}
            aria-label="收藏"
            disabled={!canUseCompletedActions}
          >
            <Star size={17} fill={card.favorite ? "#f8d545" : "none"} />
          </button>
          {canUseCompletedActions ? (
            <a className="card-action-link" href={card.video} download>
              <Download size={15} />
              下载
            </a>
          ) : (
            <button type="button" disabled>
              <Download size={15} />
              下载
            </button>
          )}
          <button
            type="button"
            onClick={() => onRegenerate(card.id)}
            disabled={!canRetryOrDelete}
          >
            <RefreshCcw size={15} />
            再次生成
          </button>
          <button
            type="button"
            onClick={() => onDelete(card.id)}
            disabled={!canRetryOrDelete}
          >
            <Trash2 size={15} />
            删除
          </button>
        </div>
      </div>
    </article>
  );
}

export function VideoInspirationCard({ item, onOpen }) {
  return (
    <button
      className="video-inspiration-card"
      type="button"
      style={{ "--video-inspiration-aspect": item.aspect || 16 / 9 }}
      onClick={() => onOpen(item)}
    >
      <span className="video-inspiration-media">
        <img
          src={item.poster}
          alt={item.title}
          loading="lazy"
          decoding="async"
          fetchPriority="low"
        />
        <LazyPreviewVideo src={item.preview} />
      </span>
    </button>
  );
}

export function VideoInspirationModal({
  item,
  getInitialFavorite,
  onClose,
  onRemix,
  onFavorite,
  onReferencePoster,
}) {
  if (!item) return null;
  return (
    <FaceminiInspirationModal
      getInitialFavorite={getInitialFavorite}
      item={{
        ...item,
        mediaType: "video",
        category: "视频灵感",
        image: item.poster,
        material: item.feature || "视频素材",
      }}
      onClose={onClose}
      onRemix={onRemix}
      onFavorite={onFavorite}
      onReference={(nextItem) => onReferencePoster?.(nextItem)}
    />
  );
}

export function VideoTaskDetailModal({
  task,
  getInitialFavorite,
  onClose,
  onRemix,
  onReference,
  onFavorite,
}) {
  if (!task) return null;
  return (
    <FaceminiInspirationModal
      getInitialFavorite={getInitialFavorite}
      item={{
        ...task,
        id: task.id,
        title: task.title || "视频生成记录",
        category: "视频灵感",
        mediaType: "video",
        videoSrc: task.video,
        video: task.video,
        image: task.poster || task.cover || task.thumbnail || task.referenceImageUrl,
        poster: task.poster || task.cover || task.thumbnail || task.referenceImageUrl,
        ratio: task.ratio || "16:9",
        model: task.model || task.modelKey || "Seedance 2.0",
        material: "历史生成",
        prompt: task.prompt,
        favorite: Boolean(task.favorite),
      }}
      onClose={onClose}
      onRemix={() => onRemix?.(task)}
      onReference={() => onReference?.(task)}
      onFavorite={onFavorite ? () => onFavorite(task) : undefined}
    />
  );
}
