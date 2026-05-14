import React, { useEffect, useRef, useState } from "react";
import { Download, FileAudio, FileText, Loader2, Music, Pause, Play, Sparkles, Star } from "lucide-react";
import { musicApi } from "./musicApi";

const musicRecentStorageKey = "jingchuang.music.recentResults";

function formatDuration(ms) {
  const seconds = Math.round(Number(ms || 0) / 1000);
  if (!seconds) return "";
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return minutes ? `${minutes}:${String(rest).padStart(2, "0")}` : `${rest}s`;
}

function loadRecentResults() {
  try {
    return JSON.parse(window.localStorage.getItem(musicRecentStorageKey) || "[]");
  } catch {
    return [];
  }
}

function makeFileName(prefix, ext) {
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\..+/, "").replace("T", "-");
  return `${prefix}-${stamp}.${ext}`;
}

function downloadBlob({ content, fileName, type }) {
  const blob = new Blob([content], { type });
  const href = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = href;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(href);
}

async function downloadAudioUrl(audioUrl, fileName) {
  const response = await fetch(audioUrl);
  if (!response.ok) throw new Error("音乐下载失败");
  downloadBlob({
    content: await response.blob(),
    fileName,
    type: response.headers.get("Content-Type") || "audio/mpeg"
  });
}

function MusicComposer({
  prompt,
  setPrompt,
  lyrics,
  setLyrics,
  isInstrumental,
  setIsInstrumental,
  lyricsOptimizer,
  setLyricsOptimizer,
  model,
  isGenerating,
  onGenerate,
  notice
}) {
  return (
    <div className="voice-floating-composer music-composer">
      <div className="voice-composer-title">
        <Sparkles size={16} />
        AI 音乐工作台
      </div>

      <div className="music-mode-toggle">
        <button type="button" className={!isInstrumental ? "active" : ""} onClick={() => setIsInstrumental(false)}>
          带歌词
        </button>
        <button type="button" className={isInstrumental ? "active" : ""} onClick={() => setIsInstrumental(true)}>
          纯音乐
        </button>
      </div>

      <div className="composer-field">
        <label htmlFor="music-prompt">风格 / 场景描述</label>
        <textarea
          id="music-prompt"
          rows={3}
          placeholder="例如：独立民谣，忧郁，内省，渴望，独自漫步，咖啡馆氛围"
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          disabled={isGenerating}
        />
      </div>

      {!isInstrumental && (
        <div className="composer-field">
          <label htmlFor="music-lyrics">
            歌词
            <span className="field-hint">支持 [Verse][Chorus][Bridge] 等标签</span>
          </label>
          <textarea
            id="music-lyrics"
            rows={5}
            placeholder={"[Verse]\n第一段歌词...\n[Chorus]\n副歌歌词..."}
            value={lyrics}
            onChange={(event) => setLyrics(event.target.value)}
            disabled={isGenerating}
          />
        </div>
      )}

      <div className="composer-options">
        <label className="opt-checkbox">
          <input
            type="checkbox"
            checked={lyricsOptimizer}
            onChange={(event) => setLyricsOptimizer(event.target.checked)}
            disabled={isGenerating || isInstrumental}
          />
          MiniMax 自动优化歌词
        </label>
        <span className="composer-model">模型：{model}</span>
      </div>

      <button className="music-generate-button" type="button" onClick={onGenerate} disabled={isGenerating || !prompt.trim()}>
        {isGenerating ? <Loader2 size={16} /> : <Sparkles size={16} />}
        {isGenerating ? "生成中..." : "生成音乐"}
      </button>

      {notice && <div className="music-composer-notice">{notice}</div>}
    </div>
  );
}

function MusicResult({ result, onDownloadMp3, onDownloadLrc }) {
  if (!result) return null;

  return (
    <div className="transcribe-result-panel music-result-panel">
      <div className="transcribe-result-head">
        <span>
          <FileAudio size={17} />
          {result.prompt || "音乐生成完成"}
        </span>
        <div className="transcribe-result-actions">
          <button type="button" onClick={onDownloadMp3} title="下载 MP3" aria-label="下载 MP3">
            <Download size={15} />
          </button>
          {result.lyrics && (
            <button type="button" onClick={onDownloadLrc} title="下载歌词" aria-label="下载歌词">
              <FileText size={15} />
            </button>
          )}
        </div>
      </div>

      <audio controls src={result.audioUrl} />

      <div className="transcribe-result-meta">
        <span>{formatDuration(result.durationMs) || "音乐"}</span>
        <span>{result.model}</span>
        {result.traceId && <span>Trace {String(result.traceId).slice(0, 8)}</span>}
      </div>

      {/* Lyrics preview removed per user feedback */}
    </div>
  );
}

export function MusicGenerationView() {
  const [prompt, setPrompt] = useState("");
  const [lyrics, setLyrics] = useState("");
  const [isInstrumental, setIsInstrumental] = useState(false);
  const [lyricsOptimizer, setLyricsOptimizer] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [notice, setNotice] = useState("");
  const [currentResult, setCurrentResult] = useState(null);
  const [viewTab, setViewTab] = useState("home");
  const [recentResults, setRecentResults] = useState(loadRecentResults);
  const [playingRecentId, setPlayingRecentId] = useState("");
  const [recentProgress, setRecentProgress] = useState({});
  const [recentTimes, setRecentTimes] = useState({});
  const recentAudioRefs = useRef({});

  useEffect(() => {
    try {
      window.localStorage.setItem(musicRecentStorageKey, JSON.stringify(recentResults));
    } catch {
      // Recent music history is optional.
    }
  }, [recentResults]);

  async function generate() {
    if (!prompt.trim()) {
      setNotice("请输入风格描述");
      return;
    }
    if (!isInstrumental && !lyrics.trim() && !lyricsOptimizer) {
      setNotice("请输入歌词，或开启 MiniMax 自动优化歌词");
      return;
    }

    setNotice("");
    setIsGenerating(true);
    try {
      const data = await musicApi.generate({
        prompt: prompt.trim(),
        lyrics: isInstrumental ? "" : lyrics.trim(),
        model: "music-2.6-free",
        isInstrumental,
        lyricsOptimizer: isInstrumental ? false : lyricsOptimizer
      });

      const result = {
        id: data.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        prompt: data.prompt || prompt.trim(),
        lyrics: data.lyrics || lyrics.trim(),
        model: data.model || "music-2.6-free",
        audioUrl: data.audioUrl || "",
        durationMs: data.durationMs || 0,
        traceId: data.traceId || "",
        createdAt: data.createdAt || new Date().toLocaleString("zh-CN", { hour12: false })
      };

      setCurrentResult(result);
      setRecentResults((items) => [result, ...items].slice(0, 20));
      setNotice("音乐生成完成");
    } catch (error) {
      setNotice(error.message || "生成失败");
    } finally {
      setIsGenerating(false);
    }
  }

  async function downloadMp3() {
    if (!currentResult?.audioUrl) return;
    try {
      await downloadAudioUrl(currentResult.audioUrl, makeFileName("ai-music", "mp3"));
      setNotice("音乐已下载");
    } catch (error) {
      setNotice(error.message || "音乐下载失败");
    }
  }

  function downloadLrc() {
    if (!currentResult?.lyrics) return;
    downloadBlob({
      content: currentResult.lyrics,
      fileName: makeFileName("ai-music-lyrics", "txt"),
      type: "text/plain;charset=utf-8"
    });
  }

  return (
    <section className="voice-conversion-view-root music-generation-view">
      <div className="image-filter-tabs voice-filter-tabs">
        <button className={viewTab === "home" ? "selected" : ""} type="button" onClick={() => setViewTab("home")}>
          主页
        </button>
        <button className={viewTab === "recent" ? "selected" : ""} type="button" onClick={() => setViewTab("recent")}>
          最近生成
        </button>
        <button type="button" disabled>
          <Star size={17} fill="#f8d545" color="#161616" />
          收藏
        </button>
      </div>

      <div className={`voice-conversion-canvas music-canvas ${viewTab === "recent" ? "is-recent" : ""}`}>
        {viewTab === "home" ? (
          <>
            <div className="voice-hero-empty music-hero-empty">
              <span className="voice-hero-icon">
                <Music size={42} />
              </span>
              <h1>AI 音乐生成</h1>
              <p>输入风格描述和歌词，AI 为你创作专属音乐</p>
            </div>

            {currentResult && (
              <MusicResult result={currentResult} onDownloadMp3={downloadMp3} onDownloadLrc={downloadLrc} />
            )}

            <MusicComposer
              prompt={prompt}
              setPrompt={setPrompt}
              lyrics={lyrics}
              setLyrics={setLyrics}
              isInstrumental={isInstrumental}
              setIsInstrumental={setIsInstrumental}
              lyricsOptimizer={lyricsOptimizer}
              setLyricsOptimizer={setLyricsOptimizer}
              model="music-2.6-free"
              isGenerating={isGenerating}
              onGenerate={generate}
              notice={notice}
            />
          </>
        ) : (
          <div className={`voice-recent-panel music-recent-panel ${recentResults.length ? "has-items" : ""}`}>
            {recentResults.length === 0 ? (
              <div className="voice-recent-empty">
                <Music size={28} />
                <strong>暂无生成记录</strong>
                <p>去主页创作你的第一首 AI 音乐，完成后会显示在这里。</p>
              </div>
            ) : (
              recentResults.map((item) => (
                <article className="voice-recent-card music-recent-card" key={item.id}>
                  <div className="music-recent-art">
                    <Music size={40} />
                  </div>
                  <div className="voice-recent-info">
                    <strong>{item.prompt || "AI 音乐"}</strong>
                    <span>{formatDuration(item.durationMs) || "音乐"} · {item.createdAt}</span>
                  </div>
                  <div className="music-recent-controls">
                    <button
                      className="music-recent-control-btn"
                      type="button"
                      onClick={() => {
                        const audio = recentAudioRefs.current[item.id];
                        if (!audio) return;
                        Object.values(recentAudioRefs.current).forEach((a) => { if (a && a !== audio) a.pause(); });
                        if (audio.paused) {
                          audio.play().then(() => setPlayingRecentId(item.id)).catch(() => setNotice("播放失败"));
                        } else {
                          audio.pause();
                          setPlayingRecentId("");
                        }
                      }}
                      aria-label="播放"
                    >
                      {playingRecentId === item.id ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
                    </button>
                    <span className="music-recent-time">
                      {recentTimes[item.id] || "0:00"} / {formatDuration(item.durationMs)}
                    </span>
                    <div className="music-recent-progress-track">
                      <div
                        className="music-recent-progress-fill"
                        style={{ width: `${recentProgress[item.id] || 0}%` }}
                      />
                    </div>
                    <button
                      className="music-recent-control-btn"
                      type="button"
                      onClick={() => downloadAudioUrl(item.audioUrl, makeFileName("ai-music", "mp3"))}
                      aria-label="下载"
                    >
                      <Download size={14} />
                    </button>
                  </div>
                  <audio
                    ref={(node) => { if (node) recentAudioRefs.current[item.id] = node; else delete recentAudioRefs.current[item.id]; }}
                    src={item.audioUrl}
                    onEnded={() => { setPlayingRecentId(""); setRecentProgress((p) => ({ ...p, [item.id]: 0 })); }}
                    onTimeUpdate={(event) => {
                      const audio = event.target;
                      if (audio.duration) {
                        const percent = (audio.currentTime / audio.duration) * 100;
                        setRecentProgress((p) => ({ ...p, [item.id]: percent }));
                        const mins = Math.floor(audio.currentTime / 60);
                        const secs = Math.floor(audio.currentTime % 60);
                        setRecentTimes((t) => ({ ...t, [item.id]: `${mins}:${String(secs).padStart(2, "0")}` }));
                      }
                    }}
                  />
                </article>
              ))
            )}
          </div>
        )}
      </div>
    </section>
  );
}
