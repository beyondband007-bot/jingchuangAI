import { Check } from "lucide-react";

export function ArticleVisualOptionGroup({
  title,
  options,
  value,
  onChange,
  variant = "image",
}) {
  return (
    <div className="article-field article-visual-field">
      <span>{title}</span>
      <div className={`article-visual-option-grid ${variant === "palette" ? "is-palette" : ""}`}>
        {options.map((item) => (
          <button className={value === item.id ? "is-selected" : ""} type="button" key={item.id} onClick={() => onChange(item.id)}>
            {variant === "palette" ? <span className="article-visual-color" style={{ background: item.swatch }} /> : <img src={item.image} alt="" />}
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function getPopularStepState(currentStep, hasDraftCopy) {
  if (currentStep >= 3) return { activeStep: 3, doneSteps: [1, 2] };
  if (hasDraftCopy) return { activeStep: 2, doneSteps: [1] };
  return { activeStep: 1, doneSteps: [] };
}

export function PopularStepper({ currentStep, hasDraftCopy, steps }) {
  const { activeStep, doneSteps } = getPopularStepState(currentStep, hasDraftCopy);
  return (
    <div className="fm-popular-stepper is-three-steps is-flat" aria-label="爆款图文生成步骤">
      {steps.map((item) => {
        const isDone = doneSteps.includes(item.num);
        const isActive = item.num === activeStep || isDone;
        return (
          <div className={`${isDone ? "is-done" : ""} ${isActive ? "is-active" : ""}`} key={item.num}>
            <span>{isDone ? <Check size={16} strokeWidth={2.5} /> : item.num}</span>
            <p>{item.label}</p>
          </div>
        );
      })}
    </div>
  );
}

export function CopyParamsPanel({ form, wordCounts, copyTones, onUpdateForm }) {
  return (
    <section className="article-copy-params">
      <div className="article-copy-params__head"><strong className="article-copy-params__title">文案参数</strong><span className="article-copy-params__summary">{form.wordCount} · {form.tone}</span></div>
      <div className="article-copy-params__body">
        <div className="article-copy-params__group">
          <strong>期望字数</strong>
          <div className="article-copy-params__options">{wordCounts.map((item) => <button className={form.wordCount === item ? "is-selected" : ""} type="button" key={item} onClick={() => onUpdateForm({ wordCount: item })}><span aria-hidden="true" />{item}</button>)}</div>
        </div>
        <div className="article-copy-params__group">
          <strong>文案语气</strong>
          <div className="article-copy-params__options is-wrap">{copyTones.map((item) => <button className={form.tone === item ? "is-selected" : ""} type="button" key={item} onClick={() => onUpdateForm({ tone: item })}><span aria-hidden="true" />{item}</button>)}</div>
        </div>
      </div>
    </section>
  );
}
