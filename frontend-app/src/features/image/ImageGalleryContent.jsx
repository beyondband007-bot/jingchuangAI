import { BackToTopButton } from "../../components/BackToTopButton";
import { HistoryEmptyState } from "../../components/HistoryEmptyState";
import { PageTitle } from "../../components/PageTitle";
import { IncrementalLoadMoreIndicator } from "../inspiration/incrementalItems";
import { WaterfallGrid } from "../waterfall/WaterfallGrid";
import { ComposerBar, ComposerBarPlaceholder } from "./ImageComposerBar";
import { ResultCard } from "./imageSharedUi";

export function ImageGalleryContent({
  filter,
  isComposerSticky,
  showComposer,
  composerPlacement,
  isComposerCollapsed,
  imageComposerRef,
  options,
  onSubmit,
  resetSignal,
  composerSeed,
  onSeedApplied,
  onComposerFocus,
  tabs,
  activeCategory,
  onCategoryChange,
  canRenderGallery,
  galleryItems,
  hasCompletedNotice,
  selectedTaskId,
  onPreview,
  onDelete,
  onFavorite,
  onRegenerate,
  incrementalState,
  hasActiveGeneration,
}) {
  const isInspiration = filter === "inspiration";
  const hasGalleryItems = canRenderGallery && galleryItems.length > 0;
  const showEmptyState = canRenderGallery && !hasActiveGeneration && !hasGalleryItems;

  return (
    <>
      {isInspiration && (
        <>
          {isComposerSticky && (
            <div
              className="composer-sticky-spacer image-composer-sticky-spacer"
              aria-hidden="true"
            />
          )}
          {!isComposerSticky && (
            <PageTitle as="div" className="image-composer-heading">
              哇！大师，来做图啦
            </PageTitle>
          )}
          {showComposer ? (
            <ComposerBar
              key={composerSeed?.id || "image-inspiration-composer"}
              options={options}
              onSubmit={onSubmit}
              placement={composerPlacement}
              collapsed={isComposerCollapsed}
              shellRef={imageComposerRef}
              onFocus={onComposerFocus}
              resetSignal={resetSignal}
              seed={composerSeed}
              onSeedApplied={onSeedApplied}
            />
          ) : (
            <ComposerBarPlaceholder placement={composerPlacement} />
          )}
          <div
            className="image-inspiration-category-tabs inspiration-category-tabs"
            role="tablist"
            aria-label="图片灵感分类"
          >
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`ui-filter-pill ${activeCategory === tab.id ? "is-active" : ""}`}
                onClick={() => onCategoryChange(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </>
      )}

      {hasGalleryItems && (
        <>
          <WaterfallGrid
            className={`image-results-feed ${hasCompletedNotice ? "has-completed-notice" : ""}`}
            gap={12}
            maxColumns={6}
            reductionThreshold={4}
            items={galleryItems}
            renderItem={({ card, isExample }) => (
              <ResultCard
                card={card}
                isExample={isExample}
                isImageGallery
                isSelected={!isExample && selectedTaskId === card.id}
                onPreview={onPreview}
                onDelete={isExample ? () => {} : onDelete}
                onFavorite={isExample ? () => {} : onFavorite}
                onRegenerate={isExample ? () => {} : onRegenerate}
              />
            )}
          />
          <IncrementalLoadMoreIndicator
            active={
              isInspiration &&
              incrementalState.isLoadingMore &&
              incrementalState.hasMore
            }
          />
        </>
      )}

      {showEmptyState && (
        <div className="results-feed generation-results-feed image-results-feed-empty">
          <HistoryEmptyState title="暂无图片结果" />
        </div>
      )}

      <BackToTopButton />
    </>
  );
}
