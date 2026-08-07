import imgInspirationManifest from "./imgInspirationManifest.json";

const staticAssetBaseUrl = String(
  import.meta.env.VITE_STATIC_ASSET_BASE_URL || "",
).trim().replace(/\/+$/, "");

/**
 * Uses a CDN for public media when configured, while preserving the existing
 * same-origin paths for local development and current deployments.
 */
export function staticAsset(path) {
  const normalizedPath = `/${String(path || "").replace(/^\/+/, "")}`;
  return staticAssetBaseUrl
    ? `${staticAssetBaseUrl}${normalizedPath}`
    : normalizedPath;
}

export const faceminiAsset = (path) => staticAsset(`/assets/facemini/${path}`);

const wideInspirationFiles = new Set([
  "001.webp",
  "002.webp",
  "010.webp",
  "011.webp",
  "012.webp",
  "013.webp",
  "014.webp",
  "015.webp",
  "016.webp",
  "017.webp",
  "018.webp",
  "019.webp",
  "020.webp",
  "023.webp",
  "024.webp",
  "025.webp",
  "026.webp",
  "027.webp",
  "028.webp",
  "029.webp",
  "030.webp",
  "031.webp",
  "032.webp",
  "041.webp",
  "042.webp",
  "043.webp",
  "044.webp",
  "046.webp",
  "048.webp",
  "049.webp",
  "050.webp",
  "051.webp",
  "052.webp",
  "054.webp",
  "055.webp",
  "056.webp",
  "057.webp",
  "058.webp",
  "059.webp",
  "060.webp",
  "061.webp",
  "062.webp",
  "070.webp",
  "072.webp",
  "073.webp",
  "074.webp",
  "075.webp",
  "077.webp",
  "078.webp",
  "079.webp",
  "083.webp",
  "084.webp",
  "085.webp",
  "087.webp",
  "088.webp",
  "089.webp",
  "090.webp",
  "091.webp",
  "092.webp",
  "093.webp",
  "095.webp",
  "096.webp",
  "097.webp",
  "098.webp",
  "105.webp",
  "106.webp",
  "107.webp",
  "108.webp",
  "112.webp",
  "113.webp",
  "114.webp",
  "115.webp",
  "121.webp",
  "122.webp",
  "123.webp",
  "124.webp",
  "125.webp",
]);
const squareInspirationFiles = new Set([]);

function getInspirationAspect(file) {
  if (wideInspirationFiles.has(file)) return "wide";
  if (squareInspirationFiles.has(file)) return "square";
  return "portrait";
}

export const imageInspirationCategoryTabs = [
  { id: "all", label: "全部" },
  { id: "baokuan", label: "爆款模板" },
  { id: "sheying", label: "摄影写真" },
  { id: "dianshang", label: "电商营销" },
  { id: "dongman", label: "动漫游戏" },
  { id: "chahua", label: "风格插画" },
];

const imageInspirationModelByCategory = {
  baokuan: "GPT Image 2",
  sheying: "GPT Image 2",
  dianshang: "Nano Banana Pro",
  dongman: "Nano Banana Pro",
  chahua: "Nano Banana Pro",
};

// The source package contains a number of images whose descriptive fields were
// exported against a different file. Keep the catalog keyed by its stable id,
// rather than relying on the source-file order.
const imageInspirationContentFixes = {
  "dongman-055": "夜幕下，一位身穿黑色礼服的女子站在城市高楼的落地窗前，窗外灯火璀璨，画面优雅而都市感十足。",
  "dongman-057": "昏暗酒吧内，一位戴礼帽的男子坐在窗边，暖黄台灯映照桌面的酒杯，氛围复古而神秘。",
  "dongman-059": "一位白发女子身着飘逸古装，静坐于莲花与云雾环绕的水面，画面清冷而梦幻。",
  "dongman-060": "一位身着深绿色礼服的女子站在古典庭院的水边，灯笼和石桥映出朦胧的东方奇幻氛围。",
  "dongman-061": "一名黑衣战士在巨大的宇宙飞船残骸前持剑而立，冷色光影展现宏大的科幻战场。",
  "dongman-062": "一位白发狐耳人物身着银白长袍立于冰雪城池中，周围环绕寒气与灵光，风格冷艳奇幻。",
  "dongman-064": "一位蒙眼的黑衣女剑士手持长剑站在玫瑰丛前，画面神秘、优雅且带有危险感。",
  "dongman-065": "雨夜霓虹都市中，一位身穿黑色皮衣的女子回眸而立，赛博光影营造冷峻氛围。",
  "dongman-066": "烛光与玫瑰环绕的室内，一位身穿黑色礼服的女子凝视前方，呈现哥特式华丽气质。",
  "dongman-070": "冰蓝色王座上，一位白发冰雪女王身披华丽礼服，周围冰晶闪耀，画面冷艳而梦幻。",
  "dongman-071": "一位身穿黑色礼服的哥特女子端坐于华丽王座，红色玫瑰窗与烛火营造神秘高贵感。",
  "dongman-072": "一位身穿红色赛车服的女赛车手站在赛道前，背后赛车与烟雾交织，画面充满速度感。",
  "dongman-073": "末日荒原上，一名骑着摩托车的战士穿过尘土飞扬的公路，画面粗粝而充满冒险感。",
  "dongman-077": "战场硝烟中，一位披甲战士手持武器迎向远处军队与雷云，呈现史诗般的战争场景。",
  "dongman-078": "烈焰与巨龙环绕的战场上，一名持剑骑士正面迎战，画面热烈而充满奇幻张力。",
  "dongman-080": "幽暗宝殿中，一位金甲王者端坐在石质王座上，金色光芒与尘埃交织，气势庄严。",
  "dongman-083": "雨后都市街头，一位身穿黑色礼服的女子站在酒店门前，金色灯光映在湿润地面上。",
  "dongman-085": "夕阳下的日式神社与樱花之间，一位持刀武者摆出战斗姿态，画面热烈而唯美。",
  "dongman-086": "阴雨火车站台上，一位背影少年望向远方铁轨，氛围安静而略带忧伤。",
  "dongman-087": "烟花照亮夜空，一位身穿红白和服的女子仰望绚丽焰火，画面节庆感浓郁而梦幻。",
  "dongman-088": "日落时分的海边公路延伸至远方，暖橙天空与海面相映，氛围宁静而开阔。",
  "dongman-089": "废弃仓库内，一束天光照亮空荡的地面与陈旧机械，呈现孤寂的工业感。",
  "dongman-090": "雷暴夜色下，破碎公路穿过荒凉原野，远方闪电划破乌云，呈现末日般的辽阔。",
  "dongman-091": "月光照亮寂静海面与远处山影，巨大的残月悬在天空，画面神秘而宁静。",
  "dongman-092": "霓虹地铁车厢中，一位黑衣女战士手持长剑，冷色灯光营造紧张的赛博战斗氛围。",
  "dongman-093": "巨大的蓝紫色魔法阵在城市夜空中旋转，中心人物被星光与符文环绕，画面神秘壮观。",
  "dongman-094": "夕阳海岸被分割成三段画面，一位少年在不同距离眺望海面，氛围温暖而治愈。",
  "dongman-095": "幽蓝水族馆中，一位蓝发女子侧身凝视水中鲸影，画面宁静、深邃且富有梦幻感。",
  "dongman-097": "日出照亮层叠云海与山峰，金色晨光洒向远方，呈现辽阔宁静的自然景观。",
  "dongman-098": "幽暗遗迹中，一位披斗篷的女战士站在蓝色符文与巨石之间，氛围神秘而危险。",
  "dongman-100": "宇宙飞船舷窗前，一位短发女性身着白色未来制服，窗外是深邃星空与飞船结构。",
  "dongman-101": "红色警报笼罩的未来工厂中，两名人物站在燃烧的城市残骸前，呈现灾难科幻场景。",
  "dongman-102": "血红满月下，一位披黑甲的骑士持剑站在荒原，画面暗黑而充满压迫感。",
  "dongman-103": "云海与雪山之间，一位披斗篷的旅者站在峰顶眺望日出，画面壮丽而孤寂。",
  "dongman-107": "戴着虚拟现实头显的人站在蓝色全息城市前，悬浮信息屏环绕，呈现沉浸式未来科技感。",
  "dongman-108": "戴头盔的赛博人物站在蓝色城市屏幕前，冷色灯光与数据面板营造未来感。",
  "dongman-110": "夜晚的日式街道挂满灯笼，水面游动着金鱼，远处烟花绽放，画面繁华而梦幻。",
  "dongman-121": "风雪中的群山与松林在月光下延伸，远方山谷隐约透出灯火，画面清冷壮阔。",
  "dongman-124": "幽暗森林深处，一位戴面具的人站在积水小径中央，古老石门与雾气营造神秘氛围。",
};

// Attach display metadata to each catalog material once so all entry points
// (image generation, creation center, and favorites) use the same model.
export const imageInspirationMaterials = imgInspirationManifest.map((item) => ({
  ...item,
  ...(imageInspirationContentFixes[item.id]
    ? {
        title: imageInspirationContentFixes[item.id],
        prompt: imageInspirationContentFixes[item.id],
        description: imageInspirationContentFixes[item.id],
      }
    : {}),
  model:
    item.model ||
    imageInspirationModelByCategory[item.categoryId] ||
    "GPT Image 2",
}));

export const exampleImages = imageInspirationMaterials.map((item, index) => ({
  file: `${item.baseName}.webp`,
  categoryId: item.categoryId,
  categoryLabel: item.categoryLabel,
  src: item.thumbnailWebp || item.thumbnailJpg,
  fallbackSrc: item.thumbnailJpg || item.thumbnailWebp,
  hdSrc: item.imageWebp || item.imageJpg,
  hdFallbackSrc: item.imageJpg || item.imageWebp,
  label:
    item.title ||
    `${item.categoryLabel} ${String(index + 1).padStart(2, "0")}`,
  prompt: item.prompt || item.title || `${item.categoryLabel}灵感图`,
  description: item.description || "",
  style: item.categoryLabel || "",
  mood: "",
  tags: [item.categoryLabel].filter(Boolean),
  model: item.model,
  ratio: item.ratio || "高清原图",
  width: item.width || null,
  height: item.height || null,
  resolution:
    item.width && item.height
      ? `${item.width}×${item.height}`
      : "",
  quality: "精选",
  price: "参考",
  aspect:
    item.width && item.height
      ? item.width / item.height
      : getInspirationAspect(`${item.baseName}.webp`),
}));

function summarizeInspirationTitle(text, fallback = "AI 图片案例") {
  const normalized = String(text || "").trim();
  if (!normalized) return fallback;
  return normalized.length > 20 ? `${normalized.slice(0, 20)}…` : normalized;
}

export const fmImageGenerationInspirations = exampleImages.map((item, index) => ({
  id: `image-gen-${item.categoryId || "all"}-${item.file || index}`,
  categoryId: item.categoryId,
  title: summarizeInspirationTitle(item.description || item.prompt, item.label),
  category: item.categoryLabel || "图片灵感",
  prompt: item.prompt,
  thumbnail: item.src,
  fallbackThumbnail: item.fallbackSrc,
  source: item.hdSrc || item.src,
  fallbackSource: item.hdFallbackSrc || item.hdSrc || item.src,
  ratio: item.ratio,
  width: item.width,
  height: item.height,
  resolution: item.resolution,
  aspect: item.aspect,
  model: item.model || "GPT Image 2",
  material: "高清原图",
}));

export const fmHomeFeatures = [
  [
    "强大的模型支持",
    "接入主流大模型能力，支持多模态灵感、提示词和内容生成。",
    "home-icons/01.svg",
  ],
  [
    "多模态创作能力",
    "覆盖文本、图片、视频、音频等内容形态，快速组合成完整工作流。",
    "home-icons/02.svg",
  ],
  [
    "数字人内容生产",
    "面向口播、带货和知识讲解场景，提升内容生产效率。",
    "home-icons/03.svg",
  ],
  [
    "智能营销工作流",
    "从灵感、生成到二次处理，串联常用营销工具。",
    "home-icons/04.svg",
  ],
  [
    "稳定安全的服务体验",
    "为企业级权限、积分和任务体系保留清晰架构。",
    "home-icons/05.svg",
  ],
  [
    "清晰可控的资产管理",
    "作品、提示词和灵感素材在同一套界面中沉淀。",
    "home-icons/06.svg",
  ],
];

export const fmHomeModules = [
  [
    "企业级AI智能体",
    "深度结合业务场景，构建更高效的AI协作体验。",
    "home/01.png",
    "home-icons/07.svg",
    "chat",
  ],
  [
    "垂类行业AI落地",
    "面向行业需求，提供可复用的AI应用能力。",
    "home/02.png",
    "home-icons/08.svg",
    "creation",
  ],
  [
    "AI漫剧内容生产",
    "提升内容创作效率，助力多样化视觉内容快速生成。",
    "home/03.png",
    "home-icons/09.svg",
    "video",
  ],
  [
    "通用性营销工具",
    "聚焦增长与传播需求，帮助品牌提升内容转化。",
    "home/04.png",
    "home-icons/10.svg",
    "article",
  ],
];

const fmImageOriginalExtension = {
  "huaban-6611068022": "jpg",
  "huaban-6854630930": "jpg",
  "huaban-6929323331": "jpg",
};

const getFaceminiImageOriginalFile = (id) =>
  `${id}.${fmImageOriginalExtension[id] || "png"}`;

const fmImageDimensions = {
  "huaban-6006882171": [816, 1456],
  "huaban-6337337122": [568, 852],
  "huaban-6366433900": [576, 1024],
  "huaban-6384921628": [1024, 2048],
  "huaban-6485103869": [1200, 1600],
  "huaban-6524298886": [720, 1280],
  "huaban-6553923406": [1200, 1600],
  "huaban-6611068022": [736, 1308],
  "huaban-6624334273": [768, 1024],
  "huaban-6699919842": [1024, 1536],
  "huaban-6703441531": [720, 1280],
  "huaban-6735284749": [1080, 720],
  "huaban-6738588563": [768, 1344],
  "huaban-6744389287": [1200, 675],
  "huaban-6781282455": [1200, 1800],
  "huaban-6810189037": [1200, 2133],
  "huaban-6823396722": [2304, 1728],
  "huaban-6854630930": [5000, 3355],
  "huaban-6907897240": [1200, 1600],
  "huaban-6929323331": [816, 1456],
  "huaban-7047676154": [1200, 1607],
  "huaban-7118167125": [1024, 1280],
  "huaban-7147202189": [1535, 2732],
  "huaban-7156636947": [1000, 1339],
};

const fmCommonAspectRatios = [
  ["1:2", 1 / 2],
  ["9:16", 9 / 16],
  ["2:3", 2 / 3],
  ["3:4", 3 / 4],
  ["4:5", 4 / 5],
  ["1:1", 1],
  ["4:3", 4 / 3],
  ["3:2", 3 / 2],
  ["16:9", 16 / 9],
];

function getGreatestCommonDivisor(a, b) {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y) {
    const next = x % y;
    x = y;
    y = next;
  }
  return x || 1;
}

function formatFaceminiImageRatio(id) {
  const [width, height] = fmImageDimensions[id] || [];
  if (!width || !height) return "高清原图";
  const aspect = width / height;
  const nearest = fmCommonAspectRatios
    .map(([label, value]) => ({
      label,
      diff: Math.abs(aspect - value) / value,
    }))
    .sort((a, b) => a.diff - b.diff)[0];
  if (nearest && nearest.diff <= 0.025) return nearest.label;
  const divisor = getGreatestCommonDivisor(width, height);
  return `${width / divisor}:${height / divisor}`;
}

export const fmImageInspirations = [
  [
    "huaban-6006882171",
    "阳台落日独处",
    "图片灵感",
    "傍晚城市阳台视角，一位女孩坐在绿植旁看向夕阳，天空云层被暖金色日落照亮，生活方式摄影，宁静治愈氛围，细腻自然光。",
  ],
  [
    "huaban-6337337122",
    "奢侈品手机静物",
    "爆款图文",
    "银色手机从黑色菱格链条包中露出，背景是热带绿植和金黄色光影，高端奢侈品广告构图，浅景深，商业静物摄影。",
  ],
  [
    "huaban-6366433900",
    "都市动漫情侣",
    "图片灵感",
    "精致动漫情侣半身像，黑色礼服与暖色室内灯光，男生回眸、女生靠近镜头，浪漫都市氛围，细腻线稿，高级插画质感。",
  ],
  [
    "huaban-6384921628",
    "自媒体橙色街景",
    "爆款图文",
    "明亮橙粉色商业街插画，礼盒购物车、冰淇淋、热带树和促销小店，适合自媒体种草封面，轻快节日氛围，3D卡通质感。",
  ],
  [
    "huaban-6485103869",
    "手机概念广告",
    "爆款图文",
    "黑色智能手机竖立在红色岩石星球表面，碎石飞散，夕阳和深色天空形成强烈对比，科技产品广告大片，超现实商业摄影。",
  ],
  [
    "huaban-6524298886",
    "带货女主播",
    "数字人形象",
    "年轻女性主播坐在直播间展示商品，背景有服装板和课程屏幕，柔和棚拍光，清爽美妆带货风格，真实口播人物形象。",
  ],
  [
    "huaban-6553923406",
    "产品测评直播",
    "视频灵感",
    "镜头前的产品测评直播场景，前景相机和麦克风清晰可见，女性拿着护肤品讲解，室内暖光，真实自媒体拍摄氛围。",
  ],
  [
    "huaban-6611068022",
    "蓝焰动漫角色",
    "图片灵感",
    "深色动漫少年从蓝色火焰和碎片中伸手，强透视构图，高对比冷光，粒子飞散，暗黑幻想插画，电影级冲击力。",
  ],
  [
    "huaban-6624334273",
    "促销购物车海报",
    "爆款图文",
    "粉橙渐变促销海报，购物车装满优惠券、礼盒、金币和购物袋，漂浮的折扣元素，明亮电商大促视觉，适合商品活动封面。",
  ],
  [
    "huaban-6699919842",
    "彩光动漫头像",
    "图片灵感",
    "柔和彩色碎光洒在动漫少年脸上，蓝色眼睛，水彩与玻璃反光质感，清透梦幻氛围，精致二次元头像插画。",
  ],
  [
    "huaban-6703441531",
    "新闻口播主播",
    "数字人形象",
    "女性主持人站在新闻演播室，手持麦克风面对镜头微笑，背景有新闻屏幕，职业口播形象，清晰棚拍光，媒体报道风格。",
  ],
  [
    "huaban-6735284749",
    "商场购物场景",
    "视频灵感",
    "高端商场中女性拎着多只购物袋行走，暖色天花灯和玻璃橱窗反射，商业生活方式摄影，适合消费场景短视频。",
  ],
  [
    "huaban-6738588563",
    "未来感人像",
    "图片灵感",
    "未来感女性头像，透明发光护目镜，银白短发，浅蓝背景，皮肤高光通透，科技时尚人像，干净高级的AI视觉风格。",
  ],
  [
    "huaban-6744389287",
    "品牌宣传口播",
    "数字人形象",
    "戴眼镜的女性讲师在书架和补光灯前展示书本，真实直播间环境，品牌宣传和知识分享口播风格，温和专业。",
  ],
  [
    "huaban-6781282455",
    "紫色护肤品广告",
    "爆款图文",
    "紫色护肤精华瓶置于黑色岩石和水面上，紫色液体飞溅，深色高级背景，化妆品商业广告，强烈质感和品牌视觉。",
  ],
  [
    "huaban-6810189037",
    "虚拟主播购物车",
    "数字人形象",
    "卡通玩具和零食超市场景，男孩推着购物车穿过彩色货架，独角兽和玩偶漂浮，虚拟主播与带货场景结合，欢乐3D动画风。",
  ],
  [
    "huaban-6823396722",
    "母婴生活方式",
    "视频灵感",
    "明亮洗衣房内母亲陪伴宝宝，洗衣机、婴儿座椅和柔和居家光线，母婴产品种草视频场景，温馨真实。",
  ],
  [
    "huaban-6854630930",
    "活动现场直播",
    "视频灵感",
    "年轻女性站在人群和环形补光灯前做直播，现场观众围绕，真实活动记录氛围，适合达人探店、发布会和短视频封面。",
  ],
  [
    "huaban-6907897240",
    "商务会议协作",
    "爆款图文",
    "明亮会议室中团队围坐讨论方案，白板图表、笔记本电脑和自然窗光，企业品牌宣传、带货文案和商务协作场景。",
  ],
  [
    "huaban-6929323331",
    "咖啡馆生活方式",
    "视频灵感",
    "阳光穿过绿植洒进咖啡馆，女性在吧台制作饮品，咖啡机和温暖木质空间，真实生活方式摄影，适合探店短视频。",
  ],
  [
    "huaban-7047676154",
    "古风手部特写",
    "图片灵感",
    "古风人物手部特写，红线缠绕指尖，华丽织物与金色粒子光效，浅景深，东方幻想氛围，适合仙侠视觉海报。",
  ],
  [
    "huaban-7118167125",
    "舞台演出瞬间",
    "视频灵感",
    "霓虹舞台上的二次元歌手演出，动感姿态，黄色丝带与聚光灯穿插，音乐现场视觉海报，活力充沛。",
  ],
  [
    "huaban-7147202189",
    "虚拟主播直播间",
    "数字人形象",
    "蓝粉色电竞直播间，猫耳二次元虚拟主播拿着饮品坐在麦克风前，桌面设备丰富，横竖屏口播场景，赛博可爱风。",
  ],
  [
    "huaban-7156636947",
    "料理机产品摄影",
    "爆款图文",
    "厨房台面上的料理机产品摄影，水果、玻璃杯和暖色自然光，干净家居商业广告，适合电商主图和详情页视觉。",
  ],
].map(([id, title, category, prompt], index) => {
  const [width, height] = fmImageDimensions[id] || [];
  const isGeneratedImage = category === "图片灵感" || category === "爆款图文";

  return {
    id,
    title,
    category,
    prompt,
    thumbnail: faceminiAsset(`inspirations/image/thumbs/${id}.webp`),
    source: faceminiAsset(
      `inspirations/image/originals/${getFaceminiImageOriginalFile(id)}`,
    ),
    dimensions: fmImageDimensions[id],
    width,
    height,
    resolution: width && height ? `${width}×${height}` : "",
    ratio: formatFaceminiImageRatio(id),
    aspect: width && height ? width / height : "portrait",
    model: isGeneratedImage
      ? (index % 2 === 0 ? "GPT Image 2" : "Nano Banana Pro")
      : undefined,
  };
});

const officialDigitalHumanDefinitions = [
  ["dh-05", "数字人1 清妍", "生活分享、品牌展示与轻松口播。", "png", "通用口播"],
  ["dh-06", "数字人2 晚晴", "时尚发布、活动主持与质感内容。", "png", "通用口播"],
  ["dh-07", "数字人3 知夏", "亲和讲解、日常分享与实用内容。", "jpg", "通用口播"],
  ["dh-08", "数字人4 念安", "生活方式、好物分享与轻快口播。", "png", "通用口播"],
  ["dh-09", "数字人5 若溪", "潮流内容、品牌种草与短视频口播。", "jpg", "通用口播"],
  ["dh-10", "数字人6 知微", "专业讲解、知识科普与企业内容。", "png", "通用口播"],
  ["dh-11", "数字人7 星澜", "自然分享、生活美学与温柔叙述。", "png", "通用口播"],
  ["dh-12", "数字人8 语宁", "生活记录、轻松互动与氛围内容。", "png", "通用口播"],
  ["dh-13", "数字人9 可昕", "服务介绍、亲和沟通与品牌内容。", "png", "通用口播"],
  ["dh-14", "数字人10 映雪", "文化分享、艺术推荐与知性讲解。", "png", "通用口播"],
  ["dh-15", "数字人11 雅晴", "展览导览、知识分享与现场讲解。", "jpg", "通用口播"],
  ["dh-16", "数字人12 清禾", "旅行分享、生活方式与自然口播。", "jpg", "通用口播"],
  ["dh-17", "数字人13 婉柔", "品质生活、礼仪文化与优雅表达。", "jpg", "通用口播"],
  ["dh-18", "数字人14 予安", "手作分享、空间介绍与温暖叙述。", "jpg", "通用口播"],
  ["dh-19", "数字人15 书瑶", "商务介绍、品牌传播与专业表达。", "jpg", "通用口播"],
];

function getOfficialDigitalHumanAssetDirectory(avatarId) {
  return `/assets/digital-human/official-v2/${avatarId}`;
}

function getOfficialDigitalHumanViews(assetDirectory) {
  return [
    { type: "front", label: "正视图", url: `${assetDirectory}/views/front.png` },
    { type: "side", label: "侧视图", url: `${assetDirectory}/views/side.png` },
    { type: "back", label: "背视图", url: `${assetDirectory}/views/back.png` },
    { type: "face", label: "面部图", url: `${assetDirectory}/views/face.png` },
  ];
}

export const fmDigitalHumanInspirations = officialDigitalHumanDefinitions.map(
  ([avatarId, title, prompt, referenceExtension, category]) => {
    const assetDirectory = getOfficialDigitalHumanAssetDirectory(avatarId);
    return {
      id: `digital-human-official-${avatarId}`,
      avatarId: `official-${avatarId}`,
      title,
      category: "数字人形象",
      prompt,
      thumbnail: `${assetDirectory}/poster.jpg`,
      poster: `${assetDirectory}/poster.jpg`,
      source: `${assetDirectory}/preview.mp4`,
      videoSrc: `${assetDirectory}/preview.mp4`,
      referenceImage: `${assetDirectory}/reference-front.${referenceExtension}`,
      views: getOfficialDigitalHumanViews(assetDirectory),
      tags: [category, "中文口播"],
      ratio: "4s",
      model: "MiniMax-H3",
      material: "数字人视频",
      aspect: "portrait",
    };
  },
);

export const digitalHumanOfficialAvatarFallbacks = fmDigitalHumanInspirations.map(
  (item) => ({
    id: item.avatarId,
    name: item.title,
    description: `适合${item.title}类数字人口播、讲解与短视频内容`,
    language: "中文 / 通用",
    status: "ready",
    tags: item.tags,
    cover: item.source,
    assetPath: item.source,
    poster: item.poster,
    referenceImage: item.referenceImage,
    views: item.views,
  }),
);

export const fmCreationScenes = [
  [
    "自媒体创作",
    "脚本、种草、朋友圈文案一键生成",
    "creation/scenes/self-media.jpg",
    ["小红书", "抖音", "朋友圈"],
    "article",
    "进入自媒体文案",
  ],
  [
    "电商美工",
    "主图、海报、详情页视觉快速出图",
    "creation/scenes/ecommerce-design.jpg",
    ["淘宝", "京东", "拼多多"],
    "image",
    "进入图片生成",
  ],
  [
    "虚拟主播",
    "选形象配音色，口型自然对口播",
    "creation/scenes/virtual-anchor.jpg",
    ["抖音", "淘宝直播", "视频号"],
    "digital-human",
    "进入数字人形象",
  ],
  [
    "文案带货",
    "标题、标语、带货话术智能撰写",
    "creation/scenes/copy-selling.jpg",
    ["淘宝", "抖音", "小红书"],
    "article",
    "进入带货文案",
  ],
  [
    "品牌宣传",
    "海报文案物料，一站式制作",
    "creation/scenes/brand-promo.jpg",
    ["公众号", "抖音", "品牌私域"],
    "article",
    "进入品牌宣传",
  ],
  [
    "母婴种草",
    "育儿干货、好物测评、宝宝文案",
    "creation/scenes/mom-baby.jpg",
    ["小红书", "抖音", "宝宝树"],
    "article",
    "进入母婴种草",
  ],
];

export const getCreationSceneImage = (image) =>
  image.includes("/")
    ? faceminiAsset(image)
    : faceminiAsset(`inspirations/image/thumbs/${image}.webp`);

export function getCreationCenterInspirations(activeTab, videoInspirations = []) {
  switch (activeTab) {
    case "图片灵感":
      return fmImageGenerationInspirations;
    case "视频灵感":
      return videoInspirations;
    case "数字人形象":
      return fmDigitalHumanInspirations;
    default:
      return fmImageInspirations.filter((item) => item.category === activeTab);
  }
}

const fmInspirationCategoryRouteMap = {
  图片灵感: { feature: "image", target: "image", model: "GPT Image 2" },
  视频灵感: { feature: "video", target: "video", model: "Kling Video" },
  数字人形象: {
    feature: "digital-human",
    target: "digital-human",
    model: "Digital Human",
  },
  爆款图文: { feature: "article", target: "article", model: "AI 图文" },
};

export function getFaceminiInspirationRoute(item) {
  if (item?.feature === "article") {
    return fmInspirationCategoryRouteMap["爆款图文"];
  }
  if (item?.avatarId || item?.feature === "digital-human") {
    return fmInspirationCategoryRouteMap["数字人形象"];
  }
  if (
    item?.mediaType === "video" ||
    item?.isVideo ||
    item?.video ||
    item?.videoSrc ||
    item?.videoUrl ||
    item?.feature === "video"
  ) {
    return fmInspirationCategoryRouteMap["视频灵感"];
  }
  return (
    fmInspirationCategoryRouteMap[item?.category] ||
    fmInspirationCategoryRouteMap["图片灵感"]
  );
}

export function resolveFaceminiInspirationImageUrl(item) {
  if (!item) return "";
  if (
    item.mediaType === "video" ||
    item.isVideo ||
    item.video ||
    item.videoSrc ||
    item.videoUrl
  ) {
    return item.poster || item.thumbnail || item.cover || item.image || "";
  }
  return (
    item.hdSrc ||
    item.imageUrl ||
    item.image ||
    item.source ||
    item.poster ||
    item.thumbnail ||
    item.src ||
    ""
  );
}

export const videoInspirationCategoryTabs = [
  { id: "all", label: "全部" },
  { id: "tvc", label: "TVC 广告", folder: "TVC-gg" },
  { id: "live-commerce", label: "AI 真人带货", folder: "AI-zrdh" },
  { id: "live-drama", label: "AI 真人短剧", folder: "AI-zrdj" },
  { id: "comic-drama", label: "AI 漫剧", folder: "AI-mj" },
  { id: "creative", label: "AI 创作视频", folder: "AI-czsp" },
  { id: "promo", label: "宣传类视频", folder: "XCL-sp" },
];

const videoInspirationFolderSlugs = {
  "TVC-gg": [
    "axiom-visual-concept-ad",
    "camera",
    "car-ad",
    "car-visual-concept-ad",
    "chagee-visual-concept-ad",
    "massage-device",
    "medical-ultrasound-device-1",
    "smartphone-4",
  ],
  "AI-zrdh": ["cola", "golden-pomelo-1", "golden-pomelo-2"],
  "AI-zrdj": [
    "boxing-king-returns",
    "costume-drama",
    "fallen-god",
    "former-king",
    "tenth-freezer",
  ],
  "AI-mj": [
    "ai-3d-animation",
    "ai-3d-bleach-vs-naruto",
    "isekai-demon-king",
    "tianmen-weihe",
    "yongyeti",
  ],
  "AI-czsp": [
    "3a-game-style-remake-1",
    "3a-game-style-remake-2",
    "live-action-yuelin-qiji-remake",
    "mecha-transformation-1",
    "mecha-transformation-2",
    "mecha-transformation-3",
    "mecha-transformation-4",
    "yuelin-qiji-3d-remake",
    "zhang-xue-motorcycle-remake",
  ],
  "XCL-sp": ["wuhan-cherry-blossom-season"],
};

const videoInspirationMetadata = [
  [
    "3a-game-style-remake-1",
    "3A 游戏风格重制",
    "3A 游戏宣传片质感，废墟战场中一名原创英雄角色持武器向前穿行，脚下碎石震动，远处火光和断壁残垣若隐若现。镜头从低角度贴地推进，随后环绕到人物侧后方，捕捉披风、装甲划痕和武器高光。空气中有火星、烟尘、体积光和轻微镜头抖动，画面高对比、写实渲染、动作张力强。5 秒内完成远景到近景的叙事递进，保持人物动作连贯、面部不崩坏、无字幕水印，避免卡通化和廉价特效。",
  ],
  [
    "3a-game-style-remake-2",
    "3A 游戏动作场景",
    "高规格 3A 游戏动作过场，原创主角在未来城市街区高速奔跑，穿过雨雾、广告灯牌和金属天桥，身后有追击者或无人机灯光逼近。镜头先贴身跟拍肩背和脚步，再切到侧面运动镜头展现冲刺速度，最后快速推向角色坚定表情。霓虹反射、湿润地面、动态模糊和风压细节清晰，节奏紧凑、电影感强。动作要一镜到底般流畅，人物比例稳定，背景有纵深，避免画面杂乱、文字标识和过度抖动。",
  ],
  [
    "ai-3d-animation",
    "AI 3D 动画",
    "高质量 3D 动画短片，深色纯净空间中，一个抽象发光能量核心缓慢旋转并向外展开，半透明光线丝带像流体一样缠绕、分裂、重组。镜头从远景平滑推进到能量核心，再轻微环绕展示立体结构和光影层次。材质应干净高级，有玻璃、雾化光、粒子尘埃和柔和辉光，整体科技感、未来感、秩序感强。运动节奏优雅克制，循环感自然，光线不过曝，边缘细节锐利，避免出现人物、文字或杂乱背景。",
  ],
  [
    "ai-3d-bleach-vs-naruto",
    "热血动漫对战",
    "热血日漫战斗短片，两名原创动漫战士在破碎竞技场或废墟街区高速交锋，一人持刀释放蓝白刀光，另一人以拳风和能量护盾反击。镜头快速推拉、横移、定格，捕捉冲刺、格挡、爆发和烟尘翻涌的瞬间。画面有夸张透视、速度线、碎石飞散和强烈冲击波，色彩鲜明。角色设计要原创，动作清楚有起承转合，保留日漫热血张力，不要出现真实动漫 IP 标志、角色姓名、字幕或可识别版权元素。",
  ],
  [
    "axiom-visual-concept-ad",
    "科技概念广告",
    "高端科技概念广告，未来感智能设备或精密终端在黑色无尘背景中悬浮旋转，产品轮廓简洁，金属、玻璃和陶瓷材质边缘被细窄光带依次扫亮。镜头从暗场中慢速推近，先展示整体剪影，再切到接口、纹理、曲面高光和微小结构。节奏高级克制，光效冷静、空间留白充足，突出精密、奢华、未来品牌气质。产品始终居中清晰，反射真实，镜头运动稳定，避免花哨 UI、多余文字和廉价塑料感。",
  ],
  [
    "boxing-king-returns",
    "拳王归来",
    "真人短剧预告片质感，退役拳王从黑暗选手通道走向擂台中央，双拳缠着绷带，肩背肌肉和旧伤细节清晰。观众席虚化欢呼，聚光灯逐盏亮起，空气中漂浮粉尘和汗水。镜头先拍背影和脚步，再低角度推进到擂台绳，最后切到坚定面部特写。整体有慢动作、强反差光、热血回归氛围，突出力量、尊严和逆袭感。人物表情真实，拳台空间明确，动作不夸张变形，避免夸张血腥和卡通化打斗。",
  ],
  [
    "camera",
    "相机产品片",
    "专业相机产品广告，暗色摄影棚中相机机身与镜头组件悬浮分层展开，随后以精密机械感缓慢合拢。镜头微距展示玻璃镀膜反射、金属旋钮、镜头刻度、快门按钮、机身皮革纹理和卡口结构。光线采用黑金色调，边缘高光细腻，背景干净无杂物。运镜从产品正面推到镜头内部，再环绕机身侧面，突出专业、精密、可靠的商业质感。产品比例真实，材质锐利，避免品牌乱码、镜头畸形和多余手部入镜。",
  ],
  [
    "car-ad",
    "汽车广告",
    "高端汽车城市夜景广告，一辆豪华轿跑在雨后高架道路和隧道之间疾驰，湿润路面反射霓虹灯、车灯和城市天际线。镜头先贴近旋转轮毂与水花，再滑向车身流线、前灯、尾灯和车标位置，随后高速跟拍车辆转弯。画面要有速度感、稳定商业摄影、冷暖光对比和高级金属漆质感。车辆始终清晰完整，转弯轨迹自然，路面反射真实，避免拥堵交通、事故画面、杂乱车流和变形车身。",
  ],
  [
    "car-visual-concept-ad",
    "汽车视觉概念片",
    "未来概念车视觉大片，概念车从黑色暗场和几何灯阵中缓慢驶出，低矮车身、封闭式格栅、发光轮毂和流线型车顶逐渐显现。蓝白光轨沿车身轮廓划过，镜面地面反射车灯和车底光效。摄影机从车头低角度推进，再环绕侧面和尾部，展示科技豪华风、未来设计语言和品牌发布会质感。画面干净无杂物，车身结构合理，光轨贴合轮廓，避免普通家用车外观、夸张翅膀和文字 Logo。",
  ],
  [
    "chagee-visual-concept-ad",
    "茶饮视觉广告",
    "新中式茶饮视觉广告，浅色高级台面上放置透明茶杯，茶汤、冰块、茶叶、奶盖或水果切片在空中慢动作飞溅并优雅回落。清透自然光穿过琥珀色液体，杯壁水珠和茶叶纹理清晰可见。镜头从杯口微距推进到液体旋涡，再切到整体产品陈列，画面干净、清爽、东方雅致，适合茶饮品牌大片。液体运动要真实细腻，杯体不变形，避免脏乱桌面、文字乱码和夸张卡通效果。",
  ],
  [
    "cola",
    "可乐广告",
    "AI 真人带货风格的可乐短视频，明亮夏日场景中，冰镇可乐罐从水花和冰块中弹出，拉环打开瞬间气泡喷涌，罐身红色包装、凝结水珠和冰块反光清晰可见。年轻主播手持产品入镜，微笑展示罐身并做出畅饮动作。镜头先给产品冲击特写，再切到主播半身和清爽背景，节奏明快、食欲感强。人物手指自然、罐体比例稳定，突出冰爽口感，避免真实品牌文字变形和画面油腻。",
  ],
  [
    "costume-drama",
    "古装剧情",
    "真人古装短剧情镜头，华丽宫殿长廊中，一位古装人物在暖色灯火和窗棂光影下缓步转身，衣袂、发饰和垂坠玉佩随风轻动。镜头从远处对称构图推进到中景，再切到眼神和手部动作特写，暗示重要剧情转折。光线柔和有逆光轮廓，色调典雅，东方影视剧质感强，人物表情克制含蓄。保持服饰纹样精致、步伐连贯、脸部稳定，避免现代物品、现代妆容和过度滤镜。",
  ],
  [
    "fallen-god",
    "坠落神明",
    "暗黑奇幻真人短剧预告，乌云撕裂的天空中，受伤神明或天使般人物缓慢坠落，破碎羽翼、金色光尘和黑色烟雾向四周散开。地面有渺小人物抬头仰望，残破神殿和裂开的石柱增强尺度。镜头先仰拍天空，再慢动作跟随坠落轨迹，最后落到地面震起尘浪。整体史诗、悲壮、压迫感强。光尘和羽翼碎片要有层次，人物姿态优雅，避免血腥细节、恐怖尸体和廉价奇幻特效。",
  ],
  [
    "former-king",
    "昔日王者",
    "暗黑奇幻王者归来短剧，废墟荒原上阴云密布，血色残阳压低天际，昔日王者身披破损黑金披风站在古坟和断旗之间。无数锈剑从地底、裂石和残墙中破土而出，黑金色剑气撕裂长空，尘土和碎石向外扩散。镜头从远景展示荒原规模，再低角度环绕人物，最后定格在冷峻眼神。氛围压抑、史诗、复仇感强。剑阵数量密集但不杂乱，人物居中稳定，避免血腥尸体和现代道具。",
  ],
  [
    "golden-pomelo-1",
    "金柚产品片",
    "AI 真人带货产品展示，明亮果园或清爽厨房场景中，主播手持金柚靠近镜头，切开的柚子果肉晶莹饱满，果汁水珠在阳光下闪亮。镜头先拍完整金柚外皮纹理，再切到剥开的果瓣、果肉纤维和轻轻挤压出的汁水，清澈水花与绿叶慢动作掠过。画面清新明亮，突出新鲜、多汁、香甜、可口。主播动作自然，果肉颜色真实诱人，避免干瘪果肉、脏乱背景和夸张虚假包装。",
  ],
  [
    "golden-pomelo-2",
    "金柚饮品广告",
    "金柚饮品带货广告，透明杯中金黄色饮品、柚子切片、气泡、冰块和薄荷叶层次分明，杯壁凝结水珠。主播从清爽桌面拿起饮品递向镜头，轻轻摇晃后气泡上升，柚子果粒随液体流动。镜头微距捕捉冰块碰撞、果肉透光和杯口水汽，再切到主播品尝表情。整体清爽高级、适合短视频电商展示。饮品色泽通透，杯体稳定不变形，避免颜色浑浊、文字乱码和廉价塑料杯感。",
  ],
  [
    "isekai-demon-king",
    "异世界魔王",
    "异世界漫剧风格，原创魔王角色在巨大黑石城堡前登场，天空布满紫黑雷云，脚下古老魔法阵逐圈亮起。角色披风翻飞，角冠、铠甲、权杖和红色眼光细节突出，紫黑能量从地面向外涌动。镜头先低角度仰拍城堡和角色剪影，再环绕到正面特写，营造强烈压迫感。画面为二次元厚涂质感，色彩暗黑但主体清晰。角色原创度高，动作威严缓慢，避免真实 IP、字幕和现代元素。",
  ],
  [
    "live-action-yuelin-qiji-remake",
    "真人奇迹重制",
    "真人奇幻重制短片，年轻角色站在神秘森林深处的月光光束中，周围有发光植物、蓝绿色薄雾、漂浮萤光和古老石碑。角色缓慢抬头，伸手触碰空中的金色魔法粒子，光点沿手臂扩散。镜头从背影平稳推进到侧脸，再轻微上摇展示树冠与月光。氛围梦幻、安静、带探索感和奇迹感。人物服装自然、有冒险气质，魔法光效柔和真实，避免恐怖森林、低清噪点和过度曝光。",
  ],
  [
    "massage-device",
    "按摩仪广告",
    "智能按摩仪产品广告，温暖整洁的家居或办公室场景中，产品被放在沙发、桌面或使用者肩颈处。镜头依次展示贴合人体的佩戴方式、震动或热敷灯效、按键反馈、柔软材质纹理和使用者放松表情。光线柔和暖色，背景浅景深，节奏舒缓。突出放松、便携、科技护理和品质生活。产品外观高级，人体动作自然，使用场景可信，避免医疗夸大、疼痛表情、杂乱家居和低端塑料感。",
  ],
  [
    "mecha-transformation-1",
    "机甲变形 01",
    "科幻机甲变形特写，暗色工业空间中，悬浮机甲组件从四周高速飞入并精准组装，金属外壳闭合、齿轮咬合、液压杆伸展、装甲片逐层覆盖。蓝色能量线从胸口核心向四肢逐段点亮，细小火花和蒸汽从缝隙喷出。镜头在微距机械细节和半身全貌之间快速切换，节奏硬核、有重量感。机械结构要合理连续，金属划痕真实，避免塑料玩具质感、卡通变形和零件穿模。",
  ],
  [
    "mecha-transformation-2",
    "机甲变形 02",
    "巨大机甲从城市废墟地面缓缓站起，沉重脚掌压碎地面，机械臂展开并锁定，肩部装甲滑开露出能量核心。脚下尘土、碎石和金属残片被震起，远处高楼残影、警示灯和浓烟营造灾后战场。镜头采用低角度广角仰拍，先展示人物在前景的渺小，再推向机甲全身。整体震撼科幻大片感，强调尺度、重量和机械威压。动作缓慢有压迫感，机甲比例稳定，避免玩具化、穿模和过度烟雾遮挡。",
  ],
  [
    "mecha-transformation-3",
    "机甲变形 03",
    "机甲战士在蓝白光雨和能量风暴中完成变形，角色站立不动，装甲片从肩部、胸甲、手臂、腿部层层覆盖并锁定。胸口能量核心点亮的一瞬间释放环形冲击波，雨滴、粒子和碎屑向外扩散。镜头从半身中景推进到眼部发光特写，再快速拉远展示完整机甲姿态。画面冷峻、强光对比、动作清晰。装甲拼接要连贯，人物轮廓不丢失，避免模糊变形、过度闪烁和面部崩坏。",
  ],
  [
    "mecha-transformation-4",
    "机甲变形 04",
    "紧凑型机甲变形微距镜头，画面聚焦机械内部结构，螺栓旋紧、滑轨推进、齿轮咬合、装甲缝隙闭合、能量管线依次锁定。冷色调工业灯光从侧面扫过，金属划痕、油膜、细小灰尘和蒸汽清晰可见。镜头缓慢横移并在关键结构上短暂停留，背景简洁深色，突出硬核机械质感、精密制造和真实重量。运动要像真实机械装配，避免玩具化、零件漂浮和花哨光污染。",
  ],
  [
    "medical-ultrasound-device-1",
    "医疗超声设备",
    "医疗超声设备商业展示，洁净明亮的诊疗室或实验室中，一台现代超声设备缓慢旋转展示，白色机身、高清屏幕、探头、推车轮、按键面板和线缆收纳细节清楚。屏幕上显示抽象医学波形、扫描界面和数据流动，不出现真实隐私信息。镜头从整机推到探头和屏幕特写，光线专业干净，氛围可信、科技、医疗级。设备比例准确，场景无杂物，避免血腥画面、患者隐私和夸大治疗效果。",
  ],
  [
    "smartphone-4",
    "手机产品片",
    "智能手机新品发布片，手机在黑色高级背景中悬浮旋转，超窄边框、背部镜头模组、金属中框、玻璃背板和按键结构被高光依次扫过。屏幕出现流动光效和抽象壁纸，不展示具体应用文字。镜头从整机剪影推到镜头模组微距，再滑过边框和屏幕弧面，最后回到正面悬浮定格。科技感、轻薄感、高级质感突出。手机结构要真实对称，边框锐利，避免指纹污渍、变形镜头和廉价塑料质感。",
  ],
  [
    "tenth-freezer",
    "太平间冷藏柜",
    "悬疑短剧场景，昏暗太平间走廊内一排不锈钢遗体冷藏柜沿墙排列，每个柜门有小标签、金属把手和冷硬反光，地面略微潮湿。冷蓝色荧光灯闪烁，空气中有轻微冷雾，空间安静压抑。镜头从走廊远端缓慢横移推进，掠过一扇扇柜门，最后停在半开的柜门前，但不要出现尸体特写。画面应冷峻、真实、悬疑，明确不要生成超市冰柜、食品陈列、商用冷柜广告或温馨厨房。",
  ],
  [
    "tianmen-weihe",
    "天门奇景",
    "东方奇幻漫剧场景，巍峨天门矗立在峡谷与云海之间，石壁上有古老纹路和悬空栈道，远处河流蜿蜒穿过群山。清晨阳光切开云雾，飞鸟从山门前掠过，云海缓慢翻涌。镜头先在高空穿越云层，再俯冲靠近天门，最后从门洞中穿过展示辽阔山河。画面宏大、仙侠、东方奇观感强。山体尺度要震撼，云雾层次自然，避免现代建筑、文字招牌和灰暗低清画质。",
  ],
  [
    "wuhan-cherry-blossom-season",
    "武汉樱花季",
    "武汉樱花季城市宣传片，春日樱花大道盛放，粉白花瓣随风飘落，游客、学生或市民在树下拍照、漫步、骑行。远处可见城市建筑、校园道路、湖面或具有武汉气质的街景轮廓。镜头从低处花瓣特写开始，平稳穿行在人群与樱花之间，再抬升展示整条樱花路。整体温柔明亮、纪录片质感、地域宣传氛围。人物自然不抢戏，花瓣运动轻盈，避免拥挤混乱、商业广告牌抢眼和过度美颜。",
  ],
  [
    "yongyeti",
    "雪域巨兽",
    "雪域奇幻漫剧镜头，雪山深处一只巨大雪域巨兽从冰层和暴风雪中苏醒，厚重白色毛发、冰晶覆盖的角、呼出的白雾和沉重爪印清晰可见。前景有探险者或小队身影显得非常渺小，冰雪被巨兽动作震起飞溅。镜头低角度广角仰拍，先展示脚掌和雪尘，再拉到巨兽全貌。冷色调、冒险感、压迫感强。巨兽动作缓慢沉重，毛发和雪粒真实，避免可爱宠物化、血腥攻击和比例忽大忽小。",
  ],
  [
    "yuelin-qiji-3d-remake",
    "月林奇迹 3D",
    "3D 奇幻森林动画，月光从高大树冠间洒落，蓝紫色薄雾在地面流动，角色穿过发光蘑菇、透明花瓣、古老树根和漂浮萤光粒子。镜头平滑跟随角色脚步向前探索，偶尔低角度掠过植物微光，再推到前方神秘光源。材质柔和、色彩梦幻、空间层次清晰，营造纯净童话和奇迹感。角色动作轻盈，植物发光不过曝，避免恐怖风格、写实脏乱、低清噪点和画面空洞。",
  ],
  [
    "zhang-xue-motorcycle-remake",
    "摩托车重制",
    "真人电影感摩托车短片，人物戴头盔骑摩托穿越雨夜城市街道，前灯划破水雾，雨水从头盔、皮衣和车身线条上滑落，湿润路面反射路灯和霓虹。镜头先贴地跟拍车轮溅起水花，再侧面追随车辆加速，最后切到背影驶向远处隧道或街口。都市冷色调、速度感与孤独感并存，画面稳定高级。骑行动作安全自然，车辆比例真实，避免危险事故、杂乱车流和廉价短视频滤镜。",
  ],
];

const videoInspirationMetadataMap = new Map(
  videoInspirationMetadata.map(([slug, title, prompt]) => [
    slug,
    { title, prompt },
  ]),
);

const videoInspirationPromptQualitySuffix =
  "镜头运动平滑，主体始终清晰，光影和材质真实，无水印、无乱码、无畸形肢体、无画面闪烁、无噪点、无主体漂移。";

const videoInspirationAspectMeta = {
  "3a-game-style-remake-1": { ratio: "16:9", aspect: 720 / 406 },
  "3a-game-style-remake-2": { ratio: "16:9", aspect: 720 / 406 },
  "ai-3d-animation": { ratio: "16:9", aspect: 720 / 406 },
  "ai-3d-bleach-vs-naruto": { ratio: "16:9", aspect: 720 / 406 },
  "axiom-visual-concept-ad": { ratio: "16:9", aspect: 720 / 406 },
  "boxing-king-returns": { ratio: "16:9", aspect: 720 / 406 },
  camera: { ratio: "16:9", aspect: 720 / 406 },
  "car-ad": { ratio: "16:9", aspect: 720 / 406 },
  "car-visual-concept-ad": { ratio: "16:9", aspect: 720 / 406 },
  "chagee-visual-concept-ad": { ratio: "16:9", aspect: 720 / 406 },
  cola: { ratio: "9:16", aspect: 720 / 1280 },
  "costume-drama": { ratio: "9:16", aspect: 720 / 1280 },
  "fallen-god": { ratio: "9:16", aspect: 720 / 1280 },
  "former-king": { ratio: "16:9", aspect: 720 / 406 },
  "golden-pomelo-1": { ratio: "9:16", aspect: 720 / 1280 },
  "golden-pomelo-2": { ratio: "9:16", aspect: 720 / 1280 },
  "isekai-demon-king": { ratio: "16:9", aspect: 720 / 406 },
  "live-action-yuelin-qiji-remake": { ratio: "16:9", aspect: 720 / 406 },
  "massage-device": { ratio: "16:9", aspect: 720 / 406 },
  "mecha-transformation-1": { ratio: "16:9", aspect: 720 / 406 },
  "mecha-transformation-2": { ratio: "16:9", aspect: 720 / 406 },
  "mecha-transformation-3": { ratio: "16:9", aspect: 720 / 406 },
  "mecha-transformation-4": { ratio: "16:9", aspect: 720 / 406 },
  "medical-ultrasound-device-1": { ratio: "16:9", aspect: 720 / 406 },
  "smartphone-4": { ratio: "16:9", aspect: 720 / 406 },
  "tenth-freezer": { ratio: "9:16", aspect: 720 / 1280 },
  "tianmen-weihe": { ratio: "16:9", aspect: 720 / 406 },
  "wuhan-cherry-blossom-season": { ratio: "16:9", aspect: 720 / 406 },
  yongyeti: { ratio: "16:9", aspect: 720 / 406 },
  "yuelin-qiji-3d-remake": { ratio: "16:9", aspect: 720 / 406 },
  "zhang-xue-motorcycle-remake": { ratio: "16:9", aspect: 720 / 406 },
};

export const videoInspirationItems = videoInspirationCategoryTabs
  .filter((category) => category.id !== "all")
  .flatMap((category) =>
    (videoInspirationFolderSlugs[category.folder] || []).map((slug) => {
      const metadata = videoInspirationMetadataMap.get(slug) || {};
      const aspectMeta = videoInspirationAspectMeta[slug] || {
        ratio: "16:9",
        aspect: 16 / 9,
      };
      const title = metadata.title || slug;
      const prompt = metadata.prompt
        ? `${metadata.prompt}${videoInspirationPromptQualitySuffix}`
        : title;
      return {
        id: `video-inspiration-${category.id}-${slug}`,
        slug,
        title,
        prompt,
        model: "Seedance 2.0",
        feature: category.label,
        categoryId: category.id,
        category: category.label,
        folder: category.folder,
        ratio: aspectMeta.ratio,
        aspect: aspectMeta.aspect,
        duration: 5,
        video: `${staticAsset(`assets/videoInspiration/${category.folder}/${slug}.webm`)}?v=20260623`,
        videoFallbackSrc: `${staticAsset(`assets/videoInspiration/${category.folder}/${slug}.mp4`)}?v=20260623`,
        preview: `${staticAsset(`assets/videoInspiration/previews/${slug}-preview.webm`)}?v=20260613`,
        poster: `${staticAsset(`assets/videoInspiration/posters/${slug}.jpg`)}?v=20260613`,
      };
    }),
  );

export function getFaceminiVideoInspirations() {
  return videoInspirationItems.map((item) => ({
    ...item,
    id: `creation-${item.id}`,
    category: "视频灵感",
    thumbnail: item.poster,
    source: item.video,
    videoSrc: item.video,
    material: "视频素材",
    aspect: item.aspect,
  }));
}
