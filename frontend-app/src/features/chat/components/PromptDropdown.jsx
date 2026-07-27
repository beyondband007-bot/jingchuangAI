import React, { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import "./promptDropdown.css";

function normalizeOption(option) {
  if (typeof option === "object" && option !== null) {
    return {
      disabled: Boolean(option.disabled),
      label: option.label ?? option.name ?? option.value,
      raw: option,
      value: option.value,
    };
  }

  return {
    disabled: false,
    label: option,
    raw: option,
    value: option,
  };
}

function toPixels(value) {
  return typeof value === "number" ? value : Number.parseFloat(value) || 0;
}

export function PromptDropdown({
  ariaLabel,
  className = "",
  disabled = false,
  leadingIcon = null,
  onChange,
  options,
  placement = "top",
  renderOption,
  renderValue,
  triggerClassName = "",
  value,
  width = 160,
}) {
  const id = useId();
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [menuPlacement, setMenuPlacement] = useState(placement);
  const [menuStyle, setMenuStyle] = useState(null);
  const normalizedOptions = useMemo(
    () => (options || []).map(normalizeOption),
    [options],
  );
  const selectedOption =
    normalizedOptions.find((option) => String(option.value) === String(value)) ||
    normalizedOptions[0] ||
    null;

  function closeMenu({ restoreFocus = false } = {}) {
    setIsOpen(false);
    if (restoreFocus) triggerRef.current?.focus();
  }

  function openMenu() {
    if (disabled) return;
    window.dispatchEvent(
      new CustomEvent("facemini-prompt-dropdown-open", { detail: id }),
    );
    setIsOpen(true);
  }

  function toggleMenu() {
    if (isOpen) {
      closeMenu();
    } else {
      openMenu();
    }
  }

  function updateMenuPosition() {
    const trigger = triggerRef.current;
    const menu = menuRef.current;
    if (!trigger || !menu) return;

    const viewportPadding = 8;
    const offset = 8;
    const rect = trigger.getBoundingClientRect();
    const requestedWidth = Math.max(toPixels(width), rect.width);
    const menuWidth = Math.min(
      requestedWidth,
      window.innerWidth - viewportPadding * 2,
    );
    const menuHeight = Math.min(menu.offsetHeight, 320);
    const spaceAbove = rect.top - viewportPadding;
    const spaceBelow = window.innerHeight - rect.bottom - viewportPadding;
    const preferredPlacement = placement === "bottom" ? "bottom" : "top";
    const preferredSpace =
      preferredPlacement === "top" ? spaceAbove : spaceBelow;
    const alternatePlacement = preferredPlacement === "top" ? "bottom" : "top";
    const alternateSpace =
      alternatePlacement === "top" ? spaceAbove : spaceBelow;
    const resolvedPlacement =
      preferredSpace >= menuHeight + offset
        ? preferredPlacement
        : alternateSpace >= menuHeight + offset
          ? alternatePlacement
          : spaceAbove > spaceBelow
            ? "top"
            : "bottom";
    const availableHeight = Math.max(
      120,
      (resolvedPlacement === "top" ? spaceAbove : spaceBelow) - offset,
    );
    const left = Math.max(
      viewportPadding,
      Math.min(rect.left, window.innerWidth - menuWidth - viewportPadding),
    );
    const top =
      resolvedPlacement === "top"
        ? Math.max(viewportPadding, rect.top - Math.min(menuHeight, availableHeight) - offset)
        : Math.min(
            window.innerHeight - Math.min(menuHeight, availableHeight) - viewportPadding,
            rect.bottom + offset,
          );

    setMenuPlacement(resolvedPlacement);
    setMenuStyle({
      left: `${left}px`,
      maxHeight: `${availableHeight}px`,
      top: `${top}px`,
      width: `${menuWidth}px`,
    });
  }

  useLayoutEffect(() => {
    if (!isOpen) return undefined;
    const frameId = window.requestAnimationFrame(updateMenuPosition);
    return () => window.cancelAnimationFrame(frameId);
  }, [isOpen, normalizedOptions.length, placement, width]);

  useEffect(() => {
    if (!isOpen) return undefined;

    function closeOtherMenus(event) {
      if (event.detail !== id) closeMenu();
    }

    function closeOnOutside(event) {
      const target = event.target;
      if (!rootRef.current?.contains(target) && !menuRef.current?.contains(target)) {
        closeMenu();
      }
    }

    function closeOnEscape(event) {
      if (event.key === "Escape") closeMenu({ restoreFocus: true });
    }

    function repositionOrClose(event) {
      if (menuRef.current?.contains(event.target)) return;
      closeMenu();
    }

    window.addEventListener("facemini-prompt-dropdown-open", closeOtherMenus);
    document.addEventListener("pointerdown", closeOnOutside, true);
    document.addEventListener("keydown", closeOnEscape);
    document.addEventListener("wheel", repositionOrClose, true);
    document.addEventListener("touchmove", repositionOrClose, true);
    window.addEventListener("resize", repositionOrClose);
    window.addEventListener("scroll", repositionOrClose, true);
    return () => {
      window.removeEventListener("facemini-prompt-dropdown-open", closeOtherMenus);
      document.removeEventListener("pointerdown", closeOnOutside, true);
      document.removeEventListener("keydown", closeOnEscape);
      document.removeEventListener("wheel", repositionOrClose, true);
      document.removeEventListener("touchmove", repositionOrClose, true);
      window.removeEventListener("resize", repositionOrClose);
      window.removeEventListener("scroll", repositionOrClose, true);
    };
  }, [id, isOpen]);

  useEffect(() => {
    if (disabled) closeMenu();
  }, [disabled]);

  function selectOption(option) {
    if (option.disabled) return;
    onChange?.(option.value, option.raw);
    closeMenu({ restoreFocus: true });
  }

  const menu = isOpen ? (
    <div
      ref={menuRef}
      className={`prompt-dropdown__menu prompt-dropdown__menu--${menuPlacement}`}
      role="listbox"
      aria-label={ariaLabel}
      style={menuStyle || undefined}
    >
      {normalizedOptions.map((option) => {
        const isSelected = String(option.value) === String(selectedOption?.value);
        return (
          <button
            key={String(option.value)}
            className={`${isSelected ? "is-selected" : ""} ${option.disabled ? "is-disabled" : ""}`.trim()}
            type="button"
            role="option"
            aria-selected={isSelected}
            disabled={option.disabled}
            onClick={() => selectOption(option)}
          >
            {renderOption
              ? renderOption(option.raw, isSelected, option)
              : option.label}
          </button>
        );
      })}
    </div>
  ) : null;

  return (
    <>
      <div
        ref={rootRef}
        className={`prompt-dropdown ${isOpen ? "is-open" : ""} ${disabled ? "is-disabled" : ""} ${className}`.trim()}
      >
        <button
          ref={triggerRef}
          className={`prompt-dropdown__trigger ${triggerClassName}`.trim()}
          type="button"
          aria-label={ariaLabel}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          disabled={disabled}
          onClick={toggleMenu}
        >
          {leadingIcon}
          {renderValue ? renderValue(selectedOption, isOpen) : <span>{selectedOption?.label}</span>}
          <svg className="prompt-dropdown__chevron" width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
      {menu ? createPortal(menu, document.body) : null}
    </>
  );
}
