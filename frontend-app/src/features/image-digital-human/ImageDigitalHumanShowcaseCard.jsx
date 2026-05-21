import React from "react";
import { FileText, ImagePlus, Mic, UserRound, Wand2, X } from "lucide-react";
import "./ImageDigitalHumanShowcaseCard.css";

export function ImageDigitalHumanShowcaseCard({
  portraitPreview,
  onSelectPortrait,
  onClearPortrait,
  modelOptions,
  voiceOptions,
  selectedModelValue,
  selectedModelLabel,
  onModelChange,
  selectedVoiceValue,
  selectedVoiceName,
  onVoiceChange,
  text,
  textLength,
  onTextChange,
  notice,
  isSubmitting
}) {
  return (
    <section className="idh-showcase-card" aria-label="图片数字人展示卡片">
      <div className="idh-showcase-hero">
        <div className="idh-showcase-copy">
          <strong>图片数字人生成</strong>
          <p>上传人物正面图，配置脚本与音色，快速生成口型自然的视频内容。</p>
        </div>
      </div>

      <div className="idh-showcase-frame">
        <div className="idh-showcase-stage">
          <div className={`idh-showcase-upload ${portraitPreview ? "has-image" : ""}`}>
            <div className="idh-showcase-upload-header">
              <div className="idh-showcase-step-badge">1</div>
              <div className="idh-showcase-upload-copy">
                <h3>上传人脸图</h3>
                <p>建议使用正面、清晰、光线均匀的人像照片</p>
              </div>
              <span className="idh-showcase-format-pill">JPG / PNG / WEBP</span>
            </div>
            <label className="idh-showcase-upload-input">
              <input
                type="file"
                accept="image/*"
                hidden
                onChange={(event) => {
                  onSelectPortrait?.(event.target.files?.[0] || null);
                  event.target.value = "";
                }}
              />
              {portraitPreview ? (
                <img src={portraitPreview} alt="当前上传人物" />
              ) : (
                <div className="idh-showcase-placeholder">
                  <ImagePlus size={56} />
                  <strong>点击或拖拽照片到此处上传</strong>
                  <span>支持 JPG / PNG / WEBP，建议上传清晰正面照</span>
                </div>
              )}
            </label>
            {portraitPreview ? (
              <button className="idh-showcase-clear" type="button" onClick={onClearPortrait} aria-label="清空图片">
                <X size={14} />
              </button>
            ) : null}
          </div>

          <div className="idh-showcase-settings">
            <div className="idh-showcase-drive-tabs">
              <div className="idh-showcase-pill is-active">
                <FileText size={15} />
                <span>文本驱动</span>
              </div>
              <div className="idh-showcase-pill">
                <Mic size={15} />
                <span>音频驱动</span>
              </div>
            </div>
            <div className="idh-showcase-pill">
              <Mic size={15} />
              <span>{selectedVoiceName || "待选择音色"}</span>
            </div>
            <div className="idh-showcase-pill">
              <Wand2 size={15} />
              <span>{selectedModelLabel || "待选择模型"}</span>
            </div>
            <label className="idh-showcase-field">
              <span>模型</span>
              <select value={selectedModelValue} onChange={(event) => onModelChange?.(event.target.value)}>
                {modelOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
            </label>
            <label className="idh-showcase-field">
              <span>音色</span>
              <select value={selectedVoiceValue} onChange={(event) => onVoiceChange?.(event.target.value)}>
                {voiceOptions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </label>
            <label className="idh-showcase-field idh-showcase-field--textarea">
              <span>脚本内容</span>
              <textarea value={text} maxLength={2000} onChange={(event) => onTextChange?.(event.target.value)} />
            </label>
          </div>
        </div>

        <div className="idh-showcase-steps">
          <div className="is-active">
            <span>1</span>
            <div>
              <strong>上传形象</strong>
              <small>锁定人物正面图</small>
            </div>
          </div>
          <div className="is-active">
            <span>2</span>
            <div>
              <strong>编辑脚本</strong>
              <small>当前 {textLength} / 2000 字</small>
            </div>
          </div>
          <div className={isSubmitting ? "is-active" : ""}>
            <span>3</span>
            <div>
              <strong>生成视频</strong>
              <small>{isSubmitting ? "任务提交中" : "等待生成"}</small>
            </div>
          </div>
        </div>

        <div className="idh-showcase-summary">
          <div>
            <span>形象状态</span>
            <strong>{portraitPreview ? "已上传图片" : "待上传"}</strong>
          </div>
          <div>
            <span>驱动方式</span>
            <strong>文本驱动</strong>
          </div>
          <div>
            <span>人物预览</span>
            <strong>{portraitPreview ? "可生成" : "待补全"}</strong>
          </div>
        </div>

        <div className="idh-showcase-footer">
          <div className="idh-showcase-footer-item">
            <UserRound size={15} />
            <span>{portraitPreview ? "已就绪，可继续调整" : "上传图片后可开始生成"}</span>
          </div>
          {notice ? <div className="idh-showcase-footer-item is-notice">{notice}</div> : null}
        </div>
      </div>
    </section>
  );
}
