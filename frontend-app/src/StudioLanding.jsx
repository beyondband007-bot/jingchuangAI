import { memo, useCallback, useEffect, useRef } from "react";
import studioLandingHtml from "./StudioLandingContent";

export const StudioLanding = memo(function StudioLanding({ onOpenAuth, onEnterApp }) {
  const rootRef = useRef(null);

  const handleClick = useCallback((event) => {
    const actionTarget = event.target.closest("[data-studio-action]");
    if (!actionTarget || !rootRef.current?.contains(actionTarget)) return;

    const action = actionTarget.dataset.studioAction;
    if (action === "login" || action === "register" || action === "enter") {
      event.preventDefault();
      event.stopPropagation();
    }

    if (action === "login") onOpenAuth("login");
    if (action === "register") onOpenAuth("register");
    if (action === "enter") onEnterApp();
  }, [onEnterApp, onOpenAuth]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;

    const burst = root.querySelector("[data-studio-burst-canvas]");
    if (!burst) return undefined;

    let cancelled = false;
    let cleanupBurst = null;
    const burstModuleUrl = "/new_page/assets/prismatic-burst.js";
    const importPublicModule = new Function("url", "return import(url)");

    importPublicModule(burstModuleUrl)
      .then(({ mountPrismaticBurst }) => {
        if (cancelled || !root.isConnected) return;

        cleanupBurst = mountPrismaticBurst(burst, {
          opacity: 0.96,
          intensity: 2.2,
          speed: 0.82,
          distort: 1.08,
          noiseAmount: 0.2,
          rayCount: 13,
        });
        root.classList.add("is-video-ready");
      })
      .catch((error) => {
        console.warn("Failed to start studio WebGL burst:", error);
        root.classList.add("is-video-ready");
      });

    return () => {
      cancelled = true;
      root.classList.remove("is-video-ready");
      cleanupBurst?.();
    };
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;

    document.body.classList.add("studio-landing-active");
    document.documentElement.classList.add("studio-landing-active");

    function resetPageScroll() {
      const pageRoot = document.documentElement;
      const previousBehavior = pageRoot.style.scrollBehavior;
      pageRoot.style.scrollBehavior = "auto";
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      requestAnimationFrame(() => {
        pageRoot.style.scrollBehavior = previousBehavior;
      });
    }

    resetPageScroll();
    const loadFrame = requestAnimationFrame(() => root.classList.add("is-loaded"));
    window.addEventListener("pageshow", resetPageScroll);

    return () => {
      document.body.classList.remove("studio-landing-active");
      document.documentElement.classList.remove("studio-landing-active");
      root.classList.remove("is-loaded");
      cancelAnimationFrame(loadFrame);
      window.removeEventListener("pageshow", resetPageScroll);
    };
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;

    const nav = root.querySelector(".nav");
    const firstScreen = root.querySelector(".first-screen");
    const heroShell = root.querySelector(".showcase-shell");
    const features = root.querySelector(".features");
    let lastScrollY = window.scrollY;
    let heroIntroProgress = 0;
    let pendingWheelX = 0;
    let pendingWheelY = 0;
    let wheelFrame = 0;
    let revealFrame = 0;
    let revealVisibleTargets = null;
    const cleanups = [];

    const setRootVar = (name, value) => {
      root.style.setProperty(name, value);
    };

    function clamp(value, min, max) {
      return Math.min(Math.max(value, min), max);
    }

    function smootherStep(value) {
      return value * value * value * (value * (value * 6 - 15) + 10);
    }

    function syncNavFadeState() {
      if (!nav) return;
      const currentY = window.scrollY;
      const delta = currentY - lastScrollY;

      if (window.innerWidth <= 720) {
        nav.classList.remove("nav--fade-menu");
        lastScrollY = window.scrollY;
        return;
      }

      if (currentY <= 72) {
        nav.classList.remove("nav--fade-menu");
      } else if (delta > 10) {
        nav.classList.add("nav--fade-menu");
      } else if (delta < -10) {
        nav.classList.remove("nav--fade-menu");
      }

      lastScrollY = currentY;
    }

    function updateNavSafeOffset() {
      if (!nav || !firstScreen) return;
      const navStyles = window.getComputedStyle(nav);
      const stickyTop = parseFloat(navStyles.top) || 0;
      const navHeight = Math.ceil(nav.getBoundingClientRect().height);
      const reserved = Math.max(0, navHeight + stickyTop);
      const heroGap = Math.max(12, Math.min(24, Math.round(navHeight * 0.18)));
      setRootVar("--nav-safe-offset", `${reserved}px`);
      setRootVar("--hero-nav-gap", `${heroGap}px`);
    }

    function writeHeroVideoFrame() {
      setRootVar("--hero-video-y", "0px");
      setRootVar("--hero-video-scale", "1");
      setRootVar("--hero-video-radius", "32px");
      setRootVar("--hero-video-frame-opacity", "1");
      setRootVar("--hero-video-border-alpha", "0.62");
      setRootVar("--hero-video-inner-alpha", "0.08");
      setRootVar("--hero-video-glow-alpha", "0.16");
      setRootVar("--hero-video-shadow-alpha", "0.55");
      setRootVar("--hero-video-shadow-y", "30px");
      setRootVar("--hero-video-shadow-blur", "80px");
      setRootVar("--hero-video-ray-opacity", "0.95");
    }

    function writeHeroCopyFrame(progress) {
      const eased = smootherStep(clamp(progress, 0, 1));
      setRootVar("--hero-eyebrow-opacity", String((1 - eased).toFixed(3)));
      setRootVar("--hero-eyebrow-shift", `${(-34 * eased).toFixed(1)}px`);
      setRootVar("--hero-copy-opacity", String((1 - eased).toFixed(3)));
      setRootVar("--hero-copy-shift", `${(-42 * eased).toFixed(1)}px`);
      setRootVar("--hero-actions-opacity", String((1 - eased).toFixed(3)));
      setRootVar("--hero-actions-shift", `${(-30 * eased).toFixed(1)}px`);
    }

    function writeHeroSequenceFrame(progress) {
      writeHeroCopyFrame(progress);
      writeHeroVideoFrame();
    }

    function updateFeaturesOffset(shellRect) {
      const baseGap = window.innerWidth <= 720 ? 18 : 24;
      const firstScreenBottom = firstScreen
        ? firstScreen.getBoundingClientRect().bottom
        : window.innerHeight;
      const offset = Math.max(baseGap, shellRect.bottom - firstScreenBottom + baseGap);
      setRootVar("--features-offset", `${Math.ceil(offset)}px`);
    }

    function measureHeroVideoTarget() {
      writeHeroVideoFrame();
      setRootVar("--hero-eyebrow-opacity", "1");
      setRootVar("--hero-eyebrow-shift", "0px");
      setRootVar("--hero-copy-opacity", "1");
      setRootVar("--hero-copy-shift", "0px");
      setRootVar("--hero-actions-opacity", "1");
      setRootVar("--hero-actions-shift", "0px");

      if (!heroShell) return;
      updateFeaturesOffset(heroShell.getBoundingClientRect());
      writeHeroSequenceFrame(heroIntroProgress);
    }

    function setHeroIntroProgress(progress) {
      root.classList.add("hero-sequence-running");
      heroIntroProgress = clamp(progress, 0, 1);
      writeHeroSequenceFrame(heroIntroProgress);
      if (heroIntroProgress === 0 || heroIntroProgress === 1) {
        root.classList.remove("hero-sequence-running");
      }
    }

    function revealFeatures(element = features) {
      if (!element || element.classList.contains("features--visible")) return;
      element.classList.add("features--visible");
      const timer = window.setTimeout(() => {
        element.classList.add("features--entered");
      }, 1150);
      cleanups.push(() => window.clearTimeout(timer));
    }

    function revealElement(element) {
      element?.classList.add("reveal-visible");
    }

    function syncHeroCanvasState() {
      if (!firstScreen) return;
      root.dataset.heroCanvasState = firstScreen.getBoundingClientRect().bottom > 80 ? "playing" : "paused";
    }

    function findScrollableAncestor(startNode) {
      let node = startNode;
      while (node && node !== document.body && node !== document.documentElement) {
        if (node instanceof HTMLElement) {
          const style = window.getComputedStyle(node);
          const canScrollY = /(auto|scroll|overlay)/.test(style.overflowY)
            && node.scrollHeight > node.clientHeight + 1;
          if (canScrollY) return node;
        }
        node = node.parentElement;
      }
      return null;
    }

    function flushLandingWheel() {
      wheelFrame = 0;
      const left = pendingWheelX;
      const top = pendingWheelY;
      pendingWheelX = 0;
      pendingWheelY = 0;
      if (left || top) {
        window.scrollBy({ top, left, behavior: "auto" });
        if (typeof revealVisibleTargets === "function") {
          revealVisibleTargets();
        } else {
          scheduleRevealCheck();
        }
        syncHeroCanvasState();
      }
    }

    function handleLandingWheel(event) {
      if (!root.contains(event.target)) return;
      const scrollable = findScrollableAncestor(event.target);
      if (scrollable && scrollable !== document.body && scrollable !== document.documentElement) return;

      const multiplier = event.deltaMode === WheelEvent.DOM_DELTA_LINE
        ? 16
        : event.deltaMode === WheelEvent.DOM_DELTA_PAGE
          ? window.innerHeight
          : 1;
      const nextTop = event.deltaY * multiplier;
      const nextLeft = event.deltaX * multiplier;
      if (nextTop === 0 && nextLeft === 0) return;

      event.preventDefault();
      pendingWheelY += nextTop;
      pendingWheelX += nextLeft;
      if (!wheelFrame) {
        wheelFrame = requestAnimationFrame(flushLandingWheel);
      }
    }

    function setupScrollReveals() {
      const getRevealTargets = () => [
          ...Array.from(root.querySelectorAll(".metrics-strip")).map((element) => ({ element, onReveal: revealElement })),
          ...Array.from(root.querySelectorAll(".section-heading")).map((element) => ({ element, onReveal: revealElement })),
          ...Array.from(root.querySelectorAll(".why-grid")).map((element) => ({ element, onReveal: revealElement })),
          ...Array.from(root.querySelectorAll(".workflow-section")).map((element) => ({ element, onReveal: revealElement })),
          ...Array.from(root.querySelectorAll(".features")).map((element) => ({ element, onReveal: revealFeatures }))
        ].filter((item) => item.element);
      const revealTargets = getRevealTargets();

      if (!("IntersectionObserver" in window)) {
        revealTargets.forEach((item) => item.onReveal(item.element));
        return;
      }

      const revealVisibleTargets = () => {
        const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
        getRevealTargets().forEach((item) => {
          if (!item.element || item.element.dataset.revealed === "true") return;
          const rect = item.element.getBoundingClientRect();
          if (rect.top < viewportHeight * 0.9 && rect.bottom > viewportHeight * 0.05) {
            item.element.dataset.revealed = "true";
            item.onReveal(item.element);
          }
        });
      };

      const revealObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const target = getRevealTargets().find((item) => item.element === entry.target);
          if (target) {
            target.element.dataset.revealed = "true";
            target.onReveal(target.element);
          }
          syncHeroCanvasState();
          observer.unobserve(entry.target);
        });
      }, {
        threshold: 0.22,
        rootMargin: "0px 0px -10% 0px"
      });

      revealTargets.forEach((item) => revealObserver.observe(item.element));
      revealVisibleTargets();
      cleanups.push(() => {
        revealObserver.disconnect();
      });
      return revealVisibleTargets;
    }

    function scheduleRevealCheck() {
      if (typeof revealVisibleTargets === "function" && !revealFrame) {
        revealFrame = requestAnimationFrame(() => {
          revealFrame = 0;
          revealVisibleTargets();
          syncHeroCanvasState();
        });
      }
    }

    function getEdgeProximity(card, x, y) {
      const rect = card.getBoundingClientRect();
      const cx = rect.width / 2;
      const cy = rect.height / 2;
      const dx = x - cx;
      const dy = y - cy;
      const kx = dx !== 0 ? cx / Math.abs(dx) : Infinity;
      const ky = dy !== 0 ? cy / Math.abs(dy) : Infinity;
      return Math.min(Math.max(1 / Math.min(kx, ky), 0), 1);
    }

    function getCursorAngle(card, x, y) {
      const rect = card.getBoundingClientRect();
      const cx = rect.width / 2;
      const cy = rect.height / 2;
      const dx = x - cx;
      const dy = y - cy;
      if (dx === 0 && dy === 0) return 0;
      const degrees = (Math.atan2(dy, dx) * (180 / Math.PI)) + 90;
      return degrees < 0 ? degrees + 360 : degrees;
    }

    const glowCards = Array.from(root.querySelectorAll(".showcase-shell"));
    glowCards.forEach((card) => {
      const onMove = (event) => {
        const rect = card.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        const edge = getEdgeProximity(card, x, y);
        const angle = getCursorAngle(card, x, y);
        card.style.setProperty("--edge-proximity", String((edge * 100).toFixed(3)));
        card.style.setProperty("--cursor-angle", `${angle.toFixed(3)}deg`);
      };
      const onLeave = () => {
        card.style.setProperty("--edge-proximity", "0");
        card.style.setProperty("--cursor-angle", "45deg");
      };
      card.addEventListener("pointermove", onMove);
      card.addEventListener("pointerleave", onLeave);
      cleanups.push(() => {
        card.removeEventListener("pointermove", onMove);
        card.removeEventListener("pointerleave", onLeave);
      });
    });

    const buttons = Array.from(root.querySelectorAll(".pill-cta"));
    buttons.forEach((button) => {
      const resetPointer = () => {
        button.style.setProperty("--cursor-x", "50%");
        button.style.setProperty("--cursor-y", "50%");
        button.style.setProperty("--tilt-x", "0deg");
        button.style.setProperty("--tilt-y", "0deg");
      };
      const onMove = (event) => {
        const rect = button.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        const offsetX = x - rect.width / 2;
        const offsetY = y - rect.height / 2;
        button.style.setProperty("--cursor-x", `${x}px`);
        button.style.setProperty("--cursor-y", `${y}px`);
        button.style.setProperty("--tilt-y", `${offsetX / 24}deg`);
        button.style.setProperty("--tilt-x", `${(offsetY / 18) * -1}deg`);
      };
      button.addEventListener("pointermove", onMove);
      button.addEventListener("pointerleave", resetPointer);
      button.addEventListener("pointerup", resetPointer);
      cleanups.push(() => {
        button.removeEventListener("pointermove", onMove);
        button.removeEventListener("pointerleave", resetPointer);
        button.removeEventListener("pointerup", resetPointer);
      });
    });

    updateNavSafeOffset();
    syncNavFadeState();
    measureHeroVideoTarget();
    revealVisibleTargets = setupScrollReveals();
    const revealAfterScroll = scheduleRevealCheck;

    const onResize = () => {
      updateNavSafeOffset();
      syncNavFadeState();
      measureHeroVideoTarget();
      revealAfterScroll();
      syncHeroCanvasState();
    };
    window.addEventListener("scroll", syncNavFadeState, { passive: true });
    window.addEventListener("scroll", revealAfterScroll, { passive: true });
    document.addEventListener("scroll", syncNavFadeState, { passive: true });
    document.addEventListener("scroll", revealAfterScroll, { passive: true });
    window.addEventListener("resize", onResize);
    window.addEventListener("wheel", handleLandingWheel, { passive: false });

    let navResizeObserver = null;
    if (window.ResizeObserver && nav) {
      navResizeObserver = new ResizeObserver(updateNavSafeOffset);
      navResizeObserver.observe(nav);
    }

    return () => {
      cleanups.forEach((cleanup) => cleanup());
      navResizeObserver?.disconnect();
      if (wheelFrame) cancelAnimationFrame(wheelFrame);
      if (revealFrame) cancelAnimationFrame(revealFrame);
      window.removeEventListener("scroll", syncNavFadeState);
      window.removeEventListener("scroll", revealAfterScroll);
      document.removeEventListener("scroll", syncNavFadeState);
      document.removeEventListener("scroll", revealAfterScroll);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("wheel", handleLandingWheel);
    };
  }, []);

  return (
    <div
      ref={rootRef}
      className="studio-landing"
      onClick={handleClick}
      dangerouslySetInnerHTML={{ __html: studioLandingHtml }}
    />
  );
});
