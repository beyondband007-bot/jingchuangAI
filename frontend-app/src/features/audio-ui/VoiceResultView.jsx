import React, { useState } from "react";
import { ArrowLeft, Download, Heart, Music } from "lucide-react";
import { VoiceRecentPlayer } from "./VoiceRecentPlayer";
import "./voiceResult.css";

export function VoiceResultView({
  result,
  onBack,
  onDownload,
  onFavoriteToggle,
}) {
  const [playingId, setPlayingId] = useState("");
  const favorite = Boolean(result?.favorite);
  const playerId = `voice-result-${result?.id || "current"}`;

  return (
    <div className="voice-result-view">
      <button className="voice-result-back" type="button" onClick={onBack}>
        <ArrowLeft size={20} />
        <span>返回主页</span>
      </button>

      <div className="voice-result-content">
        <div className="voice-result-heading">
          <span className="voice-result-heading__icon"><Music size={24} /></span>
          <div>
            <h1>音频生成完成</h1>
            <p>你的音频已生成，可直接播放或下载保存</p>
          </div>
        </div>

        <article className="voice-recent-card voice-result-card">
          <div className="voice-recent-info">
            <strong>{result?.title || "生成音频"}</strong>
            <span>{result?.voiceName}{result?.createdAt ? ` · ${result.createdAt}` : ""}</span>
          </div>
          <VoiceRecentPlayer
            playerId={playerId}
            src={result?.audioUrl || result?.audioDataUrl}
            durationMs={result?.durationMs}
            disabled={!result?.audioUrl && !result?.audioDataUrl}
            playingId={playingId}
            onPlayingChange={setPlayingId}
          >
            <button
              className="voice-recent-icon-button"
              type="button"
              onClick={onDownload}
              data-tooltip="下载 MP3"
              aria-label="下载 MP3"
            >
              <Download size={18} />
            </button>
            <button
              className={`voice-recent-icon-button ${favorite ? "is-favorite" : ""}`}
              type="button"
              onClick={onFavoriteToggle}
              data-tooltip={favorite ? "取消收藏" : "收藏"}
              aria-label={favorite ? "取消收藏" : "收藏"}
            >
              <Heart size={18} fill={favorite ? "currentColor" : "none"} />
            </button>
          </VoiceRecentPlayer>
        </article>
      </div>
    </div>
  );
}
