let tencentCaptchaScriptPromise = null;

export function loadTencentCaptchaScript() {
  if (window.TencentCaptcha) {
    return Promise.resolve();
  }
  if (tencentCaptchaScriptPromise) {
    return tencentCaptchaScriptPromise;
  }

  tencentCaptchaScriptPromise = new Promise((resolve, reject) => {
    const existingScript = document.querySelector(
      'script[src="https://turing.captcha.qcloud.com/TJCaptcha.js"]',
    );
    if (existingScript) {
      existingScript.addEventListener("load", resolve, { once: true });
      existingScript.addEventListener(
        "error",
        () => reject(new Error("验证码组件加载失败，请稍后重试")),
        { once: true },
      );
      return;
    }

    const script = document.createElement("script");
    script.src = "https://turing.captcha.qcloud.com/TJCaptcha.js";
    script.async = true;
    script.onload = resolve;
    script.onerror = () => reject(new Error("验证码组件加载失败，请稍后重试"));
    document.head.appendChild(script);
  });

  return tencentCaptchaScriptPromise;
}
