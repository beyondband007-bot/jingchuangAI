import React from "react";
import {
  ArrowUp,
  ChevronDown,
  ImagePlus,
  Layers,
  Loader2,
  X,
} from "lucide-react";
import {
  ArticleVisualOptionGroup,
  CopyParamsPanel,
  PopularStepper,
} from "./ArticleFormPanels";
import { ArticleImageConfigPanel } from "./ArticleImageConfigPanel";
import BillingPoints from "../../components/BillingPoints.jsx";

/**
 * The article workspace's left-side editor.  Keeping the interactive form in
 * one component lets ArticleGenerationView focus on task data and requests.
 */
export function ArticleFormPanel({
  step,
  draftCopy,
  popularSteps,
  platformTabs,
  form,
  isMorePlatformActive,
  isMorePlatformOpen,
  morePlatformRef,
  onToggleMorePlatform,
  morePlatformOptions,
  onSelectMorePlatform,
  onChangePlatform,
  copyTemplates,
  isTemplateOpen,
  templateSelectRef,
  onToggleTemplate,
  onSelectCopyTemplate,
  onUpdateForm,
  referenceInputRef,
  onAddReferenceAssets,
  isReferenceUploading,
  referenceAssets,
  maxReferenceAssets,
  onRemoveReferenceAsset,
  quickTemplates,
  onPreviewQuickTemplate,
  wordCounts,
  copyTones,
  onGenerateDraft,
  isDraftSubmitting,
  ratios,
  imageCounts,
  visualStyles,
  RatioIcon,
  isModelOpen,
  setIsModelOpen,
  modelSelectRef,
  selectedModelOption,
  modelOptions,
  model,
  setModel,
  isGenerating,
  onBackStep,
  onSubmitGeneration,
  submitError,
}) {
  return (
    <aside className={`article-form-panel${step >= 3 ? " is-image-config" : ""}`}>
      {step < 3 ? (
        <>
          <div className="article-form-panel__scroll">
            <div className="article-form-top">
              <PopularStepper currentStep={step} hasDraftCopy={Boolean(draftCopy)} steps={popularSteps} />
              <div className="fm-popular-platform-tabs" aria-label="平台类型">
                {platformTabs.map((item) => (
                  <button
                    className={form.platform === item && !isMorePlatformActive ? "is-active" : ""}
                    type="button"
                    key={item}
                    onClick={() => onChangePlatform(item)}
                  >
                    {item}
                  </button>
                ))}
                <span className={`fm-popular-platform-more ${isMorePlatformOpen ? "is-open" : ""}`} ref={morePlatformRef}>
                  <button
                    className={isMorePlatformActive ? "is-active" : ""}
                    type="button"
                    aria-haspopup="listbox"
                    aria-expanded={isMorePlatformOpen}
                    onClick={onToggleMorePlatform}
                  >
                    <span>{isMorePlatformActive ? form.platform : "更多"}</span>
                    <ChevronDown size={14} />
                  </button>
                  {isMorePlatformOpen && (
                    <div className="fm-popular-platform-more-menu" role="listbox" aria-label="更多平台">
                      {morePlatformOptions.map((item) => (
                        <button
                          className={form.platform === item ? "is-selected" : ""}
                          type="button"
                          key={item}
                          role="option"
                          aria-selected={form.platform === item}
                          onClick={() => onSelectMorePlatform(item)}
                        >
                          <span>{item}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </span>
              </div>
            </div>
            <label className="fm-popular-template-select">
              <span>文案模板</span>
              <span className={`fm-popular-template-wrap ${isTemplateOpen ? "is-open" : ""}`} ref={templateSelectRef}>
                <button
                  className="fm-popular-template-trigger"
                  type="button"
                  aria-haspopup="listbox"
                  aria-expanded={isTemplateOpen}
                  onClick={onToggleTemplate}
                >
                  <Layers size={17} />
                  <span>{form.copyTemplate || "请选择文案模板"}</span>
                  <ChevronDown size={16} />
                </button>
                {isTemplateOpen && (
                  <div className="fm-popular-template-menu" role="listbox" aria-label="文案模板">
                    {copyTemplates.map((item) => (
                      <button
                        className={form.copyTemplate === item ? "is-selected" : ""}
                        type="button"
                        key={item}
                        role="option"
                        aria-selected={form.copyTemplate === item}
                        onClick={() => onSelectCopyTemplate(item)}
                      >
                        <span>{item}</span>
                      </button>
                    ))}
                  </div>
                )}
              </span>
            </label>
            <label className="article-field article-topic-field">
              <span>创作主题</span>
              <em>{form.topic.length}/500</em>
              <div className="article-topic-box">
                <textarea
                  value={form.topic}
                  onChange={(event) => onUpdateForm({ topic: event.target.value.slice(0, 500) })}
                  placeholder="描述你想发的内容，或 上传参考图 让 AI 帮你想"
                />
                <div className={`article-reference-upload${referenceAssets.length ? " has-asset" : ""}`}>
                  <input
                    ref={referenceInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    multiple
                    onChange={(event) => onAddReferenceAssets(event.target.files)}
                  />
                  <button
                    className="article-reference-upload__pick"
                    type="button"
                    disabled={isReferenceUploading || referenceAssets.length >= maxReferenceAssets}
                    onClick={() => referenceInputRef.current?.click()}
                  >
                    {isReferenceUploading ? <Loader2 size={16} className="is-spinning" /> : <ImagePlus size={16} />}
                    <span>{isReferenceUploading ? "上传中..." : "上传参考图"}</span>
                  </button>
                  <div className="article-reference-upload__text">
                    <strong>{referenceAssets.length ? `已添加 ${referenceAssets.length} 张参考素材` : "上传参考图"}</strong>
                    <span>{isReferenceUploading ? "正在上传素材..." : referenceAssets.length ? null : "商品实拍、场景截图都可以，AI 帮你提炼创作主题"}</span>
                  </div>
                  {!!referenceAssets.length && (
                    <div className="article-reference-upload__thumbs">
                      {referenceAssets.map((asset) => {
                        const assetKey = asset.id || asset.referenceImageUrl;
                        return (
                          <figure className="article-reference-upload__thumb" key={assetKey}>
                            {asset.previewUrl || asset.referenceImageUrl ? <img src={asset.previewUrl || asset.referenceImageUrl} alt="" /> : <ImagePlus size={14} />}
                            <button type="button" onClick={() => onRemoveReferenceAsset(assetKey)} aria-label="移除参考素材">
                              <X size={12} />
                            </button>
                          </figure>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </label>
            <section className="article-quick-section is-inline">
              <header><div><strong>快捷图文模版</strong></div></header>
              <div className="article-quick-rail">
                {quickTemplates.map((item) => (
                  <button className="article-quick-card__thumb" type="button" key={item.id} aria-label={item.title} onClick={() => onPreviewQuickTemplate(item)}>
                    <img src={item.image} alt="" />
                  </button>
                ))}
              </div>
            </section>
            <CopyParamsPanel form={form} wordCounts={wordCounts} copyTones={copyTones} onUpdateForm={onUpdateForm} />
          </div>
          <div className="article-generate-fab-wrap">
            <button className="article-generate-fab" type="button" onClick={onGenerateDraft} disabled={isDraftSubmitting || isReferenceUploading}>
              {isDraftSubmitting ? <Loader2 size={17} className="is-spinning" /> : <ArrowUp size={17} />}
              {isDraftSubmitting ? (
                "生成中"
              ) : (
                <>
                  生成标题&正文
                  <span className="article-generate-fab__points">
                    <BillingPoints feature="article" payload={{}} fallbackPoints={10} /> 积分
                  </span>
                </>
              )}
            </button>
          </div>
        </>
      ) : (
        <div className="article-form-panel__scroll">
          <div className="article-form-top">
            <PopularStepper currentStep={step} hasDraftCopy={Boolean(draftCopy)} steps={popularSteps} />
          </div>
          <ArticleImageConfigPanel
            form={form}
            ratios={ratios}
            imageCounts={imageCounts}
            visualStyles={visualStyles}
            onUpdateForm={onUpdateForm}
            RatioIcon={RatioIcon}
            VisualOptionGroup={ArticleVisualOptionGroup}
            isModelOpen={isModelOpen}
            setIsModelOpen={setIsModelOpen}
            modelSelectRef={modelSelectRef}
            selectedModelOption={selectedModelOption}
            modelOptions={modelOptions}
            model={model}
            setModel={setModel}
            isGenerating={isGenerating}
            onBackStep={onBackStep}
            onSubmitGeneration={onSubmitGeneration}
          />
        </div>
      )}
      {submitError && <div className="article-error">{submitError}</div>}
    </aside>
  );
}
