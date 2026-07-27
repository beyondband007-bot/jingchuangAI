import { useCallback, useEffect, useMemo, useState } from "react";

function takeFirstAvailable(buckets, preferredTypes) {
  for (const type of preferredTypes) {
    if (buckets[type].length) return buckets[type].shift();
  }
  return null;
}

function getInspirationAspectBucket(aspect) {
  if (aspect === "wide" || aspect === "square" || aspect === "portrait") {
    return aspect;
  }
  if (typeof aspect === "number" && Number.isFinite(aspect)) {
    if (aspect >= 1.18) return "wide";
    if (aspect >= 0.86) return "square";
  }
  return "portrait";
}

export function useMeasuredInspirationCards(items, resetKey) {
  const [measuredAspects, setMeasuredAspects] = useState({});

  useEffect(() => {
    setMeasuredAspects({});
  }, [resetKey]);

  const cards = useMemo(
    () =>
      items.map((item) => {
        const measuredAspect = measuredAspects[item.id];
        return measuredAspect ? { ...item, aspect: measuredAspect } : item;
      }),
    [items, measuredAspects],
  );

  const registerImageSize = useCallback((item, image) => {
    if (!item?.id || !image?.naturalWidth || !image?.naturalHeight) return;
    const nextAspect = image.naturalWidth / image.naturalHeight;
    if (!Number.isFinite(nextAspect) || nextAspect <= 0) return;
    setMeasuredAspects((current) => {
      if (Math.abs((current[item.id] || 0) - nextAspect) < 0.01) return current;
      return { ...current, [item.id]: nextAspect };
    });
  }, []);

  return { cards, registerImageSize };
}

export function arrangeInspirationCards(cards, columnCount = 6) {
  const buckets = cards.reduce(
    (next, card) => {
      next[getInspirationAspectBucket(card.aspect)].push(card);
      return next;
    },
    { portrait: [], square: [], wide: [] },
  );
  if (buckets.wide.length === cards.length) return cards;

  const nonWideCards = [];
  while (buckets.portrait.length || buckets.square.length) {
    nonWideCards.push(
      takeFirstAvailable(
        buckets,
        nonWideCards.length % 5 === 1
          ? ["square", "portrait"]
          : ["portrait", "square"],
      ),
    );
  }
  const total = cards.length;
  const baseLength = Math.floor(total / columnCount);
  const extraColumns = total % columnCount;
  const columnLengths = Array.from(
    { length: columnCount },
    (_, index) => baseLength + (index < extraColumns ? 1 : 0),
  );
  const wideTargets = columnLengths.map((length) => Math.floor(length / 2));
  let remainingWide =
    buckets.wide.length - wideTargets.reduce((sum, count) => sum + count, 0);
  columnLengths.forEach((length, index) => {
    if (remainingWide > 0 && wideTargets[index] < Math.ceil(length / 2)) {
      wideTargets[index] += 1;
      remainingWide -= 1;
    }
  });

  const columns = columnLengths.map((length, columnIndex) => {
    const wideCount = Math.min(wideTargets[columnIndex], buckets.wide.length);
    const nonWideCount = length - wideCount;
    const wideCards = buckets.wide.splice(0, wideCount);
    const nonWide = nonWideCards.splice(0, nonWideCount);
    const column = [];
    let preferWide = wideCount > nonWideCount;

    while (column.length < length && (wideCards.length || nonWide.length)) {
      if (preferWide && wideCards.length) {
        column.push(wideCards.shift());
      } else if (!preferWide && nonWide.length) {
        column.push(nonWide.shift());
      } else if (wideCards.length) {
        column.push(wideCards.shift());
      } else if (nonWide.length) {
        column.push(nonWide.shift());
      }
      preferWide = !preferWide;
    }

    return column;
  });

  const arranged = [];
  const maxRows = Math.max(...columns.map((column) => column.length));
  for (let rowIndex = 0; rowIndex < maxRows; rowIndex += 1) {
    columns.forEach((column) => {
      if (column[rowIndex]) arranged.push(column[rowIndex]);
    });
  }

  return arranged;
}

export function arrangeInspirationCardsByBatch(
  cards,
  columnCount = 6,
  batchSize = 30,
) {
  const arranged = [];
  for (let index = 0; index < cards.length; index += batchSize) {
    arranged.push(
      ...arrangeInspirationCards(cards.slice(index, index + batchSize), columnCount),
    );
  }
  return arranged;
}
