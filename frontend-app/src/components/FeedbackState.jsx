import React from "react";

export function FeedbackState({
  variant = "empty",
  className = "",
  illustrationSrc,
  illustrationAlt = "",
  title,
  description,
}) {
  const rootClassName = [`ui-${variant}`, className].filter(Boolean).join(" ");
  const resolvedIllustrationSrc = illustrationSrc || (
    variant === "empty" ? "/assets/article/empty/kong.png" : ""
  );

  return (
    <div className={rootClassName} aria-live={variant === "loading" ? "polite" : undefined}>
      {resolvedIllustrationSrc && (
        <img className="ui-empty__illustration" src={resolvedIllustrationSrc} alt={illustrationAlt} />
      )}
      {title && <strong className="ui-empty__title">{title}</strong>}
    </div>
  );
}
