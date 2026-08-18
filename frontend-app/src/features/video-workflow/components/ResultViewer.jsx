import React from "react";

export function ResultViewer({
  afterUrl,
  posterUrl = ""
}) {
  return (
    <section className="vgw-step vgw-step--result is-visible">
      <div className="vgw-step__label">
        <span>03</span>
        <strong>生成结果</strong>
      </div>
      <div className="vgw-glass-card vgw-result-card">
        {afterUrl ? <div className="vgw-result-card__player"><video src={afterUrl} controls playsInline preload="metadata" poster={posterUrl} /></div> : null}
      </div>
    </section>
  );
}
