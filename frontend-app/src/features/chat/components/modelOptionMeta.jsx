import React from "react";

const iconBase = "/assets/model-icons";

const modelOptionMeta = {
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
    description: "国风 / 电商优化，商品图、中式场景、日常写实创作",
    icon: `${iconBase}/seedream.svg`,
  },
  seedream_45: {
    title: "Seedream 4.5",
    description: "国风 / 电商优化，商品图、中式场景、日常写实创作",
    icon: `${iconBase}/seedream.svg`,
  },
  seedance_2_0_720p: {
    title: "Seedance 2.0",
    description: "多模态旗舰视频模型，人物稳定、运镜流畅",
    icon: `${iconBase}/spark.svg`,
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
  return modelOptionMeta[item.value] || getFallbackMeta(item);
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
            fontWeight: selected ? 800 : 700,
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
