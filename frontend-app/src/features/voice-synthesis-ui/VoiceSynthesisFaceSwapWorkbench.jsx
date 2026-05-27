import React, { useState } from "react";
import { Clipboard, LockKeyhole, Mic2, SmilePlus, Trash2, Upload, Wand2, X } from "lucide-react";
import { voiceApi } from "../voice/voiceApi";
import "./voiceSynthesisWorkbenchCard.css";
import "./VoiceSynthesisFaceSwapWorkbench.css";

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

export function VoiceSynthesisFaceSwapWorkbench({
  heading = "AI 换脸工具",
  copy,
  privacyText = "您上传的内容仅用于语音合成处理，不会被用于其他用途。",
}) {
  const [cloneAudio, setCloneAudio] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [notice, setNotice] = useState("");
  const [text, setText] = useState("欢迎使用 Facemini AI 语音合成，现在开始生成属于你的专属声音。");
  const [speed, setSpeed] = useState(1);
  const [volume, setVolume] = useState(1);
  const [pitch, setPitch] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);

  async function uploadFile(file) {
    setNotice("");
    setUploading(true);
    try {
      const durationMs = await readAudioDuration(file);
      if (durationMs && (durationMs < 10000 || durationMs > 5 * 60 * 1000)) {
        throw new Error("目标音色音频需在 10 秒到 5 分钟之间，支持 mp3、m4a、wav。");
      }

      const result = await voiceApi.uploadCloneAudio(file, durationMs);
      setCloneAudio({
        ...result,
        fileName: file.name,
        size: file.size,
        durationMs,
      });
      setNotice("目标音色上传完成。");
    } catch (error) {
      setNotice(error.message || "上传音色失败");
    } finally {
      setUploading(false);
    }
  }

  function clearCloneAudio() {
    setCloneAudio(null);
    setNotice("");
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

  async function generateVoice() {
    if (!cloneAudio?.fileId) {
      setNotice("请先上传目标音色。");
      return;
    }
    if (!text.trim()) {
      setNotice("请输入需要合成的文本。");
      return;
    }

    setNotice("");
    setIsGenerating(true);
    try {
      await voiceApi.synthesize({
        voiceId: cloneAudio.fileId,
        voiceName: cloneAudio.fileName || "",
        text,
        speed,
        volume,
        pitch,
      });
      setNotice("语音生成完成。");
    } catch (error) {
      setNotice(error.message || "语音生成失败");
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div className="face-swap-workbench voice-synthesis-face-swap-workbench">
      <div className="face-swap-workbench__hero">
        <div>
          <h1>{heading}</h1>
          <p>{copy.emptyDescription}</p>
        </div>
      </div>

      <div className="face-swap-workbench__upload-grid">
        <section className="face-swap-workbench__upload-card voice-synthesis-face-swap-workbench__card">
          <div className={`voice-synthesis-face-swap-workbench__upload ${cloneAudio ? "has-file" : ""}`}>
            <div className="voice-synthesis-face-swap-workbench__upload-header">
              <div className="voice-synthesis-face-swap-workbench__upload-copy">
                <h3>选择目标音色</h3>
                <p>建议使用单人、清晰、噪音较少的音频样本。</p>
              </div>
              <span className="voice-synthesis-face-swap-workbench__format-pill">MP3 / M4A / WAV</span>
            </div>

            <label className="voice-synthesis-face-swap-workbench__upload-input">
              <input
                type="file"
                accept=".mp3,.m4a,.wav,audio/mpeg,audio/mp4,audio/wav"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (file) uploadFile(file);
                }}
                disabled={uploading}
              />
              <div className={`voice-synthesis-face-swap-workbench__placeholder ${cloneAudio ? "has-file" : ""}`}>
                <div className="voice-synthesis-face-swap-workbench__placeholder-icon">
                  {uploading ? <Upload size={56} /> : <Mic2 size={56} />}
                </div>
                <strong>{cloneAudio ? cloneAudio.fileName : "点击或拖拽音频文件到此处上传"}</strong>
                <span>{cloneAudio ? `时长 ${Math.max(1, Math.round((cloneAudio.durationMs || 0) / 1000))} 秒` : "支持 MP3 / M4A / WAV，建议上传 10 秒到 5 分钟"}</span>
              </div>
            </label>
            {cloneAudio ? (
              <button
                className="voice-synthesis-face-swap-workbench__clear"
                type="button"
                onClick={clearCloneAudio}
                aria-label="清空音频"
              >
                <X size={14} />
              </button>
            ) : null}
            <aside className="voice-synthesis-face-swap-workbench__requirements">
              <h3>音色要求</h3>
              <ul>
                <li>人声清晰，尽量避免噪声和混响。</li>
                <li>建议使用单人独白音频，情绪稳定。</li>
                <li>语速适中，口齿清楚，更利于克隆。</li>
                <li>上传后仅用于生成相似音色，不会展示。</li>
              </ul>
            </aside>
          </div>
        </section>

        <section className="voice-synthesis-face-swap-workbench__card voice-synthesis-face-swap-workbench__card--plain">
          <div className="voice-synthesis-face-swap-workbench__right">
            <section className="voice-synthesis-workspace__panel voice-synthesis-face-swap-workbench__panel">
              <div className="voice-synthesis-workspace__step">
                <span>2</span>
                <h2>输入文本</h2>
              </div>

              <textarea
                className="voice-synthesis-workspace__textarea"
                value={text}
                onChange={(event) => setText(event.target.value)}
                placeholder="请输入或粘贴需要合成的文本内容..."
                maxLength={2000}
              />

              <div className="voice-synthesis-workspace__text-tools">
                <button type="button" onClick={() => setText("")}>
                  <Trash2 size={15} />
                  清空文本
                </button>
                <button type="button" onClick={pasteText}>
                  <Clipboard size={15} />
                  粘贴文本
                </button>
                <button type="button" onClick={insertPause}>
                  <SmilePlus size={15} />
                  插入停顿
                </button>
                <span>{text.length} / 2000</span>
              </div>
            </section>

            <section className="voice-synthesis-workspace__panel voice-synthesis-face-swap-workbench__panel">
              <div className="voice-synthesis-workspace__step">
                <span>3</span>
                <h2>生成设置</h2>
              </div>

              <div className="voice-synthesis-workspace__sliders">
                <label className="voice-synthesis-workspace__slider">
                  <span className="voice-synthesis-workspace__slider-header">
                    <span>语速</span>
                    <strong>{speed.toFixed(2)}x</strong>
                  </span>
                  <input type="range" min="0.5" max="2" step="0.05" value={speed} onChange={(event) => setSpeed(Number(event.target.value))} />
                  <span className="voice-synthesis-workspace__slider-range">
                    <small>0.5x</small>
                    <small>2.0x</small>
                  </span>
                </label>
                <label className="voice-synthesis-workspace__slider">
                  <span className="voice-synthesis-workspace__slider-header">
                    <span>音量</span>
                    <strong>{volume.toFixed(1)}</strong>
                  </span>
                  <input type="range" min="0.1" max="10" step="0.1" value={volume} onChange={(event) => setVolume(Number(event.target.value))} />
                  <span className="voice-synthesis-workspace__slider-range">
                    <small>0.1</small>
                    <small>10</small>
                  </span>
                </label>
                <label className="voice-synthesis-workspace__slider">
                  <span className="voice-synthesis-workspace__slider-header">
                    <span>音调</span>
                    <strong>{pitch > 0 ? `+${pitch}` : String(pitch)}</strong>
                  </span>
                  <input type="range" min="-12" max="12" step="1" value={pitch} onChange={(event) => setPitch(Number(event.target.value))} />
                  <span className="voice-synthesis-workspace__slider-range">
                    <small>-12</small>
                    <small>+12</small>
                  </span>
                </label>
              </div>

              <button
                type="button"
                className="voice-synthesis-workspace__generate-button dh-generate-button"
                onClick={generateVoice}
                disabled={isGenerating || uploading || !cloneAudio || !text.trim()}
              >
                <Wand2 size={18} />
                {isGenerating ? "生成中..." : "生成语音"}
              </button>
              <p className="voice-synthesis-workspace__settings-note">{notice || "目标音色支持 mp3、m4a、wav，建议时长 10 秒到 5 分钟。"}</p>
            </section>
          </div>
        </section>
      </div>


      <div className="voice-synthesis-face-swap-workbench__privacy-note">
        <LockKeyhole size={16} />
        您上传的内容仅用于换脸处理，不会被用于其他用途。
      </div>
    </div>
  );
}
