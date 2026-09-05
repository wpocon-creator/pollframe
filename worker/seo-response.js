import { LEGACY_SITE_ORIGIN } from "../src/site-origin.js";
import { pageLocale, localizedCanonical } from "../src/seo-locale.js";
import { routeContent, escapeHtml, alternateLinks, seoFallback } from "./seo-content.js";

function validSnapshot(value) {
  return value && typeof value.pollster === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value.date)
    && Array.isArray(value.results) && value.results.length <= 100
    && value.results.every((row) => typeof row.id === "string" && typeof row.name === "string" && Number.isFinite(row.value) && row.value >= 0 && row.value <= 100);
}

async function seoSnapshot(request, env, slug) {
  if (!slug || request.method === "HEAD") return null;
  try {
    const response = await fetch("https://raw.githubusercontent.com/wpocon-creator/pollframe/main/public/data/seo-polls.json", {
      cf: { cacheEverything: true, cacheTtl: 60 }, signal: AbortSignal.timeout(1200),
    });
    if (!response.ok) throw new Error("SEO projection unavailable");
    const text = await response.text();
    if (text.length > 60000) throw new Error("SEO projection too large");
    const data = JSON.parse(text);
    if (data.version !== 1) throw new Error("Unsupported SEO projection");
    const snapshot = data.snapshots?.[slug];
    if (!validSnapshot(snapshot)) throw new Error("Invalid SEO snapshot");
    return snapshot;
  } catch {
    try {
      const response = await env.ASSETS.fetch(new Request(new URL("/data/seo-polls.json", request.url)));
      if (!response.ok) return null;
      const data = await response.json();
      const snapshot = data.snapshots?.[slug];
      return data.version === 1 && validSnapshot(snapshot) ? snapshot : null;
    } catch { return null; }
  }
}

export async function seoPageResponse(request, env, stateNames, domainHtml) {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, "") || "/";
  const locale = pageLocale(url);
  const shellOnly = path === "/" && ["page", "view", "region"].some((key) => url.searchParams.has(key));
  const content = shellOnly ? null : routeContent(path, locale, stateNames);
  const canonical = localizedCanonical(path, locale);
  const [shell, snapshot] = await Promise.all([
    env.ASSETS.fetch(new Request(`${url.origin}/index.html`, { method: "GET", headers: request.headers })),
    seoSnapshot(request, env, content?.snapshot),
  ]);
  if (!shell.ok || !(shell.headers.get("content-type") ?? "").includes("text/html")) return shell;
  let html = domainHtml(await shell.text(), url, env);
  if (content) {
    const openGraphLocale = { de: "de_DE", "en-GB": "en_GB", "en-US": "en_US", es: "es_ES" }[locale];
    html = html
      .replace("</head>", '<link rel="stylesheet" href="/seo.css" /></head>')
      .replace(/<html lang="[^"]+">/, `<html lang="${locale}">`)
      .replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeHtml(content.title)}</title>`)
      .replace(/<meta\s+name="description"[\s\S]*?\/>/, `<meta name="description" content="${escapeHtml(content.description)}" />`)
      .replace(/<meta property="og:title"[^>]*\/>/, `<meta property="og:title" content="${escapeHtml(content.title)}" />`)
      .replace(/<meta property="og:locale"[^>]*\/>/, `<meta property="og:locale" content="${openGraphLocale}" />`)
      .replace(/<meta\s+property="og:description"[\s\S]*?\/>/, `<meta property="og:description" content="${escapeHtml(content.description)}" />`)
      .replace(/<meta property="og:url"[^>]*\/>/, `<meta property="og:url" content="${escapeHtml(canonical)}" />`)
      .replace(/<meta name="twitter:title"[^>]*\/>/, `<meta name="twitter:title" content="${escapeHtml(content.title)}" />`)
      .replace(/<meta\s+name="twitter:description"[\s\S]*?\/>/, `<meta name="twitter:description" content="${escapeHtml(content.description)}" />`)
      .replace(/<link rel="canonical"[^>]*\/>/, `<link rel="canonical" href="${escapeHtml(canonical)}" />${alternateLinks(path)}`)
      .replace(/<div id="root"><\/div>/, () => `<div id="root">${seoFallback(content, path, snapshot)}</div>`)
      .replace(/<noscript>[\s\S]*?<\/noscript>/, "");
  } else {
    html = html.replace(/<meta name="robots"[^>]*\/>/, '<meta name="robots" content="noindex, follow" />');
  }
  const headers = new Headers(shell.headers);
  headers.set("content-type", "text/html; charset=utf-8");
  headers.set("content-language", locale);
  headers.set("cache-control", "public, max-age=0, must-revalidate");
  headers.set("x-content-type-options", "nosniff");
  if (shellOnly) headers.set("x-robots-tag", "noindex, follow");
  if (url.origin === LEGACY_SITE_ORIGIN) {
    headers.set("cache-control", "private, no-store");
    headers.set("vary", "Service-Worker-Navigation-Preload, X-Pollframe-App");
  }
  headers.delete("etag");
  headers.delete("content-length");
  return new Response(request.method === "HEAD" ? null : html, { status: 200, headers });
}
