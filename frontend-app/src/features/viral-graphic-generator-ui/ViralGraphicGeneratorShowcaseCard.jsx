import React, { useState } from "react";
import {
  ChevronRight,
  ImagePlus
} from "lucide-react";
import "./viralGraphicGeneratorShowcaseCard.css";

export function ViralGraphicGeneratorShowcaseCard({
  templates,
  isGenerating,
  onUseTemplate,
}) {
  const featuredTemplates = templates.slice(0, 6);
  const [selectedTemplateId, setSelectedTemplateId] = useState(featuredTemplates[0]?.id || "");

  return (
    <div className="viral-graphic-showcase">
      <section className="viral-graphic-showcase__hero">
        <div className="viral-graphic-showcase__eyebrow">
          <ImagePlus size={16} />
          爆款图文工作台
        </div>
        <h3>把主题快速整理成可发布的图文方向</h3>
        <p>右侧保留模板灵感，左侧继续填写主题和参数，形成接近原 zip 设计稿的工作流。</p>

        <div className="viral-graphic-showcase__steps" aria-label="工作流步骤">
          {["选择主题", "AI 生成方向", "套用模板"].map((item, index) => (
            <React.Fragment key={item}>
              <div className="viral-graphic-showcase__step">
                <span>{index + 1}</span>
                <strong>{item}</strong>
              </div>
              {index < 2 && <ChevronRight size={16} aria-hidden="true" />}
            </React.Fragment>
          ))}
        </div>
      </section>

      <section className="viral-graphic-showcase__panel">
        <div className="viral-graphic-showcase__panel-head">
          <span>模板卡片</span>
          <strong>点击直接带入左侧表单</strong>
        </div>
        <div className="viral-graphic-showcase__template-list">
          {featuredTemplates.map((item) => (
            <article className="viral-graphic-showcase__template" key={item.id}>
              <button
                className="viral-graphic-showcase__template-thumb"
                type="button"
                onClick={() => {
                  setSelectedTemplateId(item.id);
                  onUseTemplate(item);
                }}
                aria-label={`使用模板 ${item.title}`}
              >
                <img src={item.thumbnailUrl} alt={item.title} loading="lazy" />
              </button>
              <div className="viral-graphic-showcase__template-body">
                <strong>{item.title}</strong>
                <p>{item.description}</p>
                <button
                  className={selectedTemplateId === item.id ? "is-selected" : ""}
                  type="button"
                  onClick={() => {
                    setSelectedTemplateId(item.id);
                    onUseTemplate(item);
                  }}
                  disabled={isGenerating}
                >
                  使用模板
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
