const MAX_AGE_MS = 14 * 86_400_000;
const STORAGE_KEY = "pollframe-watchlist-alerts-v2";
let pending = Promise.resolve();

export function eligibleWatchlistAlerts(signals, now = Date.now()) {
  return [...new Map(signals.filter((signal) => {
    const date = Date.parse(`${signal.date}T00:00:00Z`);
    return signal.id && Number.isFinite(date) && date <= now && now - date <= MAX_AGE_MS;
  }).map((signal) => [signal.id, signal])).values()];
}

// The ledger records both displayed and already-seen changes. It survives an
// app restart; Web Locks also serialise two tabs observing the same update.
export function processWatchlistAlerts({ signals, country, storage, registration, isVisible, canNotify, now = Date.now() }) {
  const run = async () => {
    let ledger;
    try {
      const parsed = JSON.parse(storage.getItem(STORAGE_KEY) || "{}");
      ledger = Object.fromEntries(Object.entries(parsed).filter(([, date]) => Number.isFinite(date) && now - date < MAX_AGE_MS));
    } catch { return; }
    const fresh = eligibleWatchlistAlerts(signals, now).filter((signal) => !ledger[signal.id]);
    if (!fresh.length) {
      try { storage.setItem(STORAGE_KEY, JSON.stringify(ledger)); } catch { /* storage may be unavailable */ }
      return;
    }
    const seen = isVisible();
    if (!seen && !canNotify()) return;
    const worker = seen ? null : await registration();
    // A late service-worker response must not notify after the user has
    // returned and is already looking at these values.
    const visibleNow = isVisible();
    if (!visibleNow && (!worker || !canNotify())) return;
    const previous = { ...ledger };
    fresh.forEach((signal) => { ledger[signal.id] = now; });
    try { storage.setItem(STORAGE_KEY, JSON.stringify(ledger)); } catch { return; }
    if (visibleNow) return;
    try {
      await worker.showNotification("Pollframe Watchlist", {
        body: fresh.slice(0, 4).map((signal) => signal.text).join("\n"),
        icon: "/pollframe-app-v2-192.png",
        tag: `pollframe-watchlist-${country}`,
        renotify: false,
        data: { url: `/?view=watchlist&country=${country}` },
      });
    } catch {
      try { storage.setItem(STORAGE_KEY, JSON.stringify(previous)); } catch { /* retry on next successful check */ }
    }
  };
  const work = () => globalThis.navigator?.locks?.request
    ? navigator.locks.request(STORAGE_KEY, run)
    : run();
  pending = pending.then(work, work);
  return pending;
}
