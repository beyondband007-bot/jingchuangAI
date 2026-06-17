import React, { useEffect, useMemo, useRef, useState } from "react";

function RatioPreviewIcon({ ratio, selected = false }) {
  const [width = 1, height = 1] = String(ratio || "1:1")
    .split(":")
    .map((part) => Number(part) || 1);
  const isPortrait = height > width;
  const isSquare = width === height;

  return (
    <span
      aria-hidden="true"
      style={{
        display: "inline-flex",
        width: "30px",
        alignItems: "center",
        justifyContent: "center",
        flex: "0 0 30px",
      }}
    >
      <span
        style={{
          width: isSquare ? "18px" : isPortrait ? "14px" : "22px",
          height: isSquare ? "18px" : isPortrait ? "22px" : "14px",
          borderRadius: "4px",
          border: `1.5px solid ${selected ? "#8f78ff" : "rgba(204, 204, 204, 0.72)"}`,
          background: selected
            ? "rgba(143, 120, 255, 0.18)"
            : "rgba(255, 255, 255, 0.06)",
          boxShadow: selected ? "0 0 0 3px rgba(143, 120, 255, 0.1)" : "none",
        }}
      />
    </span>
  );
}

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
  const [isHovering, setIsHovering] = useState(false);
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [showRatioDropdown, setShowRatioDropdown] = useState(false);
  const [showQualityDropdown, setShowQualityDropdown] = useState(false);
  const dialogRef = useRef(null);
  const textareaRef = useRef(null);
  const maxPromptRows = 9;
  const promptLineHeight = 24;
  const promptMaxHeight = maxPromptRows * promptLineHeight;

  function closeDropdowns() {
    setShowModelDropdown(false);
    setShowRatioDropdown(false);
    setShowQualityDropdown(false);
  }

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

  useEffect(() => {
    if (!showModelDropdown && !showRatioDropdown && !showQualityDropdown) {
      return undefined;
    }

    function closeOnOutside(event) {
      if (!dialogRef.current?.contains(event.target)) {
        closeDropdowns();
      }
    }

    function closeOnPageInteraction() {
      closeDropdowns();
    }

    function closeOnEscape(event) {
      if (event.key === "Escape") closeDropdowns();
    }

    document.addEventListener("pointerdown", closeOnOutside, true);
    document.addEventListener("wheel", closeOnPageInteraction, true);
    document.addEventListener("touchmove", closeOnPageInteraction, true);
    document.addEventListener("keydown", closeOnEscape);
    window.addEventListener("resize", closeOnPageInteraction);
    window.addEventListener("scroll", closeOnPageInteraction, true);

    return () => {
      document.removeEventListener("pointerdown", closeOnOutside, true);
      document.removeEventListener("wheel", closeOnPageInteraction, true);
      document.removeEventListener("touchmove", closeOnPageInteraction, true);
      document.removeEventListener("keydown", closeOnEscape);
      window.removeEventListener("resize", closeOnPageInteraction);
      window.removeEventListener("scroll", closeOnPageInteraction, true);
    };
  }, [showModelDropdown, showQualityDropdown, showRatioDropdown]);

  useEffect(() => {
    if (collapsed) closeDropdowns();
  }, [collapsed]);

  const shellStyle = useMemo(
    () => ({
      width: "100%",
      position: "relative",
      background:
        "linear-gradient(135deg, rgba(35, 35, 35, 0.78) 0%, rgba(28, 28, 28, 0.88) 100%)",
      borderRadius: "24px",
      border: isHovering
        ? "1px solid rgba(255, 255, 255, 0.38)"
        : "1px solid rgba(255, 255, 255, 0.08)",
      padding: "20px 24px",
      boxShadow:
        "0 4px 24px rgba(0, 0, 0, 0.4), 0 1px 3px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.05)",
      backdropFilter: "blur(20px)",
      WebkitBackdropFilter: "blur(20px)",
      transition: "border-color 0.42s cubic-bezier(0.22, 1, 0.36, 1)",
    }),
    [isHovering],
  );

  const buttonBaseStyle = {
    height: "44px",
    borderRadius: "12px",
    background: "rgba(55, 55, 55, 0.8)",
    border: "1px solid rgba(255, 255, 255, 0.06)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    padding: "0 14px",
    cursor: "pointer",
    transition: "all 0.2s ease",
    color: "#cccccc",
    fontSize: "13px",
    fontWeight: "500",
  };

  function dropdownMenuStyle(minWidth) {
    return {
      position: "absolute",
      ...(dropdownPlacement === "bottom"
        ? { top: "54px" }
        : { bottom: "54px" }),
      left: 0,
      background: "rgba(40, 40, 40, 0.98)",
      borderRadius: "12px",
      border: "1px solid rgba(255, 255, 255, 0.1)",
      padding: "8px",
      minWidth: `${minWidth}px`,
      boxShadow: "0 8px 32px rgba(0, 0, 0, 0.5)",
      backdropFilter: "blur(20px)",
      animation: "fadeIn 0.15s ease",
      zIndex: 120,
    };
  }

  function dropdownItemStyle(color) {
    return {
      padding: "10px 12px",
      borderRadius: "8px",
      cursor: "pointer",
      color,
      fontSize: "14px",
      transition: "all 0.15s ease",
    };
  }

  function highlightDropdownItem(event) {
    event.currentTarget.style.background = "rgba(255, 255, 255, 0.08)";
  }

  function resetDropdownItem(color) {
    return function (event) {
      event.currentTarget.style.background = "transparent";
    };
  }

  const currentModel = modelOptions.find((m) => m.value === model);
  const currentRatio = ratioOptions.find((r) => (r.value || r) === ratio);
  const currentQuality = qualityOptions.find((q) => q.value === quality);
  const dialogClassName = `chatbot-ui-dialog image-prompt-dialog ${
    collapsed ? "is-collapsed" : "is-expanded"
  }`;
  const mainRowClassName = `image-prompt-main-row ${
    collapsed ? "is-collapsed" : "is-expanded"
  }`;
  const textareaStyle = {
    flex: "1 1 auto",
    minWidth: 0,
    width: "100%",
    background: "transparent",
    border: "none",
    outline: "none",
    resize: "none",
    color: "#ffffff",
    fontSize: "16px",
    fontWeight: "400",
    lineHeight: `${promptLineHeight}px`,
    fontFamily: "inherit",
    minHeight: "28px",
    maxHeight: `${promptMaxHeight}px`,
    overflowY: "hidden",
    padding: 0,
  };
  const compactAddButtonStyle = {
    ...buttonBaseStyle,
    flex: "0 0 44px",
    width: "44px",
    padding: 0,
  };
  const compactSubmitStyle = {
    ...buttonBaseStyle,
    flex: "0 0 auto",
    width: "auto",
    minWidth: "96px",
    background: canSubmit
      ? buttonBaseStyle.background
      : "rgba(55, 55, 55, 0.5)",
    border: canSubmit
      ? buttonBaseStyle.border
      : "1px solid rgba(255, 255, 255, 0.04)",
    color: canSubmit ? buttonBaseStyle.color : "#8b8b8b",
    cursor: canSubmit ? "pointer" : "not-allowed",
    opacity: canSubmit ? 1 : 0.6,
  };

  return (
    <div
      ref={dialogRef}
      className={dialogClassName}
      aria-label={ariaLabel}
      style={shellStyle}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <div className={mainRowClassName}>
        {onAdd && (
          <button
            type="button"
            className="image-prompt-main-add"
            onClick={onAdd}
            style={compactAddButtonStyle}
            aria-label="添加"
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
        <textarea
          ref={textareaRef}
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
          style={textareaStyle}
        />
        <button
          type="button"
          className="image-prompt-compact-submit"
          onClick={onSubmit}
          disabled={!canSubmit}
          style={compactSubmitStyle}
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

      <div className="image-prompt-reference-region">{referenceSlot}</div>

      <div
        className="image-prompt-controls-row"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            flexWrap: "wrap",
          }}
        >
          {onAdd && (
            <button
              type="button"
              onClick={onAdd}
              style={buttonBaseStyle}
              aria-label="添加"
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

          {/* Model Dropdown */}
          <div className="chatbot-ui-dropdown" style={{ position: "relative" }}>
            <button
              type="button"
              onClick={() => {
                setShowModelDropdown(!showModelDropdown);
                setShowRatioDropdown(false);
                setShowQualityDropdown(false);
              }}
              style={buttonBaseStyle}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(70, 70, 70, 0.9)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(55, 55, 55, 0.8)";
              }}
            >
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
              <span>{currentModel?.label || model}</span>
              <svg
                width="12"
                height="12"
                viewBox="0 0 12 12"
                fill="none"
                style={{
                  transform: showModelDropdown ? "rotate(180deg)" : "rotate(0)",
                  transition: "transform 0.2s ease",
                }}
              >
                <path
                  d="M3 4.5L6 7.5L9 4.5"
                  stroke="#888888"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>

            {showModelDropdown && (
              <div style={dropdownMenuStyle(200)}>
                {modelOptions.map((item) => (
                  <div
                    key={item.value}
                    onClick={() => {
                      onModelChange(item.value);
                      setShowModelDropdown(false);
                    }}
                    style={{
                      ...dropdownItemStyle(
                        item.value === model ? "#8f78ff" : "#cccccc",
                      ),
                      fontWeight: item.value === model ? "500" : "400",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                    onMouseEnter={highlightDropdownItem}
                    onMouseLeave={resetDropdownItem(
                      item.value === model ? "#8f78ff" : "#cccccc",
                    )}
                  >
                    {item.label}
                    {item.value === model && (
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 14 14"
                        fill="none"
                      >
                        <path
                          d="M2.5 7L5.5 10L11.5 4"
                          stroke="#8f78ff"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Ratio Dropdown */}
          <div className="chatbot-ui-dropdown" style={{ position: "relative" }}>
            <button
              type="button"
              onClick={() => {
                setShowRatioDropdown(!showRatioDropdown);
                setShowModelDropdown(false);
                setShowQualityDropdown(false);
              }}
              style={buttonBaseStyle}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(70, 70, 70, 0.9)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(55, 55, 55, 0.8)";
              }}
            >
              <RatioPreviewIcon ratio={ratio} selected={showRatioDropdown} />
              <span>{currentRatio?.label || currentRatio || ratio}</span>
              <svg
                width="12"
                height="12"
                viewBox="0 0 12 12"
                fill="none"
                style={{
                  transform: showRatioDropdown ? "rotate(180deg)" : "rotate(0)",
                  transition: "transform 0.2s ease",
                }}
              >
                <path
                  d="M3 4.5L6 7.5L9 4.5"
                  stroke="#888888"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>

            {showRatioDropdown && (
              <div style={dropdownMenuStyle(150)}>
                {ratioOptions.map((item) => {
                  const optionValue = item.value || item;
                  const isSelected = optionValue === ratio;

                  return (
                    <div
                      key={optionValue}
                      onClick={() => {
                        onRatioChange(optionValue);
                        setShowRatioDropdown(false);
                      }}
                      style={{
                        ...dropdownItemStyle(
                          isSelected ? "#8f78ff" : "#cccccc",
                        ),
                        fontWeight: isSelected ? "500" : "400",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "12px",
                      }}
                      onMouseEnter={highlightDropdownItem}
                      onMouseLeave={resetDropdownItem(
                        isSelected ? "#8f78ff" : "#cccccc",
                      )}
                    >
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "10px",
                        }}
                      >
                        <RatioPreviewIcon
                          ratio={optionValue}
                          selected={isSelected}
                        />
                        {item.label || item}
                      </span>
                      {isSelected && (
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 14 14"
                          fill="none"
                        >
                          <path
                            d="M2.5 7L5.5 10L11.5 4"
                            stroke="#8f78ff"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quality Dropdown */}
          <div className="chatbot-ui-dropdown" style={{ position: "relative" }}>
            <button
              type="button"
              onClick={() => {
                setShowQualityDropdown(!showQualityDropdown);
                setShowModelDropdown(false);
                setShowRatioDropdown(false);
              }}
              style={buttonBaseStyle}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(70, 70, 70, 0.9)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(55, 55, 55, 0.8)";
              }}
            >
              <span>
                {currentQuality?.label || currentQuality?.value || quality}
              </span>
              <svg
                width="12"
                height="12"
                viewBox="0 0 12 12"
                fill="none"
                style={{
                  transform: showQualityDropdown
                    ? "rotate(180deg)"
                    : "rotate(0)",
                  transition: "transform 0.2s ease",
                }}
              >
                <path
                  d="M3 4.5L6 7.5L9 4.5"
                  stroke="#888888"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>

            {showQualityDropdown && (
              <div style={dropdownMenuStyle(150)}>
                {qualityOptions.map((item) => (
                  <div
                    key={item.value}
                    onClick={() => {
                      onQualityChange(item.value);
                      setShowQualityDropdown(false);
                    }}
                    style={{
                      ...dropdownItemStyle(
                        item.value === quality ? "#8f78ff" : "#cccccc",
                      ),
                      fontWeight: item.value === quality ? "500" : "400",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                    onMouseEnter={highlightDropdownItem}
                    onMouseLeave={resetDropdownItem(
                      item.value === quality ? "#8f78ff" : "#cccccc",
                    )}
                  >
                    {item.label || item.value}
                    {item.value === quality && (
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 14 14"
                        fill="none"
                      >
                        <path
                          d="M2.5 7L5.5 10L11.5 4"
                          stroke="#8f78ff"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {onRandom && (
            <button
              type="button"
              className="prompt-icon-button prompt-icon-button--tooltip"
              onClick={onRandom}
              style={buttonBaseStyle}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(70, 70, 70, 0.9)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(55, 55, 55, 0.8)";
              }}
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
              className="prompt-icon-button prompt-icon-button--tooltip"
              onClick={onClear}
              style={buttonBaseStyle}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(70, 70, 70, 0.9)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(55, 55, 55, 0.8)";
              }}
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
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            flexWrap: "wrap",
            justifyContent: "flex-end",
          }}
        >
          {price && (
            <span
              style={{
                padding: "8px 12px",
                color: "#f5d475",
                background: "rgba(61, 46, 16, 0.82)",
                border: "1px solid rgba(255, 212, 117, 0.2)",
                borderRadius: "999px",
                fontSize: "12px",
                fontWeight: "900",
              }}
            >
              {price}
            </span>
          )}

          <button
            type="button"
            onClick={onSubmit}
            disabled={!canSubmit}
            style={{
              ...buttonBaseStyle,
              width: "auto",
              minWidth: "120px",
              background: canSubmit
                ? buttonBaseStyle.background
                : "rgba(55, 55, 55, 0.5)",
              border: canSubmit
                ? buttonBaseStyle.border
                : "1px solid rgba(255, 255, 255, 0.04)",
              color: canSubmit ? buttonBaseStyle.color : "#8b8b8b",
              fontSize: buttonBaseStyle.fontSize,
              fontWeight: buttonBaseStyle.fontWeight,
              cursor: canSubmit ? "pointer" : "not-allowed",
              opacity: canSubmit ? 1 : 0.6,
            }}
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
