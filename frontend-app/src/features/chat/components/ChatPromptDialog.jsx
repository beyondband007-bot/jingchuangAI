import React from "react";
import { Dice5, Plus, Trash2, Zap } from "lucide-react";
import { PromptIconButton, PromptSendButton } from "./PromptActionButtons";

export function ChatPromptDialog({
  ariaLabel,
  placeholder,
  value,
  onChange,
  onSubmit,
  canSubmit,
  notice,
  leftControls,
  rightControls,
  onRandom,
  onClear,
  onAdd
}) {
  return (
    <div
      className="chat-prompt-dialog fm-prompt-dialog"
      aria-label={ariaLabel}
    >
      <div className="fm-prompt-main-row">
        <PromptIconButton ariaLabel="添加" title="添加" onClick={onAdd} disabled={!onAdd} size="round">
          <Plus size={20} />
        </PromptIconButton>
        <input
          className="fm-prompt-input"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              if (canSubmit) onSubmit();
            }
          }}
          placeholder={placeholder}
        />
      </div>

      <div className="fm-prompt-controls-row">
        <div className="fm-prompt-controls-group">
          {leftControls}
          {onRandom && (
            <PromptIconButton onClick={onRandom} ariaLabel="随机" title="随机">
              <Dice5 size={18} />
            </PromptIconButton>
          )}
          {onClear && (
            <PromptIconButton onClick={onClear} ariaLabel="清空" title="清空">
              <Trash2 size={18} />
            </PromptIconButton>
          )}
        </div>
        <div className="fm-prompt-controls-group fm-prompt-controls-group--end">
          {rightControls}
          <PromptSendButton onClick={onSubmit} disabled={!canSubmit} ariaLabel="发送">
            <Zap size={18} />
          </PromptSendButton>
        </div>
      </div>

      {notice && (
        <div className="fm-prompt-notice">
          {notice}
        </div>
      )}
    </div>
  );
}
