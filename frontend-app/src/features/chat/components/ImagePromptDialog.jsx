import React, { useEffect, useRef } from "react";
import { getModelOptionMeta, ModelOptionContent } from "./modelOptionMeta.jsx";
import { PromptDropdown } from "./PromptDropdown.jsx";
import { PromptRatioPreview } from "./PromptRatioPreview.jsx";

export function ImagePromptDialog({
  ariaLabel,
  placeholder,
  value,
  onChange,
  onSubmit,
  canSubmit,
  notice,
  onRandom,
  onClear,
  onAdd,
  model,
  onModelChange,
  modelOptions,
  ratio,
  onRatioChange,
  ratioOptions,
  quality,
  onQualityChange,
  qualityOptions,
  price,
  referenceSlot,
  collapsed = false,
  dropdownPlacement = "top",
}) {
  const textareaRef = useRef(null);
  const maxPromptRows = 9;
  const promptLineHeight = 24;
  const promptMaxHeight = maxPromptRows * promptLineHeight;

  function resizePromptTextarea() {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    const nextHeight = Math.min(textarea.scrollHeight, promptMaxHeight);
    textarea.style.height = `${nextHeight}px`;
    textarea.style.overflowY =
      textarea.scrollHeight > promptMaxHeight ? "auto" : "hidden";
  }

  useEffect(() => {
    resizePromptTextarea();
  }, [value]);

  const dialogClassName = `fm-prompt-dialog chatbot-ui-dialog image-prompt-dialog ${
    collapsed ? "is-collapsed" : "is-expanded"
  }`;
  const mainRowClassName = `fm-prompt-main-row image-prompt-main-row ${
    collapsed ? "is-collapsed" : "is-expanded"
  }`;
  return (
    <div className={dialogClassName} aria-label={ariaLabel}>
      <div className={mainRowClassName}>
        <textarea
          ref={textareaRef}
          className="fm-prompt-input image-prompt-input"
          value={value}
          onChange={(event) => {
            onChange(event.target.value);
            window.requestAnimationFrame(resizePromptTextarea);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              if (canSubmit) onSubmit();
            }
          }}
          placeholder={placeholder}
          rows={1}
        />
        <button
          type="button"
          className="fm-prompt-submit image-prompt-compact-submit"
          onClick={onSubmit}
          disabled={!canSubmit}
          aria-label="生成"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
          </svg>
          生成
        </button>
      </div>

      <div className="fm-prompt-reference-region">{referenceSlot}</div>

      <div
        className="fm-prompt-controls-row image-prompt-controls-row"
      >
        <div
          className="fm-prompt-controls-group"
        >
          {onAdd && (
            <button
              type="button"
              className="fm-prompt-control fm-prompt-control--square"
              onClick={onAdd}
              aria-label="娣诲姞"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                stroke="#999999"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <line x1="10" y1="4" x2="10" y2="16" />
                <line x1="4" y1="10" x2="16" y2="10" />
              </svg>
            </button>
          )}

          <PromptDropdown
            ariaLabel="选择图片模型"
            className="fm-prompt-dropdown prompt-dropdown--model"
            disabled={collapsed}
            leadingIcon={(
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#8f78ff"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            )}
            onChange={onModelChange}
            options={modelOptions}
            placement={dropdownPlacement}
            renderOption={(item, isSelected) => (
              <ModelOptionContent item={item} selected={isSelected} />
            )}
            renderValue={(option) => (
              <span>{getModelOptionMeta(option?.raw).title}</span>
            )}
            triggerClassName="fm-prompt-control"
            value={model}
            width={480}
          />

          <PromptDropdown
            ariaLabel="选择图片比例"
            className="fm-prompt-dropdown"
            disabled={collapsed}
            onChange={onRatioChange}
            options={ratioOptions}
            placement={dropdownPlacement}
            renderOption={(item, isSelected, option) => (
              <span className="prompt-dropdown__ratio-option">
                <PromptRatioPreview ratio={option.value} selected={isSelected} />
                <span>{item.label || option.value}</span>
              </span>
            )}
            renderValue={(option, isOpen) => (
              <>
                <PromptRatioPreview ratio={option?.value || ratio} selected={isOpen} />
                <span>{option?.label || ratio}</span>
              </>
            )}
            triggerClassName="fm-prompt-control"
            value={ratio}
            width={160}
          />

          <PromptDropdown
            ariaLabel="选择图片清晰度"
            className="fm-prompt-dropdown"
            disabled={collapsed}
            onChange={onQualityChange}
            options={qualityOptions}
            placement={dropdownPlacement}
            triggerClassName="fm-prompt-control"
            value={quality}
            width={160}
          />

          {onRandom && (
            <button
              type="button"
              onClick={onRandom}
              className="fm-prompt-control fm-prompt-control--square prompt-icon-button prompt-icon-button--tooltip"
              data-tooltip="随机提示词"
              aria-label="随机提示词"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#999999"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="1" y="3" width="15" height="13" rx="2" ry="2" />
                <path d="m16 8-4 4-4-4" />
                <circle cx="5.5" cy="18.5" r="2.5" />
                <circle cx="18.5" cy="18.5" r="2.5" />
              </svg>
            </button>
          )}

          {onClear && (
            <button
              type="button"
              onClick={onClear}
              className="fm-prompt-control fm-prompt-control--square prompt-icon-button prompt-icon-button--tooltip"
              data-tooltip="清空提示词"
              aria-label="清空提示词"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#999999"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 6h18" />
                <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
              </svg>
            </button>
          )}
        </div>

        <div
          className="fm-prompt-controls-group fm-prompt-controls-group--end"
        >
          {price && (
            <span
              className="fm-prompt-points"
            >
              {price}
            </span>
          )}

          <button
            type="button"
            className="fm-prompt-submit image-prompt-submit"
            onClick={onSubmit}
            disabled={!canSubmit}
            aria-label="生成"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
            生成
          </button>
        </div>
      </div>
    </div>
  );
}
