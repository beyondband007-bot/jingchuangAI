import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown } from "lucide-react";
import "./customSelect.css";

function normalizeOption(item) {
  if (typeof item === "object" && item !== null) {
    return {
      value: item.value,
      label: item.label ?? item.name ?? item.value
    };
  }

  return {
    value: item,
    label: item
  };
}

function parseRatio(value) {
  const match = String(value || "1:1").match(/(\d+)\s*:\s*(\d+)/);
  if (!match) return { width: 1, height: 1 };

  return {
    width: Number(match[1]) || 1,
    height: Number(match[2]) || 1,
  };
}

function RatioPreviewIcon({ ratio, selected = false }) {
  const { width, height } = parseRatio(ratio);
  const isPortrait = height > width;
  const isSquare = width === height;
  const isUltraWide = !isPortrait && !isSquare && width / height >= 2;

  return (
    <span className="ratio-preview-slot" aria-hidden="true">
      <span
        className={`ratio-preview-icon ${selected ? "is-selected" : ""}`}
        style={{
          width: isSquare ? "18px" : isPortrait ? "14px" : isUltraWide ? "26px" : "22px",
          height: isSquare ? "18px" : isPortrait ? "22px" : isUltraWide ? "12px" : "14px",
        }}
      />
    </span>
  );
}

function measureMenuContentWidth(triggerElement, normalizedOptions, hasRatioIcon = false) {
  if (!triggerElement || normalizedOptions.length === 0 || typeof document === "undefined") {
    return 0;
  }

  const computedStyle = window.getComputedStyle(triggerElement);
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) return 0;

  context.font = computedStyle.font;

  const widestLabel = normalizedOptions.reduce((maxWidth, option) => {
    const labelWidth = context.measureText(String(option.label ?? "")).width;
    return Math.max(maxWidth, labelWidth);
  }, 0);

  return Math.ceil(widestLabel + 72 + (hasRatioIcon ? 38 : 0));
}

export function CustomSelect({
  value,
  onChange,
  options,
  icon: Icon,
  className = "",
  triggerClassName = "",
  ariaLabel,
  placeholder = "请选择",
  disabled = false,
  showRatioIcon = false,
  menuZIndex
}) {
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [menuPlacement, setMenuPlacement] = useState("top");
  const [menuStyle, setMenuStyle] = useState(null);
  const normalizedOptions = useMemo(() => (options || []).map(normalizeOption), [options]);
  const selectedOption = normalizedOptions.find((item) => String(item.value) === String(value)) || normalizedOptions[0] || null;

  function updateMenuPosition() {
    if (!triggerRef.current) return;

    const rect = triggerRef.current.getBoundingClientRect();
    const estimatedHeight = Math.min(menuRef.current?.offsetHeight || (normalizedOptions.length * 40 + 16), 280);
    const shouldFitContent = Boolean(
      rootRef.current?.classList.contains("content-fit-select") ||
      rootRef.current?.closest(".face-swap-workbench__setting--model")
    );
    const contentWidth = shouldFitContent
      ? measureMenuContentWidth(triggerRef.current, normalizedOptions, showRatioIcon)
      : 0;
    const width = Math.min(
      window.innerWidth - 16,
      Math.ceil(shouldFitContent ? Math.max(rect.width, contentWidth) : rect.width)
    );
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const requiredHeight = Math.min(estimatedHeight + 12, window.innerHeight - 16);
    const canOpenBelow = spaceBelow >= requiredHeight;
    const canOpenAbove = spaceAbove >= requiredHeight;
    const openUpward = !canOpenBelow && canOpenAbove;
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8));
    const top = openUpward
      ? Math.max(8, rect.top - estimatedHeight - 8)
      : Math.min(window.innerHeight - estimatedHeight - 8, rect.bottom + 8);

    setMenuPlacement(openUpward ? "top" : "bottom");
    setMenuStyle({
      position: "fixed",
      top: `${top}px`,
      left: `${left}px`,
      width: `${width}px`,
      zIndex: menuZIndex || "var(--z-dropdown)"
    });
  }

  useEffect(() => {
    if (!open) return undefined;

    function closeOnOutside(event) {
      const target = event.target;
      const isInsideTrigger = rootRef.current?.contains(target);
      const isInsideMenu = menuRef.current?.contains(target);

      if (!isInsideTrigger && !isInsideMenu) setOpen(false);
    }

    function closeOnEscape(event) {
      if (event.key === "Escape") setOpen(false);
    }

    updateMenuPosition();

    function closeOnPageInteraction(event) {
      const target = event.target;
      const isInsideMenu = menuRef.current?.contains(target);

      if (!isInsideMenu) setOpen(false);
    }

    document.addEventListener("pointerdown", closeOnOutside, true);
    document.addEventListener("keydown", closeOnEscape);
    document.addEventListener("wheel", closeOnPageInteraction, true);
    document.addEventListener("touchmove", closeOnPageInteraction, true);
    window.addEventListener("resize", closeOnPageInteraction);
    window.addEventListener("scroll", closeOnPageInteraction, true);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutside, true);
      document.removeEventListener("keydown", closeOnEscape);
      document.removeEventListener("wheel", closeOnPageInteraction, true);
      document.removeEventListener("touchmove", closeOnPageInteraction, true);
      window.removeEventListener("resize", closeOnPageInteraction);
      window.removeEventListener("scroll", closeOnPageInteraction, true);
    };
  }, [open, normalizedOptions.length, showRatioIcon, menuZIndex]);

  function pickOption(option) {
    if (disabled) return;
    onChange?.(option.value, option);
    setOpen(false);
  }

  const menu = open ? (
    <div
      ref={menuRef}
      className={`custom-select-menu is-floating is-${menuPlacement}`}
      role="listbox"
      aria-label={ariaLabel}
      style={menuStyle || undefined}
    >
      {normalizedOptions.map((option) => {
        const isSelected = String(option.value) === String(selectedOption?.value);

        return (
          <button
            className={isSelected ? "is-selected" : ""}
            type="button"
            role="option"
            aria-selected={isSelected}
            key={option.value}
            onClick={() => pickOption(option)}
          >
            <span>
              {showRatioIcon ? <RatioPreviewIcon ratio={option.value} selected={isSelected} /> : null}
              <span>{option.label}</span>
            </span>
          </button>
        );
      })}
    </div>
  ) : null;

  return (
    <>
      <div ref={rootRef} className={`custom-select ${open ? "is-open" : ""} ${disabled ? "is-disabled" : ""} ${className}`.trim()}>
      <button
        ref={triggerRef}
        className={`custom-select-trigger ${triggerClassName}`.trim()}
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
      >
        {Icon ? <Icon size={16} /> : null}
        <span className="custom-select-trigger__value">
          {showRatioIcon && selectedOption ? (
            <RatioPreviewIcon ratio={selectedOption.value} selected={open} />
          ) : null}
          <span>{selectedOption?.label ?? placeholder}</span>
        </span>
        <ChevronDown className="custom-select-chevron" size={15} />
      </button>
      </div>
      {menu ? createPortal(menu, document.body) : null}
    </>
  );
}
