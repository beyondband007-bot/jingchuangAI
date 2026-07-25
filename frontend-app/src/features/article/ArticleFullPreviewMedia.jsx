import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

function isLandscapeRatio(ratio) {
  const [width, height] = String(ratio || "")
    .split(":")
    .map(Number);
  return Number.isFinite(width) && Number.isFinite(height) && width > height;
}

function probeImageLandscape(src, ratioFallback) {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image.naturalWidth > image.naturalHeight);
    image.onerror = () => resolve(isLandscapeRatio(ratioFallback));
    image.src = src;
  });
}

function useArticlePreviewLayout(images, ratioFallback) {
  const imageKey = images.map((item) => item.image).join("|");
  const [isLandscapePreview, setIsLandscapePreview] = useState(() =>
    isLandscapeRatio(ratioFallback),
  );

  useEffect(() => {
    if (!images.length) {
      setIsLandscapePreview(isLandscapeRatio(ratioFallback));
      return undefined;
    }

    let cancelled = false;
    Promise.all(
      images.map((item) => probeImageLandscape(item.image, ratioFallback)),
    ).then((results) => {
      if (!cancelled) setIsLandscapePreview(results.some(Boolean));
    });

    return () => {
      cancelled = true;
    };
  }, [imageKey, images, ratioFallback]);

  return isLandscapePreview;
}

export function ArticleFullPreviewMedia({
  images,
  ratioFallback,
  title,
  activeIndex,
  onActiveIndexChange,
  className = "",
  stacked = false,
  variant = "history",
}) {
  const carouselRef = useRef(null);
  const isLandscapePreview = useArticlePreviewLayout(images, ratioFallback);
  const isPopular = variant === "popular";
  const mediaClassName = [
    isPopular ? "article-popular-media" : "article-result-full-media",
    isPopular ? "" : "article-history-full-media",
    `count-${Math.min(images.length, 4)}`,
    isLandscapePreview ? "is-landscape" : "",
    stacked ? "is-stacked" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  const stackedGalleryClass = isPopular
    ? "article-popular-media-gallery"
    : "article-result-stacked-gallery";
  const landscapeGalleryClass = isPopular
    ? "article-popular-media-gallery"
    : "article-history-full-gallery";
  const carouselClass = isPopular
    ? "article-popular-media-carousel"
    : "article-result-full-carousel";
  const slideClass = isPopular
    ? "article-popular-media-slide"
    : "article-result-full-slide";
  const navButtonClass = isPopular
    ? "article-popular-media-nav"
    : "article-history-image-nav";
  const dotsClass = isPopular
    ? "article-popular-media-dots"
    : "article-history-preview-dots";

  function scrollToIndex(index) {
    const carousel = carouselRef.current;
    if (!carousel) return;
    carousel.scrollTo({ left: carousel.clientWidth * index, behavior: "smooth" });
    onActiveIndexChange?.(index);
  }

  function handleCarouselScroll(event) {
    const carousel = event.currentTarget;
    if (!carousel.clientWidth) return;
    const nextIndex = Math.round(carousel.scrollLeft / carousel.clientWidth);
    if (images[nextIndex] && nextIndex !== activeIndex) {
      onActiveIndexChange?.(nextIndex);
    }
  }

  const renderGallery = (galleryClass) => (
    <section className={mediaClassName}>
      <div className={galleryClass}>
        {images.map((item, index) => (
          <figure key={item.id}>
            <img src={item.image} alt={item.title || title || `配图 ${index + 1}`} draggable="false" />
          </figure>
        ))}
      </div>
    </section>
  );

  if (stacked) return renderGallery(stackedGalleryClass);
  if (isLandscapePreview) return renderGallery(landscapeGalleryClass);

  return (
    <section className={mediaClassName}>
      <div className={carouselClass} ref={carouselRef} onScroll={handleCarouselScroll}>
        {images.map((item, index) => (
          <figure className={slideClass} key={item.id}>
            <img src={item.image} alt={item.title || title || `配图 ${index + 1}`} draggable="false" />
          </figure>
        ))}
      </div>
      {images.length > 1 && (
        <>
          <button className={`${navButtonClass} is-prev`} type="button" onClick={() => scrollToIndex((activeIndex - 1 + images.length) % images.length)} aria-label="上一张">
            <ChevronLeft size={22} />
          </button>
          <button className={`${navButtonClass} is-next`} type="button" onClick={() => scrollToIndex((activeIndex + 1) % images.length)} aria-label="下一张">
            <ChevronRight size={22} />
          </button>
          <div className={dotsClass}>
            {images.map((item, index) => (
              <button className={index === activeIndex ? "is-active" : ""} type="button" key={item.id} onClick={() => scrollToIndex(index)} aria-label={`查看第 ${index + 1} 张`} />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
