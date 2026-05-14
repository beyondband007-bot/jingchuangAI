import React, { useEffect, useRef, useState } from "react";
import { CheckCircle2, Download, Loader2, Mic, Music, Play, Plus, Star, Trash2 } from "lucide-react";
import { voiceConvertApi } from "./voiceConvertApi";

const voiceConvertRecentStorageKey = "jingchuang.voiceConvert.recentResults";

function formatVoiceDuration(ms) {
  const seconds = Math.round(Number(ms || 0) / 1000);
  if (!seconds) return "";
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return minutes ? `${minutes}:${String(rest).padStart(2, "0")}` : `${rest}s`;
}

function makeVoiceId() {
  return `VoiceConvert_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
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

function makeVoiceDownloadName(prefix = "voice-convert") {
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
    return JSON.parse(window.localStorage.getItem(voiceConvertRecentStorageKey) || "[]");
  } catch {
    return [];
  }
}

function VoiceUploadSlot({ title, hint, fileState, isUploading, onPick, accept = ".mp3,.m4a,.wav,audio/mpeg,audio/mp4,audio/wav" }) {
  const inputRef = useRef(null);
  const hasFile = Boolean(fileState?.fileName);

  return (
    <button className={`voice-upload-slot ${hasFile ? "has-file" : ""}`} type="button" onClick={() => inputRef.current?.click()} disabled={isUploading}>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
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

export function VoiceConvertView() {
  const [targetAudio, setTargetAudio] = useState(null);
  const [sourceAudio, setSourceAudio] = useState(null);
  const [uploading, setUploading] = useState("");
  const [notice, setNotice] = useState("");
  const [speed, setSpeed] = useState(1);
  const [volume, setVolume] = useState(1);
  const [pitch, setPitch] = useState(0);
  const [isConverting, setIsConverting] = useState(false);
  const [currentVoice, setCurrentVoice] = useState(null);
  const [demoAudio, setDemoAudio] = useState("");
  const [resultAudio, setResultAudio] = useState("");
  const [resultUrl, setResultUrl] = useState("");
  const [resultFileName, setResultFileName] = useState("voice-convert.mp3");
  const [viewTab, setViewTab] = useState("home");
  const [recentResults, setRecentResults] = useState(loadRecentResults);
  const [playingRecentId, setPlayingRecentId] = useState("");
  const recentAudioRefs = useRef({});

  useEffect(() => {
    try {
      const safeItems = recentResults.map(({ audioDataUrl, ...item }) => item);
      window.localStorage.setItem(voiceConvertRecentStorageKey, JSON.stringify(safeItems));
    } catch {
      // Recent conversion history is optional.
    }
  }, [recentResults]);

  useEffect(() => {
    let mounted = true;
    voiceConvertApi.getTasks().then((items) => {
      if (mounted) setRecentResults(items);
    }).catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  async function uploadTargetFile(file) {
    setNotice("");
    setUploading("target");
    try {
      const durationMs = await readAudioDuration(file);
      if (durationMs && (durationMs < 10000 || durationMs > 5 * 60 * 1000)) {
        throw new Error("目标音色需为 10 秒到 5 分钟的 mp3、m4a 或 wav");
      }

      const result = await voiceConvertApi.uploadTargetAudio(file, durationMs);
      setTargetAudio({
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

  async function pickSourceFile(file) {
    setNotice("");
    try {
      if (file.size > 50 * 1024 * 1024) throw new Error("源音频需小于 50MB");
      const durationMs = await readAudioDuration(file);
      if (durationMs && (durationMs < 6000 || durationMs > 6 * 60 * 1000)) {
        throw new Error("源音频需为 6 秒到 6 分钟的 mp3、wav、flac、m4a 或 webm");
      }
      setSourceAudio({
        file,
        fileName: file.name,
        size: file.size,
        durationMs
      });
      setResultAudio("");
      setResultUrl("");
      setNotice("源音频已选择");
    } catch (error) {
      setNotice(error.message);
    }
  }

  async function convertVoice() {
    if (!targetAudio?.fileId) {
      setNotice("请先上传目标音色");
      return;
    }
    if (!sourceAudio?.file) {
      setNotice("请先上传源音频");
      return;
    }

    setNotice("");
    setIsConverting(true);
    try {
      const result = await voiceConvertApi.convert({
        sourceAudio: sourceAudio.file,
        cloneAudioFileId: targetAudio.fileId,
        generatedVoiceId: makeVoiceId(),
        name: targetAudio.fileName ? targetAudio.fileName.replace(/\.[^.]+$/, "") : "目标音色",
        sourceDurationMs: sourceAudio.durationMs,
        speed,
        volume,
        pitch
      });
      const fileName = makeVoiceDownloadName();
      setCurrentVoice(result.voice);
      setDemoAudio(result.demoAudio || "");
      setResultAudio(result.audioDataUrl);
      setResultUrl(result.audioUrl || "");
      setResultFileName(fileName);
      setRecentResults((items) => [{
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        title: sourceAudio.fileName ? sourceAudio.fileName.replace(/\.[^.]+$/, "") : "音色转换结果",
        voiceName: result.voice?.name || "目标音色",
        audioUrl: result.audioUrl || "",
        audioDataUrl: result.audioDataUrl || "",
        fileName,
        createdAt: new Date().toLocaleString("zh-CN", { hour12: false })
      }, ...items].slice(0, 20));
      setViewTab("home");
      setNotice(result.rhythmMeta?.adjusted ? "转换完成，已按源音频时长自动校准语速" : "转换完成");
    } catch (error) {
      setNotice(error.message);
    } finally {
      setIsConverting(false);
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
          <span className="voice-hero-icon">🎙️</span>
          <h1>音色转换</h1>
          <p>上传目标音色和源音频，自动提取源内容并转换成目标声音</p>
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
                <strong>暂无转换记录</strong>
                <p>转换完成的 MP3 会显示在这里，可直接播放和下载。</p>
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

        {viewTab === "home" && <div className="voice-floating-composer">
          <div className="voice-composer-title">
            <Mic size={16} />
            音色转换
          </div>
          <div className="voice-upload-grid is-two">
            <VoiceUploadSlot
              title="+ 目标音色"
              hint="参考音频 10s-5min"
              fileState={targetAudio}
              isUploading={uploading === "target"}
              onPick={uploadTargetFile}
            />
            <VoiceUploadSlot
              title="+ 源音频"
              hint="待转换音频 6s-6min"
              fileState={sourceAudio}
              isUploading={false}
              onPick={pickSourceFile}
              accept=".mp3,.m4a,.wav,.flac,.webm,audio/mpeg,audio/mp4,audio/wav,audio/flac,audio/webm,video/webm"
            />
          </div>

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
                  <span>转换结果</span>
                  <audio src={resultAudio} controls />
                </div>
              )}
            </div>
          )}

          <div className="voice-composer-footer">
            <span>{notice || "目标音色支持 mp3、m4a、wav；源音频支持 mp3、wav、flac、m4a、webm"}</span>
            <div className="voice-actions">
              {(resultAudio || resultUrl) && (
                <button className="voice-download" type="button" onClick={() => downloadResult({ audioDataUrl: resultAudio, audioUrl: resultUrl, fileName: resultFileName })}>
                  <Download size={15} />
                </button>
              )}
              <button className="voice-generate-button" type="button" onClick={convertVoice} disabled={isConverting || uploading || !targetAudio || !sourceAudio}>
                {isConverting ? <Loader2 size={16} /> : <Play size={16} />}
                开始转换
              </button>
            </div>
          </div>
        </div>}
      </div>
    </section>
  );
}
