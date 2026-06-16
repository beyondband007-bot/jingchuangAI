import React, { useEffect, useRef, useState } from "react";
import { Download, Loader2, Music, Pause, Play, Star } from "lucide-react";
import { AiMusicGenerationWorkbenchCard } from "../music-generation-ui/AiMusicGenerationWorkbenchCard";
import { musicApi } from "./musicApi";
import { formatBeijingDateTime, formatBeijingStamp } from "../../utils/time";

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
  const stamp = formatBeijingStamp();
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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForMusicTask(taskId, { attempts = 80, intervalMs = 3000 } = {}) {
  let task = await musicApi.getTask(taskId);
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (task.status === "completed" || task.status === "failed") return task;
    await sleep(intervalMs);
    task = await musicApi.getTask(taskId);
  }
  throw new Error("音乐仍在生成中，请稍后到历史记录里查看。");
}

export function MusicGenerationView() {
  const [prompt, setPrompt] = useState("");
  const [lyrics, setLyrics] = useState("");
  const [isInstrumental, setIsInstrumental] = useState(false);
  const [lyricsOptimizer, setLyricsOptimizer] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [notice, setNotice] = useState("");
  const [currentResult, setCurrentResult] = useState(null);
  const [toast, setToast] = useState(null);
  const [viewTab, setViewTab] = useState("home");
  const [recentResults, setRecentResults] = useState(loadRecentResults);
  const canGenerate = isInstrumental
    ? prompt.trim().length > 0
    : prompt.trim().length > 0 && lyrics.trim().length > 0;
  const [playingRecentId, setPlayingRecentId] = useState("");
  const [recentProgress, setRecentProgress] = useState({});
  const [recentTimes, setRecentTimes] = useState({});
  const recentAudioRefs = useRef({});

  useEffect(() => {
    let mounted = true;
    musicApi.getTasks().then((items) => {
      if (mounted) setRecentResults(items);
    }).catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(musicRecentStorageKey, JSON.stringify(recentResults));
    } catch {
      // Recent history is optional.
    }
  }, [recentResults]);

  async function generate() {
    if (!prompt.trim()) {
      setNotice("请输入风格描述。");
      return;
    }
    if (!isInstrumental && !lyrics.trim() && !lyricsOptimizer) {
      setNotice("请输入歌词，或开启自动优化歌词。");
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
      setNotice("音乐任务已提交，正在生成中...");
      const completed = data.status === "completed" ? data : await waitForMusicTask(data.id);
      if (completed.status === "failed") {
        throw new Error(completed.error || "音乐生成失败，请稍后重试。");
      }
      if (!completed.audioUrl) {
        throw new Error("音乐已完成，但未返回音频文件。");
      }

      const result = {
        id: completed.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        prompt: completed.prompt || prompt.trim(),
        lyrics: completed.lyrics || lyrics.trim(),
        model: completed.model || "music-2.6-free",
        audioUrl: completed.audioUrl || "",
        durationMs: completed.durationMs || 0,
        traceId: completed.traceId || "",
        createdAt: completed.createdAt || formatBeijingDateTime()
      };

      setCurrentResult(result);
      setRecentResults((items) => [result, ...items].slice(0, 20));
      setNotice("音乐生成完成。");
      showToast("success", "音乐生成成功");
    } catch (error) {
      setNotice(error.message || "生成失败");
      showToast("error", "音乐生成失败，请稍后重试");
    } finally {
      setIsGenerating(false);
    }
  }

  function showToast(type, message) {
    setToast({ type, message });
    setTimeout(() => {
      setToast(null);
      if (type === "success") {
        setViewTab("recent");
      }
    }, 2000);
  }

  async function downloadMp3() {
    if (!currentResult?.audioUrl) return;
    try {
      await downloadAudioUrl(currentResult.audioUrl, makeFileName("ai-music", "mp3"));
      setNotice("音乐已下载。");
    } catch (error) {
      setNotice(error.message || "音乐下载失败");
    }
  }

  function downloadLyrics() {
    if (!currentResult?.lyrics) return;
    downloadBlob({
      content: currentResult.lyrics,
      fileName: makeFileName("ai-music-lyrics", "txt"),
      type: "text/plain;charset=utf-8"
    });
  }

  function appendPrompt(textToAppend) {
    setPrompt((current) => [current.trim(), textToAppend].filter(Boolean).join("，").slice(0, 200));
  }

  return (
    <section className="voice-conversion-view-root music-generation-view">
      <div className="image-filter-tabs voice-filter-tabs">
        <button className={viewTab === "home" ? "selected" : ""} type="button" onClick={() => setViewTab("home")}>主页</button>
        <button className={viewTab === "recent" ? "selected" : ""} type="button" onClick={() => setViewTab("recent")}>历史记录</button>
        <button type="button" disabled>
          <Star size={17} fill="#f8d545" color="#161616" />
          收藏
        </button>
      </div>

      <div className={`voice-conversion-canvas music-canvas ${viewTab === "recent" ? "is-recent" : ""}`}>
        {viewTab === "home" ? (
          <>
            <div className="voice-hero-empty music-hero-empty">
              <h1>音乐生成</h1>
              <p>输入风格与歌词，一键生成专属音乐</p>
            </div>

            <AiMusicGenerationWorkbenchCard
              prompt={prompt}
              lyrics={lyrics}
              isInstrumental={isInstrumental}
              lyricsOptimizer={lyricsOptimizer}
              model="music-2.6-free"
              isGenerating={isGenerating}
              canGenerate={canGenerate}
              notice={notice}
              currentResult={currentResult}
              onPromptChange={setPrompt}
              onLyricsChange={setLyrics}
              onToggleInstrumental={setIsInstrumental}
              onToggleLyricsOptimizer={setLyricsOptimizer}
              onGenerate={generate}
              onUseStyleTag={appendPrompt}
              onDownloadMp3={downloadMp3}
              onDownloadLyrics={downloadLyrics}
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
                      disabled={!item.audioUrl || item.status === "failed"}
                      aria-label="播放"
                    >
                      {playingRecentId === item.id ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
                    </button>
                    <span className="music-recent-time">
                      {recentTimes[item.id] || "0:00"} / {formatDuration(item.durationMs)}
                    </span>
                    <div className="music-recent-progress-track">
                      <div className="music-recent-progress-fill" style={{ width: `${recentProgress[item.id] || 0}%` }} />
                    </div>
                    <button
                      className="music-recent-control-btn"
                      type="button"
                      onClick={() => downloadAudioUrl(item.audioUrl, makeFileName("ai-music", "mp3"))}
                      disabled={!item.audioUrl || item.status === "failed"}
                      aria-label="下载"
                    >
                      <Download size={14} />
                    </button>
                  </div>
                  <audio
                    ref={(node) => {
                      if (node) recentAudioRefs.current[item.id] = node;
                      else delete recentAudioRefs.current[item.id];
                    }}
                    src={item.audioUrl}
                    onEnded={() => {
                      setPlayingRecentId("");
                      setRecentProgress((p) => ({ ...p, [item.id]: 0 }));
                    }}
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

      {toast ? (
        <div className={`music-toast music-toast--${toast.type}`}>
          {toast.message}
        </div>
      ) : null}
    </section>
  );
}
