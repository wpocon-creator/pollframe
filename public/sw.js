const VERSION = "pollframe-app-v24";
const SHELL_CACHE = `${VERSION}-shell`;
const RUNTIME_CACHE = `${VERSION}-runtime`;
const DATA_CACHE = `${VERSION}-data`;
const OFFLINE_READY_URL = new URL("/__pollframe-offline-ready__", self.location.origin).href;
const SHELL = [
  "/manifest-context.js",
  "/manifest.webmanifest",
  "/pollframe-mark.svg",
  "/pollframe-app-192.png",
  "/pollframe-app-512.png",
  "/pollframe-maskable-512.png"
];
const CORE_DATA = [
  "/regions.json",
  "/state-map-data.json",
  "/uk-summary.json",
  "/spain-summary.json",
  "/data/approval.json",
];
const COUNTRY_DATA = {
  de: [
    "/data/bundestag.json",
    "/data/baden-wuerttemberg.json",
    "/data/bayern.json",
    "/data/berlin.json",
    "/data/brandenburg.json",
    "/data/bremen.json",
    "/data/hamburg.json",
    "/data/hessen.json",
    "/data/mecklenburg-vorpommern.json",
    "/data/niedersachsen.json",
    "/data/nordrhein-westfalen.json",
    "/data/rheinland-pfalz.json",
    "/data/saarland.json",
    "/data/sachsen.json",
    "/data/sachsen-anhalt.json",
    "/data/schleswig-holstein.json",
    "/data/thueringen.json",
  ],
  uk: [
    "/data/uk-westminster.json",
    "/data/uk-westminster-polls.json",
    "/data/uk-constituencies.json",
  ],
  es: [
    "/data/spain-congress.json",
    "/data/spain-autonomies.geojson",
    "/data/spain-regions.json",
  ],
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

async function cacheDataPaths(paths) {
  const dataCache = await caches.open(DATA_CACHE);
  const results = await Promise.all([...new Set(paths)].map(async (path) => {
    try {
      const response = await fetch(path);
      if (!response.ok) return false;
      await dataCache.put(new URL(path, self.location.origin).href, response);
      return true;
    } catch {
      return false;
    }
  }));
  return results.every(Boolean);
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
  if (!await cacheDataPaths(CORE_DATA)) throw new Error("Core offline data could not be cached");
}

async function prefetchCountry(country) {
  return cacheDataPaths(COUNTRY_DATA[country] ?? COUNTRY_DATA.de);
}

async function prefetchOfflineApp() {
  const complete = await cacheDataPaths([
    ...CORE_DATA,
    ...Object.values(COUNTRY_DATA).flat(),
  ]);
  const dataCache = await caches.open(DATA_CACHE);
  if (complete) {
    await dataCache.put(OFFLINE_READY_URL, new Response(JSON.stringify({ version: VERSION, cachedAt: new Date().toISOString() }), {
      headers: { "content-type": "application/json" },
    }));
  } else {
    await dataCache.delete(OFFLINE_READY_URL);
  }
  const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
  clients.forEach((client) => client.postMessage({ type: "POLLFRAME_OFFLINE_READY", ready: complete }));
}

self.addEventListener("install", (event) => {
  event.waitUntil(installAppShell().then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(Promise.all([
    caches.keys().then((keys) => Promise.all(
      keys.filter((key) => key.startsWith("pollframe-app-") && ![SHELL_CACHE, RUNTIME_CACHE, DATA_CACHE].includes(key))
        .map((key) => caches.delete(key)),
    )),
    self.registration.navigationPreload?.enable().catch(() => {}),
    self.clients.claim(),
  ]));
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
  if (event.data?.type === "PREFETCH_COUNTRY") event.waitUntil(prefetchCountry(event.data.country));
  if (event.data?.type === "PREFETCH_OFFLINE_APP") event.waitUntil(prefetchOfflineApp());
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
    || url.pathname === "/spain-summary.json"
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
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), data ? 4500 : 10000);
  try {
    const response = await fetch(request, { signal: controller.signal });
    if (response.ok) {
      try { await cache.put(request, response.clone()); } catch { /* Never discard a valid network response because cache storage raced or filled up. */ }
    }
    return response;
  } catch (error) {
    const cached = await cache.match(request, { ignoreSearch: request.mode === "navigate", ignoreVary: true });
    if (!cached) throw error;
    if (data) await notifyCachedData();
    return cached;
  } finally {
    clearTimeout(timeout);
  }
}

async function navigationResponse(event) {
  const preloaded = await event.preloadResponse;
  if (preloaded) {
    if (preloaded.ok) {
      const cache = await caches.open(SHELL_CACHE);
      try { await cache.put(event.request, preloaded.clone()); } catch { /* Return the preloaded page even if cache storage is unavailable. */ }
    }
    return preloaded;
  }
  return networkFirst(event.request, SHELL_CACHE);
}

async function cacheFirst(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cached = await caches.match(request, { ignoreVary: true });
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) {
    try { await cache.put(request, response.clone()); } catch { /* The network response remains usable without a runtime-cache write. */ }
  }
  return response;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET" || request.headers.has("range")) return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname === "/embed.html") return;

  if (request.mode === "navigate") {
    event.respondWith(navigationResponse(event).catch(() => caches.match("/")));
    return;
  }
  if (isDataRequest(url)) {
    event.respondWith(networkFirst(request, DATA_CACHE, { data: true }));
    return;
  }
  if (isStaticAsset(url)) event.respondWith(cacheFirst(request));
});
