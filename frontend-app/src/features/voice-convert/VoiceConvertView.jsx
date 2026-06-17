import React, { useEffect, useRef, useState } from "react";
import { CheckCircle2, Download, Loader2, Mic, Music, Play, Star, Trash2 } from "lucide-react";
import { VoiceConversionWorkbenchCard } from "../voice-conversion-ui/VoiceConversionWorkbenchCard";
import { voiceConvertApi } from "./voiceConvertApi";
import { formatBeijingDateTime, formatBeijingStamp } from "../../utils/time";
import { normalizeUploadFileName, stripFileExtension } from "../../utils/fileName";

const voiceConvertRecentStorageKey = "jingchuang.voiceConvert.recentResults";
const maxTargetAudioBytes = 20 * 1024 * 1024;
const maxSourceAudioBytes = 50 * 1024 * 1024;

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
  const stamp = formatBeijingStamp();
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
    const items = JSON.parse(window.localStorage.getItem(voiceConvertRecentStorageKey) || "[]");
    return items.map((item) => ({
      ...item,
      title: normalizeUploadFileName(item.title || ""),
      voiceName: normalizeUploadFileName(item.voiceName || ""),
    }));
  } catch {
    return [];
  }
}

export function VoiceConvertView({ resetSignal = 0 }) {
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
  const [toast, setToast] = useState(null);
  const recentAudioRefs = useRef({});
  const toastTimerRef = useRef(null);
  const targetUploadVersionRef = useRef(0);
  const sourcePickVersionRef = useRef(0);

  function showToast(type, message) {
    setToast({ type, message });
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => {
      setToast(null);
      toastTimerRef.current = null;
    }, 2200);
  }

  useEffect(() => {
    try {
      const safeItems = recentResults.map(({ audioDataUrl, ...item }) => item);
      window.localStorage.setItem(voiceConvertRecentStorageKey, JSON.stringify(safeItems));
    } catch {
      // Recent history is optional.
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

  useEffect(() => {
    if (!resetSignal) return;
    targetUploadVersionRef.current += 1;
    sourcePickVersionRef.current += 1;
    Object.values(recentAudioRefs.current).forEach((audio) => audio?.pause?.());
    setTargetAudio(null);
    setSourceAudio(null);
    setUploading("");
    setNotice("");
    setSpeed(1);
    setVolume(1);
    setPitch(0);
    setIsConverting(false);
    setCurrentVoice(null);
    setDemoAudio("");
    setResultAudio("");
    setResultUrl("");
    setResultFileName("voice-convert.mp3");
    setViewTab("home");
    setPlayingRecentId("");
    setToast(null);
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    }
  }, [resetSignal]);

  useEffect(() => () => {
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
  }, []);

  async function uploadTargetFile(file) {
    const uploadVersion = targetUploadVersionRef.current + 1;
    targetUploadVersionRef.current = uploadVersion;
    setNotice("");
    setUploading("target");
    try {
      if (file.size > maxTargetAudioBytes) {
        throw new Error("目标音色文件需小于 20MB");
      }
      const durationMs = await readAudioDuration(file);
      if (durationMs && (durationMs < 10000 || durationMs > 5 * 60 * 1000)) {
        throw new Error("目标音色需为 10 秒到 5 分钟的 mp3、m4a 或 wav。");
      }

      const result = await voiceConvertApi.uploadTargetAudio(file, durationMs);
      if (uploadVersion !== targetUploadVersionRef.current) return;
      setTargetAudio({
        ...result,
        fileName: normalizeUploadFileName(file.name),
        size: file.size,
        durationMs
      });
      setCurrentVoice(null);
      setDemoAudio("");
      setResultAudio("");
      setResultUrl("");
      setNotice("目标音色上传完成。");
    } catch (error) {
      if (uploadVersion !== targetUploadVersionRef.current) return;
      setNotice(error.message || "目标音色上传失败");
    } finally {
      if (uploadVersion === targetUploadVersionRef.current) setUploading("");
    }
  }

  function clearTargetAudio() {
    setTargetAudio(null);
    setCurrentVoice(null);
    setDemoAudio("");
    setResultAudio("");
    setResultUrl("");
    setNotice("");
  }

  function clearSourceAudio() {
    setSourceAudio(null);
    setResultAudio("");
    setResultUrl("");
    setNotice("");
  }

  async function pickSourceFile(file) {
    const pickVersion = sourcePickVersionRef.current + 1;
    sourcePickVersionRef.current = pickVersion;
    setNotice("");
    try {
      if (file.size > maxSourceAudioBytes) throw new Error("源音频文件需小于 50MB");
      const durationMs = await readAudioDuration(file);
      if (pickVersion !== sourcePickVersionRef.current) return;
      if (durationMs && (durationMs < 6000 || durationMs > 6 * 60 * 1000)) {
        throw new Error("源音频需为 6 秒到 6 分钟的 mp3、wav、flac、m4a 或 webm。");
      }
      setSourceAudio({
        file,
        fileName: normalizeUploadFileName(file.name),
        size: file.size,
        durationMs
      });
      setResultAudio("");
      setResultUrl("");
      setNotice("源音频已选择。");
    } catch (error) {
      if (pickVersion !== sourcePickVersionRef.current) return;
      setNotice(error.message || "源音频选择失败");
    }
  }

  async function convertVoice() {
    if (!targetAudio?.fileId) {
      setNotice("请先上传目标音色。");
      return;
    }
    if (!sourceAudio?.file) {
      setNotice("请先上传源音频。");
      return;
    }

    setNotice("");
    setIsConverting(true);
    try {
      const result = await voiceConvertApi.convert({
        sourceAudio: sourceAudio.file,
        cloneAudioFileId: targetAudio.fileId,
        generatedVoiceId: makeVoiceId(),
        name: targetAudio.fileName ? stripFileExtension(targetAudio.fileName) : "目标音色",
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
      const voiceLabel = result.voice?.name || stripFileExtension(targetAudio.fileName) || "目标音色";
      const sourceLabel = stripFileExtension(sourceAudio.fileName);
      setRecentResults((items) => [{
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        title: sourceLabel || voiceLabel || "音色转换结果",
        voiceName: voiceLabel,
        audioUrl: result.audioUrl || "",
        audioDataUrl: result.audioDataUrl || "",
        fileName,
        createdAt: formatBeijingDateTime()
      }, ...items].slice(0, 20));
      setViewTab("home");
      showToast("success", "音色转换成功");
      setNotice(result.rhythmMeta?.adjusted ? "转换完成，已按源音频时长自动校准语速。" : "转换完成。");
    } catch (error) {
      showToast("error", "音色转换失败，请稍后重试");
      setNotice(error.message || "音色转换失败");
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
    <section className="voice-conversion-view-root voice-convert-view-root">
      <div className="image-filter-tabs voice-filter-tabs">
        <button className={viewTab === "home" ? "selected" : ""} type="button" onClick={() => setViewTab("home")}>主页</button>
        <button className={viewTab === "recent" ? "selected" : ""} type="button" onClick={() => setViewTab("recent")}>历史记录</button>
        <button type="button" disabled>
          <Star size={17} fill="#f8d545" color="#161616" />
          收藏
        </button>
      </div>

      <div className={`voice-conversion-canvas ${viewTab === "recent" ? "is-recent" : ""}`}>
        {viewTab === "home" && (
          <>
            <div className="voice-hero-empty">
              <h1>音色转换</h1>
              <p>上传目标音色和源音频，自动提取内容并转换成目标声音。</p>
              {currentVoice && (
                <div className="voice-current-chip">
                  <CheckCircle2 size={16} />
                  当前音色：{currentVoice.name}
                </div>
              )}
            </div>

            <VoiceConversionWorkbenchCard
              targetAudio={targetAudio}
              sourceAudio={sourceAudio}
              speed={speed}
              volume={volume}
              pitch={pitch}
              notice={notice}
              isConverting={isConverting}
              demoAudio={demoAudio}
              resultAudio={resultAudio}
              onPickTarget={uploadTargetFile}
              onClearTarget={clearTargetAudio}
              onPickSource={pickSourceFile}
              onClearSource={clearSourceAudio}
              onSpeedChange={setSpeed}
              onVolumeChange={setVolume}
              onPitchChange={setPitch}
              onConvert={convertVoice}
              onDownloadResult={() => downloadResult({ audioDataUrl: resultAudio, audioUrl: resultUrl, fileName: resultFileName })}
            />
          </>
        )}

        {viewTab === "recent" && (
          <div className={`voice-recent-panel ${recentResults.length ? "has-items" : ""}`}>
            {recentResults.length === 0 ? (
              <div className="voice-recent-empty">
                <Music size={28} />
                <strong>暂无转换记录</strong>
                <p>转换完成后的 MP3 会显示在这里，可直接播放和下载。</p>
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
      </div>
      {toast ? (
        <div className={`music-toast music-toast--${toast.type}`} role="status" aria-live="polite">
          {toast.message}
        </div>
      ) : null}
    </section>
  );
}
