import dotenv from "dotenv";

dotenv.config();

export const config = {
  port: Number(process.env.PORT || 3006),
  host: process.env.HOST || (process.env.NODE_ENV === "production" ? "0.0.0.0" : "127.0.0.1"),
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
    digitalHumanModel: process.env.KIE_DIGITAL_HUMAN_MODEL || "kling/ai-avatar-pro",
    digitalHumanResolution: process.env.KIE_DIGITAL_HUMAN_RESOLUTION || "720p",
    digitalHumanDuration: Number(process.env.KIE_DIGITAL_HUMAN_DURATION || 5),
    imageDigitalHumanPrimaryModel: process.env.KIE_IMAGE_DIGITAL_HUMAN_PRIMARY_MODEL || "kling/ai-avatar-pro",
    imageDigitalHumanFallbackModel: process.env.KIE_IMAGE_DIGITAL_HUMAN_FALLBACK_MODEL || "kling/ai-avatar-pro",
    imageDigitalHumanResolution: process.env.KIE_IMAGE_DIGITAL_HUMAN_RESOLUTION || "480p",
    imageDigitalHumanFallbackResolution: process.env.KIE_IMAGE_DIGITAL_HUMAN_FALLBACK_RESOLUTION || "720p",
    motionTransferModel: process.env.KIE_MOTION_TRANSFER_MODEL || "kling-3.0/motion-control",
    motionTransferResolution: process.env.KIE_MOTION_TRANSFER_RESOLUTION || "720p",
    motionTransferCharacterOrientation: process.env.KIE_MOTION_TRANSFER_CHARACTER_ORIENTATION || "image",
    motionTransferPoints: Number(process.env.KIE_MOTION_TRANSFER_POINTS || 100),
    faceSwapModel: process.env.KIE_FACE_SWAP_MODEL || "wan/2-7-r2v",
    faceSwapResolution: process.env.KIE_FACE_SWAP_RESOLUTION || "720p",
    faceSwapDuration: Number(process.env.KIE_FACE_SWAP_DURATION || 5),
    faceSwapPoints: Number(process.env.KIE_FACE_SWAP_POINTS || 100),
    watermarkImageModel: process.env.KIE_WATERMARK_IMAGE_MODEL || "gpt-image-2-image-to-image",
    watermarkImageResolution: process.env.KIE_WATERMARK_IMAGE_RESOLUTION || "2K",
    watermarkImagePoints: Number(process.env.KIE_WATERMARK_IMAGE_POINTS || 25),
    watermarkVideoModel: process.env.KIE_WATERMARK_VIDEO_MODEL || process.env.KIE_MOTION_TRANSFER_MODEL || "wan/2-7-r2v",
    watermarkVideoResolution: process.env.KIE_WATERMARK_VIDEO_RESOLUTION || "720p",
    watermarkVideoPoints: Number(process.env.KIE_WATERMARK_VIDEO_POINTS || 100),
    enhanceImageModel: process.env.KIE_ENHANCE_IMAGE_MODEL || "gpt-image-2-image-to-image",
    enhanceVideoModel: process.env.KIE_ENHANCE_VIDEO_MODEL || "topaz/video-upscale",
    enhanceUpscaleFactor: process.env.KIE_ENHANCE_UPSCALE_FACTOR || "2",
    enhanceImagePoints: Number(process.env.KIE_ENHANCE_IMAGE_POINTS || 25),
    enhanceVideoPoints: Number(process.env.KIE_ENHANCE_VIDEO_POINTS || 100),
    removeBgImageModel: process.env.KIE_REMOVE_BG_IMAGE_MODEL || "recraft/remove-background",
    removeBgImagePoints: Number(process.env.KIE_REMOVE_BG_IMAGE_POINTS || 25),
    fileUploadBaseUrl: process.env.KIE_FILE_UPLOAD_BASE_URL || "https://kieai.redpandaai.co"
  },
  minimax: {
    apiKey: process.env.MINIMAX_API_KEY || "",
    groupId: process.env.MINIMAX_GROUP_ID || "",
    baseUrl: process.env.MINIMAX_BASE_URL || "https://api.minimaxi.com",
    ttsModel: process.env.MINIMAX_TTS_MODEL || "speech-2.8-turbo"
  },
  qwen: {
    apiKey: process.env.QWEN_API_KEY || process.env.DASHSCOPE_API_KEY || "",
    baseUrl: process.env.QWEN_BASE_URL || "https://dashscope-intl.aliyuncs.com/compatible-mode/v1",
    model: process.env.QWEN_MODEL || "qwen-vl-plus"
  },
  tencentCloud: {
    secretId: process.env.TENCENTCLOUD_SECRET_ID || "",
    secretKey: process.env.TENCENTCLOUD_SECRET_KEY || "",
    region: process.env.TENCENTCLOUD_REGION || "ap-guangzhou"
  },
  sms: {
    sdkAppId: process.env.SMS_SDK_APP_ID || "",
    signName: process.env.SMS_SIGN_NAME || "",
    loginTemplateId: process.env.SMS_LOGIN_TEMPLATE_ID || "",
    registerTemplateId: process.env.SMS_REGISTER_TEMPLATE_ID || "",
    reviseTemplateId: process.env.SMS_REVISE_TEMPLATE_ID || "",
    templateParamMode: process.env.SMS_TEMPLATE_PARAM_MODE || "code_time",
    codeExpireMinutes: String(process.env.SMS_CODE_EXPIRE_MINUTES || "5"),
    dryRun: process.env.SMS_DRY_RUN === "true"
  },
  alipay: {
    env: process.env.ALIPAY_ENV || "sandbox",
    appId: process.env.ALIPAY_APP_ID || "",
    sellerId: process.env.ALIPAY_SELLER_ID || "",
    privateKeyPath: process.env.ALIPAY_PRIVATE_KEY_PATH || "",
    publicKeyPath: process.env.ALIPAY_PUBLIC_KEY_PATH || "",
    publicBaseUrl: (process.env.ALIPAY_PUBLIC_BASE_URL || process.env.PUBLIC_BASE_URL || "").replace(/\/+$/, "")
  },
  media: {
    storageDir: process.env.MEDIA_STORAGE_DIR || "storage",
    publicAssetsDir: process.env.PUBLIC_ASSETS_DIR || "../frontend-app/public"
  }
};
