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
