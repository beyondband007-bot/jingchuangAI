import { Star } from "lucide-react";
import { AssetCardGrid } from "./AssetCardGrid";

export function AssetTimeFilterControl({
  options,
  activePreset,
  startDate,
  endDate,
  onSelectPreset,
  onStartDateChange,
  onEndDateChange,
}) {
  return (
    <div className="fm-assets-time-filter" aria-label="时间筛选">
      <div className="fm-assets-time-presets">
        {options.map(([value, label]) => (
          <button
            key={value}
            type="button"
            className={activePreset === value ? "is-active" : ""}
            onClick={() => onSelectPreset(value)}
          >
            {label}
          </button>
        ))}
      </div>
      {activePreset === "custom" && (
        <div className="fm-assets-date-range">
          <input
            type="date"
            value={startDate}
            max={endDate || undefined}
            onChange={(event) => onStartDateChange(event.target.value)}
            aria-label="开始日期"
          />
          <span>至</span>
          <input
            type="date"
            value={endDate}
            min={startDate || undefined}
            onChange={(event) => onEndDateChange(event.target.value)}
            aria-label="结束日期"
          />
        </div>
      )}
    </div>
  );
}

export function AssetGalleryView({
  tabs,
  activeTab,
  cards,
  isLoading,
  timeFilterControl,
  previewModal,
  deleteConfirmDialog,
  onSelectTab,
  onSelect,
  onDelete,
  onToggleFavorite,
}) {
  return (
    <section className="assets-view-root fm-assets-gallery-view">
      <div className="fm-assets-inner">
        <div className="fm-assets-filter-row">
          <div className="fm-assets-tabs" aria-label="作品分类">
            {tabs.map((tab) => (
              <button
                key={tab}
                type="button"
                className={tab === activeTab ? "is-active" : ""}
                onClick={() => onSelectTab(tab)}
              >
                {tab}
              </button>
            ))}
          </div>
          {timeFilterControl}
        </div>
        <AssetCardGrid
          cards={cards}
          isLoading={isLoading}
          emptyTitle={isLoading ? "正在加载作品" : "暂无作品"}
          onSelect={onSelect}
          onDelete={onDelete}
          onToggleFavorite={onToggleFavorite}
        />
      </div>
      {previewModal}
      {deleteConfirmDialog}
    </section>
  );
}

export function FavoriteAssetsView({
  isGuest,
  tabs,
  activeTab,
  cards,
  timeFilterControl,
  previewModal,
  deleteConfirmDialog,
  onOpenAuth,
  onSelectTab,
  onSelect,
  onDelete,
  onToggleFavorite,
}) {
  return (
    <section className="assets-view-root fm-assets-gallery-view fm-favorites-view">
      {isGuest ? (
        <div className="assets-login-panel fm-favorites-login-panel">
          <Star size={32} />
          <strong>登录后查看我的收藏</strong>
          <p>登录后可按模块浏览已收藏的作品</p>
          <button type="button" onClick={() => onOpenAuth("login")}>
            登录
          </button>
        </div>
      ) : (
        <div className="fm-assets-inner fm-favorites-inner">
          <div className="fm-assets-filter-row">
            <div className="fm-assets-tabs fm-favorites-tabs" aria-label="我的收藏分类">
              {tabs.map((tab) => (
                <button
                  className={tab === activeTab ? "is-active" : ""}
                  key={tab}
                  type="button"
                  onClick={() => onSelectTab(tab)}
                >
                  {tab}
                </button>
              ))}
            </div>
            {timeFilterControl}
          </div>
          <AssetCardGrid
            cards={cards}
            emptyTitle={`暂无${activeTab}收藏`}
            emptyClassName="fm-favorites-empty-state"
            gridClassName="fm-favorites-grid"
            onSelect={onSelect}
            onDelete={onDelete}
            onToggleFavorite={onToggleFavorite}
          />
        </div>
      )}
      {previewModal}
      {deleteConfirmDialog}
    </section>
  );
}
