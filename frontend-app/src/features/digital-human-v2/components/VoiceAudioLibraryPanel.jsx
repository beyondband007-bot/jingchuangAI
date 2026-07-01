import React, { useRef, useState } from "react";
import { Message } from "@arco-design/web-react";
import { Check, Loader2, Mic2, Play, Upload, X } from "lucide-react";
import { digitalHumanApi } from "../../../api/digitalHumanApi";
import { formatSpeechDurationFromMs } from "../utils";

const CLONE_AUDIO_ACCEPT = "audio/mpeg,audio/mp3,audio/wav,audio/x-wav,audio/mp4,audio/x-m4a,.mp3,.wav,.m4a";
const CLONE_AUDIO_MIN_MS = 10000;
const CLONE_AUDIO_MAX_MS = 5 * 60 * 1000;
const VOICE_CLONE_POINTS = 2000;

function getFileStem(name = "") {
  return String(name || "我的音频").replace(/\.[^.]+$/, "").slice(0, 24) || "我的音频";
}

function readAudioDurationMs(file) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const audio = new Audio(url);
    audio.addEventListener("loadedmetadata", () => {
      const durationMs = Math.round(Number(audio.duration || 0) * 1000);
      URL.revokeObjectURL(url);
      resolve(durationMs > 0 ? durationMs : 0);
    });
    audio.addEventListener("error", () => {
      URL.revokeObjectURL(url);
      resolve(0);
    });
  });
}

export function VoiceAudioLibraryPanel({
  voices = [],
  voiceId,
  onVoiceIdChange,
  onVoiceSaved,
  refreshCredits,
}) {
  const inputRef = useRef(null);
  const audioRef = useRef(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [pendingAudio, setPendingAudio] = useState(null);
  const [uploadNotice, setUploadNotice] = useState(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [previewingId, setPreviewingId] = useState("");
  const clonedVoices = voices.filter((voice) => voice.source === "voice-clone");

  async function previewVoice(targetVoiceId) {
    if (!targetVoiceId) return;
    setPreviewingId(targetVoiceId);
    try {
      const result = await digitalHumanApi.previewVoice({
        text: "你好，这是当前音色的试听效果。",
        voiceId: targetVoiceId,
      });
      audioRef.current?.pause();
      const audio = new Audio(result.audioDataUrl);
      audioRef.current = audio;
      await audio.play();
    } catch (error) {
      Message.error(error?.message || "音色试听失败");
    } finally {
      setPreviewingId("");
    }
  }

  async function handleFileChange(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setUploadNotice(null);
    setPendingAudio(null);
    setShowConfirmDialog(false);

    if (!/\.(mp3|wav|m4a)$/i.test(file.name) && !/^audio\//i.test(file.type)) {
      setUploadNotice({
        tone: "warning",
        title: "音频格式不支持",
        message: "请上传 MP3、WAV 或 M4A 格式的人声参考音频。",
        fileName: file.name,
      });
      Message.warning("请上传 MP3、WAV 或 M4A 格式音频");
      return;
    }

    setIsUploading(true);
    try {
      const durationMs = await readAudioDurationMs(file);
      if (durationMs > 0 && durationMs < CLONE_AUDIO_MIN_MS) {
        const actualDuration = formatSpeechDurationFromMs(durationMs);
        const minDuration = formatSpeechDurationFromMs(CLONE_AUDIO_MIN_MS);
        setPendingAudio(null);
        setShowConfirmDialog(false);
        setUploadNotice({
          tone: "warning",
          title: "音频时长不足，无法解析音色",
          message: `当前音频约 ${actualDuration}，音色克隆至少需要 ${minDuration}。请上传更长、清晰、单人说话的人声参考音频。`,
          fileName: file.name,
        });
        Message.warning(`音频只有约 ${actualDuration}，请上传不少于 ${minDuration} 的参考音频`);
        return;
      }
      if (durationMs > CLONE_AUDIO_MAX_MS) {
        setPendingAudio(null);
        setShowConfirmDialog(false);
        setUploadNotice({
          tone: "warning",
          title: "音频时长过长",
          message: "参考音频不能超过 5 分钟，请裁剪后重新上传。",
          fileName: file.name,
        });
        Message.warning("参考音频不能超过 5 分钟");
        return;
      }

      const uploaded = await digitalHumanApi.uploadVoiceCloneAudio(file, durationMs);
      const nextPendingAudio = {
        fileId: uploaded.fileId || uploaded.file_id || uploaded.cachedVoice?.id,
        audioHash: uploaded.audioHash,
        name: uploaded.localName || uploaded.cachedVoice?.name || file.name,
        durationMs: uploaded.durationMs || durationMs,
        mimeType: uploaded.mimeType || file.type,
        size: uploaded.size || file.size,
        cachedVoice: uploaded.cachedVoice || null,
        reused: Boolean(uploaded.cachedVoice || uploaded.reused),
      };
      setPendingAudio(nextPendingAudio);
      setUploadNotice(null);
      setShowConfirmDialog(true);
      Message.success("音频已上传，请确认解析后保存为我的音色");
    } catch (error) {
      setPendingAudio(null);
      setShowConfirmDialog(false);
      setUploadNotice({
        tone: "error",
        title: "音频上传失败",
        message: error?.message || "请检查文件后重新上传。",
        fileName: file.name,
      });
      Message.error(error?.message || "音频上传失败");
    } finally {
      setIsUploading(false);
    }
  }

  async function confirmParseVoice() {
    if (!pendingAudio) return;

    if (pendingAudio.cachedVoice?.id) {
      onVoiceIdChange?.(pendingAudio.cachedVoice.id);
      onVoiceSaved?.(pendingAudio.cachedVoice);
      setPendingAudio(null);
      setShowConfirmDialog(false);
      Message.success("已复用保存过的音色");
      return;
    }

    setIsParsing(true);
    try {
      const cloneResult = await digitalHumanApi.createVoiceClone({
        cloneAudioFileId: pendingAudio.fileId,
        audioHash: pendingAudio.audioHash,
        durationMs: pendingAudio.durationMs,
        sourceFileName: pendingAudio.name,
        sourceMimeType: pendingAudio.mimeType,
        sourceSize: pendingAudio.size,
        previewText: "你好，这是我的专属数字人音色。",
        name: `${getFileStem(pendingAudio.name)}音色`,
      });
      const voice = cloneResult?.voice;
      if (!voice?.id) {
        throw new Error("音色解析失败，请重新上传");
      }
      onVoiceIdChange?.(voice.id);
      onVoiceSaved?.(voice);
      setPendingAudio(null);
      setShowConfirmDialog(false);
      await refreshCredits?.();
      Message.success(cloneResult?.reused ? "已复用保存过的音色" : "我的音色已解析并保存");
    } catch (error) {
      Message.error(error?.message || "音色解析失败");
    } finally {
      setIsParsing(false);
    }
  }

  return (
    <div className="dhv2-audio-library">
      <input
        ref={inputRef}
        type="file"
        accept={CLONE_AUDIO_ACCEPT}
        hidden
        onChange={handleFileChange}
      />

      <div className="dhv2-audio-library__grid">
        <button
          type="button"
          className="dhv2-audio-create-card"
          disabled={isUploading || isParsing}
          onClick={() => inputRef.current?.click()}
        >
          <span className="dhv2-audio-create-card__icon" aria-hidden="true">
            {isUploading ? <Loader2 size={24} className="dhv2-spinner" /> : <Upload size={24} />}
          </span>
          <span>{isUploading ? "上传中" : "上传我的音频"}</span>
        </button>

        {pendingAudio ? (
          <article className="dhv2-audio-pending-card">
            <button
              type="button"
              className="dhv2-audio-pending-card__close"
              aria-label="取消解析"
              disabled={isParsing}
              onClick={() => {
                setPendingAudio(null);
                setUploadNotice(null);
                setShowConfirmDialog(false);
              }}
            >
              <X size={14} />
            </button>
            <span className="dhv2-audio-pending-card__icon" aria-hidden="true">
              <Mic2 size={22} />
            </span>
            <strong>{pendingAudio.name}</strong>
            <em>
              {pendingAudio.durationMs
                ? formatSpeechDurationFromMs(pendingAudio.durationMs)
                : "已上传，等待解析"}
            </em>
            <p>
              {pendingAudio.cachedVoice
                ? "该音频已解析过，可直接复用，不消耗积分。"
                : `确认解析会消耗 ${VOICE_CLONE_POINTS.toLocaleString()} 积分，解析后保存到我的音色，可重复使用。`}
            </p>
            <button
              type="button"
              className="dhv2-audio-pending-card__confirm"
              disabled={isParsing}
              onClick={() => setShowConfirmDialog(true)}
            >
              <Check size={14} />
              {pendingAudio.cachedVoice ? "确认使用音色" : "确认解析我的音色"}
            </button>
          </article>
        ) : null}

        {uploadNotice ? (
          <article className={`dhv2-audio-notice-card is-${uploadNotice.tone || "info"}`}>
            <button
              type="button"
              className="dhv2-audio-notice-card__close"
              aria-label="关闭上传提示"
              onClick={() => setUploadNotice(null)}
            >
              <X size={14} />
            </button>
            <span className="dhv2-audio-notice-card__icon" aria-hidden="true">
              <Mic2 size={22} />
            </span>
            <strong>{uploadNotice.title}</strong>
            {uploadNotice.fileName ? <em>{uploadNotice.fileName}</em> : null}
            <p>{uploadNotice.message}</p>
            <button
              type="button"
              className="dhv2-audio-notice-card__action"
              onClick={() => inputRef.current?.click()}
            >
              <Upload size={14} />
              重新上传
            </button>
          </article>
        ) : null}

        {clonedVoices.map((voice) => {
          const isActive = String(voice.id) === String(voiceId);
          return (
            <article
              key={voice.id}
              className={`dhv2-audio-asset-card${isActive ? " is-active" : ""}`}
            >
              <button
                type="button"
                className="dhv2-audio-asset-card__main"
                onClick={() => onVoiceIdChange?.(voice.id)}
              >
                <span className="dhv2-audio-asset-card__icon" aria-hidden="true">
                  <Mic2 size={22} />
                </span>
                <strong>{voice.name || "我的音色"}</strong>
                <em>{isActive ? "当前使用" : "已保存，可复用"}</em>
              </button>
              <button
                type="button"
                className="dhv2-audio-asset-card__play"
                aria-label={`试听${voice.name || "我的音色"}`}
                disabled={previewingId === voice.id}
                onClick={() => previewVoice(voice.id)}
              >
                {previewingId === voice.id ? <Loader2 size={14} className="dhv2-spinner" /> : <Play size={14} />}
              </button>
            </article>
          );
        })}

        {!pendingAudio && !uploadNotice && !clonedVoices.length ? (
          <div className="dhv2-audio-library__empty">暂无我的音色，上传音频后点击确认解析</div>
        ) : null}
      </div>

      {pendingAudio && showConfirmDialog ? (
        <div
          className="dhv2-audio-confirm-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="确认解析我的音色"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !isParsing) {
              setShowConfirmDialog(false);
            }
          }}
        >
          <section className="dhv2-audio-confirm" onMouseDown={(event) => event.stopPropagation()}>
            <header className="dhv2-audio-confirm__head">
              <div>
                <span>我的音色</span>
                <strong>{pendingAudio.cachedVoice ? "确认使用已解析音色" : "确认解析我的音色"}</strong>
              </div>
              <button
                type="button"
                className="dhv2-audio-confirm__close"
                aria-label="关闭确认解析"
                disabled={isParsing}
                onClick={() => setShowConfirmDialog(false)}
              >
                <X size={16} />
              </button>
            </header>

            <div className="dhv2-audio-confirm__body">
              <span className="dhv2-audio-confirm__icon" aria-hidden="true">
                <Mic2 size={24} />
              </span>
              <div className="dhv2-audio-confirm__file">
                <strong>{pendingAudio.name}</strong>
                <span>
                  {pendingAudio.durationMs
                    ? `音频时长 ${formatSpeechDurationFromMs(pendingAudio.durationMs)}`
                    : "参考音频已上传"}
                </span>
              </div>
              <div className="dhv2-audio-confirm__cost">
                {pendingAudio.cachedVoice ? (
                  <>
                    <span>复用已保存音色</span>
                    <strong>0 积分</strong>
                  </>
                ) : (
                  <>
                    <span>本次解析消耗</span>
                    <strong>{VOICE_CLONE_POINTS.toLocaleString()} 积分</strong>
                  </>
                )}
              </div>
              <p>
                {pendingAudio.cachedVoice
                  ? "该音频已经解析过，确认后会直接选择已保存的我的音色。"
                  : "点击确认后才会开始克隆音色。解析成功后会保存到我的音色，后续可直接复用。"}
              </p>
            </div>

            <footer className="dhv2-audio-confirm__footer">
              <button
                type="button"
                className="dhv2-audio-confirm__secondary"
                disabled={isParsing}
                onClick={() => setShowConfirmDialog(false)}
              >
                稍后再解析
              </button>
              <button
                type="button"
                className="dhv2-audio-confirm__primary"
                disabled={isParsing}
                onClick={confirmParseVoice}
              >
                {isParsing ? <Loader2 size={16} className="dhv2-spinner" /> : <Check size={16} />}
                {pendingAudio.cachedVoice ? "确认使用音色" : "确认解析我的音色"}
              </button>
            </footer>
          </section>
        </div>
      ) : null}
    </div>
  );
}
