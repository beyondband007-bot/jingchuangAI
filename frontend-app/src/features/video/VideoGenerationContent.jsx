import { Film, Loader2, Sparkles, Star } from "lucide-react";
import { ComposerBarPlaceholder } from "../image/ImageComposerBar";
import { PageTitle } from "../../components/PageTitle";
import { HistoryEmptyState } from "../../components/HistoryEmptyState";
import { VideoComposerBar } from "./VideoComposerBar";
import {
  VideoInspirationCard,
  VideoInspirationModal,
  VideoResultCard,
  VideoTaskDetailModal,
} from "./VideoCards";
import { VideoGenerationResultPlayer } from "./VideoGenerationResultPlayer";
import { VideoGenStage } from "./VideoGenStage";
import { WaterfallGrid } from "../waterfall/WaterfallGrid";
import "../inspiration/inspirationCategoryTabs.css";
import "./videoGenerationContent.css";

export function VideoGenerationContent({
  videoGen,
  playingTask,
  filter,
  setFilter,
  credits,
  isComposerSticky,
  isComposerCollapsed,
  showVideoComposer,
  options,
  createTask,
  resetSignal,
  composerSeed,
  videoComposerRef,
  setIsComposerFocused,
  canRenderVideoInspirationGrid,
  isVideoInspirationCatalogLoading,
  videoInspirationCatalogLoadError,
  retryVideoInspirationCatalogLoad,
  videoInspirationCategoryTabs,
  videoInspirationCategory,
  selectVideoInspirationCategory,
  visibleVideoInspirationItems,
  setSelectedInspiration,
  isVideoHistoryLoading,
  isSubmitting,
  sortedCards,
  deleteTask,
  toggleFavorite,
  requestRegenerate,
  setSelectedHistoryTask,
  selectedInspiration,
  favoriteInspirationIds,
  getInspirationFavoriteId,
  getInitialFavorite,
  useVideoInspiration,
  toggleVideoInspirationFavorite,
  referenceVideoPoster,
  selectedHistoryTask,
  remixVideoTask,
  referenceVideoTask,
  deleteConfirmDialog,
  regenerateConfirmDialog,
  BackToTopButtonComponent,
  IncrementalLoadMoreIndicatorComponent,
  openVideoInspiration,
}) {
  if (videoGen.isGenStageActive && videoGen.derivedState) {
    return <VideoGenStage derivedState={videoGen.derivedState} />;
  }

  if (playingTask?.video) {
    return (
      <section className="video-gen-view video-gen-view-root is-immersive">
        <div className="video-gen-immersive-shell">
          <VideoGenerationResultPlayer
            task={playingTask}
            onBack={openVideoInspiration}
            onFavorite={() => toggleFavorite(playingTask.id)}
            onRegenerate={() => requestRegenerate(playingTask.id)}
          />
        </div>
        {regenerateConfirmDialog}
      </section>
    );
  }

  return (
    <section
      className={`video-gen-view video-gen-view-root${
        filter !== "inspiration" &&
        !isVideoHistoryLoading &&
        sortedCards.length === 0
          ? " is-empty-results"
          : ""
      }`}
    >
      <div className="image-filter-tabs">
        <button
          className={filter === "inspiration" ? "selected" : ""}
          onClick={openVideoInspiration}
          type="button"
        >
          <Sparkles size={17} />
          灵感广场
        </button>
        <button
          className={filter === "recent" ? "selected" : ""}
          onClick={() => setFilter("recent")}
          type="button"
        >
          历史记录
        </button>
        <button
          className={filter === "favorite" ? "selected" : ""}
          onClick={() => setFilter("favorite")}
          type="button"
        >
          <Star size={17} fill="#f8d545" color="#161616" />
          收藏
        </button>
        {credits && <span className="credits-chip">积分 {credits.balance}</span>}
      </div>
      {filter === "inspiration" && (
        <>
          {isComposerSticky && (
            <div
              className="composer-sticky-spacer video-composer-sticky-spacer"
              aria-hidden="true"
            />
          )}
          {!isComposerSticky && (
            <PageTitle as="div" className="video-composer-heading">
              视频生成
            </PageTitle>
          )}
          {showVideoComposer ? (
            <VideoComposerBar
              options={options}
              onSubmit={createTask}
              resetSignal={resetSignal}
              seed={composerSeed}
              placement={isComposerSticky ? "sticky" : "inline"}
              collapsed={isComposerCollapsed}
              shellRef={videoComposerRef}
              onFocus={() => setIsComposerFocused(true)}
              onBlur={() => {}}
            />
          ) : (
            <ComposerBarPlaceholder
              placement={isComposerSticky ? "sticky" : "inline"}
              className="video-composer"
            />
          )}
        </>
      )}
      {filter === "inspiration" && canRenderVideoInspirationGrid ? (
        isVideoInspirationCatalogLoading ? (
          <div
            className="video-generation-empty-state generation-empty-results video-history-loading"
            role="status"
            aria-live="polite"
          >
            <Loader2 size={28} className="is-spinning" />
            <strong>正在加载视频灵感…</strong>
          </div>
        ) : videoInspirationCatalogLoadError ? (
          <div className="video-generation-empty-state generation-empty-results">
            <strong>视频灵感加载失败</strong>
            <button type="button" onClick={retryVideoInspirationCatalogLoad}>
              重新加载
            </button>
          </div>
        ) : (
        <>
          <div className="video-inspiration-category-tabs inspiration-category-tabs" aria-label="视频分类">
            {videoInspirationCategoryTabs.map((category) => (
              <button
                key={category.id}
                type="button"
                className={
                  videoInspirationCategory === category.id ? "is-active" : ""
                }
                onClick={() => selectVideoInspirationCategory(category.id)}
              >
                {category.label}
              </button>
            ))}
          </div>
          <WaterfallGrid
            className="video-inspiration-grid"
            gap={12}
            maxColumns={4}
            items={visibleVideoInspirationItems.items}
            renderItem={(item) => (
              <VideoInspirationCard item={item} onOpen={setSelectedInspiration} />
            )}
          />
          <IncrementalLoadMoreIndicatorComponent
            active={
              visibleVideoInspirationItems.isLoadingMore &&
              visibleVideoInspirationItems.hasMore
            }
          />
        </>
        )
      ) : filter !== "inspiration" ? (
        <div className="results-feed generation-results-feed">
          {isVideoHistoryLoading ? (
            <div
              className="video-generation-empty-state generation-empty-results video-history-loading"
              role="status"
              aria-live="polite"
            >
              <Loader2 size={28} className="is-spinning" />
              <strong>加载历史记录中...</strong>
              <p>正在同步你的视频生成记录。</p>
            </div>
          ) : (
            <>
              {isSubmitting && filter === "recent" && (
                <VideoResultCard
                  card={{
                    id: "submitting",
                    status: "processing",
                    model: "创建中",
                    ratio: "16:9",
                    duration: 8,
                    time: "--:--",
                    rmb: null,
                    price: "计算中",
                    prompt: "正在提交视频生成任务",
                    favorite: false,
                  }}
                  onDelete={() => {}}
                  onFavorite={() => {}}
                  onRegenerate={() => {}}
                  onOpen={() => {}}
                />
              )}
              {sortedCards.length ? (
                sortedCards.map((card) => (
                  <VideoResultCard
                    card={card}
                    key={card.id}
                    onDelete={deleteTask}
                    onFavorite={toggleFavorite}
                    onRegenerate={requestRegenerate}
                    onOpen={setSelectedHistoryTask}
                  />
                ))
              ) : (
                <HistoryEmptyState title="暂无视频结果" />
              )}
            </>
          )}
        </div>
      ) : null}
      <BackToTopButtonComponent />
      <VideoInspirationModal
        item={
          selectedInspiration
            ? {
                ...selectedInspiration,
                favorite: favoriteInspirationIds.has(
                  getInspirationFavoriteId(selectedInspiration),
                ),
              }
            : null
        }
        getInitialFavorite={getInitialFavorite}
        onClose={() => setSelectedInspiration(null)}
        onRemix={useVideoInspiration}
        onFavorite={toggleVideoInspirationFavorite}
        onReferencePoster={(item) =>
          referenceVideoPoster(item, {
            onDone: () => setSelectedInspiration(null),
          })
        }
      />
      <VideoTaskDetailModal
        task={selectedHistoryTask}
        getInitialFavorite={getInitialFavorite}
        onClose={() => setSelectedHistoryTask(null)}
        onRemix={remixVideoTask}
        onReference={referenceVideoTask}
        onFavorite={(task) => toggleFavorite(task.id)}
      />
      {deleteConfirmDialog}
      {regenerateConfirmDialog}
    </section>
  );
}
