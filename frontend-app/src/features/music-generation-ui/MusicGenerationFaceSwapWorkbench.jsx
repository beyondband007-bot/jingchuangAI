import React, { useState } from "react";
import { ChevronDown, FileAudio, FileText, Info, LockKeyhole, Wand2 } from "lucide-react";
import { musicApi } from "../music/musicApi";
import "./aiMusicGenerationWorkbenchCard.css";
import "./MusicGenerationFaceSwapWorkbench.css";

const styleTags = ["流行", "电子", "嘻哈", "古典", "国风", "轻音乐", "摇滚", "爵士"];

function formatStamp() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, "0");
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
}

function makeFileName(prefix, ext) {
  return `${prefix}-${formatStamp()}.${ext}`;
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
    type: response.headers.get("Content-Type") || "audio/mpeg",
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
  throw new Error("音乐仍在生成中，请稍后到最近生成里查看。");
}

export function MusicGenerationFaceSwapWorkbench({
  heading = "AI 换脸工具",
  copy,
}) {
  const [prompt, setPrompt] = useState("");
  const [lyrics, setLyrics] = useState("");
  const [isInstrumental, setIsInstrumental] = useState(false);
  const [lyricsOptimizer, setLyricsOptimizer] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [notice, setNotice] = useState("");
  const [currentResult, setCurrentResult] = useState(null);

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
        lyricsOptimizer: isInstrumental ? false : lyricsOptimizer,
      });

      setNotice("音乐任务已提交，正在生成中...");
      const completed = data.status === "completed" ? data : await waitForMusicTask(data.id);
      if (completed.status === "failed") {
        throw new Error(completed.error || "音乐生成失败，请稍后重试。");
      }
      if (!completed.audioUrl) {
        throw new Error("音乐已完成，但未返回音频文件。");
      }

      setCurrentResult({
        id: completed.id || `${Date.now()}`,
        prompt: completed.prompt || prompt.trim(),
        lyrics: completed.lyrics || lyrics.trim(),
        model: completed.model || "music-2.6-free",
        audioUrl: completed.audioUrl || "",
        durationMs: completed.durationMs || 0,
      });
      setNotice("音乐生成完成。");
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
      type: "text/plain;charset=utf-8",
    });
  }

  function appendPrompt(tag) {
    setPrompt((current) => [current.trim(), tag].filter(Boolean).join("，").slice(0, 200));
  }

  return (
    <div className="face-swap-workbench music-generation-face-swap-workbench">
      <div className="face-swap-workbench__hero">
        <div>
          <h1>{heading}</h1>
          <p>{copy.emptyDescription}</p>
        </div>
      </div>

      <div className="face-swap-workbench__upload-grid">
        <section className="face-swap-workbench__upload-card music-generation-face-swap-workbench__card">
          <div className="ai-music-workbench__mode-tabs music-generation-face-swap-workbench__mode-tabs">
            <button type="button" className={!isInstrumental ? "is-active" : ""} onClick={() => setIsInstrumental(false)}>
              带歌词
            </button>
            <button type="button" className={isInstrumental ? "is-active" : ""} onClick={() => setIsInstrumental(true)}>
              纯音乐
            </button>
          </div>

          <label className="ai-music-workbench__field-title">
            <span>1</span>
            风格 / 场景描述
            <Info size={16} />
          </label>
          <div className="ai-music-workbench__textarea ai-music-workbench__style-box">
            <textarea
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder="例如：独立民谣，忧郁，内省，温暖，致敬追梦，咖啡馆氛围"
              maxLength={200}
              disabled={isGenerating}
            />
            <em>{prompt.length} / 200</em>
          </div>

          <div className="ai-music-workbench__tags">
            <b>智能推荐：</b>
            {styleTags.map((tag) => (
              <button key={tag} type="button" onClick={() => appendPrompt(tag)}>
                {tag}
              </button>
            ))}
          </div>

          {!isInstrumental ? (
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
                  onChange={(event) => setLyrics(event.target.value)}
                  placeholder={"[Verse]\n第一段歌词...\n[Chorus]\n副歌歌词...\n[Verse 2]\n第二段歌词..."}
                  disabled={isGenerating}
                />
              </div>
            </>
          ) : null}

          <div className="music-generation-face-swap-workbench__right">
            <div className="ai-music-workbench__bottom-options music-generation-face-swap-workbench__bottom-options">
              <label>
                <input
                  type="checkbox"
                  checked={lyricsOptimizer}
                  onChange={(event) => setLyricsOptimizer(event.target.checked)}
                  disabled={isGenerating || isInstrumental}
                />
                <span>自动优化歌词</span>
                <Info size={14} />
              </label>
              <button type="button" className="ai-music-workbench__model">
                模型：music-2.6-free
                <ChevronDown size={15} />
              </button>
            </div>

            <button className="ai-music-workbench__generate music-generation-face-swap-workbench__generate" type="button" onClick={generate} disabled={isGenerating || !prompt.trim()}>
              <Wand2 size={20} />
              {isGenerating ? "生成中..." : "生成音乐"}
            </button>

            {notice ? <div className="ai-music-workbench__notice">{notice}</div> : null}

            {currentResult ? (
              <div className="ai-music-workbench__result">
                <div className="ai-music-workbench__result-head">
                  <span>
                    <FileAudio size={16} /> {currentResult.prompt || "音乐生成完成"}
                  </span>
                  <div>
                    <button type="button" onClick={downloadMp3}>
                      <FileAudio size={14} /> MP3
                    </button>
                    {currentResult.lyrics ? (
                      <button type="button" onClick={downloadLyrics}>
                        <FileText size={14} /> 歌词
                      </button>
                    ) : null}
                  </div>
                </div>
                <audio controls src={currentResult.audioUrl} />
              </div>
            ) : null}
          </div>
        </section>
      </div>


    </div>
  );
}
