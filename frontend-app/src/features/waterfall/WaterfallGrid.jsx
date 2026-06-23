import React, { useEffect, useMemo, useRef, useState } from "react";

function joinClasses(...values) {
  return values.filter(Boolean).join(" ");
}

function getColumnCount(width, minColumnWidth, gap, maxColumns) {
  if (!width) return 1;
  const estimated = Math.floor((width + gap) / (minColumnWidth + gap));
  return Math.max(1, Math.min(maxColumns, estimated || 1));
}

function applyColumnReduction(columnCount, reductionThreshold) {
  if (columnCount < reductionThreshold) return columnCount;
  return Math.max(1, columnCount - 1);
}

function parseRatio(value) {
  if (typeof value !== "string") return null;
  const match = value.match(/(\d+(?:\.\d+)?)\s*[:/]\s*(\d+(?:\.\d+)?)/);
  if (!match) return null;
  const width = Number(match[1]);
  const height = Number(match[2]);
  if (!width || !height) return null;
  return width / height;
}

function getItemAspect(item) {
  const value =
    item?.aspect ??
    item?.card?.aspect ??
    item?.ratio ??
    item?.card?.ratio ??
    null;

  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return value;
  }

  if (value === "wide") return 16 / 9;
  if (value === "square") return 1;
  if (value === "portrait") return 3 / 4;

  const parsed = parseRatio(value);
  return parsed || 3 / 4;
}

function getEstimatedItemHeight(item) {
  const aspect = getItemAspect(item);
  return 1 / Math.max(0.3, Math.min(3, aspect));
}

function getItemKey(item, index) {
  return item?.id ?? item?.card?.id ?? index;
}

export function WaterfallGrid({
  items,
  renderItem,
  className = "",
  itemClassName = "",
  minColumnWidth = 172,
  gap = 13,
  maxColumns = 8,
  reductionThreshold = Number.POSITIVE_INFINITY
}) {
  const containerRef = useRef(null);
  const [columnCount, setColumnCount] = useState(1);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return undefined;

    const updateColumnCount = () => {
      const next = applyColumnReduction(
        getColumnCount(element.clientWidth, minColumnWidth, gap, maxColumns),
        reductionThreshold,
      );
      setColumnCount((current) => (current === next ? current : next));
    };

    updateColumnCount();

    const observer = new ResizeObserver(updateColumnCount);
    observer.observe(element);

    return () => observer.disconnect();
  }, [gap, maxColumns, minColumnWidth, reductionThreshold]);

  const columns = useMemo(() => {
    const next = Array.from({ length: columnCount }, () => []);
    const columnHeights = Array.from({ length: columnCount }, () => 0);
    items.forEach((item, index) => {
      const targetColumnIndex = columnHeights.indexOf(Math.min(...columnHeights));
      next[targetColumnIndex].push({ item, index });
      columnHeights[targetColumnIndex] += getEstimatedItemHeight(item);
    });
    return next;
  }, [columnCount, items]);

  return (
    <div
      ref={containerRef}
      className={joinClasses("waterfall-grid", className)}
      style={{ "--waterfall-columns": columnCount, "--waterfall-gap": `${gap}px` }}
    >
      {columns.map((columnItems, columnIndex) => (
        <div className="waterfall-grid-column" key={`waterfall-column-${columnIndex}`}>
          {columnItems.map(({ item, index }) => (
            <div className={joinClasses("waterfall-grid-item", itemClassName)} key={getItemKey(item, index)}>
              {renderItem(item, index)}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
