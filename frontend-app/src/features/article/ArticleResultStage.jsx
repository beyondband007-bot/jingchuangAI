import React from "react";
import { Loader2, Sparkles, X } from "lucide-react";
import { ArticleFullPreviewMedia } from "./ArticleFullPreviewMedia";
import { ArticlePopularResultPanel } from "./ArticlePopularResultPanel";
import { ArticleStyleTemplatePreview } from "./ArticleStyleTemplatePreview";

export function ArticleResultStage({
  showStyleTemplatePreview, activeVisualStyleLabel, form, isDraftSubmitting,
  isGenerating, step, draftCopy, onFocusTopic, onChooseQuickTemplate,
  onUpdateDraft, onConfirmDraft, activeStyleTemplatePreviews,
  selectedStyleTemplateId, onSelectStyleTemplate, hasFailedArticle,
  hasCompletedArticle, resultViewMode, onChangeResultViewMode,
  activePreviewIndex, onActivePreviewIndexChange, selectedTask, submitError,
  onRequestRegenerate, formatArticleError, previewImages, resultCreatedAt,
  onCopyArticleTitle, onCopyArticleBody, onDownloadImagesAsZip, authorName,
}) {
  return (
    <main className="article-result-card">
      <header>
        <strong>{showStyleTemplatePreview ? "模板预览" : "生成结果"}</strong>
        <span>
          {showStyleTemplatePreview
            ? `${activeVisualStyleLabel}风格 · 2 款示意 · ${form.imageCount}图 · ${form.ratio}`
            : `${form.platform} · ${form.ratio}`}
        </span>
      </header>
      {isDraftSubmitting ? (
        <div className="article-result-empty">
          <Loader2 size={58} className="is-spinning" />
          <h2>正在生成标题正文</h2>
          <p>DeepSeek 正在根据场景、模板、字数和卖点整理文案草案</p>
        </div>
      ) : isGenerating ? (
        <div className="article-result-empty">
          <Loader2 size={58} className="is-spinning" />
          <h2>正在生成配图</h2>
          <p>请稍等片刻，生成完成后会自动展示结果</p>
        </div>
      ) : step < 3 && !draftCopy ? (
        <div className="article-result-empty">
          <Sparkles size={92} />
          <h2>尚未生成图文</h2>
          <p>按步骤选择场景与模板，先生成标题正文，再配置配图生成完整图文</p>
          <div>
            <button type="button" onClick={onFocusTopic}>去输入主题</button>
            <button type="button" onClick={onChooseQuickTemplate}>选择快捷模板</button>
          </div>
        </div>
      ) : step < 3 ? (
        <div className="article-copy-result">
          <label>
            <span>标题</span>
            <input value={draftCopy.title} onChange={(event) => onUpdateDraft({ title: event.target.value })} />
          </label>
          <label>
            <span>正文</span>
            <textarea value={draftCopy.body} onChange={(event) => onUpdateDraft({ body: event.target.value })} />
          </label>
          <div className="article-tag-section">
            <span>标签</span>
            <div className="article-tag-editor">
              {(draftCopy.tags || []).map((tag) => (
                <button type="button" key={tag} onClick={() => onUpdateDraft({ tags: draftCopy.tags.filter((item) => item !== tag) })}>
                  #{tag} <X size={13} />
                </button>
              ))}
              <input
                placeholder="输入标签后回车，如：敏感肌"
                onKeyDown={(event) => {
                  if (event.key === "Enter" && event.currentTarget.value.trim()) {
                    event.preventDefault();
                    onUpdateDraft({ tags: [...(draftCopy.tags || []), event.currentTarget.value.trim()] });
                    event.currentTarget.value = "";
                  }
                }}
              />
            </div>
          </div>
          <div className="article-copy-actions">
            <button className="article-confirm-copy" type="button" onClick={onConfirmDraft}>确认文案无误，下一步配置配图</button>
          </div>
        </div>
      ) : showStyleTemplatePreview ? (
        <ArticleStyleTemplatePreview
          items={activeStyleTemplatePreviews}
          selectedId={selectedStyleTemplateId}
          imageCount={form.imageCount}
          ratio={form.ratio}
          onSelect={onSelectStyleTemplate}
        />
      ) : (
        <ArticlePopularResultPanel
          hasFailedArticle={hasFailedArticle}
          hasCompletedArticle={hasCompletedArticle}
          resultViewMode={resultViewMode}
          onChangeResultViewMode={onChangeResultViewMode}
          activePreviewIndex={activePreviewIndex}
          onActivePreviewIndexChange={onActivePreviewIndexChange}
          selectedTask={selectedTask}
          submitError={submitError}
          onRequestRegenerate={onRequestRegenerate}
          isRegenerating={isGenerating}
          formatArticleError={formatArticleError}
          previewImages={previewImages}
          draftCopy={draftCopy}
          resultCreatedAt={resultCreatedAt}
          onCopyArticleTitle={onCopyArticleTitle}
          onCopyArticleBody={onCopyArticleBody}
          onDownloadImagesAsZip={onDownloadImagesAsZip}
          authorName={authorName}
          FullPreviewMedia={ArticleFullPreviewMedia}
        />
      )}
    </main>
  );
}
