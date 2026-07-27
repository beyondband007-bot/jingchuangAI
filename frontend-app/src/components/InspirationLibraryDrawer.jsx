import React, { useEffect, useMemo, useState } from "react";
import { Drawer } from "@arco-design/web-react";
import { Search, Sparkles, X } from "lucide-react";
import "./InspirationLibraryDrawer.css";
import {
  INSPIRATION_LIBRARY_DEFAULT_TAB,
  INSPIRATION_LIBRARY_TABS,
} from "./inspirationLibraryConfig";

const inspirationLibraryItems = [
  { title: "电商主图", icon: "🛍️", tab: "图片模板", route: "image" },
  { title: "赛博海报", icon: "🌃", tab: "图片模板", route: "image" },
  { title: "插画头像", icon: "🎨", tab: "图片模板", route: "image" },
  { title: "3D 产品", icon: "✨", tab: "图片模板", route: "image" },
  { title: "国潮美食", icon: "🍜", tab: "图片模板", route: "image" },
  { title: "品牌 IP", icon: "🐱", tab: "图片模板", route: "image" },
  { title: "人像写真", icon: "👤", tab: "图片模板", route: "image" },
  { title: "节日海报", icon: "🎉", tab: "图片模板", route: "image" },
  { title: "短视频口播", icon: "🎤", tab: "视频模板", route: "video" },
  { title: "产品种草", icon: "🌿", tab: "视频模板", route: "video" },
  { title: "漫剧片段", icon: "🎭", tab: "视频模板", route: "video" },
  { title: "蝶舞", icon: "🦋", tab: "视频模板", route: "video" },
  { title: "趣味短剧", icon: "🐱", tab: "视频模板", route: "video" },
  { title: "城市延时", icon: "🌃", tab: "视频模板", route: "video" },
  { title: "产品旋转", icon: "📦", tab: "视频模板", route: "video" },
  { title: "口播带货", icon: "🛒", tab: "视频模板", route: "video" },
];

export function InspirationLibraryDrawer({
  open,
  activeTab,
  onTabChange,
  onClose,
  onOpenFeature,
}) {
  const [keyword, setKeyword] = useState("");

  useEffect(() => {
    if (!open) return undefined;

    function handleKeyDown(event) {
      if (event.key === "Escape") onClose?.();
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  const filteredItems = useMemo(() => {
    const query = keyword.trim().toLowerCase();
    return inspirationLibraryItems.filter((item) => {
      const matchesTab =
        activeTab === INSPIRATION_LIBRARY_DEFAULT_TAB || item.tab === activeTab;
      const matchesKeyword =
        !query ||
        item.title.toLowerCase().includes(query) ||
        item.tab.toLowerCase().includes(query);
      return matchesTab && matchesKeyword;
    });
  }, [activeTab, keyword]);

  function selectItem(item) {
    onClose?.();
    onOpenFeature?.(item.route);
  }

  function handleCategoryKeyDown(event, item) {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    selectItem(item);
  }

  return (
    <Drawer
      className="fm-library-drawer"
      wrapClassName="fm-library-drawer-shell"
      visible={open}
      placement="right"
      width={300}
      title={
        <div className="fm-library-head">
          <div className="fm-library-title">
            <Sparkles size={18} />
            <h2>灵感库</h2>
          </div>
          <button
            className="fm-library-close"
            type="button"
            aria-label="关闭灵感库"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>
      }
      footer={null}
      closable={false}
      maskClosable
      unmountOnExit
      onCancel={onClose}
    >
      <nav className="fm-library-tabs" aria-label="灵感库分类">
        {INSPIRATION_LIBRARY_TABS.map((tab) => (
          <button
            className={activeTab === tab ? "is-active" : ""}
            type="button"
            key={tab}
            onClick={() => onTabChange(tab)}
          >
            {tab}
          </button>
        ))}
      </nav>
      <label className="fm-library-search">
        <Search size={16} />
        <input
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          placeholder="搜索模板名称、风格、场景..."
        />
      </label>
      <ul className="fm-library-grid">
        {filteredItems.map((item) => (
          <li className="fm-library-list-item" key={`${item.tab}-${item.title}`}>
            <div
              className="fm-library-card"
              role="button"
              tabIndex={0}
              onClick={() => selectItem(item)}
              onKeyDown={(event) => handleCategoryKeyDown(event, item)}
            >
              <span className="fm-library-icon" aria-hidden="true">
                {item.icon}
              </span>
              <span className="fm-library-name">{item.title}</span>
            </div>
          </li>
        ))}
      </ul>
      {!filteredItems.length && (
        <div className="fm-library-empty">
          <Sparkles size={24} />
          <strong>暂无匹配模板</strong>
          <p>换个关键词或分类试试</p>
        </div>
      )}
    </Drawer>
  );
}
