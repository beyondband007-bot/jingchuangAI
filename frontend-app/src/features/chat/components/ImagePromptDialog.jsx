import React, { useMemo, useState } from "react";

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
  referenceSlot
}) {
  const [isHovering, setIsHovering] = useState(false);
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [showRatioDropdown, setShowRatioDropdown] = useState(false);
  const [showQualityDropdown, setShowQualityDropdown] = useState(false);

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
    fontWeight: "500"
  };

  function dropdownMenuStyle(minWidth) {
    return {
      position: "absolute",
      bottom: "54px",
      left: 0,
      background: "rgba(40, 40, 40, 0.98)",
      borderRadius: "12px",
      border: "1px solid rgba(255, 255, 255, 0.1)",
      padding: "8px",
      minWidth: `${minWidth}px`,
      boxShadow: "0 8px 32px rgba(0, 0, 0, 0.5)",
      backdropFilter: "blur(20px)",
      animation: "fadeIn 0.15s ease",
      zIndex: 5
    };
  }

  function dropdownItemStyle(color) {
    return {
      padding: "10px 12px",
      borderRadius: "8px",
      cursor: "pointer",
      color,
      fontSize: "14px",
      transition: "all 0.15s ease"
    };
  }

  function highlightDropdownItem(event) {
    event.currentTarget.style.background = "rgba(255, 255, 255, 0.08)";
  }

  function resetDropdownItem(color) {
    return function(event) {
      event.currentTarget.style.background = "transparent";
    };
  }

  const currentModel = modelOptions.find(m => m.value === model);
  const currentRatio = ratioOptions.find(r => (r.value || r) === ratio);
  const currentQuality = qualityOptions.find(q => q.value === quality);

  return (
    <div
      className="chatbot-ui-dialog"
      aria-label={ariaLabel}
      style={shellStyle}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <div style={{ marginBottom: "16px" }}>
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              if (canSubmit) onSubmit();
            }
          }}
          placeholder={placeholder}
          rows={1}
          style={{
            width: "100%",
            background: "transparent",
            border: "none",
            outline: "none",
            resize: "none",
            color: "#ffffff",
            fontSize: "16px",
            fontWeight: "400",
            lineHeight: "1.5",
            fontFamily: "inherit",
            minHeight: "28px",
            padding: 0
          }}
        />
      </div>

      {referenceSlot}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          {onAdd && (
            <button
              type="button"
              onClick={onAdd}
              style={buttonBaseStyle}
              aria-label="添加"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#999999" strokeWidth="2" strokeLinecap="round">
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
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(70, 70, 70, 0.9)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(55, 55, 55, 0.8)"; }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8f78ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
              <span>{currentModel?.label || model}</span>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ transform: showModelDropdown ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.2s ease" }}>
                <path d="M3 4.5L6 7.5L9 4.5" stroke="#888888" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
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
                      ...dropdownItemStyle(item.value === model ? "#8f78ff" : "#cccccc"),
                      fontWeight: item.value === model ? "500" : "400",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between"
                    }}
                    onMouseEnter={highlightDropdownItem}
                    onMouseLeave={resetDropdownItem(item.value === model ? "#8f78ff" : "#cccccc")}
                  >
                    {item.label}
                    {item.value === model && (
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M2.5 7L5.5 10L11.5 4" stroke="#8f78ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
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
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(70, 70, 70, 0.9)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(55, 55, 55, 0.8)"; }}
            >
              <span>{currentRatio?.label || currentRatio || ratio}</span>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ transform: showRatioDropdown ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.2s ease" }}>
                <path d="M3 4.5L6 7.5L9 4.5" stroke="#888888" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            {showRatioDropdown && (
              <div style={dropdownMenuStyle(150)}>
                {ratioOptions.map((item) => (
                  <div
                    key={item.value || item}
                    onClick={() => {
                      onRatioChange(item.value || item);
                      setShowRatioDropdown(false);
                    }}
                    style={{
                      ...dropdownItemStyle((item.value || item) === ratio ? "#8f78ff" : "#cccccc"),
                      fontWeight: (item.value || item) === ratio ? "500" : "400",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between"
                    }}
                    onMouseEnter={highlightDropdownItem}
                    onMouseLeave={resetDropdownItem((item.value || item) === ratio ? "#8f78ff" : "#cccccc")}
                  >
                    {item.label || item}
                    {(item.value || item) === ratio && (
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M2.5 7L5.5 10L11.5 4" stroke="#8f78ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                ))}
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
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(70, 70, 70, 0.9)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(55, 55, 55, 0.8)"; }}
            >
              <span>{currentQuality?.label || currentQuality?.value || quality}</span>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ transform: showQualityDropdown ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.2s ease" }}>
                <path d="M3 4.5L6 7.5L9 4.5" stroke="#888888" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
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
                      ...dropdownItemStyle(item.value === quality ? "#8f78ff" : "#cccccc"),
                      fontWeight: item.value === quality ? "500" : "400",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between"
                    }}
                    onMouseEnter={highlightDropdownItem}
                    onMouseLeave={resetDropdownItem(item.value === quality ? "#8f78ff" : "#cccccc")}
                  >
                    {item.label || item.value}
                    {item.value === quality && (
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M2.5 7L5.5 10L11.5 4" stroke="#8f78ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
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
              onClick={onRandom}
              style={buttonBaseStyle}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(70, 70, 70, 0.9)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(55, 55, 55, 0.8)"; }}
              aria-label="随机"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#999999" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
              style={buttonBaseStyle}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(70, 70, 70, 0.9)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(55, 55, 55, 0.8)"; }}
              aria-label="清空"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#999999" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18" />
                <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
              </svg>
            </button>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", justifyContent: "flex-end" }}>
          {price && (
            <span
              style={{
                padding: "8px 12px",
                color: "#f5d475",
                background: "rgba(61, 46, 16, 0.82)",
                border: "1px solid rgba(255, 212, 117, 0.2)",
                borderRadius: "999px",
                fontSize: "12px",
                fontWeight: "900"
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
              background: canSubmit ? buttonBaseStyle.background : "rgba(55, 55, 55, 0.5)",
              border: canSubmit ? buttonBaseStyle.border : "1px solid rgba(255, 255, 255, 0.04)",
              color: canSubmit ? buttonBaseStyle.color : "#8b8b8b",
              fontSize: buttonBaseStyle.fontSize,
              fontWeight: buttonBaseStyle.fontWeight,
              cursor: canSubmit ? "pointer" : "not-allowed",
              opacity: canSubmit ? 1 : 0.6
            }}
            aria-label="生成"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
            生成
          </button>
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
