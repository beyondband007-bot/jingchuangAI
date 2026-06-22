import React, { useEffect, useRef, useState } from "react";
import { CheckCircle2, Download, Heart, Loader2, LockKeyhole, Mic, Music, Star, Trash2 } from "lucide-react";
import { VoiceSynthesisWorkbenchCard } from "./VoiceSynthesisWorkbenchCard";
import { VoiceRecentPlayer } from "../audio-ui/VoiceRecentPlayer";
import { voiceApi } from "../voice/voiceApi";
import { formatBeijingDateTime, formatBeijingStamp } from "../../utils/time";
import { useDeleteConfirmation } from "../../components/DeleteConfirmDialog";

const voicePreviewText = "欢迎使用 Facemini AI 语音合成，现在开始试听目标音色的自然效果。";
const voiceRecentStorageKey = "jingchuang.voice.recentResults";
const maxCloneAudioBytes = 20 * 1024 * 1024;

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
    return JSON.parse(window.localStorage.getItem(voiceRecentStorageKey) || "[]");
  } catch {
    return [];
  }
}

export function VoiceSynthesisView({ authUser, onOpenAuth, resetSignal = 0 }) {
  const [cloneAudio, setCloneAudio] = useState(null);
  const [uploading, setUploading] = useState("");
  const [notice, setNotice] = useState("");
  const [text, setText] = useState("");
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
  const [toast, setToast] = useState(null);
  const toastTimerRef = useRef(null);
  const uploadVersionRef = useRef(0);
  const isGuest = Boolean(authUser?.isGuest);

  function showToast(type, message) {
    setToast({ type, message });
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => {
      setToast(null);
      toastTimerRef.current = null;
    }, 2200);
  }

  function requestLoginForGeneration() {
    setNotice("请先登录");
    onOpenAuth?.("login");
  }

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
      // Synthesis history is optional.
    }
  }, [recentResults]);

  useEffect(() => {
    let mounted = true;
    voiceApi.getTasks().then((items) => {
      if (mounted && Array.isArray(items) && items.length) setRecentResults(items);
    }).catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!resetSignal) return;
    uploadVersionRef.current += 1;
    setCloneAudio(null);
    setUploading("");
    setNotice("");
    setText("");
    setSpeed(1);
    setVolume(1);
    setPitch(0);
    setIsCloning(false);
    setIsSynthesizing(false);
    setCurrentVoice(null);
    setDemoAudio("");
    setResultAudio("");
    setResultUrl("");
    setResultFileName("voice-synthesis.mp3");
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

  async function uploadFile(file) {
    const uploadVersion = uploadVersionRef.current + 1;
    uploadVersionRef.current = uploadVersion;
    setNotice("");
    setUploading("clone");
    try {
      if (file.size > maxCloneAudioBytes) {
        throw new Error("音频文件需小于 20MB");
      }
      const durationMs = await readAudioDuration(file);
      if (durationMs && (durationMs < 10000 || durationMs > 5 * 60 * 1000)) {
        throw new Error("目标音色音频需在 10 秒到 5 分钟之间，支持 mp3、m4a、wav。");
      }

      const result = await voiceApi.uploadCloneAudio(file, durationMs);
      if (uploadVersion !== uploadVersionRef.current) return;
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
      setNotice("目标音色上传完成。");
    } catch (error) {
      if (uploadVersion !== uploadVersionRef.current) return;
      setNotice(error.message || "上传音色失败");
    } finally {
      if (uploadVersion === uploadVersionRef.current) setUploading("");
    }
  }

  function clearCloneAudio() {
    setCloneAudio(null);
    setCurrentVoice(null);
    setDemoAudio("");
    setResultAudio("");
    setResultUrl("");
    setNotice("");
  }

  async function ensureVoiceClone() {
    if (isGuest) {
      requestLoginForGeneration();
      return null;
    }

    if (!cloneAudio?.fileId) {
      setNotice("请先上传目标音色。");
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
      setNotice(error.message || "克隆音色失败");
      return null;
    } finally {
      setIsCloning(false);
    }
  }

  async function generateSpeech() {
    if (isGuest) {
      requestLoginForGeneration();
      return;
    }

    if (!cloneAudio?.fileId) {
      setNotice("请先上传目标音色。");
      return;
    }
    if (!text.trim()) {
      setNotice("请输入需要合成的文本。");
      return;
    }

    const voice = await ensureVoiceClone();
    if (!voice?.id) return;

    setNotice("");
    setIsSynthesizing(true);
    try {
      const result = await voiceApi.synthesize({
        voiceId: voice.id,
        voiceName: voice.name || "",
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
        createdAt: formatBeijingDateTime()
      }, ...items].slice(0, 20));
      setViewTab("home");
      showToast("success", "语音生成成功");
      setNotice("语音生成完成。");
    } catch (error) {
      showToast("error", "语音生成失败，请稍后重试");
      setNotice(error.message || "语音生成失败");
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

  async function pasteText() {
    try {
      const clipboardText = await navigator.clipboard.readText();
      if (!clipboardText) {
        setNotice("剪贴板内容为空。");
        return;
      }
      setText((current) => `${current}${current ? "\n" : ""}${clipboardText}`.slice(0, 2000));
      setNotice("已从剪贴板粘贴文本。");
    } catch {
      setNotice("浏览器未授权读取剪贴板，请手动粘贴。");
    }
  }

  function insertPause() {
    setText((current) => `${current}${current.endsWith(" ") || !current ? "" : " "}……`);
    setNotice("已插入停顿标记。");
  }

  function toggleRecentFavorite(id) {
    setRecentResults((items) => items.map((item) => (
      item.id === id ? { ...item, favorite: !item.favorite } : item
    )));
  }

  function performDeleteRecentResult(id) {
    setPlayingRecentId((current) => (current === id ? "" : current));
    setRecentResults((items) => items.filter((item) => item.id !== id));
  }

  const { requestDelete: deleteRecentResult, deleteConfirmDialog } =
    useDeleteConfirmation({
      onConfirm: performDeleteRecentResult,
      title: "删除历史记录？",
      message: "该语音生成记录会被移除，删除后无法恢复。",
    });

  return (
    <section className="voice-conversion-view-root voice-synthesis-view-root">
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
              <h1>语音合成</h1>
              <p>上传目标音色并输入文本，一键生成专属语音</p>
              {currentVoice && (
                <div className="voice-current-chip">
                  <CheckCircle2 size={16} />
                  当前音色：{currentVoice.name}
                </div>
              )}
            </div>

            {voices.length > 0 && (
              <div className="voice-cloned-list">
                {voices.slice(0, 4).map((voice) => (
                  <button
                    className={currentVoice?.id === voice.id ? "is-active" : ""}
                    key={voice.id}
                    type="button"
                    onClick={() => setCurrentVoice(voice)}
                  >
                    <Mic size={15} />
                    {voice.name}
                  </button>
                ))}
              </div>
            )}

            <VoiceSynthesisWorkbenchCard
              cloneAudio={cloneAudio}
              currentVoice={currentVoice}
              voices={voices}
              text={text}
              speed={speed}
              volume={volume}
              pitch={pitch}
              uploading={uploading === "clone"}
              isGenerating={isCloning || isSynthesizing}
              notice={notice}
              demoAudio={demoAudio}
              resultAudio={resultAudio}
              onPickCloneAudio={uploadFile}
              onClearCloneAudio={clearCloneAudio}
              onTextChange={setText}
              onClearText={() => setText("")}
              onPasteText={pasteText}
              onInsertPause={insertPause}
              onSpeedChange={setSpeed}
              onVolumeChange={setVolume}
              onPitchChange={setPitch}
              onSelectVoice={setCurrentVoice}
              onGenerate={generateSpeech}
              onDownloadResult={() => downloadResult({ audioDataUrl: resultAudio, audioUrl: resultUrl, fileName: resultFileName })}
            />
            <div className="voice-privacy-note">
              <LockKeyhole size={15} />
              <span>音色数据仅用于当前语音生成流程，不在组件内额外持久化原始上传文件。</span>
            </div>
          </>
        )}

        {viewTab === "recent" && (
          <div className={`voice-recent-panel ${recentResults.length ? "has-items" : ""}`}>
            {recentResults.length === 0 ? (
              <div className="voice-recent-empty">
                <Music size={28} />
                <strong>暂无生成记录</strong>
                <p>生成完成后的 MP3 会显示在这里，可直接播放、收藏和下载。</p>
              </div>
            ) : (
              recentResults.map((item) => (
                <article className="voice-recent-card" key={item.id}>
                  <div className="voice-recent-art">
                    <Music size={22} />
                  </div>
                  <div className="voice-recent-info">
                    <strong>{item.title}</strong>
                    <span>{item.voiceName} · {item.createdAt}</span>
                    <small>{item.durationMs ? formatVoiceDuration(item.durationMs) : "已生成"}</small>
                  </div>
                  <VoiceRecentPlayer
                    playerId={item.id}
                    src={item.audioUrl || item.audioDataUrl}
                    durationMs={item.durationMs}
                    disabled={!item.audioUrl && !item.audioDataUrl}
                    playingId={playingRecentId}
                    onPlayingChange={setPlayingRecentId}
                  >
                    <button className="voice-recent-icon-button" type="button" onClick={() => downloadResult(item)} title="下载 MP3" aria-label="下载 MP3">
                      <Download size={16} />
                    </button>
                    <button
                      className={`voice-recent-icon-button ${item.favorite ? "is-favorite" : ""}`}
                      type="button"
                      onClick={() => toggleRecentFavorite(item.id)}
                      title={item.favorite ? "取消收藏" : "收藏"}
                      aria-label={item.favorite ? "取消收藏" : "收藏"}
                    >
                      <Heart size={16} fill={item.favorite ? "currentColor" : "none"} />
                    </button>
                    <button className="voice-recent-icon-button is-danger" type="button" onClick={() => deleteRecentResult(item.id)} title="删除" aria-label="删除">
                      <Trash2 size={16} />
                    </button>
                  </VoiceRecentPlayer>
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
      {deleteConfirmDialog}
    </section>
  );
}
