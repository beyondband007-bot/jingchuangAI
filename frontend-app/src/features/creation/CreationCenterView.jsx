import { useCallback, useEffect, useState } from "react";
import "./creationCenter.css";
import { ChevronDown } from "lucide-react";
import { BackToTopButton } from "../../components/BackToTopButton";
import { FaceminiInspirationModal } from "../image/FaceminiInspirationModal";
import {
  IncrementalLoadMoreIndicator,
  useIncrementalItems,
} from "../inspiration/incrementalItems";
import { useMeasuredInspirationCards } from "../inspiration/inspirationCards";
import { WaterfallGrid } from "../waterfall/WaterfallGrid";
import {
  buildImageLaunchSeedPayload,
  getInspirationFavoriteId,
  inspirationFavoritesChangedEvent,
  isInspirationFavorite,
  loadInspirationFavoriteIds,
  readInspirationFavoriteIds,
  toggleInspirationFavoriteId,
  writePendingGenerationSeed,
} from "../generation/generationState";
import { isLoggedInUser } from "../invite/inviteUtils";
import {
  faceminiAsset,
  fmCreationScenes,
  getCreationCenterInspirations,
  getCreationSceneImage,
  getFaceminiInspirationRoute,
  getFaceminiVideoInspirations,
  resolveFaceminiInspirationImageUrl,
} from "../../data/faceminiData";
export function CreationCenterView({
  onOpenFeature,
  onOpenInvite,
  onOpenLibrary,
  authUser,
  onOpenAuth,
}) {
  const [activeTab, setActiveTab] = useState("图片灵感");
  const [bannerIndex, setBannerIndex] = useState(0);
  const [isBannerSliding, setIsBannerSliding] = useState(false);
  const [modalItem, setModalItem] = useState(null);
  const [favoriteInspirationIds, setFavoriteInspirationIds] = useState(() =>
    readInspirationFavoriteIds(),
  );
  const heroBanners = [
    {
      image: faceminiAsset("creation/banners/home-top-slider-1.jpg"),
      action: "chat",
      label: "打开大模型",
    },
    {
      image: faceminiAsset("creation/banners/home-top-slider-2.jpg"),
      action: "invite",
      label: "打开邀请有礼",
    },
  ];
  const categories = ["图片灵感", "视频灵感", "数字人形象", "爆款图文"];
  const filteredImages = getCreationCenterInspirations(activeTab, getFaceminiVideoInspirations());
  const visibleFilteredImages = useIncrementalItems(
    filteredImages,
    `creation-${activeTab}-${filteredImages.length}`,
  );
  const measuredInspirationCards = useMeasuredInspirationCards(
    visibleFilteredImages.items,
    `creation-${activeTab}-${filteredImages.length}`,
  );
  const nextBannerIndex = (bannerIndex + 1) % heroBanners.length;

  useEffect(() => {
    function syncFavoriteIds() {
      setFavoriteInspirationIds(readInspirationFavoriteIds());
    }
    window.addEventListener(inspirationFavoritesChangedEvent, syncFavoriteIds);
    return () =>
      window.removeEventListener(
        inspirationFavoritesChangedEvent,
        syncFavoriteIds,
      );
  }, []);

  useEffect(() => {
    if (!isLoggedInUser(authUser)) return;
    loadInspirationFavoriteIds().then(setFavoriteInspirationIds).catch(() => {});
  }, [authUser?.id]);

  const advanceHeroBanner = useCallback(() => {
    if (isBannerSliding) return;
    setIsBannerSliding(true);
    window.setTimeout(() => {
      setBannerIndex((index) => (index + 1) % heroBanners.length);
      setIsBannerSliding(false);
    }, 520);
  }, [heroBanners.length, isBannerSliding]);

  useEffect(() => {
    const timer = window.setInterval(advanceHeroBanner, 3600);
    return () => window.clearInterval(timer);
  }, [advanceHeroBanner]);

  function openInspiration(item) {
    const route = getFaceminiInspirationRoute(item);
    const favoriteId = getInspirationFavoriteId(item);
    setModalItem({
      ...item,
      favorite: favoriteInspirationIds.has(favoriteId),
      image: resolveFaceminiInspirationImageUrl(item),
      material:
        item.material || (item.category === "数字人形象" ? "视频封面" : "高清原图"),
      model: item.model || route.model,
    });
  }

  async function toggleInspirationFavorite(item) {
    if (!isLoggedInUser(authUser)) {
      onOpenAuth?.("login");
      throw new Error("请先登录");
    }
    const nextValue = await toggleInspirationFavoriteId(
      getInspirationFavoriteId(item),
    );
    const nextIds = readInspirationFavoriteIds();
    setFavoriteInspirationIds(nextIds);
    setModalItem((current) =>
      current && getInspirationFavoriteId(current) === getInspirationFavoriteId(item)
        ? { ...current, favorite: nextValue }
        : current,
    );
    return nextValue;
  }

  function remixInspiration(item) {
    const route = getFaceminiInspirationRoute(item);
    const launchSeed = buildImageLaunchSeedPayload({
      prompt: item.prompt,
      ratio: item.ratio || null,
      notice: "已填入同款提示词",
    });
    writePendingGenerationSeed({
      target: route.target,
      title: item.title,
      category: item.category,
      avatarId: item.avatarId || null,
      ...launchSeed,
    });
    setModalItem(null);
    onOpenFeature(route.feature, launchSeed);
  }

  function referenceInspiration(item) {
    const route = getFaceminiInspirationRoute(item);
    const imageUrl = resolveFaceminiInspirationImageUrl(item);
    const isVideo = Boolean(
      item?.mediaType === "video" ||
        item?.isVideo ||
        item?.video ||
        item?.videoSrc ||
        item?.videoUrl,
    );
    const launchSeed = buildImageLaunchSeedPayload({
      prompt: item.prompt || "",
      referenceImage: imageUrl
        ? {
            url: imageUrl,
            originalName: `${item.title || (isVideo ? "视频封面" : "参考图")}.${isVideo ? "jpg" : "png"}`,
            size: 0,
            mimeType: isVideo ? "image/jpeg" : "image/png",
          }
        : null,
      model: "gpt_image_2",
      notice: "已添加为参考图",
    });
    writePendingGenerationSeed({
      target: route.target,
      title: item.title,
      category: item.category,
      ...launchSeed,
    });
    setModalItem(null);
    onOpenFeature(route.feature, launchSeed);
  }

  function handleHeroBannerClick() {
    const activeBanner = heroBanners[bannerIndex];
    if (activeBanner?.action === "invite") {
      onOpenInvite?.();
      return;
    }
    onOpenFeature(activeBanner?.action || "image");
  }

  return (
    <section className="fm-work-page fm-creation-page">
      <div className="fm-banner-row">
        <div className="fm-banner-card fm-banner-large">
          <button
            className="fm-banner-main-hit"
            type="button"
            onClick={handleHeroBannerClick}
            aria-label={heroBanners[bannerIndex]?.label || "打开创作功能"}
          >
            <span
              className={`fm-hero-banner-stage ${isBannerSliding ? "is-sliding" : ""}`}
            >
              <img src={heroBanners[bannerIndex].image} alt="" />
              <img src={heroBanners[nextBannerIndex].image} alt="" />
            </span>
          </button>
          <button
            className="fm-banner-arrow is-left"
            type="button"
            onClick={advanceHeroBanner}
            aria-label="上一张"
          >
            <ChevronDown size={20} />
          </button>
          <button
            className="fm-banner-arrow is-right"
            type="button"
            onClick={advanceHeroBanner}
            aria-label="下一张"
          >
            <ChevronDown size={20} />
          </button>
        </div>
        <button
          className="fm-banner-card"
          type="button"
          onClick={() => onOpenFeature("image")}
        >
          <img src={faceminiAsset("creation/banners/banner-01.jpg")} alt="" />
        </button>
        <button
          className="fm-banner-card"
          type="button"
          onClick={() => onOpenFeature("digital-human")}
        >
          <img src={faceminiAsset("creation/banners/banner-02.jpg")} alt="" />
        </button>
      </div>
      <section className="fm-section-block">
        <h2>场景化创作入口</h2>
        <div className="fm-scene-grid">
          {fmCreationScenes.map(
            ([title, desc, image, tags, route, entryLabel]) => (
              <button
                className="fm-scene-card"
                type="button"
                key={title}
                onClick={() => onOpenFeature(route)}
              >
                <div className="fm-scene-image">
                  <img src={getCreationSceneImage(image)} alt="" />
                  <span className="fm-scene-entry">{entryLabel}</span>
                </div>
                <div className="fm-scene-body">
                  <h3>{title}</h3>
                  <p>{desc}</p>
                  <div className="fm-scene-tags">
                    {tags.map((tag) => (
                      <span key={tag}>{tag}</span>
                    ))}
                  </div>
                </div>
              </button>
            ),
          )}
        </div>
      </section>
      <section className="fm-section-block">
        <div className="fm-section-title-row fm-inspiration-title-row">
          <h2>灵感广场</h2>
          <div className="fm-generation-tabs fm-inspiration-tabs" aria-label="灵感分类">
            {categories.map((tab) => (
              <button
                className={`ui-filter-pill ${tab === activeTab ? "is-active selected" : ""}`}
                type="button"
                key={tab}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
        <WaterfallGrid
          key={`creation-inspiration-${activeTab}`}
          className="fm-masonry"
          gap={12}
          maxColumns={5}
          minColumnWidth={172}
          items={measuredInspirationCards.cards}
          renderItem={(item) => (
            <div className="fm-image-card">
              <button
                className="fm-image-card-hit"
                type="button"
                onClick={() => openInspiration(item)}
                aria-label={item.title}
              >
                <img
                  src={item.thumbnail}
                  alt={item.title}
                  loading="lazy"
                  onLoad={(event) =>
                    measuredInspirationCards.registerImageSize(
                      item,
                      event.currentTarget,
                    )
                  }
                  onError={(event) => {
                    if (
                      item.fallbackThumbnail &&
                      event.currentTarget.src !== item.fallbackThumbnail
                    ) {
                      event.currentTarget.src = item.fallbackThumbnail;
                      measuredInspirationCards.registerImageSize(
                        item,
                        event.currentTarget,
                      );
                    }
                  }}
                />
              </button>
              <button
                className="fm-image-card-remix"
                type="button"
                onClick={() => remixInspiration(item)}
              >
                生成同款
              </button>
            </div>
          )}
        />
        <IncrementalLoadMoreIndicator
          active={visibleFilteredImages.isLoadingMore && visibleFilteredImages.hasMore}
        />
      </section>
      <FaceminiInspirationModal
      getInitialFavorite={isInspirationFavorite}
        item={modalItem}
        onClose={() => setModalItem(null)}
        onRemix={remixInspiration}
        onReference={referenceInspiration}
        onFavorite={toggleInspirationFavorite}
      />
      <BackToTopButton />
    </section>
  );
}
