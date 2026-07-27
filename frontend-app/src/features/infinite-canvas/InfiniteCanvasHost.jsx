import React, { useEffect, useRef } from "react";
import { Loader2, LogIn } from "lucide-react";
import { paymentApi } from "../../api/paymentApi";
import { emitCreditsUpdated } from "../../api/creditsEvents";
import "./infiniteCanvasHost.css";

export function InfiniteCanvasHost({ authUser, onOpenAuth, onOpenFeature }) {
  const iframeRef = useRef(null);
  const isLoadingUser = !authUser;
  const isGuest = Boolean(authUser?.isGuest);

  useEffect(() => {
    function handleMessage(event) {
      if (event.origin !== window.location.origin || event.source !== iframeRef.current?.contentWindow) return;
      if (event.data?.source !== "facemini-canvas") return;
      if (event.data.type === "auth-required") {
        onOpenAuth?.("login");
      } else if (event.data.type === "open-assets") {
        onOpenFeature?.("assets");
      } else if (event.data.type === "credits-changed") {
        paymentApi.getCredits().then(emitCreditsUpdated).catch(() => {});
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [onOpenAuth, onOpenFeature]);

  if (isLoadingUser) {
    return (
      <section className="infinite-canvas-gate" aria-label="正在验证登录状态" aria-live="polite">
        <Loader2 size={28} className="infinite-canvas-gate__spinner" />
        <p>正在验证登录状态…</p>
      </section>
    );
  }

  if (isGuest) {
    return (
      <section className="infinite-canvas-gate" aria-label="无限画布登录门禁">
        <div className="infinite-canvas-gate__icon" aria-hidden="true">∞</div>
        <h2>登录后使用无限画布</h2>
        <p>项目会保存到云端，生成的图片和视频会自动进入“我的资产”。</p>
        <button className="infinite-canvas-gate__action" type="button" onClick={() => onOpenAuth?.("login")}>
          <LogIn size={17} />
          立即登录
        </button>
      </section>
    );
  }

  return (
    <section className="infinite-canvas-host" aria-label="Facemini 无限画布">
      <iframe
        ref={iframeRef}
        title="Facemini 无限画布"
        src="/canvas-app/"
        className="infinite-canvas-host__frame"
        allow="clipboard-read; clipboard-write"
      />
    </section>
  );
}
