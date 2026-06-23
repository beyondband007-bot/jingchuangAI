import React from "react";
import { AudioLines, FileAudio, FileText, Info, Music, Wand2 } from "lucide-react";
import "./aiMusicGenerationWorkbenchCard.css";

const styleTags = ["流行", "民谣", "嘻哈", "电子", "摇滚", "R&B", "古典", "轻音乐", "国风", "更多"];

function isStyleTagSelected(prompt, tag) {
  if (tag === "更多") return false;
  const parts = String(prompt || "")
    .split(/[，,、]/)
    .map((part) => part.trim())
    .filter(Boolean);
  return parts.includes(tag);
}

export function AiMusicGenerationWorkbenchCard({
  prompt,
  lyrics,
  isInstrumental,
  lyricsOptimizer,
  model,
  isGenerating,
  canGenerate,
  notice,
  currentResult,
  onPromptChange,
  onLyricsChange,
  onToggleInstrumental,
  onToggleLyricsOptimizer,
  onGenerate,
  onUseStyleTag,
  onDownloadMp3,
  onDownloadLyrics
}) {
  return (
    <section className="ai-music-workbench ai-music-workbench--ref">
      <div className="ai-music-workbench__card ai-music-workbench__studio">
        {/* Mode tabs */}
        <div className="ai-music-workbench__mode-tabs">
          <button type="button" className={!isInstrumental ? "is-active" : ""} onClick={() => onToggleInstrumental(false)}>
            <FileText size={15} />
            带歌词创作
          </button>
          <button type="button" className={isInstrumental ? "is-active" : ""} onClick={() => onToggleInstrumental(true)}>
            <Music size={15} />
            纯音乐创作
          </button>
        </div>

        {/* Two-column form */}
        <div className={`ai-music-workbench__columns ${isInstrumental ? "is-instrumental" : ""}`}>
          {/* Left: style + tags */}
          <div className="ai-music-workbench__column ai-music-workbench__column--left">
            <label className="ai-music-workbench__field-title">
              <AudioLines size={17} />
              风格 / 场景描述
            </label>
            <div className="ai-music-workbench__textarea ai-music-workbench__style-box">
              <textarea
                value={prompt}
                onChange={(event) => onPromptChange(event.target.value)}
                placeholder="描述你想要的音乐风格、情绪或场景，例如：爱情，流行，温暖治愈"
                maxLength={200}
                disabled={isGenerating}
              />
              <em>{prompt.length} / 200</em>
            </div>

            <div className="ai-music-workbench__tags">
              <span className="ai-music-workbench__tags-label">推荐风格</span>
              <div className="ai-music-workbench__tags-list">
                {styleTags.map((tag) => {
                  const isSelected = isStyleTagSelected(prompt, tag);
                  return (
                  <button
                    key={tag}
                    type="button"
                    className={isSelected ? "is-active" : ""}
                    onClick={() => onUseStyleTag(tag === "更多" ? "爵士" : tag)}
                  >
                    {isSelected ? <Music size={13} /> : null}
                    {tag}
                  </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right: lyrics */}
          {!isInstrumental && (
            <div className="ai-music-workbench__column ai-music-workbench__column--right">
              <label className="ai-music-workbench__field-title">
                <Music size={17} />
                歌词
              </label>
              <div className="ai-music-workbench__textarea ai-music-workbench__lyric-box">
                <textarea
                  value={lyrics}
                  onChange={(event) => onLyricsChange(event.target.value)}
                  placeholder="输入歌词，越详细越有助于生成符合你期望的歌曲"
                  maxLength={3000}
                  disabled={isGenerating}
                />
                <em>{lyrics.length} / 3000</em>
              </div>
            </div>
          )}
        </div>

        {/* Options */}
        <div className="ai-music-workbench__bottom-options">
          <label className="ai-music-workbench__switch-label">
            <input
              type="checkbox"
              checked={lyricsOptimizer}
              onChange={(event) => onToggleLyricsOptimizer(event.target.checked)}
              disabled={isGenerating || isInstrumental}
            />
            <span className="ai-music-workbench__switch" />
            <span className="ai-music-workbench__switch-text">自动优化歌词</span>
            <Info size={14} />
          </label>
        </div>

        {/* Submit */}
        <div className="ai-music-workbench__submit-row">
          <button className="ai-music-workbench__generate" type="button" onClick={onGenerate} disabled={isGenerating || !canGenerate}>
            <Wand2 size={20} />
            {isGenerating ? "生成中..." : "立即生成音乐"}
          </button>
          <p>本次生成预计消耗 <strong>30</strong> 积分</p>
        </div>

        {notice ? <div className="ai-music-workbench__notice">{notice}</div> : null}

        {currentResult ? (
          <div className="ai-music-workbench__result">
            <div className="ai-music-workbench__result-head">
              <span><FileAudio size={16} /> {currentResult.prompt || "音乐生成完成"}</span>
              <div>
                <button type="button" onClick={onDownloadMp3}><FileAudio size={14} /> MP3</button>
                {currentResult.lyrics ? <button type="button" onClick={onDownloadLyrics}><FileText size={14} /> 歌词</button> : null}
              </div>
            </div>
            <audio controls src={currentResult.audioUrl} />
          </div>
        ) : null}
      </div>
    </section>
  );
}
