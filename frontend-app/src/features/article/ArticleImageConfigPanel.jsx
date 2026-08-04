import React from "react";
import { ChevronDown, Layers, Loader2, Sparkles } from "lucide-react";
import BillingPoints from "../../components/BillingPoints.jsx";

export function ArticleImageConfigPanel({
  form,
  ratios,
  imageCounts,
  visualStyles,
  onUpdateForm,
  RatioIcon,
  VisualOptionGroup,
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
}) {
  return (
    <>
      <h2>
        <span>步骤 3 ·</span> 配图配置
      </h2>
      <div className="article-choice-row is-ratio">
        <strong>尺寸比例</strong>
        <div className="article-choice-options">
          {ratios.map((item) => (
            <button
              className={form.ratio === item ? "is-selected" : ""}
              type="button"
              key={item}
              onClick={() => onUpdateForm({ ratio: item })}
            >
              <RatioIcon ratio={item} />
              {item}
            </button>
          ))}
        </div>
      </div>
      <div className="article-visual-config">
        <VisualOptionGroup
          title="视觉风格"
          options={visualStyles}
          value={form.visualStyle}
          onChange={(value) => onUpdateForm({ visualStyle: value })}
        />
      </div>
      <div className="article-choice-row">
        <strong>配图数量</strong>
        {imageCounts.map((item) => (
          <button
            className={form.imageCount === item ? "is-selected" : ""}
            type="button"
            key={item}
            onClick={() => onUpdateForm({ imageCount: item })}
          >
            {item}
          </button>
        ))}
      </div>
      <div className="article-model-select-row">
        <strong>模型选项</strong>
        <span
          className={`fm-popular-template-wrap article-model-select ${isModelOpen ? "is-open" : ""}`}
          ref={modelSelectRef}
        >
          <button
            className="fm-popular-template-trigger"
            type="button"
            aria-haspopup="listbox"
            aria-expanded={isModelOpen}
            onClick={() => setIsModelOpen((value) => !value)}
          >
            <Layers size={17} />
            <span>
              {selectedModelOption?.label ||
                selectedModelOption?.value ||
                "请选择模型"}
            </span>
            <ChevronDown size={16} />
          </button>
          {isModelOpen && (
            <div
              className="fm-popular-template-menu"
              role="listbox"
              aria-label="模型选项"
            >
              {modelOptions.map((item) => (
                <button
                  className={model === item.value ? "is-selected" : ""}
                  type="button"
                  key={item.value}
                  role="option"
                  aria-selected={model === item.value}
                  onClick={() => {
                    setModel(item.value);
                    setIsModelOpen(false);
                  }}
                >
                  <span>{item.label || item.value}</span>
                </button>
              ))}
            </div>
          )}
        </span>
      </div>
      <div className="article-step-action-row">
        <p className="article-credit-hint">
          预计消耗 <strong><BillingPoints feature="image" payload={{ count: form.imageCount }} fallbackPoints={Math.max(1, form.imageCount) * 30} /></strong>{" "}
          积分
        </p>
        <div className="article-step-buttons">
          <button
            className="article-back-step"
            type="button"
            onClick={onBackStep}
          >
            上一步
          </button>
          <button
            className="article-generate-full"
            type="button"
            onClick={onSubmitGeneration}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <Loader2 size={17} className="is-spinning" />
            ) : (
              <Sparkles size={17} />
            )}
            {isGenerating ? "生成中" : "生成完整图文"}
          </button>
        </div>
      </div>
    </>
  );
}
