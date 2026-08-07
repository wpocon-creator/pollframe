const VERSION = "pollframe-app-v6";
const SHELL_CACHE = `${VERSION}-shell`;
const RUNTIME_CACHE = `${VERSION}-runtime`;
const DATA_CACHE = `${VERSION}-data`;
const SHELL = [
  "/manifest-context.js",
  "/manifest.webmanifest",
  "/pollframe-mark.svg",
  "/pollframe-app-192.png",
  "/pollframe-app-512.png",
  "/pollframe-maskable-512.png"
];
const COUNTRY_DATA = {
  de: ["/", "/regions.json", "/state-map-data.json", "/data/bundestag.json"],
  uk: ["/?country=uk", "/uk-summary.json", "/data/uk-westminster.json", "/data/uk-constituencies.json"],
};

async function cacheBuiltAssetGraph(cache, initialPaths) {
  const queue = [...initialPaths];
  const visited = new Set();
  while (queue.length) {
    const path = queue.shift();
    const absolute = new URL(path, self.location.origin);
    if (absolute.origin !== self.location.origin || visited.has(absolute.href)) continue;
    visited.add(absolute.href);
    const response = await fetch(absolute.href);
    if (!response.ok) continue;
    await cache.put(absolute.href, response.clone());
    if (!absolute.pathname.endsWith(".js")) continue;
    const source = await response.text();
    for (const match of source.matchAll(/["'](\.?\/[^"']+\.(?:js|css))["']/g)) {
      queue.push(new URL(match[1], absolute.href).href);
    }
  }
}

async function installAppShell() {
  const shellCache = await caches.open(SHELL_CACHE);
  await shellCache.addAll(SHELL);
  const rootResponse = await fetch("/");
  if (!rootResponse.ok) throw new Error(`App shell returned ${rootResponse.status}`);
  await shellCache.put("/", rootResponse.clone());
  const html = await rootResponse.text();
  const builtAssets = [...html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map((match) => match[1]);
  await cacheBuiltAssetGraph(shellCache, [...new Set(builtAssets)]);

}

async function prefetchCountry(country) {
  const dataCache = await caches.open(DATA_CACHE);
  await Promise.all((COUNTRY_DATA[country] ?? COUNTRY_DATA.de).map(async (path) => {
    try {
      const response = await fetch(path);
      if (response.ok) await dataCache.put(path, response);
    } catch {
      // A temporary data failure must not prevent the app shell from installing.
    }
  }));
}

self.addEventListener("install", (event) => {
  event.waitUntil(installAppShell());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(Promise.all([
    caches.keys().then((keys) => Promise.all(
      keys.filter((key) => key.startsWith("pollframe-app-") && ![SHELL_CACHE, RUNTIME_CACHE, DATA_CACHE].includes(key))
        .map((key) => caches.delete(key)),
    )),
    self.clients.claim(),
  ]));
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
  if (event.data?.type === "PREFETCH_COUNTRY") event.waitUntil(prefetchCountry(event.data.country));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = event.notification.data?.url ?? "/?view=watchlist";
  event.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
    const existing = clients.find((client) => new URL(client.url).origin === self.location.origin);
    if (existing) return existing.focus().then(() => existing.navigate(target));
    return self.clients.openWindow(target);
  }));
});

function isDataRequest(url) {
  return url.pathname === "/poll-data.json"
    || url.pathname === "/regions.json"
    || url.pathname === "/state-map-data.json"
    || url.pathname === "/uk-summary.json"
    || url.pathname.startsWith("/data/");
}

function isStaticAsset(url) {
  return url.pathname.startsWith("/assets/")
    || /\.(?:png|svg|webmanifest)$/.test(url.pathname);
}

async function notifyCachedData() {
  const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
  clients.forEach((client) => client.postMessage({ type: "POLLFRAME_CACHED_DATA" }));
}

async function networkFirst(request, cacheName, { data = false } = {}) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response.ok) await cache.put(request, response.clone());
    return response;
  } catch (error) {
    const cached = await cache.match(request, { ignoreSearch: request.mode === "navigate", ignoreVary: true });
    if (!cached) throw error;
    if (data) await notifyCachedData();
    return cached;
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cached = await caches.match(request, { ignoreVary: true });
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) await cache.put(request, response.clone());
  return response;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET" || request.headers.has("range")) return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname === "/embed.html") return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request, SHELL_CACHE).catch(() => caches.match("/")));
    return;
  }
  if (isDataRequest(url)) {
    event.respondWith(networkFirst(request, DATA_CACHE, { data: true }));
    return;
  }
  if (isStaticAsset(url)) event.respondWith(cacheFirst(request));
});
