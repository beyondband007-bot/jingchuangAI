import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Bot,
  Box,
  Camera,
  Copy,
  Dice5,
  Download,
  Eraser,
  FileText,
  Hash,
  Home,
  Image,
  Layers,
  Mic,
  Music,
  Paintbrush,
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
  Trash2,
  UserRound,
  Video,
  Wand2
} from "lucide-react";
import { imageApi } from "./api/imageApi";
import "./styles.css";

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
  return window.location.pathname === "/image" ? "image" : "home";
}

function OriginalHome({ onOpenImage }) {
  return (
    <div className="original-home-shell">
      <iframe className="original-home-frame" title="鲸创AI首页" src="/original/index.html" />
      <button className="image-nav-hotspot" type="button" onClick={onOpenImage} aria-label="进入图片生成" />
    </div>
  );
}

function FeatureSidebar({ activeNav, onNavChange }) {
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
      <div className="feature-login">登</div>
    </aside>
  );
}

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
  const [count, setCount] = useState(options.counts[0] || 1);
  const [notice, setNotice] = useState("");
  const [simulateFail, setSimulateFail] = useState(false);

  useEffect(() => {
    if (!model && options.models[0]) setModel(options.models[0].value);
    if (!ratio && options.ratios[0]) setRatio(options.ratios[0]);
    if (!quality && options.qualities[0]) setQuality(options.qualities[0].value);
  }, [model, options, quality, ratio]);

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
      count,
      shouldFail: simulateFail
    });
    setNotice(simulateFail ? "已创建失败态模拟任务" : "已创建 mock 生成任务");
    setPrompt("");
    setSimulateFail(false);
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
        <label className="control-select">
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
        <label className="control-select">
          <Hash size={16} />
          <select value={count} onChange={(event) => setCount(Number(event.target.value))}>
            {options.counts.map((item) => (
              <option key={item} value={item}>
                {item} 张
              </option>
            ))}
          </select>
        </label>
        <button className="composer-tool" type="button" aria-pressed={simulateFail} onClick={() => setSimulateFail((value) => !value)} aria-label="失败态模拟">
          <Sparkles size={18} />
        </button>
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
      {simulateFail && <div className="composer-notice warning">失败态模拟已开启，本次提交会生成失败卡片。</div>}
    </div>
  );
}

const emptyOptions = { models: [], ratios: [], qualities: [], counts: [] };

function ImageGenerationView({ activeNav }) {
  const [filter, setFilter] = useState("all");
  const [cards, setCards] = useState([]);
  const [options, setOptions] = useState(emptyOptions);
  const [credits, setCredits] = useState(null);

  useEffect(() => {
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
  }, [filter]);

  if (activeNav !== "image") {
    return <ComingSoon activeNav={activeNav} />;
  }

  async function createTask(payload) {
    await imageApi.createTask(payload);
  }

  async function deleteTask(id) {
    await imageApi.deleteTask(id);
  }

  async function toggleFavorite(id) {
    await imageApi.toggleFavorite(id);
  }

  async function regenerateTask(id) {
    await imageApi.regenerateTask(id);
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
      <div className="results-feed">
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
      {options.models.length > 0 && <ComposerBar options={options} onSubmit={createTask} />}
    </section>
  );
}

function ImageFeaturePage({ onBackHome }) {
  const [activeNav, setActiveNav] = useState("image");

  function handleNavChange(id) {
    if (id === "home") {
      onBackHome();
      return;
    }
    setActiveNav(id);
  }

  return (
    <div className="feature-page-shell">
      <FeatureSidebar activeNav={activeNav} onNavChange={handleNavChange} />
      <main className="feature-main">
        <ImageGenerationView activeNav={activeNav} />
      </main>
    </div>
  );
}

function App() {
  const [view, setView] = useState(getInitialView);

  useEffect(() => {
    const onPopState = () => setView(getInitialView());
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  function openImage() {
    window.history.pushState(null, "", "/image");
    setView("image");
  }

  function backHome() {
    window.history.pushState(null, "", "/");
    setView("home");
  }

  if (view === "image") {
    return <ImageFeaturePage onBackHome={backHome} />;
  }

  return <OriginalHome onOpenImage={openImage} />;
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
