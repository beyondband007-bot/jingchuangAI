import { Sparkles, Star } from "lucide-react";

export function ImageGenerationTabs({
  filter,
  credits,
  onShowInspiration,
  onShowWorkbench,
  onShowFavorites,
}) {
  return (
    <div className="image-filter-tabs">
      <button
        className={filter === "inspiration" ? "selected" : ""}
        onClick={onShowInspiration}
        type="button"
      >
        <Sparkles size={17} />
        灵感
      </button>
      <button
        className={filter === "recent" ? "selected" : ""}
        onClick={onShowWorkbench}
        type="button"
      >
        生成
      </button>
      <button
        className={filter === "favorite" ? "selected" : ""}
        onClick={onShowFavorites}
        type="button"
      >
        <Star size={17} fill="#f8d545" color="#161616" />
        收藏
      </button>
      {credits && <span className="credits-chip">积分 {credits.balance}</span>}
    </div>
  );
}
