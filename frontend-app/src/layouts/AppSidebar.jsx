import { memo, useCallback, useState } from "react";
import { ChevronDown } from "lucide-react";

export const AppSidebar = memo(function AppSidebar({
  activeNav,
  navItems,
  navSections,
  onNavChange,
  onPrefetchNav,
  onOpenLanding,
}) {
  const enableSidebarSearch = false;
  const query = "";
  const [openGroups, setOpenGroups] = useState(() => ({
    vision: true,
    marketing: false,
    audio: false,
  }));
  const normalizedQuery = enableSidebarSearch ? query.trim().toLowerCase() : "";

  const getNavItem = useCallback(
    (id) => navItems.find((item) => item.id === id),
    [navItems],
  );
  const isVisible = useCallback(
    (item) => {
      if (!normalizedQuery) return true;
      return (
        item?.label?.toLowerCase().includes(normalizedQuery) ||
        item?.id?.toLowerCase().includes(normalizedQuery)
      );
    },
    [normalizedQuery],
  );
  const toggleGroup = useCallback((id) => {
    setOpenGroups((current) => ({ ...current, [id]: !current[id] }));
  }, []);

  const sidebarSections = navSections.filter(
    (section) => section.id !== "assets" && section.id !== "billing",
  );
  const assetsItem = getNavItem("assets");
  const AssetsIcon = assetsItem?.icon;

  return (
    <div className="app-sidebar">
      <button
        className="feature-brand app-sidebar__brand"
        type="button"
        onClick={onOpenLanding}
        aria-label="返回 Facemini 首页"
      >
        <span className="feature-brand-text">Facemini</span>
        <span className="feature-brand-beta">Beta</span>
      </button>
      <nav className="feature-nav app-sidebar__menu" aria-label="功能导航">
        {sidebarSections.map((section) => {
          if (section.type === "item") {
            const item = getNavItem(section.id);
            if (!item || !isVisible(item)) return null;
            const Icon = item.icon;
            const active = activeNav === item.id;
            return (
              <div className="feature-nav-section" key={section.id}>
                <button
                  className={`feature-nav-item ${active ? "is-active" : ""}`}
                  onClick={() => onNavChange?.(item.id)}
                  onFocus={() => onPrefetchNav?.(item.id)}
                  onPointerEnter={() => onPrefetchNav?.(item.id)}
                  type="button"
                >
                  <Icon size={18} strokeWidth={1.9} />
                  <span>{item.label}</span>
                </button>
              </div>
            );
          }

          if (section.type === "external") {
            if (
              normalizedQuery &&
              !section.label.toLowerCase().includes(normalizedQuery) &&
              !section.id.toLowerCase().includes(normalizedQuery)
            )
              return null;
            const Icon = section.icon;
            return (
              <div className="feature-nav-section" key={section.id}>
                <button
                  className="feature-nav-item"
                  onClick={() =>
                    window.open(section.href, "_blank", "noopener,noreferrer")
                  }
                  type="button"
                >
                  <Icon size={18} strokeWidth={1.9} />
                  <span>{section.label}</span>
                </button>
              </div>
            );
          }

          const children = section.children
            .map(getNavItem)
            .filter(Boolean)
            .filter(isVisible);
          const hasActiveChild = section.children.includes(activeNav);
          if (!children.length && normalizedQuery) return null;
          const GroupIcon = section.icon;
          const isOpen = Boolean(
            openGroups[section.id] || hasActiveChild || normalizedQuery,
          );

          return (
            <div
              className="feature-nav-section feature-nav-section--group"
              key={section.id}
            >
              <button
                className={`feature-nav-group ${hasActiveChild ? "is-active" : ""} ${
                  isOpen ? "is-open" : ""
                }`}
                type="button"
                onClick={() => toggleGroup(section.id)}
              >
                <GroupIcon size={18} strokeWidth={1.9} />
                <span>{section.label}</span>
                <ChevronDown className="feature-nav-chevron" size={16} />
              </button>
              <div
                className={`feature-nav-children ${isOpen ? "is-open" : ""}`}
              >
                {children.map((item) => {
                  const Icon = item.icon;
                  const active = activeNav === item.id;
                  return (
                    <button
                      className={`feature-nav-child ${
                        active ? "is-active" : ""
                      }`}
                      key={item.id}
                      onClick={() => onNavChange?.(item.id)}
                      onFocus={() => onPrefetchNav?.(item.id)}
                      onPointerEnter={() => onPrefetchNav?.(item.id)}
                      type="button"
                    >
                      <span className="feature-nav-child-icon">
                        <Icon size={15} strokeWidth={1.9} />
                      </span>
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>
      {assetsItem && AssetsIcon && (
        <div className="feature-nav-assets-dock app-sidebar__assets">
          <button
            className={`feature-nav-item feature-nav-asset-bottom ${
              activeNav === "assets" ? "is-active" : ""
            }`}
            onClick={() => onNavChange?.("assets")}
            onFocus={() => onPrefetchNav?.("assets")}
            onPointerEnter={() => onPrefetchNav?.("assets")}
            type="button"
          >
            <AssetsIcon size={18} strokeWidth={1.9} />
            <span>{assetsItem.label}</span>
            <ChevronDown className="feature-nav-chevron" size={16} />
          </button>
        </div>
      )}
    </div>
  );
});
