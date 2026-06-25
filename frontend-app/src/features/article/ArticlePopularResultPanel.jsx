import React from "react";
import { Button, Tag } from "@arco-design/web-react";
import { CircleAlert, Copy, Download, RefreshCcw } from "lucide-react";
import { ArticleXhsNotePreview } from "./ArticleXhsNotePreview";

export function ArticlePopularResultPanel({
  hasFailedArticle,
  hasCompletedArticle,
  resultViewMode,
  onChangeResultViewMode,
  activePreviewIndex,
  onActivePreviewIndexChange,
  selectedTask,
  submitError,
  onRequestRegenerate,
  formatArticleError,
  previewImages,
  draftCopy,
  resultCreatedAt,
  onCopyArticleTitle,
  onCopyArticleBody,
  onDownloadImagesAsZip,
  authorName,
  FullPreviewMedia,
}) {
  const titleText = draftCopy?.title || "未生成标题";
  const bodyText = draftCopy?.body || "";
  const tags = draftCopy?.tags || [];

  return (
    <div className="article-popular-result-panel">
      <div className="article-popular-result-panel__card">
        <div
          className="article-popular-result-panel__view-toggle"
          role="tablist"
          aria-label="预览模式"
        >
          <Button
            type={resultViewMode === "full" ? "primary" : "outline"}
            shape="round"
            size="small"
            role="tab"
            aria-selected={resultViewMode === "full"}
            onClick={() => {
              onActivePreviewIndexChange(0);
              onChangeResultViewMode("full");
            }}
          >
            全文模式
          </Button>
          <Button
            type={resultViewMode === "cover" ? "primary" : "outline"}
            shape="round"
            size="small"
            role="tab"
            aria-selected={resultViewMode === "cover"}
            onClick={() => {
              onActivePreviewIndexChange(0);
              onChangeResultViewMode("cover");
            }}
          >
            笔记预览
          </Button>
        </div>

        {hasFailedArticle && (
          <div className="article-popular-result-panel__failed" role="alert">
            <CircleAlert size={26} />
            <div>
              <strong>图片生成失败</strong>
              <p>
                {formatArticleError(
                  selectedTask?.error || submitError,
                  "本次生成没有成功，请调整模型、比例或稍后重试。",
                )}
              </p>
            </div>
            <Button
              type="primary"
              status="danger"
              icon={<RefreshCcw size={15} />}
              onClick={() => onRequestRegenerate(selectedTask)}
            >
              重新生成
            </Button>
          </div>
        )}

        {hasCompletedArticle && (
          <>
            {resultViewMode === "full" && (
              <section className="article-popular-result-panel__full-layout">
                <FullPreviewMedia
                  variant="popular"
                  images={previewImages}
                  ratioFallback={selectedTask?.ratio}
                  title={titleText}
                  activeIndex={activePreviewIndex}
                  onActiveIndexChange={onActivePreviewIndexChange}
                  stacked
                />
                <article className="article-popular-result-panel__copy">
                  <div className="article-popular-result-panel__copy-row">
                    <strong>标题内容：</strong>
                    <Button
                      type="outline"
                      size="mini"
                      icon={<Copy size={15} />}
                      onClick={onCopyArticleTitle}
                    >
                      复制标题
                    </Button>
                  </div>
                  <h2>{titleText}</h2>
                  <div className="article-popular-result-panel__copy-row">
                    <strong>正文内容：</strong>
                    <Button
                      type="outline"
                      size="mini"
                      icon={<Copy size={15} />}
                      onClick={onCopyArticleBody}
                    >
                      复制正文
                    </Button>
                  </div>
                  <div className="article-popular-result-panel__body">
                    {bodyText
                      .split(/\n+/)
                      .filter(Boolean)
                      .map((paragraph, index) => (
                        <p key={`${paragraph}-${index}`}>{paragraph}</p>
                      ))}
                  </div>
                  <div className="article-popular-result-panel__tags">
                    {tags.map((tag) => (
                      <Tag key={tag} color="arcoblue" size="small">
                        #{tag}
                      </Tag>
                    ))}
                  </div>
                  <div className="article-popular-result-panel__footer">
                    <span>{resultCreatedAt}</span>
                    <Button
                      type="primary"
                      size="small"
                      icon={<Download size={16} />}
                      onClick={onDownloadImagesAsZip}
                    >
                      下载图片
                    </Button>
                  </div>
                </article>
              </section>
            )}
            {resultViewMode === "cover" && (
              <ArticleXhsNotePreview
                images={previewImages}
                title={draftCopy?.title || "AI 图文创作"}
                body={draftCopy?.body || ""}
                tags={draftCopy?.tags || []}
                createdAt={resultCreatedAt}
                authorName={authorName}
                activeIndex={activePreviewIndex}
                onActiveIndexChange={onActivePreviewIndexChange}
                stageClassName="article-popular-note-stage"
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
