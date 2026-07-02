import React from "react";

export function MarketingToolPanel({
  title,
  subtitle,
  icon = null,
  className = "",
  children,
}) {
  return (
    <div className={`marketing-tool-panel ${className}`.trim()}>
      {title || subtitle || icon ? (
        <div className="marketing-tool-hero">
          {icon ? <span className="marketing-tool-hero__icon">{icon}</span> : null}
          {title ? <h1>{title}</h1> : null}
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
      ) : null}
      {children}
    </div>
  );
}
