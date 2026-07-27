import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  use: {
    baseURL: "http://127.0.0.1:5173",
    channel: "chrome",
    headless: true,
    viewport: { width: 1280, height: 720 },
    colorScheme: "light",
    locale: "zh-CN",
    timezoneId: "Asia/Shanghai",
    reducedMotion: "reduce",
  },
  webServer: [
    { command: "npm run dev", url: "http://127.0.0.1:5173", reuseExistingServer: true },
    { command: "npm --prefix canvas-app run dev", url: "http://127.0.0.1:5176/canvas-app/", reuseExistingServer: true },
  ],
});
