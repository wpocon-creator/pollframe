// Development-only read-through. A long-lived feature branch must not quietly
// present its old committed polling snapshot as the current public dataset.
const STATES = [
  "baden-wuerttemberg",
  "bayern",
  "berlin",
  "brandenburg",
  "bremen",
  "hamburg",
  "hessen",
  "mecklenburg-vorpommern",
  "niedersachsen",
  "nordrhein-westfalen",
  "rheinland-pfalz",
  "saarland",
  "sachsen",
  "sachsen-anhalt",
  "schleswig-holstein",
  "thueringen",
];
const PATHS = new Set([
  "/poll-data.json",
  "/regions.json",
  "/state-map-data.json",
  "/uk-summary.json",
  "/spain-summary.json",
  ...[
    "bundestag",
    ...STATES,
    "uk-westminster",
    "uk-westminster-polls",
    "uk-constituencies",
    "spain-congress",
    "spain-regions",
  ].map((id) => `/data/${id}.json`),
]);
export const isPreviewLivePath = (path) => PATHS.has(path);
export function createPreviewLiveData({
  fetchImpl = fetch,
  now = Date.now,
  ttlMs = 120000,
  timeoutMs = 8000,
  maxBytes = 12 * 1024 * 1024,
} = {}) {
  const cache = new Map(),
    pending = new Map();
  async function load(path) {
    if (!isPreviewLivePath(path)) throw Error("Not a public preview data path");
    const previous = cache.get(path);
    if (previous && now() - previous.checkedAt < ttlMs)
      return { ...previous, source: "live-cache" };
    if (pending.has(path)) return pending.get(path);
    const task = (async () => {
      try {
        const response = await fetchImpl(`https://pollframe.com${path}`, {
          headers: { accept: "application/json" },
          redirect: "error",
          signal: AbortSignal.timeout(timeoutMs),
        });
        if (
          !response.ok ||
          !/^application\/json\b/i.test(
            response.headers.get("content-type") || "",
          )
        )
          throw Error("Public data response unavailable");
        if (Number(response.headers.get("content-length")) > maxBytes)
          throw Error("Public data too large");
        const reader = response.body?.getReader();
        if (!reader) throw Error("Empty public data response");
        const chunks = [];
        let size = 0;
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          size += value.length;
          if (size > maxBytes) {
            await reader.cancel();
            throw Error("Public data too large");
          }
          chunks.push(Buffer.from(value));
        }
        const body = Buffer.concat(chunks).toString("utf8"),
          data = JSON.parse(body);
        if (!data || typeof data !== "object" || Array.isArray(data))
          throw Error("Invalid public data");
        const record = { body, checkedAt: now() };
        cache.set(path, record);
        return { ...record, source: "live" };
      } catch {
        // A validated live copy is preferable to the older branch snapshot.
        if (previous) return { ...previous, source: "offline-live-cache" };
        return null;
      }
    })();
    pending.set(path, task);
    try {
      return await task;
    } finally {
      pending.delete(path);
    }
  }
  return { load };
}

export function previewLiveDataPlugin({ enabled = true, ...options } = {}) {
  if (!enabled) return null;
  const store = createPreviewLiveData(options);
  let offlineWarned = false;
  return {
    name: "pollframe-preview-live-data",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!["GET", "HEAD"].includes(req.method)) return next();
        const path = new URL(req.url, "http://127.0.0.1").pathname;
        if (!isPreviewLivePath(path)) return next();
        const record = await store.load(path);
        if (!record) {
          res.setHeader("X-Pollframe-Preview-Data", "local-offline-snapshot");
          if (!offlineWarned) {
            offlineWarned = true;
            server.config.logger.warn(
              "Pollframe preview: live data unreachable; using the local offline snapshot. Its survey dates may be old.",
            );
          }
          return next();
        }
        res.statusCode = 200;
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.setHeader("Cache-Control", "no-store");
        res.setHeader("X-Pollframe-Preview-Data", record.source);
        res.setHeader("X-Content-Type-Options", "nosniff");
        res.end(req.method === "HEAD" ? undefined : record.body);
      });
    },
  };
}
