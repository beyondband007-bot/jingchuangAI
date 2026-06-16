import React from "react";
import { ChevronDown, FileAudio, FileText, Info, Music, Wand2 } from "lucide-react";
import "./aiMusicGenerationWorkbenchCard.css";

const styleTags = ["流行", "电子", "嘻哈", "古典", "国风", "轻音乐", "摇滚", "爵士"];

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
    <section className="ai-music-workbench">
      <div className="ai-music-workbench__layout">
        <div className="ai-music-workbench__mode-tabs">
          <button type="button" className={!isInstrumental ? "is-active" : ""} onClick={() => onToggleInstrumental(false)}>
            <FileText size={15} />
            带歌词
          </button>
          <button type="button" className={isInstrumental ? "is-active" : ""} onClick={() => onToggleInstrumental(true)}>
            <Music size={15} />
            纯音乐
          </button>
        </div>
        <section className="ai-music-workbench__card ai-music-workbench__studio">
          <label className="ai-music-workbench__field-title">
            <span>1</span>
            风格 / 场景描述
            <Info size={16} />
          </label>
          <div className="ai-music-workbench__textarea ai-music-workbench__style-box">
            <textarea
              value={prompt}
              onChange={(event) => onPromptChange(event.target.value)}
              placeholder="例如：独立民谣，忧郁，内省，温暖，致敬追梦，咖啡馆氛围"
              maxLength={200}
              disabled={isGenerating}
            />
            <em>{prompt.length} / 200</em>
          </div>

          <div className="ai-music-workbench__tags">
            <b>智能推荐：</b>
            {styleTags.map((tag) => (
              <button key={tag} type="button" onClick={() => onUseStyleTag(tag)}>{tag}</button>
            ))}
          </div>

          {!isInstrumental && (
            <>
              <label className="ai-music-workbench__field-title">
                <span>2</span>
                歌词
                <Info size={16} />
                <small>支持 [Verse] [Chorus] [Bridge] 等标签</small>
              </label>
              <div className="ai-music-workbench__textarea ai-music-workbench__lyric-box">
                <textarea
                  value={lyrics}
                  onChange={(event) => onLyricsChange(event.target.value)}
                  placeholder={"请输入歌词..."}
                  disabled={isGenerating}
                />
              </div>
            </>
          )}

          <div className="ai-music-workbench__bottom-options">
            <label>
              <input
                type="checkbox"
                checked={lyricsOptimizer}
                onChange={(event) => onToggleLyricsOptimizer(event.target.checked)}
                disabled={isGenerating || isInstrumental}
              />
              <span>自动优化歌词</span>
              <Info size={14} />
            </label>
           </div>

          <div className="ai-music-workbench__submit-row">
            <p>本次生成预计消耗 <strong>30</strong> 积分</p>
            <button className="ai-music-workbench__generate" type="button" onClick={onGenerate} disabled={isGenerating || !canGenerate}>
              <Wand2 size={20} />
              {isGenerating ? "生成中..." : "生成音乐"}
            </button>
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
        </section>
      </div>
    </section>
  );
}
