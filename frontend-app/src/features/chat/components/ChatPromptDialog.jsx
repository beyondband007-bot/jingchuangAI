import React, { useMemo, useState } from "react";
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
  const [isHovering, setIsHovering] = useState(false);

  const shellStyle = useMemo(
    () => ({
      width: "100%",
      position: "relative",
      background: "linear-gradient(135deg, rgba(35, 35, 35, 0.78) 0%, rgba(28, 28, 28, 0.88) 100%)",
      borderRadius: "24px",
      border: isHovering ? "1px solid rgba(255, 255, 255, 0.38)" : "1px solid rgba(255, 255, 255, 0.08)",
      padding: "20px 24px",
      boxShadow: "0 4px 24px rgba(0, 0, 0, 0.4), 0 1px 3px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.05)",
      backdropFilter: "blur(20px)",
      WebkitBackdropFilter: "blur(20px)",
      transition: "border-color 0.42s cubic-bezier(0.22, 1, 0.36, 1)"
    }),
    [isHovering]
  );

  return (
    <div
      className="chat-prompt-dialog"
      aria-label={ariaLabel}
      style={shellStyle}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
        <PromptIconButton ariaLabel="添加" title="添加" onClick={onAdd} disabled={!onAdd} size="round">
          <Plus size={20} />
        </PromptIconButton>
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              if (canSubmit) onSubmit();
            }
          }}
          placeholder={placeholder}
          style={{
            width: "100%",
            background: "transparent",
            border: "none",
            outline: "none",
            color: "#ffffff",
            fontSize: "16px",
            fontWeight: "400",
            lineHeight: "1.5",
            minHeight: "28px",
            padding: 0
          }}
        />
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
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
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", justifyContent: "flex-end" }}>
          {rightControls}
          <PromptSendButton onClick={onSubmit} disabled={!canSubmit} ariaLabel="发送">
            <Zap size={18} />
          </PromptSendButton>
        </div>
      </div>

      {notice && (
        <div style={{ marginTop: "12px", color: "rgba(255,255,255,0.56)", fontSize: "12px", lineHeight: 1.5 }}>
          {notice}
        </div>
      )}
    </div>
  );
}
