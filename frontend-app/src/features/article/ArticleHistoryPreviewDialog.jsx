import { useEffect, useRef, useState } from "react";
import { Copy, Download, X } from "lucide-react";
import { ArticleFullPreviewMedia } from "./ArticleFullPreviewMedia";
import { ArticleXhsNotePreview } from "./ArticleXhsNotePreview";
import {
  buildArticleBodyCopy,
  copyTextToClipboard,
  getArticleImages,
} from "./articlePreviewUtils";
import { formatBeijingDateTime } from "../../utils/time";

export function ArticleHistoryPreviewDialog({ task, onClose, authUser }) {
  const [previewMode, setPreviewMode] = useState("full");
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [copiedField, setCopiedField] = useState(null);
  const copyTextTimerRef = useRef(null);
  const images = getArticleImages(task);
  const prompt = task?.prompt || "暂无提示词";
  const articleTitle = task?.copy?.title || task?.title || "AI 图文创作";
  const articleBody = task?.copy?.body || prompt;
  const articleTags = Array.isArray(task?.copy?.tags) ? task.copy.tags : [];
  const activeImage = images[activeImageIndex] || images[0];
  const createdAt =
    formatBeijingDateTime(task?.createdAt || task?.created_at || task?.time) ||
    "刚刚";

  useEffect(() => {
    setPreviewMode("full");
    setActiveImageIndex(0);
    setCopiedField(null);
  }, [task?.id]);

  useEffect(() => {
    if (!images.length) return undefined;
    function handleKeyDown(event) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      if (copyTextTimerRef.current) {
        window.clearTimeout(copyTextTimerRef.current);
      }
    };
  }, [onClose, images.length]);

  function markCopiedField(field) {
    setCopiedField(field);
    if (copyTextTimerRef.current) {
      window.clearTimeout(copyTextTimerRef.current);
    }
    copyTextTimerRef.current = window.setTimeout(() => setCopiedField(null), 1600);
  }

  async function copyArticleTitle() {
    if (!articleTitle) return;
    await copyTextToClipboard(articleTitle);
    markCopiedField("title");
  }

  async function copyArticleBody() {
    const text = buildArticleBodyCopy(articleBody, articleTags);
    if (!text) return;
    await copyTextToClipboard(text);
    markCopiedField("body");
  }

  if (!images.length) return null;

  return (
    <div
      className="fm-detail-modal-backdrop article-detail-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="爆款图文详情"
    >
      <button
        className="fm-detail-modal-shade"
        type="button"
        onClick={onClose}
        aria-label="关闭详情"
      />
      <section className={`article-history-preview-dialog is-${previewMode}`}>
        <div className="article-history-preview-tabs" aria-label="历史图文预览模式">
          <button
            className={previewMode === "full" ? "is-active" : ""}
            type="button"
            onClick={() => setPreviewMode("full")}
          >
            全文预览
          </button>
          <button
            className={previewMode === "cover" ? "is-active" : ""}
            type="button"
            onClick={() => {
              setActiveImageIndex(0);
              setPreviewMode("cover");
            }}
          >
            封面预览
          </button>
        </div>
        <button
          className="article-history-preview-close"
          type="button"
          onClick={onClose}
          aria-label="关闭详情"
        >
          <X size={20} />
        </button>

        {previewMode === "full" ? (
          <div className="article-history-full-preview">
            <ArticleFullPreviewMedia
              images={images}
              ratioFallback={task?.ratio}
              title={articleTitle}
              activeIndex={activeImageIndex}
              onActiveIndexChange={setActiveImageIndex}
            />
            <article className="article-history-full-copy">
              <div className="article-history-full-copy-head">
                <span className="article-history-preview-kicker">爆款图文</span>
                <button type="button" onClick={copyArticleTitle}>
                  <Copy size={15} />
                  {copiedField === "title" ? "已复制" : "复制标题"}
                </button>
              </div>
              <h2>{articleTitle}</h2>
              <div className="article-history-full-body">
                {articleBody
                  .split(/\n+/)
                  .filter(Boolean)
                  .map((paragraph, index) => (
                    <p key={`${paragraph}-${index}`}>{paragraph}</p>
                  ))}
              </div>
              {articleTags.length > 0 && (
                <div className="article-history-preview-tags">
                  {articleTags.map((tag) => (
                    <span key={tag}>#{tag}</span>
                  ))}
                </div>
              )}
              <div className="article-history-full-footer">
                <div className="article-history-full-footer-actions">
                  <button
                    type="button"
                    className="article-history-full-copy-btn"
                    onClick={copyArticleBody}
                  >
                    <Copy size={15} />
                    {copiedField === "body" ? "已复制" : "复制正文"}
                  </button>
                  <a href={activeImage.image} download>
                    <Download size={16} />
                    下载图片
                  </a>
                </div>
              </div>
            </article>
          </div>
        ) : (
          <ArticleXhsNotePreview
            images={images}
            title={articleTitle}
            body={articleBody}
            tags={articleTags}
            createdAt={createdAt}
            authorName={authUser?.displayName || authUser?.username || "Facemini AI"}
            activeIndex={activeImageIndex}
            onActiveIndexChange={setActiveImageIndex}
            ratioFallback={task?.ratio}
          />
        )}
      </section>
    </div>
  );
}
