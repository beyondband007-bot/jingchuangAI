import dotenv from "dotenv";

dotenv.config();

export const config = {
  port: Number(process.env.PORT || 3006),
  db: {
    host: process.env.DB_HOST || "127.0.0.1",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "jingchuang_ai",
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  },
  defaultDemoCredits: Number(process.env.DEFAULT_DEMO_CREDITS || 100),
  kie: {
    apiKey: process.env.KIE_API_KEY || "",
    baseUrl: process.env.KIE_API_BASE_URL || "https://api.kie.ai",
    imageModel: process.env.KIE_IMAGE_MODEL || "nano-banana-2",
    digitalHumanModel: process.env.KIE_DIGITAL_HUMAN_MODEL || "wan/2-7-r2v",
    digitalHumanResolution: process.env.KIE_DIGITAL_HUMAN_RESOLUTION || "720p",
    digitalHumanDuration: Number(process.env.KIE_DIGITAL_HUMAN_DURATION || 5),
    fileUploadBaseUrl: process.env.KIE_FILE_UPLOAD_BASE_URL || "https://kieai.redpandaai.co"
  },
  minimax: {
    apiKey: process.env.MINIMAX_API_KEY || "",
    groupId: process.env.MINIMAX_GROUP_ID || "",
    baseUrl: process.env.MINIMAX_BASE_URL || "https://api.minimaxi.com",
    ttsModel: process.env.MINIMAX_TTS_MODEL || "speech-2.8-turbo"
  },
  media: {
    storageDir: process.env.MEDIA_STORAGE_DIR || "storage",
    publicAssetsDir: process.env.PUBLIC_ASSETS_DIR || "../frontend-app/public"
  }
};
