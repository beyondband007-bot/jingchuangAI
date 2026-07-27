import React from "react";
import { PageTitle } from "./PageTitle";
import "../features/marketing-tool-ui/marketingToolStyles.css";

export function MarketingToolPanel({
  title,
  subtitle,
  icon = null,
  className = "",
  children,
}) {
  return (
    <div className={`marketing-tool-page marketing-tool-panel ${className}`.trim()}>
      {title || subtitle || icon ? (
        <div className="marketing-panel-hero marketing-tool-hero">
          {icon ? <span className="marketing-panel-hero__icon marketing-tool-hero__icon">{icon}</span> : null}
          {title ? <PageTitle className="marketing-panel-hero__title">{title}</PageTitle> : null}
          {subtitle ? <p className="marketing-panel-hero__subtitle">{subtitle}</p> : null}
        </div>
      ) : null}
      {children}
    </div>
  );
}
