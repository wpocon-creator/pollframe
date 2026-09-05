import {
  isPublicContentPath,
  publicCountryPath,
  publicPagePath,
  publicRegionPath,
  publicViewPath,
} from "../src/public-routes.js";
import { SITE_ORIGIN, LEGACY_SITE_ORIGIN } from "../src/site-origin.js";

function legacyAppRequest(request, url) {
  return url.origin === LEGACY_SITE_ORIGIN && (
    request.headers.get("x-pollframe-app") === "1"
    || request.headers.has("service-worker-navigation-preload")
    || url.searchParams.get("view") === "watchlist"
    || ["app", "shortcut"].includes(url.searchParams.get("source"))
  );
}

export function domainRedirect(request) {
  if (!["GET", "HEAD"].includes(request.method)) return null;
  const url = new URL(request.url);
  const knownHost = ["pollframe.com", "www.pollframe.com", "de.pollframe.workers.dev"].includes(url.hostname);
  if (!knownHost) return null;
  // Assets, APIs and existing embeds must remain same-origin for old apps and
  // published iframes. Public documents move; no browser preferences are copied.
  const documentPath = isPublicContentPath(url.pathname) || url.pathname === "/index.html";
  const wwwDocument = url.hostname === "www.pollframe.com" && ["/embed.html", "/robots.txt", "/sitemap.xml"].includes(url.pathname);
  if (!documentPath && !wwwDocument) return null;
  if (legacyAppRequest(request, url)) return null;
  const target = legacyPublicRedirect(url) ?? new URL(url);
  target.protocol = "https:";
  target.hostname = "pollframe.com";
  target.port = "";
  if (target.pathname === "/index.html") target.pathname = "/";
  return target.href === url.href ? null : target;
}

function domainHtml(html, requestUrl, env) {
  const token = requestUrl.origin === LEGACY_SITE_ORIGIN
    ? "4e1831c7e0754afa811e25e2a7a07943"
    : requestUrl.origin === SITE_ORIGIN ? env.WEB_ANALYTICS_TOKEN : "";
  const beacon = /^[a-f0-9]{32}$/.test(token ?? "")
    ? `<script type="module" src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token":"${token}"}'></script>`
    : "";
  return html.replace("<!-- pollframe-web-analytics -->", beacon);
}

const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
  "x-content-type-options": "nosniff",
  "x-robots-tag": "noindex, nofollow, noarchive",
};

const LIVE_DATA_BASE = "https://raw.githubusercontent.com/wpocon-creator/pollframe/main/public";
const LIVE_DATA_ROOTS = new Set([
  "/poll-data.json",
  "/regions.json",
  "/state-map-data.json",
  "/uk-summary.json",
  "/spain-summary.json",
]);
const LIVE_DATA_MAX_BYTES = 30 * 1024 * 1024;

const STATE_NAMES = {
  "baden-wuerttemberg": "Baden-Württemberg",
  bayern: "Bayern",
  berlin: "Berlin",
  brandenburg: "Brandenburg",
  bremen: "Bremen",
  hamburg: "Hamburg",
  hessen: "Hessen",
  "mecklenburg-vorpommern": "Mecklenburg-Vorpommern",
  niedersachsen: "Niedersachsen",
  "nordrhein-westfalen": "Nordrhein-Westfalen",
  "rheinland-pfalz": "Rheinland-Pfalz",
  saarland: "Saarland",
  sachsen: "Sachsen",
  "sachsen-anhalt": "Sachsen-Anhalt",
  "schleswig-holstein": "Schleswig-Holstein",
  thueringen: "Thüringen",
};

const SEO_ROUTES = {
  "/countries": {
    lang: "de",
    title: "Wahlumfragen nach Land: Deutschland, UK und Spanien · Pollframe",
    description: "Aktuelle Wahlumfragen, historische Trends, Karten und politische Daten für Deutschland, das Vereinigte Königreich und Spanien.",
    heading: "Wahlumfragen nach Land",
    paragraphs: [
      "Pollframe bündelt aktuelle Wahlumfragen und langfristige Entwicklungen für Deutschland, das Vereinigte Königreich und Spanien.",
      "Jede Länderansicht dokumentiert Aktualität, Methodik und Originalquellen der dargestellten Daten.",
    ],
    links: [["Deutschland", "/"], ["United Kingdom", "/uk"], ["España", "/es"]],
  },
  "/de/bundestag/umfragen": {
    lang: "de",
    title: "Bundestagswahl-Umfragen und aktuelle Sonntagsfrage · Pollframe",
    description: "Aktuelle Sonntagsfrage zur Bundestagswahl mit neuester Umfrage, langfristigem Verlauf, Institutsvergleich, Ereignissen und modellierter Sitzverteilung.",
    heading: "Aktuelle Sonntagsfrage und Bundestagswahl-Umfragen",
    paragraphs: [
      "Die Pollframe-Übersicht zeigt die jüngste veröffentlichte Bundestagswahl-Umfrage und den langfristigen Verlauf der deutschen Wahlabsicht.",
      "Institute, Erhebungszeiträume, Ereignisse und die rechnerische Sitzverteilung sind nachvollziehbar dokumentiert und lassen sich für Veröffentlichungen exportieren.",
    ],
    links: [["Deutschland im Überblick", "/"], ["Kanzler- und Regierungszufriedenheit", "/de/regierung/zufriedenheit"], ["Quellen und Lizenzen", "/sources"]],
  },
  "/de/bundeslaender/karte": {
    lang: "de",
    title: "Wahlumfragen der Bundesländer auf einer Deutschlandkarte · Pollframe",
    description: "Aktuelle Parteistärken und Wahlumfragen der 16 Bundesländer auf einer interaktiven Deutschlandkarte vergleichen.",
    heading: "Wahlumfragen der deutschen Bundesländer",
    paragraphs: [
      "Die Deutschlandkarte vergleicht veröffentlichte Wahlumfragen aller 16 Bundesländer und führt direkt zu den jeweiligen Landtagswahl-Seiten.",
      "Datenlücken und unterschiedliche Aktualität bleiben sichtbar; Werte werden nicht geschätzt, wenn keine passende Umfrage vorliegt.",
    ],
    links: [["Bundestagswahl-Umfragen", "/de/bundestag/umfragen"], ["Alle Länder", "/countries"], ["Methodik und Quellen", "/sources"]],
  },
  "/de/regierung/zufriedenheit": {
    lang: "de",
    title: "Kanzlerzufriedenheit und Regierungszufriedenheit Deutschland · Pollframe",
    description: "Aktuelle und historische Kanzler- und Regierungszufriedenheit in Deutschland mit Amtszeiten, Ereignissen, Methodik und Quellen.",
    heading: "Kanzler- und Regierungszufriedenheit in Deutschland",
    paragraphs: [
      "Pollframe zeigt veröffentlichte positive und negative Bewertungen von Bundeskanzler und Bundesregierung im Zeitverlauf.",
      "Regierungswechsel und politische Ereignisse werden zeitlich eingeordnet; Fragestellung, Institute und Quellen stehen in der Information zur Grafik.",
    ],
    links: [["Deutschland im Überblick", "/"], ["Bundestagswahl-Umfragen", "/de/bundestag/umfragen"], ["Redaktionelle Standards", "/editorial-standards"]],
  },
  "/uk": {
    lang: "en",
    title: "Latest UK election polls and constituency results · Pollframe",
    description: "Latest Westminster voting-intention polls, polling history since 1943 and official 2024 constituency results for the United Kingdom.",
    heading: "UK election polls and results",
    paragraphs: [
      "Pollframe presents the latest Westminster voting-intention trend, a polling archive dating back to 1943 and official constituency results from the 2024 general election.",
      "The polling series covers Great Britain, while the election map and constituency finder cover the full United Kingdom; that distinction is stated on each relevant view.",
    ],
    links: [["Westminster polling trend", "/uk/westminster/polls"], ["Constituency results", "/uk/constituencies"], ["Sources and licences", "/sources"]],
  },
  "/uk/westminster/polls": {
    lang: "en",
    title: "UK Westminster polls: latest voting-intention trend · Pollframe",
    description: "Weighted UK Westminster voting-intention trend, individual pollsters, political events and a polling archive dating back to 1943.",
    heading: "UK Westminster voting-intention polls",
    paragraphs: [
      "The main view shows the latest weighted Westminster polling trend alongside individual pollsters and the underlying publication dates.",
      "The historical chart reaches back to 1943 and separates election markers from sourced political events so that changes can be interpreted without treating correlation as proof of cause.",
    ],
    links: [["UK overview", "/uk"], ["Constituency results", "/uk/constituencies"], ["Editorial standards", "/editorial-standards"]],
  },
  "/uk/constituencies": {
    lang: "en",
    title: "UK constituency results 2024 and postcode finder · Pollframe",
    description: "Search all 650 UK constituencies and view official party results from the 2024 general election.",
    heading: "UK constituency results and postcode finder",
    paragraphs: [
      "Search by constituency or postcode to open the official 2024 general-election result for any of the United Kingdom's 650 constituencies.",
      "Results distinguish vote share, winning party and electorate and link back to the documented official source.",
    ],
    links: [["UK overview", "/uk"], ["Westminster polls", "/uk/westminster/polls"], ["Sources and licences", "/sources"]],
  },
  "/es": {
    lang: "es",
    title: "Encuestas electorales de España y datos políticos · Pollframe",
    description: "Encuestas nacionales de España desde 1996, evolución de la intención de voto, preocupaciones públicas y datos de las comunidades autónomas.",
    heading: "Encuestas electorales y datos políticos de España",
    paragraphs: [
      "Pollframe reúne la intención de voto nacional, su evolución histórica desde 1996 y datos políticos de las comunidades autónomas.",
      "La fecha de publicación, el trabajo de campo, la metodología y las fuentes originales se muestran junto a cada estadística.",
    ],
    links: [["Encuestas nacionales", "/es/encuestas"], ["Qué preocupa a España", "/es/preocupaciones"], ["Fuentes y licencias", "/sources"]],
  },
  "/es/encuestas": {
    lang: "es",
    title: "Encuestas electorales de España: intención de voto actual · Pollframe",
    description: "Últimas encuestas electorales de España, media y evolución desde 1996, comparación entre institutos, acontecimientos y reparto estimado de escaños.",
    heading: "Encuestas electorales de España",
    paragraphs: [
      "La página muestra la última intención de voto publicada y la evolución de las encuestas electorales españolas desde 1996.",
      "Se pueden comparar institutos y periodos, consultar acontecimientos documentados y exportar gráficos con su nota de fuente.",
    ],
    links: [["España", "/es"], ["Qué preocupa a España", "/es/preocupaciones"], ["Estándares editoriales", "/editorial-standards"]],
  },
  "/es/preocupaciones": {
    lang: "es",
    title: "Principales problemas y preocupaciones de España · Pollframe",
    description: "Problemas que más preocupan en España, preocupaciones personales y percepción de la economía según el barómetro del CIS.",
    heading: "Qué preocupa a España",
    paragraphs: [
      "Esta página compara los problemas que la ciudadanía considera más importantes para España con sus preocupaciones personales.",
      "También muestra cómo se valora la situación económica personal y la del país, manteniendo visibles la pregunta, la muestra y el trabajo de campo del CIS.",
    ],
    links: [["España", "/es"], ["Encuestas electorales", "/es/encuestas"], ["Fuentes y licencias", "/sources"]],
  },
  "/sources": {
    lang: "de",
    title: "Datenquellen, Methodik und Lizenzen · Pollframe",
    description: "Dokumentation der Pollframe-Datenquellen, Verarbeitungsschritte, offenen Lizenzen und Quellenhinweise für Grafiken und Wahldaten.",
    heading: "Datenquellen, Methodik und Lizenzen",
    paragraphs: [
      "Pollframe dokumentiert für jede Darstellung, woher die Daten stammen, wie sie verarbeitet wurden und welche Nutzungs- oder Lizenzhinweise gelten.",
      "Amtliche Wahlergebnisse, offene Datensätze und Umfragequellen bleiben voneinander getrennt; weiterführende Originalquellen sind direkt verlinkt.",
    ],
    links: [["Deutschland", "/"], ["United Kingdom", "/uk"], ["España", "/es"], ["Redaktionelle Standards", "/editorial-standards"]],
  },
  "/editorial-standards": {
    lang: "de",
    title: "Redaktionelle Standards und Korrekturen · Pollframe",
    description: "Pollframes Regeln für Datenaktualisierung, Ereignisauswahl, Korrekturen, Quellen und transparente statistische Darstellung.",
    heading: "Redaktionelle Standards von Pollframe",
    paragraphs: [
      "Die redaktionellen Standards erklären, wie Pollframe Umfragen, Wahlergebnisse, Ereignisse und Aktualitätsangaben auswählt und darstellt.",
      "Korrekturen werden nachvollziehbar vorgenommen; parteipolitische Bewertungen und unbelegte Kausalbehauptungen gehören nicht zur Datenaufbereitung.",
    ],
    links: [["Quellen und Lizenzen", "/sources"], ["Deutschland", "/"], ["United Kingdom", "/uk"], ["España", "/es"]],
  },
};

function stateSeoRoute(pathname) {
  const match = pathname.match(/^\/de\/landtagswahl\/([a-z0-9-]+)\/umfragen\/?$/);
  const name = match ? STATE_NAMES[match[1]] : null;
  if (!name) return null;
  return {
    lang: "de",
    title: `${name}: aktuelle Landtagswahl-Umfragen · Pollframe`,
    description: `Aktuelle Umfragen zur Landtagswahl in ${name} mit veröffentlichten Einzelwerten, langfristigem Verlauf, Parteien und Quellen.`,
    heading: `Landtagswahl-Umfragen in ${name}`,
    paragraphs: [
      `Pollframe zeigt die jüngsten veröffentlichten Wahlumfragen für ${name} und ordnet sie in den verfügbaren historischen Verlauf ein.`,
      "Jeder Umfragepunkt behält Institut und Veröffentlichungsdatum; Datenlücken werden sichtbar gelassen und nicht durch erfundene Werte ersetzt.",
    ],
    links: [["Deutschland im Überblick", "/"], ["Karte der Bundesländer", "/de/bundeslaender/karte"], ["Quellen und Lizenzen", "/sources"]],
  };
}

function seoRoute(pathname) {
  const normalized = pathname !== "/" ? pathname.replace(/\/+$/, "") : pathname;
  return SEO_ROUTES[normalized] ?? stateSeoRoute(normalized);
}

function legacyPublicRedirect(requestUrl) {
  if (requestUrl.pathname !== "/" || !requestUrl.search) return null;
  const query = new URLSearchParams(requestUrl.search);
  const region = query.get("region");
  const view = query.get("view");
  const country = query.get("country");
  const page = query.get("page");
  let pathname = null;
  const routeKeys = [];

  if (region && (region === "bundestag" || region === "uk-westminster" || region === "spain-congress" || STATE_NAMES[region])) {
    pathname = publicRegionPath(region);
    routeKeys.push("region");
  } else if (page === "lizenzen" || page === "redaktion") {
    pathname = publicPagePath(page);
    routeKeys.push("page");
  } else if (view === "approval" && country === "de") {
    pathname = publicViewPath("approval", "de");
    routeKeys.push("view", "country");
  } else if (view === "map" && !country) {
    pathname = publicViewPath("map");
    routeKeys.push("view");
  } else if (view === "countries") {
    pathname = publicViewPath("countries");
    routeKeys.push("view");
  } else if (view === "uk-constituencies") {
    pathname = publicViewPath("uk-constituencies");
    routeKeys.push("view", "country");
  } else if (view === "spain-issues" && country === "es") {
    pathname = publicViewPath("spain-issues", "es");
    routeKeys.push("view", "country");
  } else if (!view && !region && !page && ["uk", "es"].includes(country)) {
    pathname = publicCountryPath(country);
    routeKeys.push("country");
  } else if (!view && !region && !page && country === "de") {
    pathname = "/";
    routeKeys.push("country");
  }

  if (!pathname) return null;
  for (const key of routeKeys) query.delete(key);
  const target = new URL(pathname, requestUrl.origin);
  target.search = query.toString();
  return target;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character]));
}

function seoFallback(route) {
  const paragraphs = route.paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("");
  const links = route.links.map(([label, href]) => `<a href="${escapeHtml(href)}">${escapeHtml(label)}</a>`).join(" · ");
  return `<noscript><main><h1>${escapeHtml(route.heading)}</h1>${paragraphs}<nav aria-label="Weitere Pollframe-Seiten">${links}</nav></main></noscript>`;
}

async function seoPageResponse(request, env, route) {
  const requestUrl = new URL(request.url);
  const canonicalUrl = `${SITE_ORIGIN}${requestUrl.pathname.replace(/\/+$/, "") || "/"}`;
  const shellRequest = new Request(`${requestUrl.origin}/`, { method: "GET", headers: request.headers });
  const shell = await env.ASSETS.fetch(shellRequest);
  const contentType = shell.headers.get("content-type") ?? "";
  if (!shell.ok || !contentType.includes("text/html")) return shell;
  let html = await shell.text();
  html = domainHtml(html, requestUrl, env);
  const socialImage = `${SITE_ORIGIN}/pollframe-social.png`;
  if (route) {
  const openGraphLocale = route.lang === "es" ? "es_ES" : route.lang === "en" ? "en_GB" : "de_DE";
  html = html
    .replace(/<html lang="[^"]+">/, `<html lang="${escapeHtml(route.lang)}">`)
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeHtml(route.title)}</title>`)
    .replace(/<meta\s+name="description"[\s\S]*?\/>/, `<meta name="description" content="${escapeHtml(route.description)}" />`)
    .replace(/<meta property="og:title"[^>]*\/>/, `<meta property="og:title" content="${escapeHtml(route.title)}" />`)
    .replace(/<meta property="og:locale"[^>]*\/>/, `<meta property="og:locale" content="${openGraphLocale}" />`)
    .replace(/<meta\s+property="og:description"[\s\S]*?\/>/, `<meta property="og:description" content="${escapeHtml(route.description)}" />`)
    .replace(/<meta property="og:url"[^>]*\/>/, `<meta property="og:url" content="${escapeHtml(canonicalUrl)}" />`)
    .replace(/<meta property="og:image"[^>]*\/>/, `<meta property="og:image" content="${escapeHtml(socialImage)}" />`)
    .replace(/<meta name="twitter:title"[^>]*\/>/, `<meta name="twitter:title" content="${escapeHtml(route.title)}" />`)
    .replace(/<meta\s+name="twitter:description"[\s\S]*?\/>/, `<meta name="twitter:description" content="${escapeHtml(route.description)}" />`)
    .replace(/<meta name="twitter:image"[^>]*\/>/, `<meta name="twitter:image" content="${escapeHtml(socialImage)}" />`)
    .replace(/<link rel="canonical"[^>]*\/>/, `<link rel="canonical" href="${escapeHtml(canonicalUrl)}" />`)
    .replace(/<noscript>[\s\S]*?<\/noscript>/, seoFallback(route));
  }
  const headers = new Headers(shell.headers);
  headers.set("content-type", "text/html; charset=utf-8");
  if (route) headers.set("content-language", route.lang);
  headers.set("cache-control", "public, max-age=0, must-revalidate");
  headers.set("x-content-type-options", "nosniff");
  if (requestUrl.origin === LEGACY_SITE_ORIGIN) {
    headers.set("cache-control", "private, no-store");
    headers.set("vary", "Service-Worker-Navigation-Preload, X-Pollframe-App");
  }
  headers.delete("etag");
  headers.delete("content-length");
  return new Response(request.method === "HEAD" ? null : html, { status: 200, headers });
}

export function isLiveDataPath(pathname) {
  if (LIVE_DATA_ROOTS.has(pathname)) return true;
  return /^\/data\/[a-z0-9-]+\.(?:json|geojson)$/.test(pathname);
}

async function liveDataResponse(request, env) {
  const requestUrl = new URL(request.url);
  const upstreamUrl = `${LIVE_DATA_BASE}${requestUrl.pathname}`;
  try {
    const response = await fetch(upstreamUrl, {
      headers: { Accept: "application/json" },
      cf: { cacheEverything: true, cacheTtl: 300 },
      signal: AbortSignal.timeout(5_000),
    });
    const declaredLength = Number(response.headers.get("content-length"));
    const contentType = response.headers.get("content-type") ?? "";
    if (!response.ok
      || (Number.isFinite(declaredLength) && declaredLength > LIVE_DATA_MAX_BYTES)
      || !/(?:application\/json|text\/plain)/i.test(contentType)) {
      throw new Error(`Live data origin rejected: HTTP ${response.status}`);
    }
    const headers = new Headers(response.headers);
    headers.set("content-type", requestUrl.pathname.endsWith(".geojson") ? "application/geo+json; charset=utf-8" : "application/json; charset=utf-8");
    headers.set("cache-control", "public, max-age=60, s-maxage=300, stale-while-revalidate=1800");
    headers.set("x-content-type-options", "nosniff");
    headers.set("x-robots-tag", "noindex, noarchive");
    headers.set("x-pollframe-data-release", "github-main");
    return new Response(request.method === "HEAD" ? null : response.body, { status: response.status, headers });
  } catch {
    return env.ASSETS.fetch(request);
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: JSON_HEADERS });
}

function clean(value, maximum) {
  return String(value ?? "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim().slice(0, maximum);
}

function sameOrigin(request) {
  const origin = request.headers.get("origin");
  if (!origin) return request.headers.get("sec-fetch-site") === "same-origin";
  try { return new URL(origin).host === new URL(request.url).host; } catch { return false; }
}

async function fingerprint(request, secret) {
  const address = request.headers.get("cf-connecting-ip") ?? "unknown";
  const bytes = new TextEncoder().encode(`${address}:${secret || "pollframe-report-rate"}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].slice(0, 12).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function authorised(request, env) {
  const expected = clean(env.BUG_REPORT_ADMIN_KEY, 256);
  const supplied = clean(request.headers.get("x-pollframe-admin-key"), 256);
  if (!expected || !supplied) return false;
  const encode = (value) => crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  const [left, right] = await Promise.all([encode(expected), encode(supplied)]);
  const leftBytes = new Uint8Array(left);
  const rightBytes = new Uint8Array(right);
  let difference = 0;
  for (let index = 0; index < leftBytes.length; index += 1) difference |= leftBytes[index] ^ rightBytes[index];
  return difference === 0;
}

export class BugReportStore {
  constructor(state) {
    this.state = state;
  }

  async fetch(request) {
    const url = new URL(request.url);
    if (request.method === "POST") return this.create(request);
    if (request.method === "GET") return this.list(url);
    if (request.method === "PATCH") return this.update(request);
    return json({ error: "Method not allowed" }, 405);
  }

  async listAll(prefix) {
    const entries = [];
    let startAfter;
    while (true) {
      const batch = await this.state.storage.list({ prefix, startAfter, limit: 1000 });
      entries.push(...batch.entries());
      if (batch.size < 1000) break;
      startAfter = [...batch.keys()].at(-1);
    }
    return entries;
  }

  async cleanup(now = Date.now()) {
    const rates = await this.listAll("rate:");
    const reports = await this.listAll("report:");
    const removals = [];
    for (const [key, times] of rates) if (!(times ?? []).some((time) => now - time < 3_600_000)) removals.push(key);
    for (const [key, report] of reports) if (now - Date.parse(report.createdAt) > 31_536_000_000) removals.push(key);
    if (removals.length) await this.state.storage.delete(removals);
  }

  async alarm() {
    await this.cleanup();
  }

  async create(request) {
    const rateId = clean(request.headers.get("x-pollframe-rate-id"), 64);
    const now = Date.now();
    const rateKey = `rate:${rateId}`;
    const recent = (await this.state.storage.get(rateKey) ?? []).filter((time) => now - time < 3_600_000);
    if (recent.length >= 5) return json({ error: "Too many reports. Please try again later." }, 429);

    let body;
    try { body = await request.json(); } catch { return json({ error: "Invalid report" }, 400); }
    if (body.website) return json({ ok: true });
    const allowedTypes = new Set(["data", "visual", "interaction", "clarity", "translation", "other"]);
    const type = allowedTypes.has(body.type) ? body.type : "other";
    const message = clean(body.message, 1200);
    let page;
    try {
      const parsedPage = new URL(clean(body.page, 1200));
      if (!["http:", "https:"].includes(parsedPage.protocol)) throw new Error("Invalid protocol");
      page = parsedPage.toString();
    } catch { return json({ error: "Invalid page" }, 400); }

    const id = crypto.randomUUID();
    const report = {
      id,
      type,
      message,
      page,
      locale: clean(body.locale, 12),
      viewport: clean(body.viewport, 40),
      userAgent: clean(body.userAgent, 320),
      createdAt: new Date(now).toISOString(),
      status: "new",
    };
    await this.state.storage.put(`report:${now}:${id}`, report);
    await this.state.storage.put(rateKey, [...recent, now]);
    const currentAlarm = await this.state.storage.getAlarm();
    if (!currentAlarm || currentAlarm > now + 3_700_000) await this.state.storage.setAlarm(now + 3_700_000);
    return json({ ok: true, id }, 201);
  }

  async list(url) {
    await this.cleanup();
    const entries = await this.listAll("report:");
    const reports = entries.map(([, report]) => report).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const typeCounts = {};
    const statusCounts = {};
    const dayCounts = {};
    for (const report of reports) {
      typeCounts[report.type] = (typeCounts[report.type] ?? 0) + 1;
      statusCounts[report.status] = (statusCounts[report.status] ?? 0) + 1;
      const day = report.createdAt.slice(0, 10);
      dayCounts[day] = (dayCounts[day] ?? 0) + 1;
    }
    const requestedStatus = clean(url.searchParams.get("status"), 20);
    const filtered = requestedStatus && requestedStatus !== "all" ? reports.filter((report) => report.status === requestedStatus) : reports;
    return json({ reports: filtered, stats: { total: reports.length, typeCounts, statusCounts, dayCounts } });
  }

  async update(request) {
    let body;
    try { body = await request.json(); } catch { return json({ error: "Invalid update" }, 400); }
    const id = clean(body.id, 64);
    const status = clean(body.status, 20);
    if (!id || !["new", "reviewing", "resolved", "archived"].includes(status)) return json({ error: "Invalid update" }, 400);
    const entries = await this.listAll("report:");
    const match = entries.find(([, report]) => report.id === id);
    if (!match) return json({ error: "Report not found" }, 404);
    await this.state.storage.put(match[0], { ...match[1], status, updatedAt: new Date().toISOString() });
    return json({ ok: true });
  }
}

const ANALYTICS_EVENTS = new Set([
  "install_prompt_accepted",
  "install_completed",
  "ios_install_instructions_opened",
  "app_opened_standalone",
  "engaged_60_seconds",
  "country_switch_de",
  "country_switch_uk",
  "country_switch_es",
  "country_switch_all",
  "view_country_de",
  "view_country_uk",
  "view_country_es",
  "view_country_all",
  "view_history_de",
  "view_history_uk",
  "view_history_es",
  "view_map_de",
  "view_map_uk",
  "view_map_es",
  "view_issues_uk",
  "view_issues_es",
  "view_approval_de",
  "view_watchlist",
  "png_dialog_opened",
  "png_export_downloaded",
  "png_export_shared",
  "share_dialog_opened",
  "share_link_copied",
  "embed_code_copied",
  "source_note_copied",
  "csv_downloaded",
]);
const ANALYTICS_RETENTION_DAYS = 400;

export class AnalyticsStore {
  constructor(state) {
    this.state = state;
  }

  async cleanup(now = Date.now()) {
    const oldestDay = new Date(now - ANALYTICS_RETENTION_DAYS * 86_400_000).toISOString().slice(0, 10);
    const days = await this.state.storage.list({ prefix: "day:" });
    const expired = [...days.keys()].filter((key) => key.slice(4) < oldestDay);
    if (expired.length) await this.state.storage.delete(expired);
  }

  async fetch(request) {
    if (request.method === "POST") {
      let body;
      try { body = await request.json(); } catch { return json({ error: "Invalid event" }, 400); }
      const event = clean(body.event, 48);
      if (!ANALYTICS_EVENTS.has(event)) return json({ error: "Invalid event" }, 400);
      const day = new Date().toISOString().slice(0, 10);
      const key = `day:${day}`;
      await this.state.storage.transaction(async (transaction) => {
        const counts = await transaction.get(key) ?? {};
        counts[event] = (counts[event] ?? 0) + 1;
        await transaction.put(key, counts);
      });
      await this.cleanup();
      return new Response(null, { status: 204, headers: { "cache-control": "no-store" } });
    }
    if (request.method === "GET") {
      await this.cleanup();
      const entries = await this.state.storage.list({ prefix: "day:" });
      const days = Object.fromEntries([...entries.entries()].map(([key, counts]) => [key.slice(4), counts]));
      const totals = {};
      for (const counts of Object.values(days)) {
        for (const [event, count] of Object.entries(counts)) totals[event] = (totals[event] ?? 0) + count;
      }
      return json({
        totals,
        days,
        definitions: {
          install_completed: "Browser-confirmed completed PWA installations (supported browsers only)",
          install_prompt_accepted: "Install prompts accepted; may precede or duplicate a completed-install event",
          ios_install_instructions_opened: "iOS installation instructions opened; not proof of installation",
          app_opened_standalone: "Pollframe opened in installed standalone display mode; counts launches, not unique people",
          engaged_60_seconds: "Pollframe remained visibly open for at least 60 seconds; counts page sessions, not unique people",
          country_switch_de: "Country menu navigations to Germany",
          country_switch_uk: "Country menu navigations to the UK",
          country_switch_es: "Country menu navigations to Spain",
          country_switch_all: "Country menu navigations to the all-countries page",
          view_country_de: "Germany overview opened",
          view_country_uk: "United Kingdom overview opened",
          view_country_es: "Spain overview opened",
          view_country_all: "All-countries overview opened",
          view_history_de: "German historical polling page opened",
          view_history_uk: "UK historical polling page opened",
          view_history_es: "Spanish historical polling page opened",
          view_map_de: "German election map opened",
          view_map_uk: "UK election map opened",
          view_map_es: "Spanish election map or regional view opened",
          view_issues_uk: "UK issues page opened",
          view_issues_es: "Spanish issues page opened",
          view_approval_de: "German government or leader approval page opened",
          view_watchlist: "Installed-app Watchlist opened",
          png_dialog_opened: "PNG export chooser opened",
          png_export_downloaded: "PNG file download started after successful rendering",
          png_export_shared: "PNG passed to the operating-system share sheet after successful rendering",
          share_dialog_opened: "Share and embed dialog opened",
          share_link_copied: "A configured Pollframe link was copied",
          embed_code_copied: "Embed code was copied",
          source_note_copied: "A source note was copied",
          csv_downloaded: "A CSV download was started",
        },
        retentionDays: ANALYTICS_RETENTION_DAYS,
      });
    }
    return json({ error: "Method not allowed" }, 405);
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const domainTarget = domainRedirect(request);
    if (domainTarget) return new Response(null, {
      status: 308,
      headers: { location: domainTarget.href, "cache-control": "private, no-store" },
    });
    if (["GET", "HEAD"].includes(request.method)) {
      const redirect = legacyPublicRedirect(url);
      if (redirect) return Response.redirect(redirect, 308);
    }
    if (["GET", "HEAD"].includes(request.method) && isPublicContentPath(url.pathname)) {
      const route = seoRoute(url.pathname);
      if (route || url.pathname === "/") return seoPageResponse(request, env, route);
    }
    if (["GET", "HEAD"].includes(request.method) && isLiveDataPath(url.pathname)) return liveDataResponse(request, env);
    if (url.pathname === "/api/analytics") {
      if (request.method === "POST") {
        if (!sameOrigin(request)) return json({ error: "Invalid origin" }, 403);
        const body = await request.text();
        if (new TextEncoder().encode(body).byteLength > 256) return json({ error: "Event too large" }, 413);
        const namespace = env.ANALYTICS_STORE.jurisdiction?.("eu") ?? env.ANALYTICS_STORE;
        const id = namespace.idFromName("pollframe-aggregate-events");
        return namespace.get(id).fetch(new Request("https://analytics-store/", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body,
        }));
      }
      if (!(await authorised(request, env))) return json({ error: "Not authorised" }, 401);
      const namespace = env.ANALYTICS_STORE.jurisdiction?.("eu") ?? env.ANALYTICS_STORE;
      const id = namespace.idFromName("pollframe-aggregate-events");
      return namespace.get(id).fetch(new Request("https://analytics-store/", { method: "GET" }));
    }
    if (!url.pathname.startsWith("/api/bug-reports")) return env.ASSETS.fetch(request);
    if (!clean(env.BUG_REPORT_ADMIN_KEY, 256)) return json({ error: "Report service is not configured" }, 503);
    if (request.method === "POST") {
      if (!sameOrigin(request)) return json({ error: "Invalid origin" }, 403);
    } else if (!(await authorised(request, env))) {
      return json({ error: "Not authorised" }, 401);
    }
    let forwardedBody;
    if (!["GET", "HEAD"].includes(request.method)) {
      forwardedBody = await request.text();
      if (new TextEncoder().encode(forwardedBody).byteLength > 12_000) return json({ error: "Report too large" }, 413);
    }
    const id = env.BUG_REPORT_STORE.idFromName("pollframe-bug-reports");
    const headers = new Headers(request.headers);
    headers.set("x-pollframe-rate-id", await fingerprint(request, env.BUG_REPORT_ADMIN_KEY));
    const forwarded = new Request(`https://bug-report-store${url.pathname}${url.search}`, {
      method: request.method,
      headers,
      body: forwardedBody,
    });
    return env.BUG_REPORT_STORE.get(id).fetch(forwarded);
  },
};
