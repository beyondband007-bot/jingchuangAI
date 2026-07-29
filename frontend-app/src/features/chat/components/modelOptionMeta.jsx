import React from "react";

const iconBase = "/assets/model-icons";

const modelOptionMeta = {
  "deepseek-v4-pro": {
    title: "DeepSeek V4 Pro",
    description: "中文强，带货 / 直播 / 国风文案自然",
    icon: `${iconBase}/deepseek.svg`,
  },
  "qwen3.7-plus": {
    title: "Qwen 3.7 Plus",
    description: "均衡性价比，适合种草文案、标题创意初稿",
    icon: `${iconBase}/qwen.svg`,
  },
  "gpt-5-6-codex": {
    title: "GPT5.6-codex",
    description: "旗舰编程推理，适合复杂代码、调试与自动化",
    icon: `${iconBase}/openai.svg`,
  },
  "gemini-3-6-flash-openai": {
    title: "Gemini 3.6",
    description: "高效多模态，适合图文理解、知识工作与创意生成",
    icon: `${iconBase}/gemini.svg`,
  },
  "qwen3.6-plus": {
    title: "Qwen 3.6 Plus",
    description: "轻量低成本，适合批量短文案",
    icon: `${iconBase}/qwen.svg`,
  },
  "gpt-5-4": {
    title: "GPT Codex 系列",
    description: "专用写代码、自动化脚本",
    icon: `${iconBase}/openai.svg`,
  },
  "gpt-5-5": {
    title: "GPT Codex 系列",
    description: "专用写代码、自动化脚本",
    icon: `${iconBase}/openai.svg`,
  },
  "gemini-3-pro": {
    title: "Gemini 3 Pro",
    description: "多模态图文，适合海外短视频脚本",
    icon: `${iconBase}/gemini.svg`,
  },
  "gemini-3.1-pro-openai": {
    title: "Gemini 3 Pro",
    description: "多模态图文，适合海外短视频脚本",
    icon: `${iconBase}/gemini.svg`,
  },
  "claude-opus-4-6": {
    title: "Claude Opus 4.6",
    description: "超长上下文，适合万字策划、长篇剧本",
    icon: `${iconBase}/claude.svg`,
  },
  "claude-sonnet-4-6": {
    title: "Claude Sonnet 4.6",
    description: "长文本流畅，适合口播稿、品牌软文",
    icon: `${iconBase}/claude.svg`,
  },
  gpt_image_2: {
    title: "GPT Image 2",
    description: "全能通用，适配海报、插画、多元素创意画面",
    icon: `${iconBase}/openai.svg`,
  },
  gpt_image_2_i2i: {
    title: "GPT Image 2",
    description: "全能通用，适配海报、插画、多元素创意画面",
    icon: `${iconBase}/openai.svg`,
  },
  nano_banana_pro: {
    title: "Nano Banana Pro",
    description: "人像专精，写真、人物肖像、数字人配套配图专用",
    icon: `${iconBase}/spark.svg`,
  },
  flux_2_pro: {
    title: "Flux 2 Pro",
    description: "电影级光影质感，写实大片、科幻 3A、氛围感商业视觉效果拉满",
    icon: `${iconBase}/flux.svg`,
  },
  imagen_4_fast: {
    title: "Imagen 4 Fast",
    description: "极速轻量化，出图快，适合快速打稿、批量生成素材",
    icon: `${iconBase}/spark.svg`,
  },
  seedream_4_5: {
    title: "Seedream 4.5",
    description: "国风 / 电商优化，适合商品图、中式场景、日常写实创作",
    icon: `${iconBase}/seedream.svg`,
  },
  seedream_45: {
    title: "Seedream 4.5",
    description: "国风 / 电商优化，适合商品图、中式场景、日常写实创作",
    icon: `${iconBase}/seedream.svg`,
  },
  seedance_2_0_720p: {
    title: "Seedance 2.0",
    description: "多模态旗舰视频模型，人物稳定、运镜流畅",
    icon: `${iconBase}/spark.svg`,
  },
  seedance_2_0_mini: {
    title: "Seedance 2.0 Mini",
    description: "高速高性价比，适合快速出片与批量视频创作",
    icon: `${iconBase}/spark.svg`,
  },
  kling_3_std: {
    title: "Kling 3.0",
    description: "电影级画质，原生音效与镜头叙事更自然",
    icon: `${iconBase}/kling.svg`,
  },
};

function getFallbackMeta(item = {}) {
  const label = item.label || item.value || "模型";
  return {
    title: label,
    description: item.description || "",
    icon: `${iconBase}/spark.svg`,
  };
}

export function getModelOptionMeta(item = {}) {
  const meta = modelOptionMeta[item.value] || getFallbackMeta(item);
  return {
    ...meta,
    title: meta.title || item.label || item.value || "模型",
    description: meta.description || item.description || "",
  };
}

export function ModelOptionContent({ item, selected = false }) {
  const meta = getModelOptionMeta(item);

  return (
    <>
      <span
        aria-hidden="true"
        style={{
          width: "36px",
          height: "36px",
          borderRadius: "8px",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          flex: "0 0 36px",
          background: "#ffffff",
          border: "1px solid #e4e1ee",
        }}
      >
        <img src={meta.icon} alt="" style={{ width: "18px", height: "18px", display: "block" }} />
      </span>
      <span
        style={{
          display: "flex",
          minWidth: 0,
          flex: "1 1 auto",
          flexDirection: "column",
          gap: "4px",
          lineHeight: 1.2,
        }}
      >
        <strong
          style={{
            color: selected ? "#6d3cff" : "#686879",
            fontSize: "14px",
            fontWeight: selected ? 500 : 500,
            whiteSpace: "nowrap",
          }}
        >
          {meta.title}
        </strong>
        {meta.description ? (
          <small
            style={{
              color: "#8f8ca3",
              fontSize: "12px",
              fontWeight: 500,
              lineHeight: 1.35,
              whiteSpace: "normal",
            }}
          >
            {meta.description}
          </small>
        ) : null}
      </span>
    </>
  );
}
