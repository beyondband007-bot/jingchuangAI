import React, { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

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

export function CustomSelect({
  value,
  onChange,
  options,
  icon: Icon,
  className = "",
  ariaLabel,
  placeholder = "请选择",
  disabled = false
}) {
  const rootRef = useRef(null);
  const [open, setOpen] = useState(false);
  const normalizedOptions = useMemo(() => (options || []).map(normalizeOption), [options]);
  const selectedOption = normalizedOptions.find((item) => String(item.value) === String(value)) || normalizedOptions[0] || null;

  useEffect(() => {
    if (!open) return undefined;

    function closeOnOutside(event) {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    }

    function closeOnEscape(event) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", closeOnOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  function pickOption(option) {
    if (disabled) return;
    onChange?.(option.value, option);
    setOpen(false);
  }

  return (
    <div ref={rootRef} className={`custom-select ${open ? "is-open" : ""} ${disabled ? "is-disabled" : ""} ${className}`.trim()}>
      <button
        className="custom-select-trigger"
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
      >
        {Icon ? <Icon size={16} /> : null}
        <span>{selectedOption?.label ?? placeholder}</span>
        <ChevronDown className="custom-select-chevron" size={15} />
      </button>
      <div className="custom-select-menu" role="listbox" aria-label={ariaLabel}>
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
              <span>{option.label}</span>
              {isSelected ? <Check size={16} /> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
