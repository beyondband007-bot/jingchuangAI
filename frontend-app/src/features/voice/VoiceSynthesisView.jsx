import React, { useEffect, useRef, useState } from "react";
import { CheckCircle2, Download, Loader2, Mic, Music, Play, Plus, Star, Trash2 } from "lucide-react";
import { voiceApi } from "./voiceApi";

const voicePreviewText = "欢迎使用鲸创 AI 语音合成，现在开始试听目标音色的自然效果。";
const voiceRecentStorageKey = "jingchuang.voice.recentResults";

function formatVoiceDuration(ms) {
  const seconds = Math.round(Number(ms || 0) / 1000);
  if (!seconds) return "";
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return minutes ? `${minutes}:${String(rest).padStart(2, "0")}` : `${rest}s`;
}

function makeVoiceId() {
  return `VoiceClone_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function readAudioDuration(file) {
  return new Promise((resolve) => {
    const audio = document.createElement("audio");
    const url = URL.createObjectURL(file);
    const cleanup = () => URL.revokeObjectURL(url);
    audio.preload = "metadata";
    audio.onloadedmetadata = () => {
      const durationMs = Number.isFinite(audio.duration) ? audio.duration * 1000 : 0;
      cleanup();
      resolve(durationMs);
    };
    audio.onerror = () => {
      cleanup();
      resolve(0);
    };
    audio.src = url;
  });
}

function makeVoiceDownloadName(prefix = "voice-synthesis") {
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\..+/, "").replace("T", "-");
  return `${prefix}-${stamp}.mp3`;
}

async function downloadVoiceFile({ audioDataUrl, audioUrl, fileName }) {
  let href = audioDataUrl || "";
  let shouldRevoke = false;

  if (!href && audioUrl) {
    const response = await fetch(audioUrl);
    if (!response.ok) throw new Error("下载音频失败");
    href = URL.createObjectURL(await response.blob());
    shouldRevoke = true;
  }

  if (!href) throw new Error("暂无可下载音频");

  const link = document.createElement("a");
  link.href = href;
  link.download = fileName || makeVoiceDownloadName();
  document.body.appendChild(link);
  link.click();
  link.remove();
  if (shouldRevoke) URL.revokeObjectURL(href);
}

function loadRecentResults() {
  try {
    return JSON.parse(window.localStorage.getItem(voiceRecentStorageKey) || "[]");
  } catch {
    return [];
  }
}

function VoiceUploadSlot({ title, hint, fileState, isUploading, onPick }) {
  const inputRef = useRef(null);
  const hasFile = Boolean(fileState?.fileName);

  return (
    <button className={`voice-upload-slot ${hasFile ? "has-file" : ""}`} type="button" onClick={() => inputRef.current?.click()} disabled={isUploading}>
      <input
        ref={inputRef}
        type="file"
        accept=".mp3,.m4a,.wav,audio/mpeg,audio/mp4,audio/wav"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) onPick(file);
        }}
      />
      <span className="voice-upload-icon">{isUploading ? <Loader2 size={18} /> : <Plus size={18} />}</span>
      <strong>{hasFile ? fileState.fileName : title}</strong>
      <small>{hasFile ? `${formatVoiceDuration(fileState.durationMs) || "已上传"} · ${(fileState.size / 1024 / 1024).toFixed(1)}MB` : hint}</small>
    </button>
  );
}

export function VoiceSynthesisView() {
  const [cloneAudio, setCloneAudio] = useState(null);
  const [uploading, setUploading] = useState("");
  const [notice, setNotice] = useState("");
  const [text, setText] = useState("欢迎使用鲸创 AI 语音合成，现在开始生成属于你的专属声音。");
  const [speed, setSpeed] = useState(1);
  const [volume, setVolume] = useState(1);
  const [pitch, setPitch] = useState(0);
  const [isCloning, setIsCloning] = useState(false);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [currentVoice, setCurrentVoice] = useState(null);
  const [voices, setVoices] = useState([]);
  const [demoAudio, setDemoAudio] = useState("");
  const [resultAudio, setResultAudio] = useState("");
  const [resultUrl, setResultUrl] = useState("");
  const [resultFileName, setResultFileName] = useState("voice-synthesis.mp3");
  const [viewTab, setViewTab] = useState("home");
  const [recentResults, setRecentResults] = useState(loadRecentResults);
  const [playingRecentId, setPlayingRecentId] = useState("");
  const recentAudioRefs = useRef({});

  // 由外层保活挂载，首次挂载即拉取音色配置；隐藏时仍保留状态
  useEffect(() => {
    let mounted = true;
    voiceApi.getConfig().then((data) => {
      if (mounted) setVoices(data.voices || []);
    }).catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    try {
      const safeItems = recentResults.map(({ audioDataUrl, ...item }) => item);
      window.localStorage.setItem(voiceRecentStorageKey, JSON.stringify(safeItems));
    } catch {
      // Recent synthesis history is optional.
    }
  }, [recentResults]);

  async function uploadFile(file) {
    setNotice("");
    setUploading("clone");
    try {
      const durationMs = await readAudioDuration(file);
      if (durationMs && (durationMs < 10000 || durationMs > 5 * 60 * 1000)) {
        throw new Error("目标音色需为 10 秒到 5 分钟的 mp3、m4a 或 wav");
      }

      const result = await voiceApi.uploadCloneAudio(file, durationMs);
      setCloneAudio({
        ...result,
        fileName: file.name,
        size: file.size,
        durationMs
      });
      setCurrentVoice(null);
      setDemoAudio("");
      setResultAudio("");
      setResultUrl("");
      setNotice("目标音色上传完成");
    } catch (error) {
      setNotice(error.message);
    } finally {
      setUploading("");
    }
  }

  async function ensureVoiceClone() {
    if (!cloneAudio?.fileId) {
      setNotice("请先上传目标音色");
      return null;
    }
    if (currentVoice?.id) return currentVoice;

    setNotice("");
    setIsCloning(true);
    try {
      const result = await voiceApi.createClone({
        cloneAudioFileId: cloneAudio.fileId,
        previewText: voicePreviewText,
        voiceId: makeVoiceId(),
        name: cloneAudio.fileName ? cloneAudio.fileName.replace(/\.[^.]+$/, "") : "我的目标音色"
      });
      setCurrentVoice(result.voice);
      setVoices((items) => [result.voice, ...items.filter((item) => item.id !== result.voice.id)]);
      setDemoAudio(result.demoAudio || "");
      return result.voice;
    } catch (error) {
      setNotice(error.message);
      return null;
    } finally {
      setIsCloning(false);
    }
  }

  async function generateSpeech() {
    if (!cloneAudio?.fileId) {
      setNotice("请先上传目标音色");
      return;
    }
    if (!text.trim()) {
      setNotice("请输入需要合成的文本");
      return;
    }
    const voice = await ensureVoiceClone();
    if (!voice?.id) return;

    setNotice("");
    setIsSynthesizing(true);
    try {
      const result = await voiceApi.synthesize({
        voiceId: voice.id,
        text,
        speed,
        volume,
        pitch
      });
      const fileName = makeVoiceDownloadName();
      setResultAudio(result.audioDataUrl);
      setResultUrl(result.audioUrl || "");
      setResultFileName(fileName);
      setRecentResults((items) => [{
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        title: text.trim().slice(0, 48) || "语音合成结果",
        voiceName: voice.name || "目标音色",
        audioUrl: result.audioUrl || "",
        audioDataUrl: result.audioDataUrl || "",
        fileName,
        createdAt: new Date().toLocaleString("zh-CN", { hour12: false })
      }, ...items].slice(0, 20));
      setViewTab("home");
      setNotice("语音生成完成");
    } catch (error) {
      setNotice(error.message);
    } finally {
      setIsSynthesizing(false);
    }
  }

  async function downloadResult(item) {
    try {
      await downloadVoiceFile(item);
    } catch (error) {
      setNotice(error.message || "下载音频失败");
    }
  }

  async function toggleRecentPlayback(item) {
    const currentAudio = recentAudioRefs.current[item.id];
    if (!currentAudio) return;

    Object.entries(recentAudioRefs.current).forEach(([id, audio]) => {
      if (id !== item.id && audio) audio.pause();
    });

    if (!currentAudio.paused) {
      currentAudio.pause();
      setPlayingRecentId("");
      return;
    }

    try {
      await currentAudio.play();
      setPlayingRecentId(item.id);
    } catch (error) {
      setNotice(error.message || "播放音频失败");
    }
  }

  function toggleRecentFavorite(id) {
    setRecentResults((items) => items.map((item) => (
      item.id === id ? { ...item, favorite: !item.favorite } : item
    )));
  }

  function deleteRecentResult(id) {
    const audio = recentAudioRefs.current[id];
    if (audio) audio.pause();
    delete recentAudioRefs.current[id];
    setPlayingRecentId((current) => (current === id ? "" : current));
    setRecentResults((items) => items.filter((item) => item.id !== id));
  }

  return (
    <section className="voice-conversion-view-root">
      <div className="image-filter-tabs voice-filter-tabs">
        <button className={viewTab === "home" ? "selected" : ""} type="button" onClick={() => setViewTab("home")}>主页</button>
        <button className={viewTab === "recent" ? "selected" : ""} type="button" onClick={() => setViewTab("recent")}>最近生成</button>
        <button type="button" disabled>
          <Star size={17} fill="#f8d545" color="#161616" />
          收藏
        </button>
      </div>
      <div className={`voice-conversion-canvas ${viewTab === "recent" ? "is-recent" : ""}`}>
        {viewTab === "home" && <div className="voice-hero-empty">
          <span className="voice-hero-icon">🎭</span>
          <h1>语音合成</h1>
          <p>上传目标音色并输入文本，一键生成专属语音</p>
          {currentVoice && (
            <div className="voice-current-chip">
              <CheckCircle2 size={16} />
              当前音色：{currentVoice.name}
            </div>
          )}
        </div>}

        {viewTab === "recent" && (
          <div className={`voice-recent-panel ${recentResults.length ? "has-items" : ""}`}>
            {recentResults.length === 0 ? (
              <div className="voice-recent-empty">
                <Music size={28} />
                <strong>暂无生成记录</strong>
                <p>生成完成的 MP3 会显示在这里，可直接播放和下载。</p>
              </div>
            ) : (
              recentResults.map((item) => (
                <article className="voice-recent-card" key={item.id}>
                  <div className="voice-recent-art">
                    <Music size={34} />
                  </div>
                  <div className="voice-recent-info">
                    <strong>{item.title}</strong>
                    <span>{item.voiceName} · {item.createdAt}</span>
                  </div>
                  <audio
                    ref={(node) => {
                      if (node) recentAudioRefs.current[item.id] = node;
                      else delete recentAudioRefs.current[item.id];
                    }}
                    src={item.audioUrl || item.audioDataUrl}
                    onEnded={() => setPlayingRecentId("")}
                  />
                  <button className="voice-recent-play" type="button" onClick={() => toggleRecentPlayback(item)} aria-label="播放音频">
                    {playingRecentId === item.id ? <Loader2 size={18} /> : <Play size={18} fill="currentColor" />}
                  </button>
                  <div className="voice-recent-actions">
                    <button className="voice-recent-icon-button" type="button" onClick={() => downloadResult(item)} title="下载 MP3" aria-label="下载 MP3">
                      <Download size={15} />
                    </button>
                    <button className={`voice-recent-icon-button ${item.favorite ? "is-favorite" : ""}`} type="button" onClick={() => toggleRecentFavorite(item.id)} title={item.favorite ? "取消收藏" : "收藏"} aria-label={item.favorite ? "取消收藏" : "收藏"}>
                      <Star size={15} fill={item.favorite ? "currentColor" : "none"} />
                    </button>
                    <button className="voice-recent-icon-button is-danger" type="button" onClick={() => deleteRecentResult(item.id)} title="删除" aria-label="删除">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>
        )}

        {viewTab === "home" && voices.length > 0 && (
          <div className="voice-cloned-list">
            {voices.slice(0, 4).map((voice) => (
              <button className={currentVoice?.id === voice.id ? "is-active" : ""} key={voice.id} type="button" onClick={() => setCurrentVoice(voice)}>
                <Mic size={15} />
                {voice.name}
              </button>
            ))}
          </div>
        )}

        {viewTab === "home" && <div className="voice-floating-composer">
          <div className="voice-composer-title">
            <span>🎭</span>
            语音合成
          </div>
          <div className="voice-upload-grid">
            <VoiceUploadSlot
              title="+ 目标音色"
              hint="参考音频 10s-5min"
              fileState={cloneAudio}
              isUploading={uploading === "clone"}
              onPick={uploadFile}
            />
          </div>

          <label className="voice-textarea-field">
            <span>合成文本</span>
            <textarea value={text} onChange={(event) => setText(event.target.value)} placeholder="输入要用目标音色朗读的内容" />
          </label>

          <div className="voice-slider-row">
            <label>
              <span>语速 {speed.toFixed(2)}x</span>
              <input type="range" min="0.5" max="2" step="0.05" value={speed} onChange={(event) => setSpeed(Number(event.target.value))} />
            </label>
            <label>
              <span>音量 {volume.toFixed(1)}</span>
              <input type="range" min="0.1" max="10" step="0.1" value={volume} onChange={(event) => setVolume(Number(event.target.value))} />
            </label>
            <label>
              <span>音调 {pitch > 0 ? `+${pitch}` : pitch}</span>
              <input type="range" min="-12" max="12" step="1" value={pitch} onChange={(event) => setPitch(Number(event.target.value))} />
            </label>
          </div>

          {(demoAudio || resultAudio) && (
            <div className="voice-audio-results">
              {demoAudio && (
                <div>
                  <span>音色试听</span>
                  <audio src={demoAudio} controls />
                </div>
              )}
              {resultAudio && (
                <div>
                  <span>合成结果</span>
                  <audio src={resultAudio} controls />
                </div>
              )}
            </div>
          )}

          <div className="voice-composer-footer">
            <span>{notice || "目标音色支持 mp3、m4a、wav，建议 10 秒到 5 分钟"}</span>
            <div className="voice-actions">
              {(resultAudio || resultUrl) && (
                <button className="voice-download" type="button" onClick={() => downloadResult({ audioDataUrl: resultAudio, audioUrl: resultUrl, fileName: resultFileName })}>
                  <Download size={15} />
                </button>
              )}
              <button className="voice-generate-button" type="button" onClick={generateSpeech} disabled={isCloning || isSynthesizing || uploading || !cloneAudio || !text.trim()}>
                {isCloning || isSynthesizing ? <Loader2 size={16} /> : <Play size={16} />}
                生成语音
              </button>
            </div>
          </div>
        </div>}
      </div>
    </section>
  );
}
