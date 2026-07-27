import React from "react";

export function PromptIconButton({ ariaLabel, onClick, disabled = false, children, title, size = "square" }) {
  const sizeClass = size === "round" ? "fm-prompt-control--round" : "fm-prompt-control--square";

  return (
    <button
      type="button"
      className={`fm-prompt-control ${sizeClass}`}
      aria-label={ariaLabel}
      data-tooltip={title || ariaLabel}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

export function PromptSendButton({ ariaLabel, onClick, disabled = false, children }) {
  return (
    <button
      type="button"
      className="fm-prompt-submit fm-prompt-submit--icon"
      aria-label={ariaLabel}
      data-tooltip={ariaLabel}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
