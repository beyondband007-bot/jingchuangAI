import { useEffect, useMemo, useState } from "react";
import { billingApi } from "../api/billingApi.js";

const quoteCache = new Map();

export function useBillingQuote(feature, payload = {}, fallbackPoints = null) {
  const payloadKey = useMemo(() => JSON.stringify(payload || {}), [payload]);
  const cacheKey = `${feature}:${payloadKey}`;
  const [points, setPoints] = useState(() => quoteCache.get(cacheKey) ?? fallbackPoints);

  useEffect(() => {
    if (!feature) {
      setPoints(fallbackPoints);
      return undefined;
    }

    let cancelled = false;
    const cached = quoteCache.get(cacheKey);
    if (typeof cached === "number") {
      setPoints(cached);
      return () => {
        cancelled = true;
      };
    }

    const timer = window.setTimeout(() => {
      billingApi.quote(feature, JSON.parse(payloadKey))
        .then((quote) => {
          const nextPoints = Number(quote?.points);
          if (!Number.isFinite(nextPoints)) return;
          quoteCache.set(cacheKey, nextPoints);
          if (!cancelled) setPoints(nextPoints);
        })
        .catch(() => {
          if (!cancelled) setPoints(fallbackPoints);
        });
    }, 120);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [cacheKey, fallbackPoints, feature, payloadKey]);

  return points;
}

export default function BillingPoints({
  feature,
  payload,
  points: explicitPoints,
  fallbackPoints = null,
  className = "",
}) {
  const hasExplicitPoints = Number.isFinite(Number(explicitPoints));
  const quotedPoints = useBillingQuote(hasExplicitPoints ? null : feature, payload, fallbackPoints);
  const points = hasExplicitPoints ? Number(explicitPoints) : quotedPoints;

  if (!Number.isFinite(Number(points))) return null;

  return (
    <span
      className={`billing-points ${className}`.trim()}
      aria-label={`预计扣费 ${points} 积分`}
      title={`预计扣费 ${points} 积分`}
    >
      {points}
    </span>
  );
}
