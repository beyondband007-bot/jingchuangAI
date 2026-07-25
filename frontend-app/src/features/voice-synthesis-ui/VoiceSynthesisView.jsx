import React, { useEffect, useRef, useState } from "react";
import "../audio-ui/audioResponsive.css";
import "../audio-ui/audioStateControls.css";
import "../audio-ui/voiceWorkbench.css";
import "../audio-ui/voiceHistory.css";
import { CheckCircle2, Download, Heart, Loader2, LockKeyhole, Mic, Music, Trash2 } from "lucide-react";
import { VoiceSynthesisWorkbenchCard } from "./VoiceSynthesisWorkbenchCard";
import { VoiceConversionLoading } from "../voice-conversion-ui/VoiceConversionLoading";
import { VoiceRecentPlayer } from "../audio-ui/VoiceRecentPlayer";
import { VoiceResultView } from "../audio-ui/VoiceResultView";
import { voiceApi } from "../voice/voiceApi";
import { FeatureViewTabs } from "../../components/FeatureViewTabs";
import { formatBeijingDateTime, formatBeijingStamp } from "../../utils/time";
import {
  CreditAlertDialog,
  isRechargeRequiredMessage,
} from "../../components/CreditAlertDialog";
import { useDeleteConfirmation } from "../../components/DeleteConfirmDialog";
import { useToast } from "../../components/ToastProvider";
import { HistoryEmptyState } from "../../components/HistoryEmptyState";

const voicePreviewText = "欢迎使用 Facemini AI 语音合成，现在开始试听目标音色的自然效果。";
const voiceRecentStorageKey = "jingchuang.voice.recentResults";
const maxCloneAudioBytes = 20 * 1024 * 1024;

const SYNTHESIS_STAGE_TEXTS = [
  "正在读取目标音色",
  "正在分析文本内容",
  "正在进行语音合成",
  "正在生成音频文件",
];

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

export function VoiceSynthesisView({
  authUser,
  onOpenAuth,
  onOpenFeature,
  resetSignal = 0,
}) {
  const { showToast: showGlobalToast, dismissToast } = useToast();
  const [cloneAudio, setCloneAudio] = useState(null);
  const [uploading, setUploading] = useState("");
  const [notice, setNotice] = useState("");
  const [text, setText] = useState("");
  const [speed, setSpeed] = useState(1);
  const [volume, setVolume] = useState(1);
  const [pitch, setPitch] = useState(0);
  const [isCloning, setIsCloning] = useState(false);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [synthesisProgress, setSynthesisProgress] = useState(0);
  const [synthesisStageText, setSynthesisStageText] = useState("");
  const [showSynthesisComplete, setShowSynthesisComplete] = useState(false);
  const [currentVoice, setCurrentVoice] = useState(null);
  const [voices, setVoices] = useState([]);
  const [demoAudio, setDemoAudio] = useState("");
  const [resultAudio, setResultAudio] = useState("");
  const [resultUrl, setResultUrl] = useState("");
  const [resultFileName, setResultFileName] = useState("voice-synthesis.mp3");
  const [currentResult, setCurrentResult] = useState(null);
  const [viewTab, setViewTab] = useState("home");
  const [recentResults, setRecentResults] = useState(loadRecentResults);
  const [playingRecentId, setPlayingRecentId] = useState("");
  const uploadVersionRef = useRef(0);
  const synthesisProgressTimerRef = useRef(null);
  const synthesisStageTimerRef = useRef(null);
  const isGuest = Boolean(authUser?.isGuest);

  function showToast(type, message) {
    showGlobalToast(message, { type });
  }

  function requestLoginForGeneration() {
    setNotice("请先登录");
    onOpenAuth?.("login");
  }

  useEffect(() => {
    let mounted = true;
    voiceApi.getVoices().then((items) => {
      if (mounted) setVoices(items || []);
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
    setSynthesisProgress(0);
    setSynthesisStageText("");
    setShowSynthesisComplete(false);
    setCurrentVoice(null);
    setDemoAudio("");
    setResultAudio("");
    setResultUrl("");
    setResultFileName("voice-synthesis.mp3");
    setCurrentResult(null);
    setViewTab("home");
    setPlayingRecentId("");
    dismissToast();
  }, [resetSignal]);

  useEffect(() => () => {
    if (synthesisProgressTimerRef.current) window.clearInterval(synthesisProgressTimerRef.current);
    if (synthesisStageTimerRef.current) window.clearInterval(synthesisStageTimerRef.current);
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
      if (result.cachedVoice?.id) {
        setCurrentVoice(result.cachedVoice);
        setVoices((items) => [result.cachedVoice, ...items.filter((item) => item.id !== result.cachedVoice.id)]);
        setDemoAudio(result.cachedVoice.demoAudio || "");
      } else {
        setCurrentVoice(null);
        setDemoAudio("");
      }
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

    if (currentVoice?.id) return currentVoice;

    if (!currentVoice?.id && !cloneAudio?.fileId) {
      setNotice("请先上传目标音色。");
      return null;
    }
    if (currentVoice?.id) return currentVoice;

    setNotice("");
    setIsCloning(true);
    try {
      const result = await voiceApi.createClone({
        cloneAudioFileId: cloneAudio.fileId,
        audioHash: cloneAudio.audioHash || "",
        durationMs: cloneAudio.durationMs || 0,
        sourceFileName: cloneAudio.fileName || cloneAudio.localName || "",
        sourceMimeType: cloneAudio.mimeType || "",
        sourceSize: cloneAudio.size || 0,
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

  function startSynthesisProgress() {
    setSynthesisProgress(6);
    setSynthesisStageText(SYNTHESIS_STAGE_TEXTS[0]);
    setShowSynthesisComplete(false);

    if (synthesisProgressTimerRef.current) window.clearInterval(synthesisProgressTimerRef.current);
    if (synthesisStageTimerRef.current) window.clearInterval(synthesisStageTimerRef.current);

    synthesisProgressTimerRef.current = window.setInterval(() => {
      setSynthesisProgress((prev) => {
        if (prev >= 90) return prev;
        const increment = Math.random() * 1.2 + 0.3;
        return Math.min(90, Math.round((prev + increment) * 10) / 10);
      });
    }, 220);

    synthesisStageTimerRef.current = window.setInterval(() => {
      setSynthesisStageText((prev) => {
        const idx = SYNTHESIS_STAGE_TEXTS.indexOf(prev);
        return SYNTHESIS_STAGE_TEXTS[(idx + 1) % SYNTHESIS_STAGE_TEXTS.length];
      });
    }, 2800);
  }

  function stopSynthesisProgress() {
    if (synthesisProgressTimerRef.current) {
      window.clearInterval(synthesisProgressTimerRef.current);
      synthesisProgressTimerRef.current = null;
    }
    if (synthesisStageTimerRef.current) {
      window.clearInterval(synthesisStageTimerRef.current);
      synthesisStageTimerRef.current = null;
    }
  }

  async function generateSpeech() {
    if (isGuest) {
      requestLoginForGeneration();
      return;
    }

    if (!currentVoice?.id && !cloneAudio?.fileId) {
      setNotice("请先上传目标音色。");
      return;
    }
    if (!text.trim()) {
      setNotice("请输入需要合成的文本。");
      return;
    }

    setNotice("");
    setIsSynthesizing(true);
    startSynthesisProgress();

    const voice = await ensureVoiceClone();
    if (!voice?.id) {
      stopSynthesisProgress();
      setIsSynthesizing(false);
      setSynthesisProgress(0);
      setSynthesisStageText("");
      return;
    }

    try {
      const result = await voiceApi.synthesize({
        voiceId: voice.id,
        voiceName: voice.name || "",
        text,
        speed,
        volume,
        pitch
      });

      stopSynthesisProgress();
      setSynthesisProgress(100);
      setSynthesisStageText(SYNTHESIS_STAGE_TEXTS[SYNTHESIS_STAGE_TEXTS.length - 1]);
      setShowSynthesisComplete(true);

      await new Promise((resolve) => {
        window.setTimeout(resolve, 500);
      });

      const fileName = makeVoiceDownloadName();
      setResultAudio(result.audioDataUrl);
      setResultUrl(result.audioUrl || "");
      setResultFileName(fileName);
      const generatedResult = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        title: text.trim().slice(0, 48) || "语音合成结果",
        voiceName: voice.name || "目标音色",
        audioUrl: result.audioUrl || "",
        audioDataUrl: result.audioDataUrl || "",
        fileName,
        createdAt: formatBeijingDateTime()
      };
      setCurrentResult(generatedResult);
      setRecentResults((items) => [generatedResult, ...items].slice(0, 20));
      setViewTab("result");
      showToast("success", "语音生成成功");
      setNotice("语音生成完成。");
    } catch (error) {
      stopSynthesisProgress();
      showToast("error", "语音生成失败，请稍后重试");
      setNotice(error.message || "语音生成失败");
    } finally {
      setIsSynthesizing(false);
      setShowSynthesisComplete(false);
      setSynthesisProgress(0);
      setSynthesisStageText("");
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
    setCurrentResult((item) => (
      item?.id === id ? { ...item, favorite: !item.favorite } : item
    ));
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
  const showRechargeAlert = isRechargeRequiredMessage(notice);
  const showLoadingView = isSynthesizing || showSynthesisComplete;

  function closeRechargeAlert() {
    setNotice("");
  }

  function goToRecharge() {
    closeRechargeAlert();
    onOpenFeature?.("billing");
  }

  return (
    <section className="voice-conversion-view-root voice-synthesis-view-root">
      <FeatureViewTabs
        currentLabel="语音合成"
        activeView={viewTab === "recent" ? "recent" : "home"}
        onHome={() => setViewTab("home")}
        onHistory={() => setViewTab("recent")}
      />

      <div className={`voice-conversion-canvas ${viewTab === "recent" ? "is-recent" : ""} ${viewTab === "result" ? "is-result" : ""}`}>
        {viewTab === "result" && currentResult && (
          <VoiceResultView
            result={currentResult}
            onBack={() => setViewTab("home")}
            onDownload={() => downloadResult(currentResult)}
            onFavoriteToggle={() => toggleRecentFavorite(currentResult.id)}
          />
        )}
        {viewTab === "home" && (
          <>
            <div className="voice-hero-empty">
              <h1>语音合成</h1>
              <p>上传目标音色并输入文本，一键生成专属语音</p>
              {currentVoice && !showLoadingView && (
                <div className="voice-current-chip">
                  <CheckCircle2 size={16} />
                  当前音色：{currentVoice.name}
                </div>
              )}
            </div>

            {!showLoadingView && voices.length > 0 && (
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

            {showLoadingView ? (
              <VoiceConversionLoading
                title="正在合成音色"
                completeTitle="语音合成完成"
                progressLabel="合成进度"
                progress={synthesisProgress}
                stageText={synthesisStageText}
                isComplete={showSynthesisComplete}
              />
            ) : (
              <>
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
          </>
        )}

        {viewTab === "recent" && (
          <div className={`voice-recent-panel ${recentResults.length ? "has-items" : ""}`}>
            {recentResults.length === 0 ? (
              <HistoryEmptyState title="暂无生成记录" />
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
      {showRechargeAlert && (
        <CreditAlertDialog
          title="这次没有生成语音"
          message={notice}
          icon={<Mic size={28} />}
          onClose={closeRechargeAlert}
          onRecharge={goToRecharge}
        />
      )}
      {deleteConfirmDialog}
    </section>
  );
}
