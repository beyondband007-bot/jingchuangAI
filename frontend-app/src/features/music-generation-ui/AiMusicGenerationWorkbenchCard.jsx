import React from "react";
import { ChevronDown, ChevronRight, FileAudio, FileText, Info, Play, Sparkles, Wand2 } from "lucide-react";
import "./aiMusicGenerationWorkbenchCard.css";

const styleTags = ["流行", "电子", "嘻哈", "古典", "国风", "轻音乐", "摇滚", "爵士"];

const presetCards = [
  { title: "温暖治愈", desc: "轻柔舒缓，温暖治愈，适合放松与陪伴", accent: "cover-1" },
  { title: "动感流行", desc: "节奏明快，活力四射，适合运动与派对", accent: "cover-2" },
  { title: "史诗电影", desc: "磅礴大气，情绪丰富，适合影视配乐", accent: "cover-3" },
  { title: "国风古韵", desc: "古典韵味，悠扬婉转，适合传统文化", accent: "cover-4" }
];

function PresetCard({ item, index, onUse }) {
  return (
    <button className={`ai-music-workbench__preset ${index === 0 ? "is-active" : ""}`} type="button" onClick={() => onUse(item)}>
      <span className={`ai-music-workbench__preset-cover ${item.accent}`} />
      <span className="ai-music-workbench__preset-copy">
        <strong>{item.title}</strong>
        <small>{item.desc}</small>
      </span>
      <span className="ai-music-workbench__play"><Play size={15} fill="currentColor" /></span>
    </button>
  );
}

function SelectRow({ label, value }) {
  return (
    <div className="ai-music-workbench__select-row">
      <span>{label}</span>
      <button type="button">{value}<ChevronDown size={16} /></button>
    </div>
  );
}

export function AiMusicGenerationWorkbenchCard({
  prompt,
  lyrics,
  isInstrumental,
  lyricsOptimizer,
  model,
  isGenerating,
  notice,
  currentResult,
  onPromptChange,
  onLyricsChange,
  onToggleInstrumental,
  onToggleLyricsOptimizer,
  onGenerate,
  onUsePreset,
  onUseStyleTag,
  onDownloadMp3,
  onDownloadLyrics
}) {
  return (
    <section className="ai-music-workbench">
      <div className="ai-music-workbench__layout">
        <section className="ai-music-workbench__card ai-music-workbench__studio">
          <div className="ai-music-workbench__mode-tabs">
            <button type="button" className={!isInstrumental ? "is-active" : ""} onClick={() => onToggleInstrumental(false)}>带歌词</button>
            <button type="button" className={isInstrumental ? "is-active" : ""} onClick={() => onToggleInstrumental(true)}>纯音乐</button>
          </div>

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
                  placeholder={"[Verse]\n第一段歌词...\n[Chorus]\n副歌歌词...\n[Verse 2]\n第二段歌词..."}
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
              <span>MiniMax 自动优化歌词</span>
              <Info size={14} />
            </label>
            <button type="button" className="ai-music-workbench__model">模型：{model}<ChevronDown size={15} /></button>
          </div>

          <button className="ai-music-workbench__generate" type="button" onClick={onGenerate} disabled={isGenerating || !prompt.trim()}>
            <Wand2 size={20} />
            {isGenerating ? "生成中..." : "生成音乐"}
          </button>

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

        <aside className="ai-music-workbench__side">
          <section className="ai-music-workbench__card">
            <div className="ai-music-workbench__panel-title">
              <h3>风格预设</h3>
              <span>更多预设 <ChevronRight size={14} /></span>
            </div>
            {presetCards.map((item, index) => (
              <PresetCard key={item.title} item={item} index={index} onUse={onUsePreset} />
            ))}
          </section>

          <section className="ai-music-workbench__card">
            <div className="ai-music-workbench__panel-title">
              <h3>高级设置</h3>
              <ChevronDown size={16} />
            </div>
            <SelectRow label="音乐时长" value="3:00" />
            <SelectRow label="BPM" value="自动" />
            <SelectRow label="调式 (Key)" value="自动" />
            <SelectRow label="乐器偏好" value="自动匹配" />
            <div className="ai-music-workbench__tip">
              <Sparkles size={18} />
              <div>
                <b>创作小贴士</b>
                <p>描述越具体，AI 生成的音乐越符合预期。可添加情绪、场景、乐器和节奏信息。</p>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </section>
  );
}
