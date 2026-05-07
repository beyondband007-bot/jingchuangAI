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
import "./styles.css";

const exampleImages = [
  { src: "/gallery-1.jpg", label: "电影质感人像", model: "GPT Image 2", ratio: "9:16", quality: "2K", price: "35 积分" },
  { src: "/gallery-2.jpg", label: "时尚产品摄影", model: "Nano Banana Pro", ratio: "1:1", quality: "2K", price: "63 积分" },
  { src: "/gallery-4.jpg", label: "自然光影", model: "Imagen 4", ratio: "16:9", quality: "2K", price: "28 积分" },
  { src: "/gallery-6.jpg", label: "水下写实", model: "Flux 2 Pro", ratio: "4:3", quality: "1K", price: "18 积分" },
  { src: "/hot-1-digital-human.jpg", label: "数字人形象", model: "GPT Image 2", ratio: "9:16", quality: "2K", price: "35 积分" },
  { src: "/hot-3-motion.jpg", label: "动态创意", model: "4o Image", ratio: "1:1", quality: "1K", price: "21 积分" },
  { src: "/thumb-img-gen.jpg", label: "图片生成", model: "Imagen 4 Fast", ratio: "1:1", quality: "1K", price: "14 积分" },
  { src: "/thumb-splash-2.png", label: "灵感封面", model: "Seedream 4.5", ratio: "16:9", quality: "2K", price: "22 积分" },
  { src: "/gallery-8.jpg", label: "复古影像", model: "Nano Banana Pro", ratio: "3:4", quality: "2K", price: "63 积分" },
  { src: "/gallery-10.jpg", label: "概念海报", model: "Seedream 4.5", ratio: "9:16", quality: "2K", price: "22 积分" }
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
              <img src="/gallery-3.jpg" alt={card.prompt} />
              <img src="/gallery-4.jpg" alt={card.prompt} />
              <img src="/gallery-5.jpg" alt={card.prompt} />
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
    id: "example-eagle",
    status: "completed",
    model: "Veo 3.1 Fast",
    modelKey: "veo_3_1_fast",
    ratio: "16:9",
    duration: 8,
    time: "10:51",
    rmb: "约 ¥22.4",
    price: "2240 积分",
    prompt: "一只雄鹰展翅翱翔在峡谷之上，镜头跟随飞翔，下方是蜿蜒的河流和红色岩石，阳光穿透云层。",
    favorite: false
  },
  {
    id: "example-room",
    status: "completed",
    model: "Kling 3.0 Std",
    modelKey: "kling_3_std",
    ratio: "16:9",
    duration: 6,
    time: "10:45",
    rmb: "约 ¥2.9",
    price: "294 积分",
    prompt: "年轻女性在清晨的卧室里伸懒腰，阳光透过白色窗帘洒进来，慢动作特写，画面温暖。",
    favorite: false
  },
  {
    id: "example-city",
    status: "completed",
    model: "Veo 3.1 Lite",
    modelKey: "veo_3_1_lite",
    ratio: "16:9",
    duration: 8,
    time: "10:45",
    rmb: "约 ¥9.6",
    price: "960 积分",
    prompt: "一只机器人在未来城市的街道上奔跑，霓虹灯闪烁，全息广告投射在雨后的路面。",
    favorite: false
  },
  {
    id: "example-ai",
    status: "completed",
    model: "Kling 3.0 Pro",
    modelKey: "kling_3_pro",
    ratio: "9:16",
    duration: 10,
    time: "02:15",
    rmb: "约 ¥6.3",
    price: "630 积分",
    prompt: "核心主题：美少女火火拿着手机，在参考图场景讲解 AI 短视频服务，镜头稳定，画面清晰。",
    favorite: false
  },
  {
    id: "example-product",
    status: "completed",
    model: "Kling 3.0 Std",
    modelKey: "kling_3_std",
    ratio: "1:1",
    duration: 8,
    time: "12:24",
    rmb: "约 ¥3.9",
    price: "392 积分",
    prompt: "玻璃展台上的银色智能耳机缓慢旋转，背景是柔和蓝色光带，产品广告质感。",
    favorite: false
  },
  {
    id: "example-travel",
    status: "completed",
    model: "Veo 3.1 Fast",
    modelKey: "veo_3_1_fast",
    ratio: "9:16",
    duration: 8,
    time: "11:57",
    rmb: "约 ¥22.4",
    price: "2240 积分",
    prompt: "航拍镜头穿过江边城市天际线，夕阳把楼体染成金色，画面适合旅行短视频开场。",
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
        {cards.length || filter !== "all" ? (
          cards.length ? cards.map((card) => (
            <VideoResultCard
              card={card}
              key={card.id}
              onDelete={deleteTask}
              onFavorite={toggleFavorite}
              onRegenerate={regenerateTask}
            />
          )) : <div className="empty-results video-empty-results">暂无视频结果</div>
        ) : (
          videoExampleCards.map((card) => (
            <VideoResultCard
              card={card}
              key={card.id}
              isExample
              onDelete={() => {}}
              onFavorite={() => {}}
              onRegenerate={() => {}}
            />
          ))
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

function ImageFeaturePage({ initialNav, onBackHome }) {
  const [activeNav, setActiveNav] = useState(initialNav || "image");

  const handleNavChange = useCallback((id) => {
    if (id === "home") {
      onBackHome();
      return;
    }
    if (id === "image" || id === "video") {
      window.history.pushState(null, "", `#/${id}`);
    }
    setActiveNav((current) => (current === id ? current : id));
  }, [onBackHome]);

  return (
    <div className="feature-page-shell">
      <FeatureSidebar activeNav={activeNav} onNavChange={handleNavChange} />
      <main className="feature-main">
        {activeNav === "image" ? <ImageGenerationView activeNav={activeNav} /> : <VideoGenerationView activeNav={activeNav} />}
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

  if (view === "image" || view === "video") {
    return <ImageFeaturePage initialNav={view} onBackHome={backHome} />;
  }

  return <OriginalHome onOpenImage={openImage} skipSplash={skipHomeSplash} />;
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
