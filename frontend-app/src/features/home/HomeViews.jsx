import "./homeApp.css";
import "./home.css";
import React, { memo, useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@arco-design/web-react";
import { LogIn, LogOut, UserRound } from "lucide-react";

const faceminiAsset = (path) => `/assets/facemini/${path}`;

export function BrandWordmark({ compact = false }) {
  return (
    <span className={`fm-brand-wordmark ${compact ? "compact" : ""}`}>
      <span className="fm-brand-name">Facemini</span>
      <span className="fm-beta-badge">Beta</span>
    </span>
  );
}

export const SplashHome = memo(function SplashHome({ onOpenAuth }) {
  const frameRefs = useRef([]);

  const bindAuthLinks = useCallback(() => {
    frameRefs.current.forEach((frame) => {
      try {
        const doc = frame?.contentDocument;
        if (!doc) return;
        const bindLink = (selector, handler) => {
          const links = Array.from(doc.querySelectorAll(selector));
          links.forEach((link) => {
            if (link.dataset.jcAuthBound === "1") return;
            link.dataset.jcAuthBound = "1";
            link.addEventListener(
              "click",
              (event) => {
                event.preventDefault();
                event.stopPropagation();
                event.stopImmediatePropagation();
                handler();
              },
              true,
            );
          });
        };
        bindLink('a[href="#signin"], a[href*="#signin"]', () =>
          onOpenAuth("login"),
        );
        bindLink('a[href="#signup"], a[href*="#signup"]', () =>
          onOpenAuth("register"),
        );
      } catch {
        // The exported landing pages are same-origin locally; ignore if a browser blocks access.
      }
    });
  }, [onOpenAuth]);

  const handleFrameLoad = useCallback(() => {
    bindAuthLinks();
    let tries = 0;
    const timer = window.setInterval(() => {
      tries += 1;
      bindAuthLinks();
      if (tries >= 20) {
        window.clearInterval(timer);
      }
    }, 200);
  }, [bindAuthLinks]);

  return (
    <div className="original-home-shell">
      <div
        ref={(node) => {
          frameRefs.current[1] = node;
        }}
        className="original-home-frame"
        title="Facemini AI 首页"
      />
    </div>
  );
});

export const AppHome = memo(function AppHome({
  onOpenFeature,
  onOpenLanding,
  authUser,
  onOpenAuth,
  onLogout,
}) {
  const isGuest = !authUser || authUser.isGuest;
  const [homeContent, setHomeContent] = useState({
    features: [],
    modules: [],
  });

  useEffect(() => {
    let active = true;
    import("../../data/faceminiData").then((module) => {
      if (!active) return;
      setHomeContent({
        features: module.fmHomeFeatures,
        modules: module.fmHomeModules,
      });
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="home-feature-main fm-home-page">
      <nav className="fm-home-nav" aria-label="首页导航">
        <div className="fm-home-nav-left">
          <button type="button" onClick={onOpenLanding} aria-label="返回落地页">
            <BrandWordmark />
          </button>
          <div className="fm-home-nav-links">
            <a href="#why">关于我们</a>
            <a href="#modules">关于产品</a>
            <a href="#footer">探索我们</a>
          </div>
        </div>
        <div className="fm-home-actions">
          <Button
            type="text"
            className="fm-home-enter-creation"
            onClick={() => onOpenFeature("creation")}
          >
            创作中心
          </Button>
        </div>
      </nav>
      <section className="fm-hero-section">
        <h1>千面创想 一面即达</h1>
        <p>Facemini，让未来的工作方式，提前发生</p>
        <button
          className="fm-primary fm-hero-cta"
          type="button"
          onClick={() => onOpenFeature("creation")}
        >
          开始探索
        </button>
        <div className="fm-metrics">
          {[
            ["10M+", "AI能力日调用量"],
            ["99.99%", "平台稳定可用性"],
            ["50ms", "平均响应延迟"],
            ["500+", "企业客户与个人"],
          ].map(([value, label]) => (
            <div key={value}>
              <strong>{value}</strong>
              <span>{label}</span>
            </div>
          ))}
        </div>
      </section>
      <section className="fm-home-section" id="why">
        <h2>为什么选择Facemini</h2>
        <p>一站式解决AI应用开发的所有挑战，让您专注于产品创新</p>
        <div className="fm-feature-grid">
          {homeContent.features.map(([title, body, icon]) => (
            <button
              className="fm-feature-card"
              type="button"
              key={title}
              onClick={() => onOpenFeature("creation")}
            >
              <span className="fm-svg-icon">
                <img src={faceminiAsset(icon)} alt="" />
              </span>
              <h3>{title}</h3>
              <p>{body}</p>
            </button>
          ))}
        </div>
      </section>
      <section className="fm-home-section fm-module-section" id="modules">
        <h2>Facemini能做什么</h2>
        <p>聚焦AI应用落地，助力企业与内容业务高效增长</p>
        <div className="fm-module-list">
          {homeContent.modules.map(([title, desc, image, icon, route]) => (
            <button
              className="fm-module-row"
              type="button"
              key={title}
              onClick={() => onOpenFeature(route)}
            >
              <img src={faceminiAsset(image)} alt="" />
              <div>
                <span className="fm-svg-icon">
                  <img src={faceminiAsset(icon)} alt="" />
                </span>
                <h3>{title}</h3>
                <p>{desc}</p>
                <ul>
                  <li>模板化配置，快速启动应用</li>
                  <li>统一素材资产，便于复用沉淀</li>
                </ul>
              </div>
            </button>
          ))}
        </div>
      </section>
      <section className="fm-final-cta">
        <h2>准备好开启你的AI创意之旅了吗？</h2>
        <p>立即体验Facemini的强大能力</p>
        <button
          className="fm-primary"
          type="button"
          onClick={() => onOpenFeature("creation")}
        >
          开始探索
        </button>
        <div className="fm-footer-brand-block">
          <BrandWordmark />
          <p>AI 驱动的创意工具平台，面向企业营销、数字内容与个人创作场景。</p>
        </div>
      </section>
      <footer className="fm-home-footer" id="footer">
        <div className="fm-footer-links">
          <a>关于我们</a>
          <a>关于产品</a>
          <a>探索我们</a>
          <a>帮助中心</a>
        </div>
        <p>
          © 2026 Facemini All rights reserved.{" "}
          <a
            href="https://beian.miit.gov.cn/"
            target="_blank"
            rel="noopener noreferrer"
          >
            鄂ICP备2021002927号-3
          </a>
        </p>
      </footer>
    </main>
  );
});
