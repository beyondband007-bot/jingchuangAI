import React, { useEffect, useRef } from "react";
import { Loader2, LogIn } from "lucide-react";
import { paymentApi } from "../../api/paymentApi";
import { emitCreditsUpdated } from "../../api/creditsEvents";

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
      <section style={styles.gate} aria-label="正在验证登录状态">
        <Loader2 size={28} className="spin" />
        <p>正在验证登录状态…</p>
      </section>
    );
  }

  if (isGuest) {
    return (
      <section style={styles.gate} aria-label="无限画布登录门禁">
        <div style={styles.icon}>∞</div>
        <h2 style={styles.title}>登录后使用无限画布</h2>
        <p style={styles.copy}>项目会保存到云端，生成的图片和视频会自动进入“我的资产”。</p>
        <button type="button" style={styles.button} onClick={() => onOpenAuth?.("login")}>
          <LogIn size={17} />
          立即登录
        </button>
      </section>
    );
  }

  return (
    <section style={styles.host} aria-label="Facemini 无限画布">
      <iframe
        ref={iframeRef}
        title="Facemini 无限画布"
        src="/canvas-app/"
        style={styles.frame}
        allow="clipboard-read; clipboard-write"
      />
    </section>
  );
}

const styles = {
  host: { width: "100%", height: "100%", minHeight: 0, overflow: "hidden", background: "#f7f8fb" },
  frame: { display: "block", width: "100%", height: "100%", border: 0, background: "#f7f8fb" },
  gate: { minHeight: "calc(100vh - 64px)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, padding: 32, textAlign: "center", background: "linear-gradient(145deg, #f7f9ff, #fff8f3)" },
  icon: { width: 68, height: 68, borderRadius: 22, display: "grid", placeItems: "center", color: "white", fontSize: 34, fontWeight: 700, background: "linear-gradient(135deg, #6c5ce7, #ff8a5c)", boxShadow: "0 18px 40px rgba(108,92,231,.2)" },
  title: { margin: 0, fontSize: 25, color: "#202337" },
  copy: { margin: 0, maxWidth: 480, color: "#6b7085", lineHeight: 1.7 },
  button: { marginTop: 6, display: "inline-flex", alignItems: "center", gap: 8, border: 0, borderRadius: 12, padding: "11px 20px", color: "white", fontWeight: 700, cursor: "pointer", background: "linear-gradient(135deg, #6657e8, #7a68f2)" }
};
