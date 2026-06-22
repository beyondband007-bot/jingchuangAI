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
    items.forEach((item, index) => {
      next[index % columnCount].push({ item, index });
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
            <div className={joinClasses("waterfall-grid-item", itemClassName)} key={item.id ?? index}>
              {renderItem(item, index)}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
