import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Bot,
  Box,
  CheckCircle2,
  Camera,
  Copy,
  Dice5,
  Download,
  Eraser,
  FileText,
  Film,
  Home,
  Image,
  Layers,
  LogIn,
  Loader2,
  Maximize2,
  Mic,
  Music,
  Paintbrush,
  Play,
  Plus,
  RefreshCcw,
  Ruler,
  Send,
  PlaySquare,
  Scissors,
  Share2,
  Sparkles,
  Star,
  Target,
  Timer,
  Trash2,
  UserRound,
  Video,
  Wand2
} from "lucide-react";
import { imageApi } from "./api/imageApi";
import { videoApi } from "./api/videoApi";
import { chatApi } from "./api/chatApi";
import { digitalHumanApi } from "./api/digitalHumanApi";
import { imageDigitalHumanApi } from "./api/imageDigitalHumanApi";
import { motionTransferApi } from "./api/motionTransferApi";
import "./styles.css";

const exampleImages = [
  { src: "/assets/image/gallery-1.jpg", label: "电影质感人像", model: "GPT Image 2", ratio: "9:16", quality: "2K", price: "35 积分" },
  { src: "/assets/image/gallery-2.jpg", label: "时尚产品摄影", model: "Nano Banana Pro", ratio: "1:1", quality: "2K", price: "63 积分" },
  { src: "/assets/image/gallery-4.jpg", label: "自然光影", model: "Imagen 4", ratio: "16:9", quality: "2K", price: "28 积分" },
  { src: "/assets/image/gallery-6.jpg", label: "水下写实", model: "Flux 2 Pro", ratio: "4:3", quality: "1K", price: "18 积分" },
  { src: "/assets/image/gallery-7.jpg", label: "数字人形象", model: "GPT Image 2", ratio: "9:16", quality: "2K", price: "35 积分" },
  { src: "/assets/image/gallery-5.jpg", label: "动态创意", model: "4o Image", ratio: "1:1", quality: "1K", price: "21 积分" },
  { src: "/assets/image/thumb-img-gen.jpg", label: "图片生成", model: "Imagen 4 Fast", ratio: "1:1", quality: "1K", price: "14 积分" },
  { src: "/assets/image/gallery-9.jpg", label: "灵感封面", model: "Seedream 4.5", ratio: "16:9", quality: "2K", price: "22 积分" },
  { src: "/assets/image/gallery-8.jpg", label: "复古影像", model: "Nano Banana Pro", ratio: "3:4", quality: "2K", price: "63 积分" },
  { src: "/assets/image/gallery-10.jpg", label: "概念海报", model: "Seedream 4.5", ratio: "9:16", quality: "2K", price: "22 积分" }
];

const navItems = [
  { id: "home", label: "首页", icon: Home },
  { id: "image", label: "图片生成", icon: Image },
  { id: "video", label: "视频生成", icon: Video },
  { id: "chat", label: "AI对话", icon: Bot },
  { id: "digital-human", label: "数字人", icon: UserRound },
  { id: "image-digital-human", label: "图片数字人", icon: Camera },
  { id: "motion", label: "动作迁移", icon: Sparkles },
  { id: "face-swap", label: "视频换脸", icon: Scissors },
  { id: "voice", label: "语音合成", icon: Mic },
  { id: "article", label: "爆款图文", icon: FileText },
  { id: "watermark", label: "去水印", icon: Eraser },
  { id: "voice-convert", label: "音色转换", icon: Mic },
  { id: "transcribe", label: "转录", icon: Mic },
  { id: "video-voice", label: "视频配音", icon: PlaySquare },
  { id: "music", label: "AI音乐", icon: Music },
  { id: "replicate", label: "复刻", icon: Copy },
  { id: "enhance", label: "增强", icon: Wand2 },
  { id: "remove-bg", label: "去背景", icon: Layers },
  { id: "canvas", label: "画布", icon: Paintbrush },
  { id: "publish", label: "发布", icon: Share2 }
];

function getInitialView() {
  if (window.location.pathname === "/chat" || window.location.hash === "#/chat") return "chat";
  if (window.location.pathname === "/image-digital-human" || window.location.hash === "#/image-digital-human") return "image-digital-human";
  if (window.location.pathname === "/digital-human" || window.location.hash === "#/digital-human") return "digital-human";
  if (window.location.pathname === "/motion-transfer" || window.location.hash === "#/motion") return "motion";
  if (window.location.pathname === "/video" || window.location.hash === "#/video") return "video";
  if (window.location.pathname === "/image" || window.location.hash === "#/image") return "image";
  return "home";
}

const OriginalHome = memo(function OriginalHome({ onOpenImage, skipSplash }) {
  const frameRef = useRef(null);

  const enterOriginalHome = useCallback(() => {
    if (!skipSplash) return;

    const frame = frameRef.current;
    let tries = 0;
    const timer = window.setInterval(() => {
      tries += 1;
      try {
        const doc = frame?.contentDocument;
        const buttons = Array.from(doc?.querySelectorAll("button") || []);
        const enterButton = buttons.find((button) => button.textContent?.includes("立即生成"));
        if (enterButton) {
          enterButton.click();
          window.clearInterval(timer);
        }
      } catch {
        window.clearInterval(timer);
      }

      if (tries > 30) {
        window.clearInterval(timer);
      }
    }, 100);
  }, [skipSplash]);

  return (
    <div className="original-home-shell">
      <iframe ref={frameRef} className="original-home-frame" title="鲸创AI首页" src="/original/index.html" onLoad={enterOriginalHome} />
      <button className="image-nav-hotspot" type="button" onClick={onOpenImage} aria-label="进入图片生成" />
    </div>
  );
});

const FeatureSidebar = memo(function FeatureSidebar({ activeNav, onNavChange }) {
  return (
    <aside className="feature-sidebar">
      <div className="feature-brand">
        <span className="feature-brand-mark">
          <Sparkles size={17} />
        </span>
        <span>鲸创AI</span>
      </div>
      <nav className="feature-nav" aria-label="功能导航">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = activeNav === item.id;
          return (
            <button className={`feature-nav-item ${active ? "is-active" : ""}`} key={item.id} onClick={() => onNavChange(item.id)} type="button">
              <Icon size={18} strokeWidth={1.9} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
      <button className="feature-login" type="button">
        <LogIn size={16} />
        <span>登录</span>
      </button>
    </aside>
  );
});

function ComingSoon({ activeNav }) {
  const current = useMemo(() => navItems.find((item) => item.id === activeNav), [activeNav]);
  return (
    <section className="coming-soon-panel">
      <div className="coming-soon-icon">
        <Sparkles size={28} />
      </div>
      <h1>{current?.label || "功能"}暂未开放</h1>
      <p>当前阶段只接入图片生成入口。其他功能会在后续步骤里按模块逐步补齐。</p>
    </section>
  );
}

function ResultCard({ card, onDelete, onFavorite, onRegenerate }) {
  const isProcessing = card.status === "processing";
  const isFailed = card.status === "failed";

  return (
    <article className={`result-card status-${card.status}`}>
      <div className={`result-preview ${card.grid ? "preview-grid" : ""}`}>
        {isProcessing && <div className="processing-state">生成中...</div>}
        {isFailed && <div className="failed-state">生成失败</div>}
        {!isProcessing && !isFailed && card.image ? (
          card.grid ? (
            <>
              <img src={card.image} alt={card.prompt} />
              <img src="/assets/image/gallery-3.jpg" alt={card.prompt} />
              <img src="/assets/image/gallery-4.jpg" alt={card.prompt} />
              <img src="/assets/image/gallery-5.jpg" alt={card.prompt} />
            </>
          ) : (
            <img src={card.image} alt={card.prompt} />
          )
        ) : null}
        {!isProcessing && !isFailed && !card.image && <span className="broken-image-mark" aria-hidden="true" />}
      </div>
      <div className="result-meta">
        <div className="tag-row">
          <span className="model-tag">{card.model}</span>
          <span className="ratio-tag">{card.ratio}</span>
          <span className="quality-tag">{card.quality}</span>
          {card.count > 1 && <span className="count-tag">{card.count}张</span>}
        </div>
        <div className="time-row">
          <span>{card.time}</span>
          <strong>{card.price}</strong>
        </div>
        <p>{card.error || card.prompt}</p>
        <div className="card-actions">
          <button className={`icon-circle ${card.favorite ? "is-favorite" : ""}`} type="button" onClick={() => onFavorite(card.id)} aria-label="收藏">
            <Star size={17} fill={card.favorite ? "#f8d545" : "none"} />
          </button>
          <button type="button">
            <Download size={15} />
            下载
          </button>
          <button type="button" onClick={() => onRegenerate(card.id)}>
            <RefreshCcw size={15} />
            再次生成
          </button>
          <button type="button" onClick={() => onDelete(card.id)}>
            <Trash2 size={15} />
            删除
          </button>
        </div>
      </div>
    </article>
  );
}

function ComposerBar({ options, onSubmit }) {
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState(options.models[0]?.value || "");
  const [ratio, setRatio] = useState(options.ratios[0] || "");
  const [quality, setQuality] = useState(options.qualities[0]?.value || "");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!model && options.models[0]) setModel(options.models[0].value);
    if (!ratio && options.ratios[0]) setRatio(options.ratios[0]);
    if (!quality && options.qualities[0]) setQuality(options.qualities[0].value);
  }, [model, options, quality, ratio]);

  const count = 1;
  const price = imageApi.calculatePrice({ model, quality, count, models: options.models, qualities: options.qualities });
  const canSubmit = prompt.trim().length > 0;

  function clearPrompt() {
    setPrompt("");
    setNotice("已清空提示词");
  }

  function fillRandomPrompt() {
    setPrompt(imageApi.getRandomPrompt());
    setNotice("已填入随机提示词");
  }

  function submitPrompt() {
    if (!canSubmit) {
      setNotice("请先输入图片描述");
      return;
    }

    onSubmit({
      prompt: prompt.trim(),
      model,
      ratio,
      quality,
      count
    });
    setNotice("已创建生成任务");
    setPrompt("");
  }

  return (
    <div className="sowa-composer" aria-label="图片生成输入框">
      <div className="composer-input-row">
        <button className="composer-add" type="button" aria-label="添加参考">
          <Plus size={22} />
        </button>
        <input
          className="composer-text-input"
          value={prompt}
          onChange={(event) => {
            setPrompt(event.target.value);
            if (notice) setNotice("");
          }}
          placeholder="请描述你想生成的图片..."
        />
      </div>
      <div className="composer-controls-row">
        <label className="control-select model-select">
          <Box size={16} />
          <select value={model} onChange={(event) => setModel(event.target.value)}>
            {options.models.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label className="control-select">
          <Ruler size={16} />
          <select value={ratio} onChange={(event) => setRatio(event.target.value)}>
            {options.ratios.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label className="control-select">
          <Target size={16} />
          <select value={quality} onChange={(event) => setQuality(event.target.value)}>
            {options.qualities.map((item) => (
              <option key={item.value} value={item.value}>
                {item.value}
              </option>
            ))}
          </select>
        </label>
        <button className="composer-tool" type="button" onClick={fillRandomPrompt} aria-label="随机提示词">
          <Dice5 size={18} />
        </button>
        <button className="composer-tool" type="button" onClick={clearPrompt} aria-label="清空">
          <Trash2 size={18} />
        </button>
        <span className="price-pill">{price}</span>
        <button className="send-button" type="button" disabled={!canSubmit} onClick={submitPrompt} aria-label="生成">
          <Send size={18} />
        </button>
      </div>
      {notice && <div className="composer-notice">{notice}</div>}
    </div>
  );
}

const emptyOptions = { models: [], ratios: [], qualities: [], counts: [] };

function ExampleCanvas() {
  return (
    <div className="image-canvas example-canvas" aria-label="图片生成案例">
      <div className="example-canvas-copy">
        <span>图片生成</span>
        <h1>选择一个方向，或直接输入你的图片描述</h1>
      </div>
      <div className="example-card-grid">
        {exampleImages.map((item) => (
          <button className="example-card" key={item.src} type="button">
            <span className="example-card-preview">
              <img src={item.src} alt={item.label} />
            </span>
            <span className="example-card-tags">
              <span>{item.model}</span>
              <span>{item.ratio}</span>
              <span>{item.quality}</span>
            </span>
            <span className="example-card-meta">
              <span>{item.label}</span>
              <strong>{item.price}</strong>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function GeneratingCanvas({ prompt }) {
  return (
    <div className="image-canvas chat-canvas" aria-live="polite">
      <div className="chat-thread">
        {prompt && (
          <div className="chat-row user">
            <div className="chat-bubble">{prompt}</div>
          </div>
        )}
        <div className="chat-row assistant">
          <div className="assistant-avatar">
            <Sparkles size={17} />
          </div>
          <div className="chat-bubble waiting">
            <div className="chat-waiting-title">
              <Loader2 size={18} />
              <span>已收到你的请求，正在为你生成图片</span>
            </div>
            <div className="chat-waiting-card">
              <span />
              <span />
              <span />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CompletedCanvas({ task, onPreview }) {
  return (
    <div className="image-canvas chat-canvas">
      <div className="chat-thread">
        <div className="chat-row user">
          <div className="chat-bubble">{task.prompt}</div>
        </div>
        <div className="chat-row assistant">
          <div className="assistant-avatar">
            <CheckCircle2 size={17} />
          </div>
          <div className="chat-bubble result">
            <span>已为你生成图片</span>
            <button className="chat-result-image" type="button" onClick={() => onPreview(task)} aria-label="查看生成图片">
              <img src={task.image} alt={task.prompt} />
            </button>
            <div className="chat-result-actions">
              <a href={task.image} download>
                <Download size={15} />
                下载
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FailedCanvas({ task, prompt, error, onRetry }) {
  const message = task?.error || error || "图片生成遇到问题，请稍后再试。";

  return (
    <div className="image-canvas chat-canvas" role="status">
      <div className="chat-thread">
        {(task?.prompt || prompt) && (
          <div className="chat-row user">
            <div className="chat-bubble">{task?.prompt || prompt}</div>
          </div>
        )}
        <div className="chat-row assistant">
          <div className="assistant-avatar error">
            <Sparkles size={17} />
          </div>
          <div className="chat-bubble failed">
            <strong>这次没有生成成功</strong>
            <p>{message}</p>
            {task && (
              <button type="button" onClick={() => onRetry(task.id)}>
                <RefreshCcw size={17} />
                再次生成
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ImageWorkspaceCanvas({ status, selectedTask, activePrompt, submitError, onRetry, onPreview }) {
  if (status === "generating") {
    return <GeneratingCanvas prompt={selectedTask?.prompt || activePrompt} />;
  }

  if (status === "completed" && selectedTask?.image) {
    return <CompletedCanvas task={selectedTask} onPreview={onPreview} />;
  }

  if (status === "failed") {
    return <FailedCanvas task={selectedTask} prompt={activePrompt} error={submitError} onRetry={onRetry} />;
  }

  return <ExampleCanvas />;
}

function PreviewDrawer({ task, onClose }) {
  if (!task?.image) return null;

  return (
    <aside className="preview-drawer" aria-label="生成图片预览画布">
      <div className="preview-drawer-header">
        <div>
          <span>预览</span>
          <strong>{task.prompt}</strong>
        </div>
        <button type="button" onClick={onClose} aria-label="关闭预览">
          ×
        </button>
      </div>
      <div className="preview-drawer-stage">
        <img src={task.image} alt={task.prompt} />
      </div>
      <div className="preview-drawer-actions">
        <a href={task.image} download>
          <Download size={16} />
          下载
        </a>
      </div>
    </aside>
  );
}

function HistoryRail({ cards, selectedTaskId, onSelect, onDelete, onFavorite, onRegenerate }) {
  if (!cards.length) return null;

  return (
    <aside className="history-rail" aria-label="图片生成历史">
      <div className="history-rail-header">
        <span>历史结果</span>
        <strong>{cards.length}</strong>
      </div>
      <div className="history-list">
        {cards.map((card) => {
          const isSelected = selectedTaskId === card.id;
          const isProcessing = card.status === "pending" || card.status === "processing";
          const isFailed = card.status === "failed";

          return (
            <article className={`history-item ${isSelected ? "is-selected" : ""} status-${card.status}`} key={card.id}>
              <button className="history-preview" type="button" onClick={() => onSelect(card.id)} aria-label={`查看 ${card.prompt}`}>
                {card.image && !isFailed ? <img src={card.image} alt={card.prompt} /> : null}
                {isProcessing && (
                  <span className="history-processing">
                    <Loader2 size={18} />
                  </span>
                )}
                {isFailed && <span className="history-failed">失败</span>}
                {!card.image && !isProcessing && !isFailed && <span className="broken-image-mark" aria-hidden="true" />}
              </button>
              <div className="history-meta">
                <button className="history-title" type="button" onClick={() => onSelect(card.id)}>
                  {card.prompt}
                </button>
                <div className="history-tags">
                  <span>{card.ratio}</span>
                  <span>{card.quality}</span>
                  <span>{card.time}</span>
                </div>
                <div className="history-actions">
                  <button type="button" onClick={() => onFavorite(card.id)} aria-label="收藏">
                    <Star size={15} fill={card.favorite ? "#f8d545" : "none"} />
                  </button>
                  {card.image && (
                    <a href={card.image} download aria-label="下载图片">
                      <Download size={15} />
                    </a>
                  )}
                  <button type="button" onClick={() => onRegenerate(card.id)} aria-label="再次生成">
                    <RefreshCcw size={15} />
                  </button>
                  <button type="button" onClick={() => onDelete(card.id)} aria-label="删除">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </aside>
  );
}

function ImageGenerationView({ activeNav }) {
  const [filter, setFilter] = useState("all");
  const [cards, setCards] = useState([]);
  const [options, setOptions] = useState(emptyOptions);
  const [credits, setCredits] = useState(null);
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [submittedTaskId, setSubmittedTaskId] = useState(null);
  const [activePrompt, setActivePrompt] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [previewTask, setPreviewTask] = useState(null);

  useEffect(() => {
    if (activeNav !== "image") return undefined;

    let mounted = true;
    imageApi.getModels().then((value) => mounted && setOptions(value));
    imageApi.getCredits().then((value) => mounted && setCredits(value));
    imageApi.getTasks({ filter }).then((value) => mounted && setCards(value));

    const unsubscribe = imageApi.subscribe(() => {
      imageApi.getTasks({ filter }).then((value) => mounted && setCards(value));
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [activeNav, filter]);

  const selectedTask = useMemo(() => cards.find((card) => card.id === selectedTaskId) || null, [cards, selectedTaskId]);
  const submittedTask = useMemo(() => cards.find((card) => card.id === submittedTaskId) || null, [cards, submittedTaskId]);

  useEffect(() => {
    if (submittedTask && (submittedTask.status === "completed" || submittedTask.status === "failed")) {
      setSelectedTaskId(submittedTask.id);
      setIsSubmitting(false);
    }
  }, [submittedTask]);

  useEffect(() => {
    if (!submittedTaskId || !submittedTask) return;
    setSelectedTaskId(submittedTask.id);
  }, [submittedTask, submittedTaskId]);

  const canvasStatus = useMemo(() => {
    if (submitError) return "failed";
    if (isSubmitting) return "generating";
    if (selectedTask?.status === "pending" || selectedTask?.status === "processing") return "generating";
    if (selectedTask?.status === "failed") return "failed";
    if (selectedTask?.status === "completed" && selectedTask.image) return "completed";
    return "idle_examples";
  }, [isSubmitting, selectedTask, submitError]);
  const showHistory = Boolean(submittedTaskId || selectedTaskId || isSubmitting);

  if (activeNav !== "image") {
    return <ComingSoon activeNav={activeNav} />;
  }

  async function createTask(payload) {
    setActivePrompt(payload.prompt);
    setSubmitError("");
    setIsSubmitting(true);
    setSelectedTaskId(null);
    setIsHistoryOpen(false);
    setPreviewTask(null);

    try {
      const task = await imageApi.createTask(payload);
      setSubmittedTaskId(task.id);
      setSelectedTaskId(task.id);
      if (task.status === "failed") {
        setIsSubmitting(false);
      }
    } catch (error) {
      setSubmitError(error.message || "创建生成任务失败");
      setIsSubmitting(false);
    }
  }

  async function deleteTask(id) {
    await imageApi.deleteTask(id);
    if (selectedTaskId === id) {
      setSelectedTaskId(null);
    }
    if (submittedTaskId === id) {
      setSubmittedTaskId(null);
      setActivePrompt("");
    }
  }

  async function toggleFavorite(id) {
    await imageApi.toggleFavorite(id);
  }

  async function regenerateTask(id) {
    const source = cards.find((card) => card.id === id);
    if (source) {
      setActivePrompt(source.prompt);
    }
    setSubmitError("");
    setIsSubmitting(true);
    setIsHistoryOpen(false);
    setPreviewTask(null);

    try {
      const created = await imageApi.regenerateTask(id);
      setSubmittedTaskId(created.id);
      setSelectedTaskId(created.id);
    } catch (error) {
      setSubmitError(error.message || "创建生成任务失败");
      setIsSubmitting(false);
    }
    setIsSubmitting(false);
  }

  return (
    <section className="image-gen-view">
      <div className="image-filter-tabs">
        <button className={filter === "all" ? "selected" : ""} onClick={() => setFilter("all")} type="button">全部结果</button>
        <button className={filter === "recent" ? "selected" : ""} onClick={() => setFilter("recent")} type="button">近24小时</button>
        <button className={filter === "favorite" ? "selected" : ""} onClick={() => setFilter("favorite")} type="button">
          <Star size={17} fill="#f8d545" color="#161616" />
          收藏
        </button>
        {credits && <span className="credits-chip">积分 {credits.balance}</span>}
      </div>
      {showHistory && cards.length > 0 && (
        <button className={`history-toggle ${isHistoryOpen ? "is-open" : ""}`} type="button" onClick={() => setIsHistoryOpen((value) => !value)}>
          <Layers size={17} />
          历史
          <span>{cards.length}</span>
        </button>
      )}
      <div className={`image-workspace ${isHistoryOpen && showHistory && cards.length ? "has-history" : "is-empty"}`}>
        <ImageWorkspaceCanvas
          status={canvasStatus}
          selectedTask={selectedTask}
          activePrompt={selectedTask?.prompt || activePrompt}
          submitError={submitError}
          onRetry={regenerateTask}
          onPreview={(task) => {
            setPreviewTask(task);
            setIsHistoryOpen(false);
          }}
        />
        <HistoryRail
          cards={isHistoryOpen && showHistory ? cards : []}
          selectedTaskId={selectedTaskId}
          onSelect={(id) => {
            setSubmitError("");
            setSelectedTaskId(id);
            setPreviewTask(null);
          }}
          onDelete={deleteTask}
          onFavorite={toggleFavorite}
          onRegenerate={regenerateTask}
        />
        {cards.length ? (
          cards.map((card) => (
            <ResultCard
              card={card}
              key={card.id}
              onDelete={deleteTask}
              onFavorite={toggleFavorite}
              onRegenerate={regenerateTask}
            />
          ))
        ) : (
          <div className="empty-results">暂无收藏内容</div>
        )}
      </div>
      <PreviewDrawer task={previewTask} onClose={() => setPreviewTask(null)} />
      {options.models.length > 0 && <ComposerBar options={options} onSubmit={createTask} />}
    </section>
  );
}

const emptyVideoOptions = { models: [], ratios: [], durations: [], counts: [1], modes: [] };
const videoExampleCards = [
  {
    id: "example-video-1",
    status: "completed",
    model: "Veo 3.1 Fast",
    modelKey: "veo_3_1_fast",
    ratio: "16:9",
    duration: 8,
    time: "10:51",
    rmb: "约 ¥22.4",
    price: "2240 积分",
    prompt: "未来都市中，巨型怪兽与身穿外骨骼装甲的战士在高架桥下展开激烈战斗，建筑崩塌、火焰四起，画面具有电影级质感，灰暗色调，高速动态镜头。",
    video: "/assets/video/视频1.mp4",
    favorite: false
  },
  {
    id: "example-video-2",
    status: "completed",
    model: "Kling 3.0 Std",
    modelKey: "kling_3_std",
    ratio: "16:9",
    duration: 6,
    time: "10:45",
    rmb: "约 ¥2.9",
    price: "294 积分",
    prompt: "古风仙侠男子，额间有精致花纹，一只黑蝶停驻鼻尖后化作流光溢彩的金属面具覆于面部，随后在雾气弥漫的竹林中高速战斗，黑红配色，动作凌厉飘逸。",
    video: "/assets/video/视频2.mp4",
    favorite: false
  },
  {
    id: "example-video-3",
    status: "completed",
    model: "Veo 3.1 Lite",
    modelKey: "veo_3_1_lite",
    ratio: "16:9",
    duration: 8,
    time: "10:45",
    rmb: "约 ¥9.6",
    price: "960 积分",
    prompt: "唯美古风浪漫场景，女子眼眸中飞出一只发光的粉色蝴蝶，拖着长长的白色纱带，飞过盛开的樱花与飞檐翘角的古建筑，空中飘浮着书法文字，色调柔和梦幻，粉白交织。",
    video: "/assets/video/视频3.mp4",
    favorite: false
  },
  {
    id: "example-video-4",
    status: "completed",
    model: "Kling 3.0 Pro",
    modelKey: "kling_3_pro",
    ratio: "9:16",
    duration: 10,
    time: "02:15",
    rmb: "约 ¥6.3",
    price: "630 积分",
    prompt: "沙漠废土风格的动漫战斗，绿发女子戴着巨型兽骨面具，与手持散发紫色光芒长刀的黑发男子在沙尘中激烈交锋，动作充满张力，紫黑配色，烟尘飞扬。",
    video: "/assets/video/视频4.mp4",
    favorite: false
  },
  {
    id: "example-video-5",
    status: "completed",
    model: "Kling 3.0 Std",
    modelKey: "kling_3_std",
    ratio: "1:1",
    duration: 8,
    time: "12:24",
    rmb: "约 ¥3.9",
    price: "392 积分",
    prompt: "日系动漫风格，身穿白衬衫校服的少年沉入深蓝色的海底，阳光透过水面洒下光束，周围气泡升腾，少年伸手触碰发光气泡，随后被巨大漩涡卷入，画面静谧而神秘。",
    video: "/assets/video/视频5.mp4",
    favorite: false
  },
  {
    id: "example-video-6",
    status: "completed",
    model: "Veo 3.1 Fast",
    modelKey: "veo_3_1_fast",
    ratio: "9:16",
    duration: 8,
    time: "11:57",
    rmb: "约 ¥22.4",
    price: "2240 积分",
    prompt: "东方奇幻仙侠意境，两只通体透明发光的灵鹿在瀑布溪流与雾气缭绕的山林间奔跑跳跃，蹄下生辉，身上带有流光拖尾，穿梭于古建与密林之间，氛围空灵神秘，青绿色调。",
    video: "/assets/video/视频6.mp4",
    favorite: false
  }
];

function getVideoModelOptions(options, modelKey) {
  const selectedModel = options.models.find((item) => item.value === modelKey) || options.models[0];
  return {
    model: selectedModel,
    ratios: selectedModel?.ratios?.length ? selectedModel.ratios : options.ratios,
    durations: selectedModel?.durations?.length ? selectedModel.durations : options.durations
  };
}

function VideoPreview({ task }) {
  const isProcessing = task.status === "pending" || task.status === "processing";
  const isFailed = task.status === "failed";

  if (task.video && !isFailed) {
    return (
      <video src={task.video} controls playsInline preload="metadata" />
    );
  }

  return (
    <div className={`video-placeholder ${isFailed ? "is-failed" : ""}`}>
      {isProcessing ? <Loader2 size={24} /> : <Play size={34} fill="currentColor" />}
      {(isFailed || isProcessing) && <span>{isFailed ? "生成失败" : "生成中"}</span>}
    </div>
  );
}

function VideoResultCard({ card, onDelete, onFavorite, onRegenerate, isExample = false }) {
  return (
    <article className={`result-card video-result-card status-${card.status} ${isExample ? "is-example" : ""}`}>
      <div className="result-preview video-result-preview">
        <VideoPreview task={card} />
        <span className="video-duration-badge">{card.duration}s</span>
      </div>
      <div className="result-meta">
        <div className="tag-row">
          <span className="model-tag">{card.model}</span>
          <span className="ratio-tag">{card.ratio}</span>
          <span className="quality-tag">{card.duration}秒</span>
          <span className="count-tag">首帧</span>
        </div>
        <div className="time-row">
          <span>{card.time}</span>
          <strong>{card.rmb || card.price}</strong>
        </div>
        <p>{card.error || card.prompt}</p>
        <div className="card-actions">
          <button className={`icon-circle ${card.favorite ? "is-favorite" : ""}`} type="button" onClick={() => onFavorite(card.id)} aria-label="收藏" disabled={isExample}>
            <Star size={17} fill={card.favorite ? "#f8d545" : "none"} />
          </button>
          {card.video ? (
            <a className="card-action-link" href={card.video} download>
              <Download size={15} />
              下载
            </a>
          ) : (
            <button type="button" disabled>
              <Download size={15} />
              下载
            </button>
          )}
          <button type="button" onClick={() => onRegenerate(card.id)} disabled={isExample}>
            <RefreshCcw size={15} />
            再次生成
          </button>
          <button type="button" onClick={() => onDelete(card.id)} disabled={isExample}>
            <Trash2 size={15} />
            删除
          </button>
        </div>
      </div>
    </article>
  );
}

function VideoComposerBar({ options, onSubmit }) {
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState(options.models[0]?.value || "");
  const modelOptions = getVideoModelOptions(options, model);
  const [ratio, setRatio] = useState(modelOptions.model?.defaultRatio || modelOptions.ratios[0] || "");
  const [duration, setDuration] = useState(modelOptions.model?.defaultDuration || modelOptions.durations[0] || "");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!model && options.models[0]) {
      setModel(options.models[0].value);
      return;
    }

    const nextOptions = getVideoModelOptions(options, model);
    if (nextOptions.model) {
      if (!nextOptions.ratios.includes(ratio)) setRatio(nextOptions.model.defaultRatio || nextOptions.ratios[0] || "");
      if (!nextOptions.durations.includes(Number(duration))) setDuration(nextOptions.model.defaultDuration || nextOptions.durations[0] || "");
    }
  }, [duration, model, options, ratio]);

  const count = 1;
  const price = videoApi.calculatePrice({ model, duration, count, models: options.models });
  const rmb = videoApi.calculateRmb({ model, duration, count, models: options.models });
  const canSubmit = prompt.trim().length > 0 && model && ratio && duration;

  function clearPrompt() {
    setPrompt("");
    setNotice("已清空提示词");
  }

  function fillRandomPrompt() {
    setPrompt(videoApi.getRandomPrompt());
    setNotice("已填入随机提示词");
  }

  function submitPrompt() {
    if (!canSubmit) {
      setNotice("请先输入视频描述");
      return;
    }

    onSubmit({
      prompt: prompt.trim(),
      model,
      ratio,
      duration: Number(duration),
      mode: "first-frame",
      count
    });
    setNotice("已创建视频生成任务");
    setPrompt("");
  }

  return (
    <div className="sowa-composer video-composer" aria-label="视频生成输入框">
      <div className="composer-input-row">
        <button className="composer-add" type="button" aria-label="添加首帧占位">
          <Plus size={22} />
        </button>
        <input
          className="composer-text-input"
          value={prompt}
          onChange={(event) => {
            setPrompt(event.target.value);
            if (notice) setNotice("");
          }}
          placeholder="请描述你想生成的视频..."
        />
      </div>
      <div className="composer-controls-row">
        <label className="control-select model-select">
          <Film size={16} />
          <select value={model} onChange={(event) => setModel(event.target.value)}>
            {options.models.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label className="control-select">
          <Ruler size={16} />
          <select value={ratio} onChange={(event) => setRatio(event.target.value)}>
            {modelOptions.ratios.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label className="control-select">
          <Timer size={16} />
          <select value={duration} onChange={(event) => setDuration(Number(event.target.value))}>
            {modelOptions.durations.map((item) => (
              <option key={item} value={item}>
                {item}s
              </option>
            ))}
          </select>
        </label>
        <button className="composer-tool" type="button" onClick={fillRandomPrompt} aria-label="随机提示词">
          <Dice5 size={18} />
        </button>
        <button className="composer-tool" type="button" onClick={clearPrompt} aria-label="清空">
          <Trash2 size={18} />
        </button>
        <span className="price-pill video-price-pill">
          <strong>{price}</strong>
          {rmb && <small>{rmb}</small>}
        </span>
        <button className="send-button" type="button" disabled={!canSubmit} onClick={submitPrompt} aria-label="生成">
          <Send size={18} />
        </button>
      </div>
      {notice && <div className="composer-notice">{notice}</div>}
    </div>
  );
}

function VideoGenerationView({ activeNav }) {
  const [filter, setFilter] = useState("all");
  const [cards, setCards] = useState([]);
  const [options, setOptions] = useState(emptyVideoOptions);
  const [credits, setCredits] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    if (activeNav !== "video") return undefined;

    let mounted = true;
    videoApi.getModels().then((value) => mounted && setOptions(value));
    videoApi.getCredits().then((value) => mounted && setCredits(value));
    videoApi.getTasks({ filter }).then((value) => mounted && setCards(value));

    const unsubscribe = videoApi.subscribe(() => {
      videoApi.getTasks({ filter }).then((value) => mounted && setCards(value));
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [activeNav, filter]);

  if (activeNav !== "video") {
    return <ComingSoon activeNav={activeNav} />;
  }

  async function createTask(payload) {
    setSubmitError("");
    setIsSubmitting(true);
    try {
      await videoApi.createTask(payload);
    } catch (error) {
      setSubmitError(error.message || "创建视频生成任务失败");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function deleteTask(id) {
    await videoApi.deleteTask(id);
  }

  async function toggleFavorite(id) {
    await videoApi.toggleFavorite(id);
  }

  async function regenerateTask(id) {
    setSubmitError("");
    setIsSubmitting(true);
    try {
      await videoApi.regenerateTask(id);
    } catch (error) {
      setSubmitError(error.message || "创建视频生成任务失败");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="image-gen-view video-gen-view-root">
      <div className="image-filter-tabs">
        <button className={filter === "all" ? "selected" : ""} onClick={() => setFilter("all")} type="button">全部结果</button>
        <button className={filter === "recent" ? "selected" : ""} onClick={() => setFilter("recent")} type="button">近24小时</button>
        <button className={filter === "favorite" ? "selected" : ""} onClick={() => setFilter("favorite")} type="button">
          <Star size={17} fill="#f8d545" color="#161616" />
          收藏
        </button>
        {credits && <span className="credits-chip">积分 {credits.balance}</span>}
      </div>
      {submitError && <div className="video-submit-error">{submitError}</div>}
      <div className="results-feed video-results-feed">
        {filter === "all" ? (
          <>
            {videoExampleCards.map((card) => (
              <VideoResultCard
                card={card}
                key={card.id}
                isExample
                onDelete={() => {}}
                onFavorite={() => {}}
                onRegenerate={() => {}}
              />
            ))}
            {cards.map((card) => (
              <VideoResultCard
                card={card}
                key={card.id}
                onDelete={deleteTask}
                onFavorite={toggleFavorite}
                onRegenerate={regenerateTask}
              />
            ))}
          </>
        ) : (
          cards.length ? cards.map((card) => (
            <VideoResultCard
              card={card}
              key={card.id}
              onDelete={deleteTask}
              onFavorite={toggleFavorite}
              onRegenerate={regenerateTask}
            />
          )) : <div className="empty-results video-empty-results">暂无视频结果</div>
        )}
        {isSubmitting && (
          <VideoResultCard
            card={{
              id: "submitting",
              status: "processing",
              model: "创建中",
              ratio: "16:9",
              duration: 8,
              time: "--:--",
              rmb: null,
              price: "计算中",
              prompt: "正在提交视频生成任务",
              favorite: false
            }}
            onDelete={() => {}}
            onFavorite={() => {}}
            onRegenerate={() => {}}
          />
        )}
      </div>
      {options.models.length > 0 && <VideoComposerBar options={options} onSubmit={createTask} />}
    </section>
  );
}

const emptyChatOptions = { models: [], reasoningEfforts: [], defaultModel: "" };

function ChatCanvas({ messages, isSubmitting, error }) {
  if (!messages.length && !isSubmitting && !error) {
    return (
      <div className="chat-main-canvas">
        <div className="chat-empty-state">
          <span className="chat-empty-icon">
            <Sparkles size={22} />
          </span>
          <h1>开始新对话</h1>
          <p>我是您的 AI 创作助手，有什么可以帮您的吗？</p>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-main-canvas" aria-live="polite">
      <div className="chat-conversation-thread">
        {messages.map((message) => (
          <div className={`chat-message-row ${message.role}`} key={message.id}>
            {message.role === "assistant" && (
              <span className={`chat-message-avatar ${message.status === "failed" ? "is-error" : ""}`}>
                <Bot size={17} />
              </span>
            )}
            <div className={`chat-message-bubble ${message.status === "failed" ? "is-error" : ""}`}>
              {message.status === "failed" ? (
                <>
                  <strong>这次没有回复成功</strong>
                  <p>{message.error || "对话服务暂时不可用，请稍后重试。"}</p>
                </>
              ) : (
                message.content
              )}
            </div>
          </div>
        ))}
        {isSubmitting && (
          <div className="chat-message-row assistant">
            <span className="chat-message-avatar">
              <Bot size={17} />
            </span>
            <div className="chat-message-bubble is-loading">
              <Loader2 size={17} />
              <span>正在思考...</span>
            </div>
          </div>
        )}
        {error && (
          <div className="chat-inline-error" role="alert">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}

function ChatComposerBar({ options, onSubmit, isSubmitting }) {
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState(options.defaultModel || options.models[0]?.value || "");
  const [reasoningEffort, setReasoningEffort] = useState(options.reasoningEfforts[0]?.value || "none");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!model && (options.defaultModel || options.models[0]?.value)) {
      setModel(options.defaultModel || options.models[0].value);
    }
    if (!reasoningEffort && options.reasoningEfforts[0]) {
      setReasoningEffort(options.reasoningEfforts[0].value);
    }
  }, [model, options, reasoningEffort]);

  const selectedModel = options.models.find((item) => item.value === model) || options.models[0];
  const canSubmit = prompt.trim().length > 0 && model && !isSubmitting;
  const reservePoints = selectedModel?.reservePoints || 1;

  function submitPrompt() {
    if (!canSubmit) {
      setNotice("请先输入消息");
      return;
    }

    onSubmit({
      content: prompt.trim(),
      model,
      reasoningEffort
    });
    setPrompt("");
    setNotice("");
  }

  return (
    <div className="sowa-composer chat-composer" aria-label="AI 对话输入框">
      <div className="composer-input-row">
        <button className="composer-add" type="button" aria-label="新建对话占位">
          <Plus size={22} />
        </button>
        <input
          className="composer-text-input"
          value={prompt}
          onChange={(event) => {
            setPrompt(event.target.value);
            if (notice) setNotice("");
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              submitPrompt();
            }
          }}
          placeholder="发送消息..."
        />
      </div>
      <div className="composer-controls-row">
        <label className="control-select model-select">
          <Bot size={16} />
          <select value={model} onChange={(event) => setModel(event.target.value)}>
            {options.models.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label className="control-select">
          <Sparkles size={16} />
          <select value={reasoningEffort} onChange={(event) => setReasoningEffort(event.target.value)}>
            {options.reasoningEfforts.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <span className="price-pill">约 {reservePoints} 积分起</span>
        <button className="send-button" type="button" disabled={!canSubmit} onClick={submitPrompt} aria-label="发送">
          {isSubmitting ? <Loader2 size={18} /> : <Send size={18} />}
        </button>
      </div>
      {notice && <div className="composer-notice warning">{notice}</div>}
    </div>
  );
}

function ChatHistoryRail({ conversations, activeConversationId, onSelect }) {
  if (!conversations.length) return null;

  return (
    <aside className="history-rail chat-history-rail" aria-label="AI 对话历史">
      <div className="history-rail-header">
        <span>历史对话</span>
        <strong>{conversations.length}</strong>
      </div>
      <div className="history-list chat-history-list">
        {conversations.map((conversation) => (
          <button
            className={`chat-history-item ${activeConversationId === conversation.id ? "is-selected" : ""}`}
            key={conversation.id}
            type="button"
            onClick={() => onSelect(conversation.id)}
          >
            <span>{conversation.title}</span>
            <small>{conversation.model} · {conversation.time}</small>
          </button>
        ))}
      </div>
    </aside>
  );
}

function ChatGenerationView({ activeNav }) {
  const [messages, setMessages] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [options, setOptions] = useState(emptyChatOptions);
  const [credits, setCredits] = useState(null);
  const [conversationId, setConversationId] = useState(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    if (activeNav !== "chat") return undefined;

    let mounted = true;
    chatApi.getModels().then((value) => mounted && setOptions(value)).catch((error) => mounted && setSubmitError(error.message));
    chatApi.getCredits().then((value) => mounted && setCredits(value)).catch(() => {});
    chatApi.getConversations().then((value) => mounted && setConversations(value)).catch(() => {});

    return () => {
      mounted = false;
    };
  }, [activeNav]);

  async function sendChatMessage({ content, model, reasoningEffort }) {
    const userMessage = {
      id: `local-${Date.now()}`,
      role: "user",
      content,
      status: "completed"
    };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setSubmitError("");
    setIsSubmitting(true);

    try {
      const result = await chatApi.sendMessage({
        conversationId,
        model,
        reasoningEffort,
        messages: nextMessages.map((message) => ({
          role: message.role,
          content: message.content
        }))
      });
      setConversationId(result.conversationId);
      setMessages((current) => [...current, result.message]);
      if (result.credits) setCredits(result.credits);
      chatApi.getConversations().then(setConversations).catch(() => {});
    } catch (error) {
      setSubmitError(error.message || "发送失败");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function selectConversation(id) {
    setSubmitError("");
    setConversationId(id);
    setIsHistoryOpen(false);
    try {
      const historyMessages = await chatApi.getMessages(id);
      setMessages(historyMessages);
    } catch (error) {
      setSubmitError(error.message || "加载历史对话失败");
    }
  }

  return (
    <section className="chat-view-root">
      <div className="chat-topbar">
        <h1>AI 对话</h1>
        {credits && <span className="credits-chip">积分 {credits.balance}</span>}
      </div>
      {conversations.length > 0 && (
        <button className={`history-toggle ${isHistoryOpen ? "is-open" : ""}`} type="button" onClick={() => setIsHistoryOpen((value) => !value)}>
          <Layers size={17} />
          历史
          <span>{conversations.length}</span>
        </button>
      )}
      {isHistoryOpen && (
        <ChatHistoryRail conversations={conversations} activeConversationId={conversationId} onSelect={selectConversation} />
      )}
      <ChatCanvas messages={messages} isSubmitting={isSubmitting} error={submitError} />
      {options.models.length > 0 && <ChatComposerBar options={options} onSubmit={sendChatMessage} isSubmitting={isSubmitting} />}
    </section>
  );
}

const emptyDigitalHumanOptions = { models: [], defaults: { model: "", driveMode: "text" } };
const digitalHumanMaxAudioMs = 15000;
const ttsEmotionOptions = [
  { value: "", label: "自动" },
  { value: "calm", label: "平静" },
  { value: "happy", label: "开心" },
  { value: "sad", label: "悲伤" },
  { value: "angry", label: "愤怒" },
  { value: "fearful", label: "害怕" },
  { value: "disgusted", label: "厌恶" },
  { value: "surprised", label: "惊讶" }
];

function formatDurationMs(durationMs = 0) {
  return `${(Number(durationMs || 0) / 1000).toFixed(1)} 秒`;
}

function getDigitalHumanPreviewSignature({ text, voiceId, speed, volume, pitch, emotion }) {
  return JSON.stringify({
    text: String(text || "").trim(),
    voiceId,
    speed: Number(speed),
    volume: Number(volume),
    pitch: Number(pitch),
    emotion: emotion || ""
  });
}

const digitalHumanPublicPlaceholders = [
  { id: "public-product", name: "产品讲解员", description: "适合新品发布、功能演示、卖点介绍", language: "中文 / 通用", status: "ready", cover: "/assets/digital-human/产品讲解员.mp4" },
  { id: "public-medical", name: "健康科普员", description: "适合健康科普、诊疗介绍、公益宣传", language: "中文 / 温和", status: "ready", cover: "/assets/digital-human/健康科普员.mp4" },
  { id: "public-cartoon", name: "动漫卡通形象", description: "适合少儿内容、品牌 IP、趣味讲解", language: "中文 / 活泼", status: "ready", cover: "/assets/digital-human/动漫卡通形象.mp4" },
  { id: "public-real-estate", name: "房地产经纪人", description: "适合房源讲解、楼盘介绍、置业咨询", language: "中文 / 专业", status: "ready", cover: "/assets/digital-human/房地产经纪人.mp4" },
  { id: "public-travel", name: "文旅推荐官", description: "适合景区讲解、路线推荐、城市宣传", language: "中文 / 生动", status: "ready", cover: "/assets/digital-human/文旅推荐官.mp4" },
  { id: "public-news", name: "新闻播报员", description: "适合资讯口播、短视频新闻、活动串词", language: "中文 / 普通话", status: "ready", cover: "/assets/digital-human/新闻播报员.mp4" },
  { id: "public-life", name: "生活方式达人", description: "适合种草讲解、门店介绍、社媒内容", language: "中文 / 轻松自然", status: "ready", cover: "/assets/digital-human/生活方式达人.mp4" },
  { id: "public-finance", name: "财经主播", description: "适合行情解读、投教内容、财经播报", language: "中文 / 稳重", status: "ready", cover: "/assets/digital-human/财经主播.mp4" },
  { id: "public-operations", name: "运营达人", description: "适合活动运营、用户增长、社群内容", language: "中文 / 干练", status: "ready", cover: "/assets/digital-human/运营达人.mp4" }
];

function getDigitalHumanPublicAvatars(list = []) {
  return list.some((item) => item.cover) ? list : digitalHumanPublicPlaceholders;
}

function DigitalHumanEmptyMedia({ title, description, icon: Icon = UserRound }) {
  return (
    <div className="dh-empty-media">
      <span className="dh-empty-media-icon">
        <Icon size={24} />
      </span>
      <strong>{title}</strong>
      <p>{description}</p>
    </div>
  );
}

function DigitalHumanAvatarCard({ avatar, selected, onSelect, onPreview, onRename, onDelete, mine = false }) {
  const isTraining = avatar.status === "training";
  const isVideoCover = /\.(mp4|webm|mov)$/i.test(avatar.cover || "");
  return (
    <article className={`dh-avatar-card ${selected ? "is-selected" : ""} ${isTraining ? "is-training" : ""}`}>
      <button className="dh-avatar-cover" type="button" onClick={() => onSelect(avatar)} aria-label={`选择 ${avatar.name}`}>
        {isVideoCover ? (
          <video src={avatar.cover} muted loop playsInline preload="metadata" onMouseEnter={(event) => event.currentTarget.play()} onMouseLeave={(event) => event.currentTarget.pause()} />
        ) : avatar.cover ? (
          <img src={avatar.cover} alt={avatar.name} />
        ) : (
          <DigitalHumanEmptyMedia title="形象素材位" description="等待补充数字人视频或封面" />
        )}
        <span className="dh-avatar-badge">{selected ? "已选" : isTraining ? "训练中" : avatar.cover ? "模板" : "占位"}</span>
      </button>
      <div className="dh-avatar-info">
        <strong>{avatar.name}</strong>
        <span>{avatar.language}</span>
        <p>{avatar.description}</p>
      </div>
      <div className="dh-avatar-actions">
        <button type="button" onClick={() => onPreview(avatar)}>
          <Play size={14} />
          预览
        </button>
        {mine && (
          <>
            <button type="button" onClick={() => onRename(avatar)}>
              <FileText size={14} />
              改名
            </button>
            <button type="button" onClick={() => onDelete(avatar.id)}>
              <Trash2 size={14} />
              删除
            </button>
          </>
        )}
      </div>
    </article>
  );
}

function DigitalHumanAvatarPreviewModal({ avatar, onClose }) {
  const isVideoCover = /\.(mp4|webm|mov)$/i.test(avatar?.cover || "");

  if (!avatar) return null;

  return (
    <div className="dh-modal-backdrop" role="dialog" aria-modal="true">
      <div className="dh-avatar-preview-modal">
        <div className="dh-modal-header">
          <div>
            <span>形象预览</span>
            <strong>{avatar.name}</strong>
          </div>
          <button type="button" onClick={onClose} aria-label="关闭">×</button>
        </div>
        <div className="dh-avatar-preview-body">
          {isVideoCover ? (
            <video src={avatar.cover} controls autoPlay playsInline />
          ) : avatar.cover ? (
            <img src={avatar.cover} alt={avatar.name} />
          ) : (
            <DigitalHumanEmptyMedia title="暂无预览素材" description="等待补充数字人视频或封面" />
          )}
        </div>
      </div>
    </div>
  );
}

function DigitalHumanTaskCard({ task, selected, onSelect, onDelete, onRegenerate }) {
  const isProcessing = task.status === "processing" || task.status === "pending";
  const isCompleted = task.status === "completed";
  const isFailed = task.status === "failed";
  return (
    <article className={`dh-task-card ${selected ? "is-selected" : ""}`}>
      <button className="dh-task-preview" type="button" onClick={() => onSelect(task)}>
        {task.resultUrl ? (
          <video src={task.resultUrl} muted playsInline preload="metadata" />
        ) : task.thumbnailUrl ? <img src={task.thumbnailUrl} alt={task.avatarName} /> : (
          <DigitalHumanEmptyMedia
            icon={Video}
            title={isFailed ? "生成失败" : isCompleted ? "结果待返回" : "生成中"}
            description={isFailed ? task.error || "任务失败，积分已退回" : isCompleted ? "点击查看生成结果" : `${task.progress || 0}%`}
          />
        )}
      </button>
      <div className="dh-task-meta">
        <strong>{task.avatarName}</strong>
        <span>{task.voiceName} · {task.driveMode === "audio" ? "音频驱动" : "文字驱动"} · {task.providerModel || "KIE Wan 2.7"}</span>
        <div className="dh-progress-track">
          <i style={{ width: `${task.progress || 0}%` }} />
        </div>
        <small>{task.createdAt}</small>
      </div>
      <div className="dh-task-actions">
        <button type="button" onClick={() => onRegenerate(task.id)} disabled={isProcessing}>
          <RefreshCcw size={14} />
        </button>
        <button type="button" onClick={() => onDelete(task.id)}>
          <Trash2 size={14} />
        </button>
      </div>
    </article>
  );
}

function DigitalHumanGeneratingState({ task }) {
  return (
    <div className="dh-generating-state">
      <span className="dh-spinner" aria-hidden="true" />
      <strong>正在生成口型视频</strong>
      <p>MiniMax 已生成驱动音频，KIE 正在合成数字人口播成片。</p>
      <div className="dh-generation-progress">
        <i style={{ width: `${task?.progress || 0}%` }} />
      </div>
      <small>{task?.progress || 0}% · 完成后会自动回填到这里</small>
    </div>
  );
}

function DigitalHumanCreateAvatarModal({ onClose, onCreate, isSubmitting }) {
  const fileInputRef = useRef(null);
  const [name, setName] = useState("");
  const [file, setFile] = useState(null);
  const [notice, setNotice] = useState("");

  function submit() {
    if (!name.trim()) {
      setNotice("请输入形象名称");
      return;
    }
    if (!file) {
      setNotice("请选择视频素材，当前只记录文件名作为占位");
      return;
    }
    onCreate({ name: name.trim(), fileName: file.name });
  }

  return (
    <div className="dh-modal-backdrop" role="dialog" aria-modal="true">
      <div className="dh-modal">
        <div className="dh-modal-header">
          <div>
            <span>创建形象</span>
            <strong>预留训练素材入口</strong>
          </div>
          <button type="button" onClick={onClose} aria-label="关闭">×</button>
        </div>
        <div className="dh-modal-body">
          <label className="dh-field">
            <span>形象名称</span>
            <input value={name} onChange={(event) => setName(event.target.value)} placeholder="例如：产品讲解员" />
          </label>
          <button className="dh-upload-zone" type="button" onClick={() => fileInputRef.current?.click()}>
            <input ref={fileInputRef} type="file" accept="video/*" hidden onChange={(event) => setFile(event.target.files?.[0] || null)} />
            <Video size={24} />
            <strong>{file ? file.name : "选择数字人训练视频"}</strong>
            <span>{file ? "素材会在真实接口接入后上传" : "当前不上传文件，只保留 UI 和 API 结构"}</span>
          </button>
          {notice && <div className="dh-form-notice">{notice}</div>}
        </div>
        <div className="dh-modal-footer">
          <button type="button" onClick={onClose}>取消</button>
          <button type="button" onClick={submit} disabled={isSubmitting}>
            {isSubmitting ? <Loader2 size={16} /> : <Plus size={16} />}
            创建形象
          </button>
        </div>
      </div>
    </div>
  );
}

function DigitalHumanConfigPanel({ options, voices, selectedAvatar, onSubmit, isSubmitting }) {
  const audioInputRef = useRef(null);
  const [driveMode, setDriveMode] = useState("text");
  const [text, setText] = useState("大家好，欢迎来到我们的 AI 创作平台。今天我将为您介绍全新的数字人功能。");
  const [audioFile, setAudioFile] = useState(null);
  const [model, setModel] = useState(options.defaults?.model || options.models[0]?.value || "");
  const [voiceId, setVoiceId] = useState(voices[0]?.id || "");
  const [ttsSpeed, setTtsSpeed] = useState(1);
  const [ttsVolume, setTtsVolume] = useState(1);
  const [ttsPitch, setTtsPitch] = useState(0);
  const [ttsEmotion, setTtsEmotion] = useState("");
  const [isDesigningVoice, setIsDesigningVoice] = useState(false);
  const [voicePreviewUrl, setVoicePreviewUrl] = useState("");
  const [voicePreviewInfo, setVoicePreviewInfo] = useState(null);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!model && (options.defaults?.model || options.models[0]?.value)) {
      setModel(options.defaults?.model || options.models[0].value);
    }
    if (!voiceId && voices[0]?.id) setVoiceId(voices[0].id);
  }, [model, options, voiceId, voices]);

  const selectedModel = options.models.find((item) => item.value === model) || options.models[0];
  const selectedVoice = voices.find((item) => item.id === voiceId) || voices[0];
  const estimate = Math.max(1, Math.ceil(text.length / 180));
  const selectedAvatarIsVideo = /\.(mp4|webm|mov)$/i.test(selectedAvatar?.cover || "");
  const currentPreviewSignature = getDigitalHumanPreviewSignature({
    text,
    voiceId,
    speed: ttsSpeed,
    volume: ttsVolume,
    pitch: ttsPitch,
    emotion: ttsEmotion
  });
  const isPreviewCurrent = voicePreviewInfo?.signature === currentPreviewSignature;
  const currentAudioTooLong = isPreviewCurrent && voicePreviewInfo.durationMs > digitalHumanMaxAudioMs;

  async function previewVoice() {
    if (!text.trim()) {
      setNotice("请输入用于试听的文本脚本");
      return;
    }
    setNotice("");
    setIsDesigningVoice(true);
    try {
      const result = await digitalHumanApi.previewVoice({
        previewText: text.trim(),
        voiceId,
        speed: ttsSpeed,
        volume: ttsVolume,
        pitch: ttsPitch,
        emotion: ttsEmotion
      });
      if (result.audioDataUrl) setVoicePreviewUrl(result.audioDataUrl);
      const durationMs = Number(result.durationMs || 0);
      setVoicePreviewInfo({
        signature: currentPreviewSignature,
        durationMs,
        videoDuration: result.videoDuration || Math.ceil(durationMs / 1000)
      });
      setNotice(
        durationMs > digitalHumanMaxAudioMs
          ? `当前音频 ${formatDurationMs(durationMs)}，超过 15 秒，请缩短文本或切片后分段生成`
          : `已生成当前音色试听，视频时长将按音频反推为 ${result.videoDuration || Math.ceil(durationMs / 1000)} 秒`
      );
    } catch (error) {
      setNotice(error.message || "音色试听失败");
    } finally {
      setIsDesigningVoice(false);
    }
  }

  function submit() {
    if (!selectedAvatar) {
      setNotice("请先选择数字人形象");
      return;
    }
    if (driveMode === "text" && !text.trim()) {
      setNotice("请输入文本脚本");
      return;
    }
    if (driveMode === "audio" && !audioFile) {
      setNotice("请上传音频文件");
      return;
    }
    if (!voicePreviewInfo || !isPreviewCurrent) {
      setNotice("请先试听当前音色，系统会根据试听音频时长反推视频时长");
      return;
    }
    if (voicePreviewInfo.durationMs > digitalHumanMaxAudioMs) {
      setNotice(`当前音频 ${formatDurationMs(voicePreviewInfo.durationMs)}，超过 15 秒，请缩短文本或切片后分段生成`);
      return;
    }
    setNotice("");
    onSubmit({
      avatarId: selectedAvatar.id,
      avatarName: selectedAvatar.name,
      driveMode,
      text,
      audioName: audioFile?.name || "",
      voiceId,
      model,
      speed: ttsSpeed,
      volume: ttsVolume,
      pitch: ttsPitch,
      emotion: ttsEmotion
    });
  }

  return (
    <aside className="dh-config-panel">
      <div className="dh-config-header">
        <strong>数字人口播成片</strong>
      </div>
      <div className="dh-selected-template">
        <div className="dh-selected-template-media">
          {selectedAvatar?.cover ? (
            selectedAvatarIsVideo ? <video src={selectedAvatar.cover} muted loop playsInline preload="metadata" /> : <img src={selectedAvatar.cover} alt={selectedAvatar.name} />
          ) : (
            <UserRound size={22} />
          )}
        </div>
        <div>
          <span>当前数字人模板</span>
          <strong>{selectedAvatar?.name || "请先选择左侧模板"}</strong>
          <small>{selectedAvatar?.description || "模板会作为 KIE 口型视频的 reference_video"}</small>
        </div>
      </div>
      <div className="dh-mode-tabs">
        <button className={driveMode === "text" ? "is-active" : ""} type="button" onClick={() => setDriveMode("text")}>文字驱动</button>
        <button type="button" disabled title="音频驱动将在第二阶段接入">音频驱动</button>
      </div>
      {driveMode === "text" ? (
        <label className="dh-field dh-script-field">
          <span>文本脚本 <small>{text.length} / 2000 · 预计 {estimate} 分钟</small></span>
          <textarea value={text} maxLength={2000} onChange={(event) => setText(event.target.value)} placeholder="请输入数字人要说的话..." />
        </label>
      ) : (
        <button className="dh-audio-upload" type="button" onClick={() => audioInputRef.current?.click()}>
          <input ref={audioInputRef} type="file" accept="audio/*" hidden onChange={(event) => setAudioFile(event.target.files?.[0] || null)} />
          <Mic size={22} />
          <strong>{audioFile ? audioFile.name : "上传驱动音频"}</strong>
          <span>{audioFile ? "已选择，真实接口接入后上传" : "限制 3 分钟以内，当前为占位"}</span>
        </button>
      )}
      <label className="dh-field">
        <span>成片模型</span>
        <select value={model} onChange={(event) => setModel(event.target.value)}>
          {options.models.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
        </select>
        {selectedModel && <small>调用模型：{selectedModel.providerModel || selectedModel.value} · {selectedModel.resolution || "720p"}</small>}
      </label>
      <label className="dh-field">
        <span>音色</span>
        <select value={voiceId} onChange={(event) => setVoiceId(event.target.value)}>
          {voices.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
        {selectedVoice && <small>{selectedVoice.description}</small>}
      </label>
      <div className="dh-settings-group">
        <div className="dh-minimax-options">
          <div className="dh-minimax-options-head">
            <span>MiniMax TTS 参数</span>
            <strong>音量、语速、音调与情绪</strong>
          </div>
          <label className="dh-field">
            <span>音色情绪</span>
            <select value={ttsEmotion} onChange={(event) => setTtsEmotion(event.target.value)}>
              {ttsEmotionOptions.map((item) => <option key={item.value || "auto"} value={item.value}>{item.label}</option>)}
            </select>
          </label>
          <label className="dh-range-field">
            <span>语速 <small>{ttsSpeed.toFixed(2)}x</small></span>
            <input type="range" min="0.5" max="2" step="0.05" value={ttsSpeed} onChange={(event) => setTtsSpeed(Number(event.target.value))} />
          </label>
          <label className="dh-range-field">
            <span>音量 <small>{ttsVolume.toFixed(1)}</small></span>
            <input type="range" min="0.1" max="10" step="0.1" value={ttsVolume} onChange={(event) => setTtsVolume(Number(event.target.value))} />
          </label>
          <label className="dh-range-field">
            <span>音调 <small>{ttsPitch > 0 ? `+${ttsPitch}` : ttsPitch}</small></span>
            <input type="range" min="-12" max="12" step="1" value={ttsPitch} onChange={(event) => setTtsPitch(Number(event.target.value))} />
          </label>
        </div>
        <button className="dh-design-voice-button" type="button" onClick={previewVoice} disabled={isDesigningVoice}>
          {isDesigningVoice ? <Loader2 size={16} /> : <Mic size={16} />}
          试听当前音色
        </button>
        {voicePreviewUrl && <audio className="dh-voice-preview" src={voicePreviewUrl} controls />}
        <div className={`dh-duration-check ${currentAudioTooLong ? "is-warning" : isPreviewCurrent ? "is-ready" : ""}`}>
          {isPreviewCurrent ? (
            <span>
              当前音频 {formatDurationMs(voicePreviewInfo.durationMs)}
              {currentAudioTooLong ? "，超过 15 秒，需要切片" : `，视频将生成 ${voicePreviewInfo.videoDuration} 秒`}
            </span>
          ) : (
            <span>生成前请先试听当前音色，用真实音频时长反推视频时长</span>
          )}
        </div>
      </div>
      {notice && <div className="dh-form-notice">{notice}</div>}
      <button className="dh-generate-button" type="button" onClick={submit} disabled={isSubmitting || !isPreviewCurrent || currentAudioTooLong}>
        {isSubmitting ? <Loader2 size={18} /> : <Send size={18} />}
        用当前模板生成口型视频
      </button>
    </aside>
  );
}

function DigitalHumanGenerationView({ activeNav }) {
  const [tab, setTab] = useState("public");
  const [avatars, setAvatars] = useState({ public: [], mine: [] });
  const [tasks, setTasks] = useState([]);
  const [voices, setVoices] = useState([]);
  const [options, setOptions] = useState(emptyDigitalHumanOptions);
  const [credits, setCredits] = useState(null);
  const [selectedAvatar, setSelectedAvatar] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [previewAvatar, setPreviewAvatar] = useState(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (activeNav !== "digital-human") return undefined;
    let mounted = true;
    async function load() {
      try {
        const [modelData, avatarData, voiceData, taskData, creditData] = await Promise.all([
          digitalHumanApi.getModels(),
          digitalHumanApi.getAvatars(),
          digitalHumanApi.getVoices(),
          digitalHumanApi.getTasks(),
          digitalHumanApi.getCredits().catch(() => null)
        ]);
        if (!mounted) return;
        setOptions(modelData);
        setAvatars(avatarData);
        setVoices(voiceData.voices || []);
        setTasks(taskData);
        setCredits(creditData);
        setSelectedAvatar((current) => current || avatarData.public?.[0] || avatarData.mine?.[0] || null);
      } catch (loadError) {
        if (mounted) setError(loadError.message || "加载数字人功能失败");
      }
    }
    load();
    const unsubscribe = digitalHumanApi.subscribe(() => {
      digitalHumanApi.getTasks().then((value) => {
        if (!mounted) return;
        setTasks(value);
        setSelectedTask((current) => {
          if (!current) return current;
          return value.find((task) => String(task.id) === String(current.id)) || current;
        });
      }).catch(() => {});
      digitalHumanApi.getAvatars().then((value) => mounted && setAvatars(value)).catch(() => {});
    });
    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [activeNav]);

  async function createTask(payload) {
    setError("");
    setIsSubmitting(true);
    try {
      const task = await digitalHumanApi.createTask(payload);
      setSelectedTask(task);
      setTab("history");
    } catch (submitError) {
      setError(submitError.message || "创建数字人任务失败");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function createAvatar(payload) {
    setIsSubmitting(true);
    try {
      const avatar = await digitalHumanApi.createAvatar(payload);
      setSelectedAvatar(avatar);
      setTab("mine");
      setIsCreateOpen(false);
    } catch (submitError) {
      setError(submitError.message || "创建形象失败");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function deleteAvatar(id) {
    await digitalHumanApi.deleteAvatar(id);
    setSelectedAvatar((current) => current?.id === id ? null : current);
  }

  async function renameAvatar(avatar) {
    const nextName = window.prompt("输入新的形象名称", avatar.name);
    if (!nextName?.trim()) return;
    const updated = await digitalHumanApi.updateAvatar(avatar.id, { name: nextName.trim() });
    setSelectedAvatar(updated);
  }

  async function deleteTask(id) {
    await digitalHumanApi.deleteTask(id);
    setSelectedTask((current) => current?.id === id ? null : current);
  }

  async function regenerateTask(id) {
    const task = await digitalHumanApi.regenerateTask(id);
    setSelectedTask(task);
  }

  const visibleAvatars = tab === "mine" ? avatars.mine : getDigitalHumanPublicAvatars(avatars.public);
  const currentPreviewTask = selectedTask;
  const isPreviewProcessing = currentPreviewTask && !["completed", "failed"].includes(currentPreviewTask.status);

  return (
    <section className="dh-view-root">
      <div className="dh-topbar">
        <div>
          <span>数字人</span>
          <h1>创建会说话的数字人视频</h1>
        </div>
        {credits && <span className="credits-chip">积分 {credits.balance}</span>}
      </div>
      {error && <div className="video-submit-error">{error}</div>}
      <div className={`dh-workspace ${currentPreviewTask ? "is-generating" : "is-browsing"}`}>
        {!currentPreviewTask ? (
        <section className="dh-library-panel">
          <div className="dh-library-heading">
            <div>
              <span>第 1 步</span>
              <strong>选择数字人模板</strong>
            </div>
            <small>{selectedAvatar ? `已选择：${selectedAvatar.name}` : "选择后右侧会显示当前模板和调用模型"}</small>
          </div>
          <div className="dh-tabs">
            <button className={tab === "public" ? "is-active" : ""} type="button" onClick={() => setTab("public")}>公共形象</button>
            <button className={tab === "mine" ? "is-active" : ""} type="button" onClick={() => setTab("mine")}>我的形象</button>
            <button className={tab === "history" ? "is-active" : ""} type="button" onClick={() => setTab("history")}>生成记录</button>
          </div>
          {tab === "mine" && (
            <button className="dh-create-card" type="button" onClick={() => setIsCreateOpen(true)}>
              <Plus size={20} />
              <strong>创建形象</strong>
              <span>预留视频训练入口</span>
            </button>
          )}
          {tab === "history" ? (
            <div className="dh-task-list">
              {tasks.length ? tasks.map((task) => (
                <DigitalHumanTaskCard
                  key={task.id}
                  task={task}
                  selected={currentPreviewTask?.id === task.id}
                  onSelect={setSelectedTask}
                  onDelete={deleteTask}
                  onRegenerate={regenerateTask}
                />
              )) : <DigitalHumanEmptyMedia icon={Video} title="暂无生成记录" description="提交任务后会在这里显示进度" />}
            </div>
          ) : (
            <div className="dh-avatar-list">
              {visibleAvatars.length ? visibleAvatars.map((avatar) => (
                <DigitalHumanAvatarCard
                  key={avatar.id}
                  avatar={avatar}
                  selected={selectedAvatar?.id === avatar.id}
                  onSelect={setSelectedAvatar}
                  onPreview={setPreviewAvatar}
                  onRename={renameAvatar}
                  onDelete={deleteAvatar}
                  mine={tab === "mine"}
                />
              )) : <DigitalHumanEmptyMedia title="还没有自定义形象" description="点击创建形象，后续接入 Minimax 训练接口" />}
            </div>
          )}
        </section>
        ) : (
        <main className="dh-preview-stage">
          <div className="dh-preview-header">
            <div>
              <span>{currentPreviewTask ? "生成预览" : "形象预览"}</span>
              <strong>{currentPreviewTask?.avatarName || selectedAvatar?.name || "请选择数字人形象"}</strong>
            </div>
            <div className="dh-preview-header-actions">
              {currentPreviewTask?.resultUrl && (
                <a className="dh-download-button" href={currentPreviewTask.resultUrl} download target="_blank" rel="noreferrer">
                  <Download size={14} />
                  下载视频
                </a>
              )}
              <button className="dh-preview-back" type="button" onClick={() => setSelectedTask(null)}>
                <Layers size={14} />
                案例
              </button>
              {currentPreviewTask && <small>{currentPreviewTask.status === "completed" ? "已完成" : currentPreviewTask.status === "failed" ? "失败" : `生成中 ${currentPreviewTask.progress || 0}%`}</small>}
            </div>
          </div>
          <div className="dh-video-shell">
            {currentPreviewTask?.resultUrl ? (
              <video src={currentPreviewTask.resultUrl} controls />
            ) : isPreviewProcessing ? (
              <DigitalHumanGeneratingState task={currentPreviewTask} />
            ) : (
              <DigitalHumanEmptyMedia
                icon={currentPreviewTask ? Film : UserRound}
                title={currentPreviewTask?.status === "failed" ? "生成失败" : currentPreviewTask?.status === "completed" ? "视频结果待返回" : "正在生成数字人视频"}
                description={currentPreviewTask?.status === "failed" ? currentPreviewTask.error : currentPreviewTask ? `任务已提交，MiniMax 生成音频后由 KIE 生成口型视频。当前进度 ${currentPreviewTask.progress || 0}%` : "这里会展示选中形象或生成后的视频"}
              />
            )}
          </div>
          <div className="dh-preview-details">
            <div>
              <span>当前形象</span>
              <strong>{selectedAvatar?.name || "未选择"}</strong>
            </div>
            <div>
              <span>驱动方式</span>
              <strong>{currentPreviewTask?.driveMode === "audio" ? "音频驱动" : "文字驱动"}</strong>
            </div>
            <div>
              <span>接口状态</span>
              <strong>{currentPreviewTask?.providerModel || "MiniMax + KIE"}</strong>
            </div>
          </div>
        </main>
        )}
        <DigitalHumanConfigPanel
          options={options}
          voices={voices}
          selectedAvatar={selectedAvatar}
          onSubmit={createTask}
          isSubmitting={isSubmitting}
        />
      </div>
      {isCreateOpen && (
        <DigitalHumanCreateAvatarModal
          onClose={() => setIsCreateOpen(false)}
          onCreate={createAvatar}
          isSubmitting={isSubmitting}
        />
      )}
      {previewAvatar && (
        <DigitalHumanAvatarPreviewModal
          avatar={previewAvatar}
          onClose={() => setPreviewAvatar(null)}
        />
      )}
    </section>
  );
}

const emptyImageDigitalHumanOptions = {
  models: [],
  defaults: { model: "kie-s2v-r2v", driveMode: "text" },
  limits: { maxImageBytes: 10 * 1024 * 1024, maxAudioMs: 15000, maxTextLength: 2000 }
};

function ImageDigitalHumanTaskCard({ task, onDelete, onRegenerate }) {
  const videoRef = useRef(null);
  const isProcessing = task.status === "processing" || task.status === "pending";
  const isFailed = task.status === "failed";
  const hasVideo = Boolean(task.resultUrl && !isFailed);

  function openFullscreen() {
    const video = videoRef.current;
    if (!video) return;
    const requestFullscreen = video.requestFullscreen || video.webkitRequestFullscreen || video.msRequestFullscreen;
    requestFullscreen?.call(video);
  }

  return (
    <article className={`idh-result-card status-${task.status}`}>
      <div className="idh-result-preview">
        {hasVideo ? (
          <>
            <video ref={videoRef} src={task.resultUrl} controls playsInline preload="metadata" poster={task.thumbnailUrl || task.portraitUrl} />
            <button className="idh-fullscreen-button" type="button" onClick={openFullscreen} aria-label="全屏播放">
              <Maximize2 size={15} />
            </button>
          </>
        ) : task.portraitUrl ? (
          <img src={task.portraitUrl} alt="人物照片" />
        ) : (
          <Camera size={24} />
        )}
        {isProcessing && (
          <div className="idh-processing-mask">
            <Loader2 size={20} />
            <span>{task.progress || 0}%</span>
          </div>
        )}
        {isFailed && <div className="idh-failed-mask">生成失败</div>}
      </div>
      <div className="idh-result-meta">
        <div className="idh-result-title">
          <strong>{task.voiceName || "MiniMax 音色"}</strong>
          <span>{task.usedProviderModel || task.providerModel || "KIE"}</span>
        </div>
        <p>{task.error || task.text}</p>
        <div className="idh-progress-track">
          <i style={{ width: `${task.progress || 0}%` }} />
        </div>
        <div className="idh-result-actions">
          <small>{task.time} · {task.costPoints || 0} 积分</small>
          <span>
            {task.resultUrl && (
              <a href={task.resultUrl} download target="_blank" rel="noreferrer" aria-label="下载视频">
                <Download size={15} />
              </a>
            )}
            <button type="button" onClick={() => onRegenerate(task.id)} disabled={isProcessing} aria-label="重新生成">
              <RefreshCcw size={15} />
            </button>
            <button type="button" onClick={() => onDelete(task.id)} aria-label="删除">
              <Trash2 size={15} />
            </button>
          </span>
        </div>
      </div>
    </article>
  );
}

function ImageDigitalHumanCenterState({ task, isSubmitting, error, onOpenRecent }) {
  const isProcessing = isSubmitting || task?.status === "processing" || task?.status === "pending";
  const isFailed = Boolean(error || task?.status === "failed");
  const isCompleted = task?.status === "completed" && task?.resultUrl;

  if (!isProcessing && !isFailed && !isCompleted) return null;

  if (isCompleted) {
    return (
      <section className="idh-center-state is-completed" aria-live="polite">
        <div className="idh-center-copy">
          <CheckCircle2 size={22} />
          <strong>视频已生成</strong>
          <p>本次图片数字人视频已保存到最近生成。主页不会展示案例，方便继续创建下一条视频。</p>
          <button type="button" onClick={onOpenRecent}>
            <Layers size={15} />
            查看最近生成
          </button>
        </div>
      </section>
    );
  }

  if (isCompleted) {
    return (
      <section className="idh-center-state is-completed" aria-live="polite">
        <div className="idh-center-video">
          <video src={task.resultUrl} controls playsInline poster={task.thumbnailUrl || task.portraitUrl} />
        </div>
        <div className="idh-center-copy">
          <CheckCircle2 size={22} />
          <strong>视频已生成</strong>
          <p>口型视频已经完成，可以直接预览或下载。</p>
          <a href={task.resultUrl} download target="_blank" rel="noreferrer">
            <Download size={15} />
            下载视频
          </a>
        </div>
      </section>
    );
  }

  if (isFailed) {
    return (
      <section className="idh-center-state is-failed" role="alert">
        <span className="idh-center-icon">
          <Sparkles size={24} />
        </span>
        <strong>这次没有生成成功</strong>
        <p>{error || task?.error || "生成服务返回了错误，积分会按任务状态自动处理。"}</p>
      </section>
    );
  }

  return (
    <section className="idh-center-state is-processing" aria-live="polite">
      <span className="idh-center-spinner">
        <Loader2 size={30} />
      </span>
      <strong>正在生成图片数字人视频</strong>
      <p>正在生成语音、上传人物照片，并合成口型视频。完成后会自动回填到这里。</p>
      <div className="idh-center-progress">
        <i style={{ width: `${task?.progress || 28}%` }} />
      </div>
      <small>{task?.progress ? `${task.progress}%` : "任务准备中"} · 请保持页面打开</small>
    </section>
  );
}

function ImageDigitalHumanComposer({ options, voices, onSubmit, isSubmitting }) {
  const fileInputRef = useRef(null);
  const [portrait, setPortrait] = useState(null);
  const [portraitPreview, setPortraitPreview] = useState("");
  const [text, setText] = useState("大家好，欢迎来到我们的 AI 创作平台。今天我会用一张照片，为你生成自然口型的数字人视频。");
  const [model, setModel] = useState(options.defaults?.model || options.models[0]?.value || "");
  const [voiceId, setVoiceId] = useState(voices[0]?.id || "");
  const [speed, setSpeed] = useState(1);
  const [volume, setVolume] = useState(1);
  const [pitch, setPitch] = useState(0);
  const [emotion, setEmotion] = useState("");
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [voicePreviewUrl, setVoicePreviewUrl] = useState("");
  const [voicePreviewInfo, setVoicePreviewInfo] = useState(null);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!model && (options.defaults?.model || options.models[0]?.value)) {
      setModel(options.defaults?.model || options.models[0].value);
    }
    if (!voiceId && voices[0]?.id) setVoiceId(voices[0].id);
  }, [model, options, voiceId, voices]);

  useEffect(() => {
    return () => {
      if (portraitPreview) window.URL.revokeObjectURL(portraitPreview);
    };
  }, [portraitPreview]);

  const selectedModel = options.models.find((item) => item.value === model) || options.models[0];
  const selectedVoice = voices.find((item) => item.id === voiceId) || voices[0];
  const previewSignature = getDigitalHumanPreviewSignature({ text, voiceId, speed, volume, pitch, emotion });
  const isPreviewCurrent = voicePreviewInfo?.signature === previewSignature;
  const isTooLong = isPreviewCurrent && voicePreviewInfo.durationMs > digitalHumanMaxAudioMs;
  const price = `${selectedModel?.basePoints || 0} 积分/次`;

  function selectPortrait(file) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setNotice("请上传图片文件");
      return;
    }
    if (file.size > (options.limits?.maxImageBytes || 10 * 1024 * 1024)) {
      setNotice("图片大小不能超过 10MB");
      return;
    }
    if (portraitPreview) window.URL.revokeObjectURL(portraitPreview);
    setPortrait(file);
    setPortraitPreview(window.URL.createObjectURL(file));
    setNotice("");
  }

  async function previewVoice() {
    if (!text.trim()) {
      setNotice("请输入用于试听的台词");
      return;
    }
    setNotice("");
    setIsPreviewing(true);
    try {
      const result = await imageDigitalHumanApi.previewVoice({
        previewText: text.trim(),
        voiceId,
        speed,
        volume,
        pitch,
        emotion
      });
      if (result.audioDataUrl) setVoicePreviewUrl(result.audioDataUrl);
      const durationMs = Number(result.durationMs || 0);
      setVoicePreviewInfo({
        signature: previewSignature,
        durationMs,
        videoDuration: result.videoDuration || Math.ceil(durationMs / 1000)
      });
      setNotice(
        durationMs > digitalHumanMaxAudioMs
          ? `当前音频 ${formatDurationMs(durationMs)}，超过 15 秒，请缩短台词`
          : `已生成试听音频，视频预计 ${result.videoDuration || Math.ceil(durationMs / 1000)} 秒`
      );
    } catch (error) {
      setNotice(error.message || "音色试听失败");
    } finally {
      setIsPreviewing(false);
    }
  }

  function submit() {
    if (!portrait) {
      setNotice("请先上传人物正面照");
      return;
    }
    if (!text.trim()) {
      setNotice("请输入台词");
      return;
    }
    if (!voicePreviewInfo || !isPreviewCurrent) {
      setNotice("请先试听当前台词和音色");
      return;
    }
    if (isTooLong) {
      setNotice(`当前音频 ${formatDurationMs(voicePreviewInfo.durationMs)}，超过 15 秒`);
      return;
    }
    setNotice("");
    onSubmit({
      portrait,
      text: text.trim(),
      voiceId,
      model,
      speed,
      volume,
      pitch,
      emotion
    });
  }

  return (
    <div className="idh-composer" aria-label="图片数字人生成器">
      <div className="idh-mode-tabs">
        <button className="is-active" type="button">
          <FileText size={15} />
          文本驱动
        </button>
        <button type="button" disabled title="音频驱动将在下一阶段开放">
          <Mic size={15} />
          音频驱动
        </button>
      </div>
      <div className="idh-composer-body">
        <button className={`idh-upload-card ${portraitPreview ? "has-image" : ""}`} type="button" onClick={() => fileInputRef.current?.click()}>
          <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={(event) => selectPortrait(event.target.files?.[0])} />
          {portraitPreview ? (
            <img src={portraitPreview} alt="已上传人物照" />
          ) : (
            <>
              <Plus size={18} />
              <strong>上传图片</strong>
              <span>人物正面照</span>
            </>
          )}
        </button>
        <div className="idh-form-card">
          <label className="idh-select">
            <select value={model} onChange={(event) => setModel(event.target.value)}>
              {options.models.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </label>
          <label className="idh-select">
            <Mic size={15} />
            <select value={voiceId} onChange={(event) => setVoiceId(event.target.value)}>
              {voices.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </label>
          <textarea
            value={text}
            maxLength={options.limits?.maxTextLength || 2000}
            onChange={(event) => setText(event.target.value)}
            placeholder="请输入台词，生成语音..."
          />
          <details className="idh-advanced">
            <summary>音色参数</summary>
            <label>
              <span>情绪</span>
              <select value={emotion} onChange={(event) => setEmotion(event.target.value)}>
                {ttsEmotionOptions.map((item) => <option key={item.value || "auto"} value={item.value}>{item.label}</option>)}
              </select>
            </label>
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
          </details>
          <button className="idh-preview-voice" type="button" onClick={previewVoice} disabled={isPreviewing}>
            {isPreviewing ? <Loader2 size={15} /> : <Play size={15} />}
            生成语音
          </button>
          {voicePreviewUrl && <audio className="idh-audio-preview" src={voicePreviewUrl} controls />}
        </div>
      </div>
      <div className="idh-composer-footer">
        <span>图片与音频大小均不超过 10MB</span>
        <small>{selectedVoice?.description || selectedModel?.primaryModel}</small>
        <strong>{price}</strong>
        <button type="button" onClick={submit} disabled={isSubmitting || !isPreviewCurrent || isTooLong} aria-label="生成图片数字人视频">
          {isSubmitting ? <Loader2 size={18} /> : <Send size={18} />}
        </button>
      </div>
      {notice && <div className={`idh-notice ${isTooLong ? "is-warning" : ""}`}>{notice}</div>}
    </div>
  );
}

function ImageDigitalHumanView({ activeNav }) {
  const [tasks, setTasks] = useState([]);
  const [options, setOptions] = useState(emptyImageDigitalHumanOptions);
  const [voices, setVoices] = useState([]);
  const [credits, setCredits] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submittedTaskId, setSubmittedTaskId] = useState(null);
  const [viewTab, setViewTab] = useState("home");

  useEffect(() => {
    if (activeNav !== "image-digital-human") return undefined;
    let mounted = true;
    async function load() {
      try {
        const [modelData, voiceData, taskData, creditData] = await Promise.all([
          imageDigitalHumanApi.getModels(),
          imageDigitalHumanApi.getVoices(),
          imageDigitalHumanApi.getTasks(),
          imageDigitalHumanApi.getCredits().catch(() => null)
        ]);
        if (!mounted) return;
        setOptions(modelData);
        setVoices(voiceData.voices || []);
        setTasks(taskData);
        setCredits(creditData);
      } catch (error) {
        if (mounted) setSubmitError(error.message || "加载图片数字人失败");
      }
    }
    load();
    const unsubscribe = imageDigitalHumanApi.subscribe(() => {
      imageDigitalHumanApi.getTasks().then((value) => mounted && setTasks(value)).catch(() => {});
      imageDigitalHumanApi.getCredits().then((value) => mounted && setCredits(value)).catch(() => {});
    });
    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [activeNav]);

  if (activeNav !== "image-digital-human") {
    return <ComingSoon activeNav={activeNav} />;
  }

  const submittedTask = tasks.find((task) => String(task.id) === String(submittedTaskId)) || null;
  const showCenterState = isSubmitting || submitError || submittedTask;
  const showHero = viewTab === "home" && !showCenterState;
  const visibleResultTasks = viewTab === "recent" && submittedTaskId
    ? tasks.filter((task) => String(task.id) !== String(submittedTaskId))
    : viewTab === "recent" ? tasks : [];
  const showRecentEmpty = viewTab === "recent" && !showCenterState && visibleResultTasks.length === 0;

  async function createTask(payload) {
    setSubmitError("");
    setIsSubmitting(true);
    setSubmittedTaskId(null);
    try {
      const task = await imageDigitalHumanApi.createTask(payload);
      setSubmittedTaskId(task.id);
      setTasks((current) => [task, ...current.filter((item) => item.id !== task.id)]);
    } catch (error) {
      setSubmitError(error.message || "创建图片数字人任务失败");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function deleteTask(id) {
    await imageDigitalHumanApi.deleteTask(id);
    setTasks((current) => current.filter((task) => task.id !== id));
    setSubmittedTaskId((current) => String(current) === String(id) ? null : current);
  }

  async function regenerateTask(id) {
    setSubmitError("");
    setIsSubmitting(true);
    setSubmittedTaskId(null);
    try {
      const task = await imageDigitalHumanApi.regenerateTask(id);
      setSubmittedTaskId(task.id);
      setTasks((current) => [task, ...current]);
    } catch (error) {
      setSubmitError(error.message || "重新生成失败");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="idh-view-root">
      <div className="image-filter-tabs idh-filter-tabs">
        <button className={viewTab === "home" ? "selected" : ""} type="button" onClick={() => setViewTab("home")}>主页</button>
        <button className={viewTab === "recent" ? "selected" : ""} type="button" onClick={() => setViewTab("recent")}>最近生成</button>
        <button type="button" disabled>
          <Star size={17} fill="#f8d545" color="#161616" />
          收藏
        </button>
        {credits && <span className="credits-chip">积分 {credits.balance}</span>}
      </div>
      <div className={`idh-canvas ${showCenterState ? "has-active-task" : ""}`}>
        {showHero && <div className="idh-hero-empty">
          <span className="idh-hero-icon">
            <Camera size={34} />
          </span>
          <h1>图片数字人</h1>
          <p>上传人物照片和音频，生成数字人说话视频</p>
        </div>}
        {showCenterState && (
          <ImageDigitalHumanCenterState
            task={submittedTask}
            isSubmitting={isSubmitting && !submittedTask}
            error={submitError}
            onOpenRecent={() => {
              setViewTab("recent");
              setSubmittedTaskId(null);
            }}
          />
        )}
        {showRecentEmpty && (
          <div className="idh-recent-empty">
            <Layers size={24} />
            <strong>暂无最近生成</strong>
            <p>生成完成的视频会保存在这里，主页只保留创作入口。</p>
          </div>
        )}
        <div className={`idh-results-feed ${visibleResultTasks.length ? "has-results" : ""}`}>
          {visibleResultTasks.map((task) => (
            <ImageDigitalHumanTaskCard
              key={task.id}
              task={task}
              onDelete={deleteTask}
              onRegenerate={regenerateTask}
            />
          ))}
        </div>
      </div>
      {options.models.length > 0 && voices.length > 0 && (
        <ImageDigitalHumanComposer
          options={options}
          voices={voices}
          onSubmit={createTask}
          isSubmitting={isSubmitting}
        />
      )}
    </section>
  );
}

const emptyMotionTransferOptions = {
  models: [],
  defaults: { model: "kie-motion-transfer", resolution: "720p", duration: 5 },
  limits: {
    maxImageBytes: 10 * 1024 * 1024,
    maxVideoBytes: 200 * 1024 * 1024,
    recommendedVideoSeconds: 15
  }
};

function formatBytes(bytes) {
  const value = Number(bytes || 0);
  if (value >= 1024 * 1024) return `${(value / 1024 / 1024).toFixed(1)} MB`;
  if (value >= 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${value} B`;
}

function MotionTransferCenterState({ task, isSubmitting, error, onOpenRecent }) {
  if (task?.status === "completed") {
    return (
      <section className="motion-center-state is-completed">
        <div className="motion-result-player">
          <video src={task.resultUrl} controls playsInline poster={task.thumbnailUrl || task.imageUrl} />
        </div>
        <div className="motion-result-copy">
          <span className="motion-center-icon">
            <CheckCircle2 size={24} />
          </span>
          <h2>动作迁移已完成</h2>
          <p>{task.prompt}</p>
          <div className="motion-result-actions">
            <a href={task.resultUrl} download>
              <Download size={15} />
              下载
            </a>
            <button type="button" onClick={onOpenRecent}>
              查看历史
            </button>
          </div>
        </div>
      </section>
    );
  }

  if (error || task?.status === "failed") {
    return (
      <section className="motion-center-state is-failed">
        <span className="motion-center-icon">
          <Sparkles size={24} />
        </span>
        <strong>这次没有生成成功</strong>
        <p>{error || task?.error || "生成服务返回了错误，积分会按任务状态自动处理。"}</p>
      </section>
    );
  }

  return (
    <section className="motion-center-state is-processing" aria-live="polite">
      <span className="motion-center-spinner">
        <Loader2 size={30} />
      </span>
      <strong>{isSubmitting ? "正在创建动作迁移任务" : "正在生成动作迁移视频"}</strong>
      <p>正在上传人物图片和动作参考视频，并提交给 KIE 合成。完成后会自动回填到这里。</p>
      <div className="motion-center-progress">
        <i style={{ width: `${task?.progress || 28}%` }} />
      </div>
      <small>{task?.progress ? `${task.progress}%` : "任务准备中"} · 请保持页面打开</small>
    </section>
  );
}

function MotionTransferTaskCard({ task, onDelete, onFavorite, onRepeat }) {
  const isProcessing = task.status === "processing";
  const isFailed = task.status === "failed";
  return (
    <article className={`motion-task-card status-${task.status}`}>
      <div className="motion-task-preview">
        {task.resultUrl && !isFailed ? (
          <video src={task.resultUrl} controls playsInline preload="metadata" poster={task.thumbnailUrl || task.imageUrl} />
        ) : (
          <div className={`motion-task-placeholder ${isFailed ? "is-failed" : ""}`}>
            {isProcessing ? <Loader2 size={26} /> : <Video size={26} />}
            <strong>{isFailed ? "生成失败" : "生成中"}</strong>
          </div>
        )}
      </div>
      <div className="motion-task-meta">
        <div className="tag-row">
          <span className="model-tag">{task.providerModel || task.model}</span>
          <span className="ratio-tag">{task.resolution}</span>
          <span className="quality-tag">{task.duration}s</span>
        </div>
        <div className="time-row">
          <span>{task.time}</span>
          <strong>{task.price}</strong>
        </div>
        <p>{task.error || task.prompt}</p>
        <div className="motion-source-row">
          <span>
            <Image size={14} />
            {task.imageFileName || "人物图片"}
          </span>
          <span>
            <Film size={14} />
            {task.videoFileName || "动作视频"}
          </span>
        </div>
        <div className="card-actions motion-card-actions">
          <button className={`icon-circle ${task.favorite ? "is-favorite" : ""}`} type="button" onClick={() => onFavorite(task.id)} aria-label="收藏">
            <Star size={17} fill={task.favorite ? "#f8d545" : "none"} />
          </button>
          {task.resultUrl ? (
            <a className="card-action-link" href={task.resultUrl} download>
              <Download size={15} />
              下载
            </a>
          ) : (
            <button type="button" disabled>
              <Download size={15} />
              下载
            </button>
          )}
          <button type="button" onClick={() => onRepeat(task)}>
            <RefreshCcw size={15} />
            再次生成
          </button>
          <button type="button" onClick={() => onDelete(task.id)}>
            <Trash2 size={15} />
            删除
          </button>
        </div>
      </div>
    </article>
  );
}

function MotionTransferUploadSlot({ kind, title, hint, asset, previewUrl, isUploading, onSelect }) {
  const inputRef = useRef(null);
  const Icon = kind === "image" ? Image : Film;
  return (
    <button className={`motion-upload-slot ${previewUrl ? "has-preview" : ""}`} type="button" onClick={() => inputRef.current?.click()}>
      <input
        ref={inputRef}
        type="file"
        accept={kind === "image" ? "image/*" : "video/*"}
        hidden
        onChange={(event) => onSelect(event.target.files?.[0] || null)}
      />
      {previewUrl ? (
        kind === "image" ? (
          <img src={previewUrl} alt={title} />
        ) : (
          <video src={previewUrl} muted playsInline preload="metadata" />
        )
      ) : (
        <>
          <Plus size={16} />
          <strong>{title}</strong>
          <span>{hint}</span>
        </>
      )}
      {asset && <small>{asset.fileName} · {formatBytes(asset.sizeBytes)}</small>}
      {isUploading && (
        <span className="motion-uploading">
          <Loader2 size={16} />
          上传中
        </span>
      )}
      {!isUploading && previewUrl && (
        <span className="motion-upload-kind">
          <Icon size={14} />
          更换素材
        </span>
      )}
    </button>
  );
}

function MotionTransferComposer({ options, onSubmit, isSubmitting }) {
  const [imageAsset, setImageAsset] = useState(null);
  const [videoAsset, setVideoAsset] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [videoPreview, setVideoPreview] = useState("");
  const [model, setModel] = useState(options.defaults?.model || options.models[0]?.value || "");
  const [resolution, setResolution] = useState(options.defaults?.resolution || "720p");
  const [duration, setDuration] = useState(options.defaults?.duration || 5);
  const [notice, setNotice] = useState("");
  const [uploading, setUploading] = useState("");

  useEffect(() => {
    if (!model && (options.defaults?.model || options.models[0]?.value)) {
      setModel(options.defaults?.model || options.models[0].value);
    }
    if (!resolution && options.defaults?.resolution) setResolution(options.defaults.resolution);
    if (!duration && options.defaults?.duration) setDuration(options.defaults.duration);
  }, [duration, model, options, resolution]);

  useEffect(() => {
    return () => {
      if (imagePreview) window.URL.revokeObjectURL(imagePreview);
      if (videoPreview) window.URL.revokeObjectURL(videoPreview);
    };
  }, [imagePreview, videoPreview]);

  const selectedModel = options.models.find((item) => item.value === model) || options.models[0];
  const price = `${selectedModel?.basePoints || 0} 积分`;
  const canSubmit = imageAsset && videoAsset && !uploading && !isSubmitting;

  async function selectImage(file) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setNotice("请上传图片文件");
      return;
    }
    if (file.size > (options.limits?.maxImageBytes || 10 * 1024 * 1024)) {
      setNotice("图片大小不能超过 10MB");
      return;
    }
    if (imagePreview) window.URL.revokeObjectURL(imagePreview);
    setImagePreview(window.URL.createObjectURL(file));
    setImageAsset(null);
    setUploading("image");
    setNotice("");
    try {
      setImageAsset(await motionTransferApi.uploadImage(file));
    } catch (error) {
      setImagePreview("");
      setNotice(error.message || "图片上传失败");
    } finally {
      setUploading("");
    }
  }

  async function selectVideo(file) {
    if (!file) return;
    if (!file.type.startsWith("video/")) {
      setNotice("请上传视频文件");
      return;
    }
    if (file.size > (options.limits?.maxVideoBytes || 200 * 1024 * 1024)) {
      setNotice("视频大小不能超过 200MB");
      return;
    }
    if (videoPreview) window.URL.revokeObjectURL(videoPreview);
    setVideoPreview(window.URL.createObjectURL(file));
    setVideoAsset(null);
    setUploading("video");
    setNotice("");
    try {
      setVideoAsset(await motionTransferApi.uploadVideo(file));
    } catch (error) {
      setVideoPreview("");
      setNotice(error.message || "视频上传失败");
    } finally {
      setUploading("");
    }
  }

  function submit() {
    if (!imageAsset) {
      setNotice("请先上传单人图片");
      return;
    }
    if (!videoAsset) {
      setNotice("请先上传动作视频");
      return;
    }
    setNotice("");
    onSubmit({
      imageAssetId: imageAsset.id,
      videoAssetId: videoAsset.id,
      model,
      resolution,
      duration
    });
  }

  return (
    <div className="motion-composer" aria-label="动作迁移上传面板">
      <div className="motion-upload-grid">
        <MotionTransferUploadSlot
          kind="image"
          title="上传单人图"
          hint="主体清晰，单人效果最好"
          asset={imageAsset}
          previewUrl={imagePreview}
          isUploading={uploading === "image"}
          onSelect={selectImage}
        />
        <MotionTransferUploadSlot
          kind="video"
          title="上传动作视频"
          hint={`建议 ${options.limits?.recommendedVideoSeconds || 15} 秒内`}
          asset={videoAsset}
          previewUrl={videoPreview}
          isUploading={uploading === "video"}
          onSelect={selectVideo}
        />
      </div>
      <div className="motion-composer-footer">
        <label className="control-select model-select">
          <Box size={15} />
          <select value={model} onChange={(event) => setModel(event.target.value)}>
            {options.models.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </label>
        <label className="control-select">
          <Ruler size={15} />
          <select value={resolution} onChange={(event) => setResolution(event.target.value)}>
            {["480p", "720p", "1080p"].map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
        <label className="control-select">
          <Timer size={15} />
          <select value={duration} onChange={(event) => setDuration(Number(event.target.value))}>
            {[5, 8, 10, 15].map((item) => <option key={item} value={item}>{item}s</option>)}
          </select>
        </label>
        <span className="price-pill">{price}</span>
        <button className="send-button" type="button" onClick={submit} disabled={!canSubmit} aria-label="生成动作迁移视频">
          {isSubmitting ? <Loader2 size={18} /> : <Send size={18} />}
        </button>
      </div>
      {notice && <div className="composer-notice warning">{notice}</div>}
    </div>
  );
}

function MotionTransferView({ activeNav }) {
  const [tasks, setTasks] = useState([]);
  const [options, setOptions] = useState(emptyMotionTransferOptions);
  const [credits, setCredits] = useState(null);
  const [filter, setFilter] = useState("all");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submittedTaskId, setSubmittedTaskId] = useState(null);

  useEffect(() => {
    if (activeNav !== "motion") return undefined;
    let mounted = true;
    async function load() {
      try {
        const [modelData, taskData, creditData] = await Promise.all([
          motionTransferApi.getModels(),
          motionTransferApi.getTasks({ filter }),
          motionTransferApi.getCredits().catch(() => null)
        ]);
        if (!mounted) return;
        setOptions(modelData);
        setTasks(taskData);
        setCredits(creditData);
      } catch (error) {
        if (mounted) setSubmitError(error.message || "加载动作迁移失败");
      }
    }
    load();
    const unsubscribe = motionTransferApi.subscribe(() => {
      motionTransferApi.getTasks({ filter }).then((value) => mounted && setTasks(value)).catch(() => {});
      motionTransferApi.getCredits().then((value) => mounted && setCredits(value)).catch(() => {});
    });
    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [activeNav, filter]);

  if (activeNav !== "motion") {
    return <ComingSoon activeNav={activeNav} />;
  }

  const submittedTask = tasks.find((task) => String(task.id) === String(submittedTaskId)) || null;
  const showCenterState = isSubmitting || submitError || submittedTask;
  const showEmptyHero = !showCenterState && tasks.length === 0 && filter !== "favorite";
  const visibleTasks = submittedTaskId
    ? tasks.filter((task) => String(task.id) !== String(submittedTaskId))
    : tasks;

  async function createTask(payload) {
    setSubmitError("");
    setIsSubmitting(true);
    setSubmittedTaskId(null);
    try {
      const task = await motionTransferApi.createTask(payload);
      setSubmittedTaskId(task.id);
      setTasks((current) => [task, ...current.filter((item) => item.id !== task.id)]);
    } catch (error) {
      setSubmitError(error.message || "创建动作迁移任务失败");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function deleteTask(id) {
    await motionTransferApi.deleteTask(id);
    setTasks((current) => current.filter((task) => task.id !== id));
    setSubmittedTaskId((current) => String(current) === String(id) ? null : current);
  }

  async function toggleFavorite(id) {
    const updated = await motionTransferApi.toggleFavorite(id);
    setTasks((current) => current.map((task) => String(task.id) === String(id) ? updated : task));
  }

  function repeatTask(task) {
    createTask({
      imageAssetId: task.imageAssetId,
      videoAssetId: task.videoAssetId,
      model: task.model,
      resolution: task.resolution,
      duration: task.duration,
      prompt: task.prompt
    });
  }

  return (
    <section className="motion-view-root">
      <div className="image-filter-tabs motion-filter-tabs">
        <button className={filter === "all" ? "selected" : ""} type="button" onClick={() => setFilter("all")}>全部结果</button>
        <button className={filter === "favorite" ? "selected" : ""} type="button" onClick={() => setFilter("favorite")}>
          <Star size={17} fill="#f8d545" color="#161616" />
          收藏
        </button>
        {credits && <span className="credits-chip">积分 {credits.balance}</span>}
      </div>
      <div className={`motion-canvas ${showCenterState ? "has-active-task" : ""}`}>
        {showEmptyHero && (
          <div className="motion-hero-empty">
            <span className="motion-hero-icon">
              <Sparkles size={34} />
            </span>
            <h1>开启你的动作迁移</h1>
            <p>上传图片和动作视频，让静态人物动起来</p>
          </div>
        )}
        {showCenterState && (
          <MotionTransferCenterState
            task={submittedTask}
            isSubmitting={isSubmitting && !submittedTask}
            error={submitError}
            onOpenRecent={() => setSubmittedTaskId(null)}
          />
        )}
        {!showEmptyHero && !showCenterState && visibleTasks.length === 0 && (
          <div className="motion-recent-empty">
            <Layers size={24} />
            <strong>暂无动作迁移结果</strong>
            <p>生成完成的视频会保存在这里。</p>
          </div>
        )}
        <div className={`motion-results-feed ${visibleTasks.length ? "has-results" : ""}`}>
          {visibleTasks.map((task) => (
            <MotionTransferTaskCard
              key={task.id}
              task={task}
              onDelete={deleteTask}
              onFavorite={toggleFavorite}
              onRepeat={repeatTask}
            />
          ))}
        </div>
      </div>
      {options.models.length > 0 && (
        <MotionTransferComposer
          options={options}
          onSubmit={createTask}
          isSubmitting={isSubmitting}
        />
      )}
    </section>
  );
}

function ImageFeaturePage({ initialNav, onBackHome }) {
  const [activeNav, setActiveNav] = useState(initialNav || "image");

  const handleNavChange = useCallback((id) => {
    if (id === "home") {
      onBackHome();
      return;
    }
    if (id === "image" || id === "video" || id === "chat" || id === "digital-human" || id === "image-digital-human" || id === "motion") {
      window.history.pushState(null, "", `#/${id}`);
    }
    setActiveNav((current) => (current === id ? current : id));
  }, [onBackHome]);

  return (
    <div className="feature-page-shell">
      <FeatureSidebar activeNav={activeNav} onNavChange={handleNavChange} />
      <main className="feature-main">
        {activeNav === "image" && <ImageGenerationView activeNav={activeNav} />}
        {activeNav === "video" && <VideoGenerationView activeNav={activeNav} />}
        {activeNav === "chat" && <ChatGenerationView activeNav={activeNav} />}
        {activeNav === "digital-human" && <DigitalHumanGenerationView activeNav={activeNav} />}
        {activeNav === "image-digital-human" && <ImageDigitalHumanView activeNav={activeNav} />}
        {activeNav === "motion" && <MotionTransferView activeNav={activeNav} />}
        {!["image", "video", "chat", "digital-human", "image-digital-human", "motion"].includes(activeNav) && <ComingSoon activeNav={activeNav} />}
      </main>
    </div>
  );
}

function App() {
  const [view, setView] = useState(getInitialView);
  const [skipHomeSplash, setSkipHomeSplash] = useState(false);

  useEffect(() => {
    const onPopState = () => setView(getInitialView());
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const openImage = useCallback(() => {
    setSkipHomeSplash(false);
    if (window.location.hash !== "#/image") {
      window.history.pushState(null, "", "/#/image");
    }
    setView((current) => (current === "image" ? current : "image"));
  }, []);

  const backHome = useCallback(() => {
    if (window.location.pathname !== "/" || window.location.hash) {
      window.history.pushState(null, "", "/");
    }
    setSkipHomeSplash(true);
    setView((current) => (current === "home" ? current : "home"));
  }, []);

  if (view === "image" || view === "video" || view === "chat" || view === "digital-human" || view === "image-digital-human" || view === "motion") {
    return <ImageFeaturePage initialNav={view} onBackHome={backHome} />;
  }

  return <OriginalHome onOpenImage={openImage} skipSplash={skipHomeSplash} />;
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
