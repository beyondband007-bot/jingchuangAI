import dotenv from "dotenv";
import path from "path";

// Load project root env first as defaults, then backend-specific env to take precedence.
dotenv.config({ path: path.resolve(process.cwd(), "..", ".env") });
dotenv.config({ override: true });

const projectRoot = path.resolve(process.cwd(), "..");

function resolveProjectPath(value) {
  const filePath = String(value || "").trim();
  if (!filePath) return "";
  return path.isAbsolute(filePath) ? filePath : path.resolve(projectRoot, filePath);
}

const publicBaseUrl = (
  process.env.ALIPAY_PUBLIC_BASE_URL ||
  process.env.PUBLIC_BASE_URL ||
  process.env.MIDDLE_PLATFORM_PUBLIC_BASE_URL ||
  process.env.WF_003_CALLBACK_BASE_URL ||
  ""
).replace(/\/+$/, "");

const publicMediaBaseUrl = (
  process.env.PUBLIC_MEDIA_BASE_URL ||
  (publicBaseUrl ? `${publicBaseUrl}/media` : "")
).replace(/\/+$/, "");

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
  ark: {
    apiKey: process.env.ARK_API_KEY || "",
    baseUrl: (process.env.ARK_API_BASE_URL || "https://ark.cn-beijing.volces.com/api/v3").replace(/\/+$/, ""),
    videoModel: process.env.ARK_VIDEO_MODEL || "doubao-seedance-2-0-260128",
    projectName: process.env.ARK_PROJECT_NAME || process.env.ARK_ASSET_PROJECT_NAME || "jingchuang",
    accessKeyId: process.env.VOLC_ACCESS_KEY_ID || process.env.VOLC_ACCESSKEY || "",
    secretAccessKey: process.env.VOLC_SECRET_ACCESS_KEY || process.env.VOLC_SECRETKEY || "",
    region: process.env.VOLC_REGION || "cn-beijing",
    openApiEndpoint: (process.env.VOLC_OPENAPI_ENDPOINT || "https://open.volcengineapi.com").replace(/\/+$/, ""),
    virtualAssetGroupName: process.env.ARK_VIRTUAL_ASSET_GROUP_NAME || "jingchuang-ai-virtual-assets",
    virtualAssetPollIntervalMs: Number(process.env.ARK_VIRTUAL_ASSET_POLL_INTERVAL_MS || 10000),
    virtualAssetPollAttempts: Number(process.env.ARK_VIRTUAL_ASSET_POLL_ATTEMPTS || 18)
  },
  minimax: {
    apiKey: process.env.MINIMAX_API_KEY || "",
    groupId: process.env.MINIMAX_GROUP_ID || "",
    baseUrl: process.env.MINIMAX_BASE_URL || "https://api.minimaxi.com",
    ttsModel: process.env.MINIMAX_TTS_MODEL || "speech-2.8-turbo"
  },
  qwen: {
    apiKey: process.env.QWEN_API_KEY || process.env.DASHSCOPE_API_KEY || "",
    baseUrl: process.env.QWEN_BASE_URL || "https://dashscope.aliyuncs.com/compatible-mode/v1",
    model: process.env.QWEN_MODEL || "qwen-vl-plus"
  },
  deepseek: {
    apiKey: process.env.DEEPSEEK_API_KEY || "",
    baseUrl: process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com"
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
  captcha: {
    provider: process.env.CAPTCHA_PROVIDER || "tencent",
    dryRun: process.env.CAPTCHA_DRY_RUN === "true",
    tencentAppId: process.env.TENCENT_CAPTCHA_APP_ID || "",
    tencentAppSecretKey: process.env.TENCENT_CAPTCHA_APP_SECRET_KEY || ""
  },
  alipay: {
    env: process.env.ALIPAY_ENV || "sandbox",
    appId: process.env.ALIPAY_APP_ID || "",
    sellerId: process.env.ALIPAY_SELLER_ID || "",
    privateKeyPath: resolveProjectPath(process.env.ALIPAY_PRIVATE_KEY_PATH),
    publicKeyPath: resolveProjectPath(process.env.ALIPAY_PUBLIC_KEY_PATH),
    publicBaseUrl
  },
  wechatPay: {
    appId: process.env.WECHAT_PAY_APP_ID || "",
    mchId: process.env.WECHAT_PAY_MCH_ID || "",
    merchantSerialNo: process.env.WECHAT_PAY_MERCHANT_SERIAL_NO || "",
    apiV3Key: process.env.WECHAT_PAY_API_V3_KEY || "",
    apiV3KeyPath: resolveProjectPath(process.env.WECHAT_PAY_API_V3_KEY_PATH),
    privateKeyPath: resolveProjectPath(process.env.WECHAT_PAY_PRIVATE_KEY_PATH),
    platformPublicKeyPath: resolveProjectPath(process.env.WECHAT_PAY_PLATFORM_PUBLIC_KEY_PATH),
    notifyUrl: process.env.WECHAT_PAY_NOTIFY_URL || (publicBaseUrl ? `${publicBaseUrl}/api/payment/wechatpay/notify` : ""),
    apiBaseUrl: (process.env.WECHAT_PAY_API_BASE_URL || "https://api.mch.weixin.qq.com").replace(/\/+$/, "")
  },
  media: {
    storageDir: process.env.MEDIA_STORAGE_DIR || "storage",
    publicAssetsDir: process.env.PUBLIC_ASSETS_DIR || "../frontend-app/public",
    publicBaseUrl: publicMediaBaseUrl
  }
};
