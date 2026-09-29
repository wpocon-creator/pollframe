import {studioPopularity} from "./studio-popularity.js";
import {excludeAnalyticsRequest} from './analytics-quality.js';
import { publicApprovalData, isWithheldApprovalRequest, approvalUnavailableResponse } from "../src/approval-publication.js";
import { secureResponse, readBoundedBody, RequestError, isRecord, reserveAdminAttempt, rateAddress, reportPage } from "./security.js";
import {
  isPublicContentPath,
  publicCountryPath,
  publicPagePath,
  publicRegionPath,
  publicViewPath,
} from "../src/public-routes.js";
import { SITE_ORIGIN, LEGACY_SITE_ORIGIN } from "../src/site-origin.js";
import { seoPageResponse } from "./seo-response.js";
export { ElectionResultsStore } from "./election-results.js";

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
  target.pathname = target.pathname.replace(/\/{2,}/g, "/").replace(/\/+$/, "") || "/";
  if (target.pathname === "/index.html") target.pathname = "/";
  return target.href === url.href ? null : target;
}

function domainHtml(html, requestUrl, env) {
  const token = requestUrl.origin === LEGACY_SITE_ORIGIN
    ? "4e1831c7e0754afa811e25e2a7a07943"
    : requestUrl.origin === SITE_ORIGIN ? env.WEB_ANALYTICS_TOKEN : "";
  const beacon = !requestUrl.searchParams.has("token") && !requestUrl.searchParams.has("account") && /^[a-f0-9]{32}$/.test(token ?? "")
    ? `<script type="module" src="/analytics-beacon.js" data-pollframe-beacon="${token}"></script>`
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

function seoRoute(pathname) {
  const state = pathname.match(/^\/de\/landtagswahl\/([a-z-]+)\/umfragen\/?$/)?.[1];
  return state ? Object.hasOwn(STATE_NAMES, state) : isPublicContentPath(pathname);
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

  if (view === "studio") {
    pathname = "/studio";
    routeKeys.push("view");
  } else if (region && (region === "bundestag" || region === "uk-westminster" || region === "spain-congress" || STATE_NAMES[region])) {
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
    // This route fetches only public static files, with no client credentials.
    // Upstream Authorization/Cookie variation does not describe our response and
    // would correctly make the app's privacy-conscious offline cache reject it.
    // Keep encoding variation; never forward a provider's cookies to visitors.
    headers.set("vary", "Accept-Encoding");
    headers.delete("set-cookie");
    headers.set("x-content-type-options", "nosniff");
    headers.set("x-robots-tag", "noindex, noarchive");
    headers.set("x-pollframe-data-release", "github-main");
    const etag = headers.get("etag");
    const condition = request.headers.get("if-none-match");
    const unchanged = etag && condition?.split(",").some(value =>
      value.trim() === "*" || value.trim().replace(/^W\//, "") === etag.replace(/^W\//, ""));
    if (unchanged) {
      // Validate against the current upstream release, not a browser-side age
      // guess. Unchanged public data need not be downloaded again in full.
      response.body?.cancel().catch(() => {});
      headers.delete("content-length");
      return new Response(null, { status: 304, headers });
    }
    if (request.method === "HEAD") response.body?.cancel().catch(() => {});
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
  try { return new URL(origin).origin === new URL(request.url).origin; } catch { return false; }
}

async function fingerprint(request, secret) {
  const address = rateAddress(request.headers.get("cf-connecting-ip") ?? "unknown");
  const bytes = new TextEncoder().encode(`${address}:${secret || "pollframe-report-rate"}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].slice(0, 12).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function authorised(request, env) {
  const expected = env.BUG_REPORT_ADMIN_KEY;
  const supplied = request.headers.get("x-pollframe-admin-key");
  if (typeof expected !== "string" || !expected || !supplied || supplied.length > 256) return false;
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
    if (url.pathname === "/auth-attempt" && request.method === "POST") {
      const id = request.headers.get("x-pollframe-rate-id");
      if (!/^[a-f0-9]{24}$/.test(id ?? "")) return json({ error: "Invalid rate id" }, 400);
      const result = await reserveAdminAttempt(this.state.storage, id);
      const alarm = await this.state.storage.getAlarm();
      if (!alarm || alarm > Date.now() + 900_000) await this.state.storage.setAlarm(Date.now() + 900_000);
      return json(result);
    }
    if (url.pathname === "/auth-reset" && request.method === "POST") {
      const id = request.headers.get("x-pollframe-rate-id");
      if (!/^[a-f0-9]{24}$/.test(id ?? "")) return json({ error: "Invalid rate id" }, 400);
      await this.state.storage.delete(`auth:${id}`);
      return json({ ok: true });
    }
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
    const attempts = await this.listAll("auth:");
    const rates = await this.listAll("rate:");
    const reports = await this.listAll("report:");
    const removals = [];
    let nextExpiry = Infinity;
    const expiry = (key, until) => {
      if (!Number.isFinite(until) || until <= now) removals.push(key);
      else nextExpiry = Math.min(nextExpiry, until);
    };
    for (const [key, value] of attempts) expiry(key, value.until);
    for (const [key, times] of rates) expiry(key, Math.max(...(times ?? [])) + 3_600_000);
    for (const [key, report] of reports) expiry(key, Date.parse(report.createdAt) + 31_536_000_000);
    if (removals.length) await this.state.storage.delete(removals);
    return nextExpiry;
  }

  async alarm() {
    const nextExpiry = await this.cleanup();
    // Schedule the real expiry, rather than retaining identifiers until the
    // next quarter-hour/daily sweep. Preserve any earlier concurrently set alarm.
    const current = await this.state.storage.getAlarm();
    const next = Math.min(nextExpiry, current && current > Date.now() ? current : Infinity);
    if (Number.isFinite(next)) await this.state.storage.setAlarm(Math.max(Date.now() + 1000, next));
  }

  async create(request) {
    const rateId = clean(request.headers.get("x-pollframe-rate-id"), 64);
    const now = Date.now();
    const rateKey = `rate:${rateId}`;
    const admitted = await this.state.storage.transaction(async (transaction) => {
      const recent = (await transaction.get(rateKey) ?? []).filter((time) => now - time < 3_600_000);
      if (recent.length >= 5) return false;
      await transaction.put(rateKey, [...recent, now]);
      return true;
    });
    if (!admitted) return json({ error: "Too many reports. Please try again later." }, 429);
    const currentAlarm = await this.state.storage.getAlarm();
    if (!currentAlarm || currentAlarm > now + 3_600_000) await this.state.storage.setAlarm(now + 3_600_000);

    let body;
    try { body = await request.json(); } catch { return json({ error: "Invalid report" }, 400); }
    if (!isRecord(body)) return json({ error: "Invalid report" }, 400);
    if (body.website) return json({ ok: true });
    const allowedTypes = new Set(["data", "visual", "interaction", "clarity", "translation", "other"]);
    const type = allowedTypes.has(body.type) ? body.type : "other";
    const message = clean(body.message, 1200);
    let page;
    try {
      page = reportPage(clean(body.page, 1200));
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
    if (!isRecord(body)) return json({ error: "Invalid update" }, 400);
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
  'notice_studio_shown', 'notice_studio_dismissed', 'notice_studio_clicked',
  'notice_feedback_shown', 'notice_feedback_dismissed', 'notice_feedback_clicked',
  "install_prompt_accepted",
  "install_completed",
  "ios_install_instructions_opened",
  "app_opened_standalone",
  "engaged_60_seconds",
  "qualified_read_60_seconds",
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

  async alarm() {
    await this.cleanup();
    await studioPopularity(new Request("https://analytics-store/studio"), this.state.storage);
    const days = await this.state.storage.list({ prefix: "studio:" });
    const analyticsDays = await this.state.storage.list({ prefix: "day:", limit: 1 });
    if (days.size || analyticsDays.size) await this.state.storage.setAlarm(Date.now() + 86400000);
  }

  async cleanup(now = Date.now()) {
    const oldestDay = new Date(now - ANALYTICS_RETENTION_DAYS * 86_400_000).toISOString().slice(0, 10);
    const days = await this.state.storage.list({ prefix: "day:" });
    const expired = [...days.keys()].filter((key) => key.slice(4) <= oldestDay);
    if (expired.length) await this.state.storage.delete(expired);
  }

  async fetch(request) {
    if(new URL(request.url).pathname === "/studio")return studioPopularity(request,this.state.storage);
    if (request.method === "POST") {
      let body;
      try { body = await request.json(); } catch { return json({ error: "Invalid event" }, 400); }
      if (!isRecord(body)) return json({ error: "Invalid event" }, 400);
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
      if (!await this.state.storage.getAlarm()) await this.state.storage.setAlarm(Date.now() + 86400000);
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
          notice_studio_shown: 'Studio introduction visibly displayed',
          notice_studio_dismissed: 'Studio introduction explicitly closed with X',
          notice_studio_clicked: 'Studio introduction video link clicked; not proof of viewing',
          notice_feedback_shown: 'Feedback invitation visibly displayed',
          notice_feedback_dismissed: 'Feedback invitation explicitly closed with X',
          notice_feedback_clicked: 'Feedback invitation link clicked; not proof of submission',
          install_completed: "Browser-confirmed completed PWA installations (supported browsers only)",
          install_prompt_accepted: "Install prompts accepted; may precede or duplicate a completed-install event",
          ios_install_instructions_opened: "iOS installation instructions opened; not proof of installation",
          app_opened_standalone: "Pollframe opened in installed standalone display mode; counts launches, not unique people",
          engaged_60_seconds: "Pollframe remained visibly open for at least 60 seconds; counts page sessions, not unique people",
          qualified_read_60_seconds: "At least 60 visible seconds plus a browser-trusted interaction in this document; a reading-session proxy, not verified humans, unique people or ad-eligible impressions",
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

async function adminGate(request, env) {
  if (!env.BUG_REPORT_ADMIN_KEY || !env.BUG_REPORT_STORE) return json({ error: "Service unavailable" }, 503);
  const store = env.BUG_REPORT_STORE.get(env.BUG_REPORT_STORE.idFromName("pollframe-bug-reports"));
  const headers = { "x-pollframe-rate-id": await fingerprint(request, env.BUG_REPORT_ADMIN_KEY) };
  const attempt = await store.fetch(new Request("https://bug-report-store/auth-attempt", { method: "POST", headers }));
  if (!attempt.ok) return json({ error: "Service unavailable" }, 503);
  const limit = await attempt.json();
  if (!limit.allowed) return new Response(JSON.stringify({ error: "Too many attempts. Try again later." }), { status: 429, headers: { ...JSON_HEADERS, "retry-after": String(limit.retryAfter || 900) } });
  if (!(await authorised(request, env))) return json({ error: "Not authorised" }, 401);
  await store.fetch(new Request("https://bug-report-store/auth-reset", { method: "POST", headers }));
  return null;
}

const application = {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (isWithheldApprovalRequest(url)) return approvalUnavailableResponse(request);
    if (decodeURIComponent(url.pathname) === "/data/approval.json") {
      const response = await env.ASSETS.fetch(new Request(`${url.origin}/data/approval.json`));
      let data = null;
      try { data = await response.json(); } catch { /* Fail closed. */ }
      return new Response(request.method === "HEAD" ? null : JSON.stringify(publicApprovalData(data)), {
        headers: { ...JSON_HEADERS, "x-pollframe-publication-policy": "fgw-withheld-2026-09-21" },
      });
    }
    if (url.pathname === "/api/elections/sachsen-anhalt-2026" && request.method === "GET") {
      if (!env.ELECTION_RESULTS) return Response.json({result:null}, {headers:{"cache-control":"no-store"}});
      const id = env.ELECTION_RESULTS.idFromName("sachsen-anhalt-2026");
      const response = await env.ELECTION_RESULTS.get(id).fetch(new Request(`https://election-results/?archive=${url.searchParams.get("archive") === "1" ? "1" : "0"}`));
      const headers = new Headers(response.headers);
      const sourceError = headers.get("x-pollframe-source-error");
      if (sourceError) console.warn("Election source:", sourceError);
      headers.delete("x-pollframe-source-error");
      return new Response(response.body, {status:response.status,headers});
    }
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
      if (route || url.pathname === "/") return seoPageResponse(request, env, STATE_NAMES, domainHtml);
    }
    if (["GET", "HEAD"].includes(request.method) && isLiveDataPath(url.pathname)) return liveDataResponse(request, env);
    if (url.pathname === "/api/studio-popular") {
      if (!["GET","POST"].includes(request.method))return json({error:"Method not allowed"},405);
      if(request.method==="POST"&&!sameOrigin(request))return json({error:"Invalid origin"},403);
      if(request.method==='POST'&&excludeAnalyticsRequest(request,env))return new Response(null,{status:204,headers:{'cache-control':'no-store'}});
      const body=request.method==="POST"?await readBoundedBody(request, 128):undefined;
      if(body && new TextEncoder().encode(body).length>128)return json({error:"Too large"},413);
      const namespace=env.ANALYTICS_STORE.jurisdiction?.("eu")??env.ANALYTICS_STORE;
      return namespace.get(namespace.idFromName("pollframe-aggregate-events")).fetch(new Request("https://analytics-store/studio",{method:request.method,headers:{"content-type":"application/json"},body}));
    }
    if (url.pathname === "/api/analytics") {
      if (request.method === "POST") {
        if (!sameOrigin(request)) return json({ error: "Invalid origin" }, 403);
        if(excludeAnalyticsRequest(request,env))return new Response(null,{status:204,headers:{'cache-control':'no-store'}});
        const body = await readBoundedBody(request, 256);
        if (new TextEncoder().encode(body).byteLength > 256) return json({ error: "Event too large" }, 413);
        const namespace = env.ANALYTICS_STORE.jurisdiction?.("eu") ?? env.ANALYTICS_STORE;
        const id = namespace.idFromName("pollframe-aggregate-events");
        return namespace.get(id).fetch(new Request("https://analytics-store/", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body,
        }));
      }
      if (request.method !== "GET") return json({ error: "Method not allowed" }, 405);
      const denial = await adminGate(request, env);
      if (denial) return denial;
      const namespace = env.ANALYTICS_STORE.jurisdiction?.("eu") ?? env.ANALYTICS_STORE;
      const id = namespace.idFromName("pollframe-aggregate-events");
      return namespace.get(id).fetch(new Request("https://analytics-store/", { method: "GET" }));
    }
    if (url.pathname === "/pf-ops/3f592c524cff69071b258ce63776e793/reports" && ["GET", "HEAD"].includes(request.method)) {
      const response = await env.ASSETS.fetch(new Request(`${url.origin}/index.html`, { method: request.method }));
      const headers = new Headers(response.headers);
      headers.set("x-robots-tag", "noindex, nofollow, noarchive");
      return new Response(response.body, { status: response.status, headers });
    }
    if (url.pathname !== "/api/bug-reports") {
      if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/pf-ops/")) return json({ error: "Not found" }, 404);
      return env.ASSETS.fetch(request);
    }
    if (!["GET", "POST", "PATCH"].includes(request.method)) return json({ error: "Method not allowed" }, 405);
    if (!clean(env.BUG_REPORT_ADMIN_KEY, 256)) return json({ error: "Report service is not configured" }, 503);
    if (request.method === "POST") {
      if (!sameOrigin(request)) return json({ error: "Invalid origin" }, 403);
    } else {
      if (request.headers.has("origin") && !sameOrigin(request)) return json({ error: "Invalid origin" }, 403);
      const denial = await adminGate(request, env);
      if (denial) return denial;
    }
    let forwardedBody;
    if (!["GET", "HEAD"].includes(request.method)) {
      forwardedBody = await readBoundedBody(request, 12_000);
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

export default {
  async fetch(request, env) {
    try {
      const url = new URL(request.url);
      const path = url.pathname;
      if (url.protocol === "http:" && ["pollframe.com", "www.pollframe.com", "de.pollframe.workers.dev"].includes(url.hostname)) {
        const target = domainRedirect(request) ?? url;
        target.protocol = "https:";
        target.port = "";
        return secureResponse(new Response(null, { status: 308, headers: { location: target.href, "cache-control": "no-store" } }), request);
      }
      // Fast Cloudflare edge protection complements the durable admin counter.
      // These ephemeral keys are never added to visitor analytics.
      if (env.SECURITY_BURST_LIMITER && (path.startsWith("/api/") || path.startsWith("/pf-ops/"))) {
        const key = await fingerprint(request, env.BUG_REPORT_ADMIN_KEY);
        const { success } = await env.SECURITY_BURST_LIMITER.limit({ key });
        if (!success) return secureResponse(new Response(JSON.stringify({ error: "Too many requests. Try again later." }), { status: 429, headers: { ...JSON_HEADERS, "retry-after": "60" } }), request);
      }
      if (path.startsWith("/api/auth/") || path.startsWith("/api/account/")) {
        // Public accounts are deliberately not launched. Reject probes before
        // loading the authentication library or touching storage/mail services.
        if (env.ACCOUNTS_ENABLED !== "true") return secureResponse(json({ error: "Not found" }, 404), request);
        const {handleAccounts} = await import("./accounts.js");
        return secureResponse(await handleAccounts(request,env),request);
      }
      return secureResponse(await application.fetch(request, env), request);
    }
    catch (error) {
      // Do not return provider errors, stack traces, secrets or internal paths.
      return secureResponse(json({ error: error instanceof RequestError ? error.message : "Service unavailable" }, error instanceof RequestError ? error.status : 503), request);
    }
  },
};
