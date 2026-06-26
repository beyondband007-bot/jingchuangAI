import React from "react";
import { Download } from "lucide-react";
import { BeforeAfterPlayer } from "../../face-swap/components/BeforeAfterPlayer";

export function ResultViewer({
  beforeUrl,
  afterUrl,
  posterUrl = "",
  compareLabels = ["原视频", "生成结果"],
  showCompare = true,
}) {
  const hasCompare = showCompare && beforeUrl && afterUrl;

  return (
    <section className="vgw-step vgw-step--result is-visible">
      <div className="vgw-step__label">
        <span>03</span>
        <strong>生成结果</strong>
      </div>
      <div className="vgw-glass-card vgw-result-card">
        {afterUrl ? (
          hasCompare ? (
            <BeforeAfterPlayer
              beforeUrl={beforeUrl}
              afterUrl={afterUrl}
              posterUrl={posterUrl}
              beforeLabel={compareLabels[0]}
              afterLabel={compareLabels[1]}
            />
          ) : (
            <div className="vgw-result-card__player">
              <video
                src={afterUrl}
                controls
                playsInline
                preload="metadata"
                poster={posterUrl}
              />
            </div>
          )
        ) : null}
        {afterUrl && (
          <div className="vgw-result-card__actions">
            <a className="vgw-result-card__download" href={afterUrl} download>
              <Download size={16} />
              下载视频
            </a>
          </div>
        )}
      </div>
    </section>
  );
}
