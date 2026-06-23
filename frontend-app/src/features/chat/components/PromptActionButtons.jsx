import React from "react";

export function PromptIconButton({ ariaLabel, onClick, disabled = false, children, title, size = "square" }) {
  const style = size === "round" ? roundButtonStyle : squareButtonStyle;

  return (
    <button
      type="button"
      aria-label={ariaLabel}
      data-tooltip={title || ariaLabel}
      onClick={onClick}
      disabled={disabled}
      style={{
        ...style,
        opacity: disabled ? 0.45 : 1,
        cursor: disabled ? "not-allowed" : "pointer"
      }}
    >
      {children}
    </button>
  );
}

export function PromptSendButton({ ariaLabel, onClick, disabled = false, children }) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      data-tooltip={ariaLabel}
      onClick={onClick}
      disabled={disabled}
      style={{
        width: "46px",
        height: "46px",
        borderRadius: "50%",
        border: "none",
        background: disabled ? "rgba(255,255,255,0.1)" : "linear-gradient(to right, #ad6cfc 0%, #5a2cfc 100%)",
        color: "#ffffff",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: disabled ? "none" : "0 10px 24px rgba(90, 44, 252, 0.24)",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.55 : 1
      }}
    >
      {children}
    </button>
  );
}

const squareButtonStyle = {
  width: "40px",
  height: "40px",
  borderRadius: "12px",
  border: "1px solid rgba(255,255,255,0.08)",
  background: "rgba(255,255,255,0.04)",
  color: "#ffffff",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center"
};

const roundButtonStyle = {
  width: "42px",
  height: "42px",
  borderRadius: "50%",
  border: "1px solid rgba(255,255,255,0.08)",
  background: "rgba(255,255,255,0.04)",
  color: "#ffffff",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0
};
