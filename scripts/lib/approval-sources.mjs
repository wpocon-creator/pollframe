import { load } from "cheerio/slim";

const OFFICIAL_FGW_HOST = "www.forschungsgruppe.de";

export function discoverFgwCurrentDownloads(html, pageUrl) {
  const $ = load(html);
  const downloads = {};
  for (const element of $('a[href$=".xlsx" i]').toArray()) {
    const href = $(element).attr("href");
    if (!href) continue;
    const url = new URL(href, pageUrl);
    if (url.protocol !== "https:" || url.hostname !== OFFICIAL_FGW_HOST) continue;
    const filename = decodeURIComponent(url.pathname.split("/").at(-1) ?? "");
    if (/^4_Arbeit_Reg(?:_\d+)?\.xlsx$/i.test(filename)) downloads.government = url.href;
    if (/^11_Arbeit_Merz(?:_\d+)?\.xlsx$/i.test(filename)) downloads.leader = url.href;
  }
  if (!downloads.government || !downloads.leader) {
    throw new Error("The official FGW page does not expose both current approval downloads");
  }
  return downloads;
}

export async function fetchWithRetry(url, {
  fetchImpl = fetch,
  attempts = 3,
  timeoutMs = 45_000,
  sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)),
} = {}) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetchImpl(url, {
        headers: { "User-Agent": "PollframeDataUpdater/1.0 (public opinion visualisation)" },
        signal: controller.signal,
      });
      if (response.ok) return response;
      const retryable = response.status === 404 || response.status === 408 || response.status === 429 || response.status >= 500;
      lastError = new Error(`${url}: HTTP ${response.status}`);
      if (!retryable || attempt === attempts) throw lastError;
    } catch (error) {
      lastError = error;
      if (attempt === attempts) throw error;
    } finally {
      clearTimeout(timeout);
    }
    await sleep(500 * (2 ** (attempt - 1)));
  }
  throw lastError;
}
