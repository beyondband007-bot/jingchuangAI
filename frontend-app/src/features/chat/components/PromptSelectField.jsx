import React from "react";
import { CustomSelect } from "../../../components/CustomSelect";

export function PromptSelectField({ icon: Icon, value, onChange, options, className = "", ariaLabel }) {
  return (
    <CustomSelect
      ariaLabel={ariaLabel}
      className={`control-select ${className}`.trim()}
      icon={Icon}
      value={value}
      onChange={onChange}
      options={options}
    />
  );
}
