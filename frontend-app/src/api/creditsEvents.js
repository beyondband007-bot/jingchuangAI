const listeners = new Set();

export function emitCreditsUpdated(credits) {
  if (!credits) return;
  listeners.forEach((listener) => listener(credits));
}

export function subscribeCreditsUpdated(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
