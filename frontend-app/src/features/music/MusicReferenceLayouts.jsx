import React from "react";
import { ChevronRight, Clock, Music, Sparkles } from "lucide-react";
import { AiMusicGenerationWorkbenchCard } from "../music-generation-ui/AiMusicGenerationWorkbenchCard";
import { MusicRecentGrid } from "./MusicRecentGrid";

export function MusicReferenceComposer({
  composerProps,
  recentItems,
  onViewAll,
  onSelectItem,
  onDownloadItem,
  onEditCoverItem,
  onDeleteItem,
  onRetryItem,
}) {
  return (
    <div className="music-ref-layout">
      <div className="music-ref-hero">
        <h1><Music size={40} /> 创建你的音乐</h1>
        <p>输入歌词与风格，AI 为你创作独一无二的音乐作品 <Sparkles size={16} /></p>
      </div>

      <div className="music-ref-form">
        <AiMusicGenerationWorkbenchCard {...composerProps} />
      </div>

      <div className="music-ref-recent">
        <div className="music-ref-section-head">
          <h3><Clock size={18} /> 最近生成</h3>
          <button type="button" className="music-ref-link" onClick={onViewAll}>
            查看全部 <ChevronRight size={14} />
          </button>
        </div>
        <MusicRecentGrid
          items={recentItems}
          onSelectItem={onSelectItem}
          onDownloadItem={onDownloadItem}
          onEditCoverItem={onEditCoverItem}
          onDeleteItem={onDeleteItem}
          onRetryItem={onRetryItem}
        />
      </div>
    </div>
  );
}

export function MusicHistoryList({
  items,
  onSelectItem,
  onDownloadItem,
  onEditCoverItem,
  onDeleteItem,
  onRetryItem,
}) {
  return (
    <div className="music-ref-layout">
      <div className="music-ref-recent">
        <MusicRecentGrid
          items={items}
          onSelectItem={onSelectItem}
          onDownloadItem={onDownloadItem}
          onEditCoverItem={onEditCoverItem}
          onDeleteItem={onDeleteItem}
          onRetryItem={onRetryItem}
        />
      </div>
    </div>
  );
}
