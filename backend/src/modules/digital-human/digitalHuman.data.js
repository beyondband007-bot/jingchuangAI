export const digitalHumanModels = [
  {
    value: "seedance-2-0-digital-human",
    label: "Seedance 2.0 数字人",
    provider: "ark",
    basePoints: 30,
    configured: false
  }
];

const officialAvatarAssetRoot = "/assets/digital-human/official-v2";

function createOfficialAvatar({ id, name, description, referenceExtension, category }) {
  const assetDirectory = `${officialAvatarAssetRoot}/${id}`;
  return {
    id: `official-${id}`,
    name,
    description,
    language: "中文 / 通用",
    status: "ready",
    category,
    tags: [category, "中文口播"],
    cover: `${assetDirectory}/preview.mp4`,
    assetPath: `${assetDirectory}/preview.mp4`,
    poster: `${assetDirectory}/poster.jpg`,
    referenceImage: `${assetDirectory}/reference-front.${referenceExtension}`,
    views: [
      { type: "front", label: "正视图", url: `${assetDirectory}/views/front.png` },
      { type: "side", label: "侧视图", url: `${assetDirectory}/views/side.png` },
      { type: "back", label: "背视图", url: `${assetDirectory}/views/back.png` },
      { type: "face", label: "面部图", url: `${assetDirectory}/views/face.png` }
    ]
  };
}

export const publicAvatars = [
  createOfficialAvatar({ id: "dh-05", name: "数字人1 清妍", description: "适合生活分享、品牌展示与轻松口播", referenceExtension: "png", category: "通用口播" }),
  createOfficialAvatar({ id: "dh-06", name: "数字人2 晚晴", description: "适合时尚发布、活动主持与质感内容", referenceExtension: "png", category: "通用口播" }),
  createOfficialAvatar({ id: "dh-07", name: "数字人3 知夏", description: "适合亲和讲解、日常分享与实用内容", referenceExtension: "jpg", category: "通用口播" }),
  createOfficialAvatar({ id: "dh-08", name: "数字人4 念安", description: "适合生活方式、好物分享与轻快口播", referenceExtension: "png", category: "通用口播" }),
  createOfficialAvatar({ id: "dh-09", name: "数字人5 若溪", description: "适合潮流内容、品牌种草与短视频口播", referenceExtension: "jpg", category: "通用口播" }),
  createOfficialAvatar({ id: "dh-10", name: "数字人6 知微", description: "适合专业讲解、知识科普与企业内容", referenceExtension: "png", category: "通用口播" }),
  createOfficialAvatar({ id: "dh-11", name: "数字人7 星澜", description: "适合自然分享、生活美学与温柔叙述", referenceExtension: "png", category: "通用口播" }),
  createOfficialAvatar({ id: "dh-12", name: "数字人8 语宁", description: "适合生活记录、轻松互动与氛围内容", referenceExtension: "png", category: "通用口播" }),
  createOfficialAvatar({ id: "dh-13", name: "数字人9 可昕", description: "适合服务介绍、亲和沟通与品牌内容", referenceExtension: "png", category: "通用口播" }),
  createOfficialAvatar({ id: "dh-14", name: "数字人10 映雪", description: "适合文化分享、艺术推荐与知性讲解", referenceExtension: "png", category: "通用口播" }),
  createOfficialAvatar({ id: "dh-15", name: "数字人11 雅晴", description: "适合展览导览、知识分享与现场讲解", referenceExtension: "jpg", category: "通用口播" }),
  createOfficialAvatar({ id: "dh-16", name: "数字人12 清禾", description: "适合旅行分享、生活方式与自然口播", referenceExtension: "jpg", category: "通用口播" }),
  createOfficialAvatar({ id: "dh-17", name: "数字人13 婉柔", description: "适合品质生活、礼仪文化与优雅表达", referenceExtension: "jpg", category: "通用口播" }),
  createOfficialAvatar({ id: "dh-18", name: "数字人14 予安", description: "适合手作分享、空间介绍与温暖叙述", referenceExtension: "jpg", category: "通用口播" }),
  createOfficialAvatar({ id: "dh-19", name: "数字人15 书瑶", description: "适合商务介绍、品牌传播与专业表达", referenceExtension: "jpg", category: "通用口播" })
];

export const voices = [
  {
    id: "female-shaonv",
    providerVoiceId: "Chinese (Mandarin)_Warm_Girl",
    name: "萝莉音",
    description: "甜美、轻快、年轻感强，适合少儿内容和活泼口播",
    language: "中文普通话",
    sampleUrl: ""
  },
  {
    id: "female-yujie",
    providerVoiceId: "Chinese (Mandarin)_Mature_Woman",
    name: "御姐音",
    description: "成熟、自信、有气场，适合品牌介绍和时尚内容",
    language: "中文普通话",
    sampleUrl: ""
  },
  {
    id: "female-tianmei",
    providerVoiceId: "Chinese (Mandarin)_Sweet_Lady",
    name: "甜美女生",
    description: "明亮、亲切、感染力强，适合种草和短视频口播",
    language: "中文普通话",
    sampleUrl: ""
  },
  {
    id: "female-qn-qingse",
    providerVoiceId: "Chinese (Mandarin)_Soft_Girl",
    name: "温柔女生",
    description: "柔和、清澈、自然，适合课程讲解和生活方式内容",
    language: "中文普通话",
    sampleUrl: ""
  },
  {
    id: "female-chengshu",
    providerVoiceId: "Chinese (Mandarin)_News_Anchor",
    name: "新闻女声",
    description: "清晰、稳定、适合正式讲解",
    language: "中文普通话",
    sampleUrl: ""
  },
  {
    id: "presenter_female",
    providerVoiceId: "Chinese (Mandarin)_News_Anchor",
    name: "专业女主播",
    description: "标准、稳重、播报感强，适合新闻和政企内容",
    language: "中文普通话",
    sampleUrl: ""
  },
  {
    id: "Chinese (Mandarin)_HK_Flight_Attendant",
    name: "亲和服务声",
    description: "清楚、礼貌、服务感强，适合导览和介绍",
    language: "中文普通话",
    sampleUrl: ""
  },
  {
    id: "moss_audio_ce44fc67-7ce3-11f0-8de5-96e35d26fb85",
    providerVoiceId: "Chinese (Mandarin)_Sincere_Adult",
    name: "自然中文声 A",
    description: "MiniMax 最新中文系统音色，适合自然口播",
    language: "中文普通话",
    sampleUrl: ""
  },
  {
    id: "moss_audio_aaa1346a-7ce7-11f0-8e61-2e6e3c7ee85d",
    providerVoiceId: "Chinese (Mandarin)_Radio_Host",
    name: "自然中文声 B",
    description: "MiniMax 最新中文系统音色，适合讲解和短视频",
    language: "中文普通话",
    sampleUrl: ""
  },
  {
    id: "male-qn-jingying",
    providerVoiceId: "Chinese (Mandarin)_Gentleman",
    name: "沉稳男生",
    description: "低沉、可信、适合企业介绍",
    language: "中文普通话",
    sampleUrl: ""
  },
  {
    id: "male-qn-qingse",
    providerVoiceId: "Chinese (Mandarin)_Gentle_Youth",
    name: "清爽男生",
    description: "年轻、干净、语气自然，适合知识分享和轻商务内容",
    language: "中文普通话",
    sampleUrl: ""
  },
  {
    id: "male-qn-badao",
    providerVoiceId: "Chinese (Mandarin)_Unrestrained_Young_Man",
    name: "磁性男声",
    description: "低频、厚实、有力量感，适合广告和品牌大片旁白",
    language: "中文普通话",
    sampleUrl: ""
  },
  {
    id: "presenter_male",
    providerVoiceId: "Chinese (Mandarin)_Male_Announcer",
    name: "专业男主播",
    description: "端正、清晰、权威，适合新闻播报和活动串词",
    language: "中文普通话",
    sampleUrl: ""
  },
  {
    id: "audiobook_male_1",
    providerVoiceId: "Chinese (Mandarin)_Radio_Host",
    name: "纪录片旁白",
    description: "沉着、叙事感强，适合科普、财经和纪录片风格口播",
    language: "中文普通话",
    sampleUrl: ""
  },
  {
    id: "clever_boy",
    providerVoiceId: "Chinese (Mandarin)_Pure-hearted_Boy",
    name: "少年音",
    description: "清亮、灵动、少年感，适合校园、动漫和少儿内容",
    language: "中文普通话",
    sampleUrl: ""
  },
  {
    id: "cute_boy",
    providerVoiceId: "Chinese (Mandarin)_Cute_Spirit",
    name: "可爱男孩",
    description: "童趣、轻松、亲近，适合儿童故事和互动内容",
    language: "中文普通话",
    sampleUrl: ""
  },
  {
    id: "male-qn-daxuesheng",
    providerVoiceId: "Chinese (Mandarin)_Straightforward_Boy",
    name: "阳光男生",
    description: "自然、开朗、年轻，适合探店、旅游和社媒内容",
    language: "中文普通话",
    sampleUrl: ""
  }
];
