import React from "react";

export function PromptSelectField({ icon: Icon, value, onChange, options, className = "", ariaLabel }) {
  return (
    <label className={`control-select ${className}`.trim()} aria-label={ariaLabel}>
      {Icon ? <Icon size={16} /> : null}
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((item) => {
          const option = typeof item === "object"
            ? { value: item.value, label: item.label ?? item.value }
            : { value: item, label: item };

          return (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          );
        })}
      </select>
    </label>
  );
}
