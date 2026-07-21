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
        <div className="marketing-panel-hero marketing-tool-hero">
          {icon ? <span className="marketing-panel-hero__icon marketing-tool-hero__icon">{icon}</span> : null}
          {title ? <h1 className="marketing-panel-hero__title">{title}</h1> : null}
          {subtitle ? <p className="marketing-panel-hero__subtitle">{subtitle}</p> : null}
        </div>
      ) : null}
      {children}
    </div>
  );
}
