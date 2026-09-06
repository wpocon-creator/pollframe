// Repeatable browser measurements, not a Lighthouse score. Use the same host,
// machine, build mode and throttling for before/after comparisons.
import { chromium } from "@playwright/test";

const base = process.env.POLLFRAME_BENCH_URL ?? "https://pollframe.com";
const repeats = Number(process.env.POLLFRAME_BENCH_RUNS ?? 3);
const regions = (process.env.POLLFRAME_BENCH_REGIONS ?? "bundestag,uk-westminster,spain-congress").split(",");
if (!Number.isInteger(repeats) || repeats < 1 || repeats > 20 || regions.some((region) => !["bundestag", "uk-westminster", "spain-congress"].includes(region))) throw new Error("Use 1–20 runs and supported national region slugs.");
const browser = await chromium.launch({ headless: true });
const results = [];
try {
  for (const region of regions) {
    for (let run = 0; run < repeats; run++) {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: "block" });
      const page = await context.newPage();
      const cdp = await context.newCDPSession(page);
      await cdp.send("Network.enable");
      await cdp.send("Network.setBlockedURLs", { urls: ["*cloudflareinsights.com*", "*/api/analytics*"] });
      await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 80, downloadThroughput: 500000, uploadThroughput: 250000 });
      await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
      for (const cache of ["cold", "warm"]) {
        const start = performance.now();
        await page.goto(`${base}/?region=${region}&lang=de`, { waitUntil: "domcontentloaded", timeout: 60000 });
        await page.locator(".results-card .result-row").first().waitFor({ timeout: 60000 });
        const currentMs = Math.round(performance.now() - start);
        await page.locator("svg.poll-chart .series-line, svg.poll-chart .average-series-line").first().waitFor({ state: "attached", timeout: 60000 });
        const chartMs = Math.round(performance.now() - start);
        const resources = await page.evaluate(() => performance.getEntriesByType("resource").map((r) => ({ url: r.name, duration: Math.round(r.duration), bytes: r.transferSize, decoded: r.decodedBodySize })).filter((r) => /\.json|\/assets\//.test(r.url)));
        results.push({ region, run, cache, currentMs, chartMs, resources });
        console.error(`${region} ${cache} ${run + 1}: current ${currentMs}ms, chart ${chartMs}ms`);
      }
      await context.close();
    }
  }
} finally { await browser.close(); }
const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : Math.round((sorted[middle - 1] + sorted[middle]) / 2);
};
const summary = regions.flatMap((region) => ["cold", "warm"].map((cache) => {
  const runs = results.filter((result) => result.region === region && result.cache === cache);
  return { region, cache, currentMs: median(runs.map((r) => r.currentMs)), chartMs: median(runs.map((r) => r.chartMs)) };
}));
console.log(JSON.stringify({ base, cpu: "4x", network: "4Mbps / 80ms", summary, results: results.map(({ resources, ...result }) => process.env.POLLFRAME_BENCH_RESOURCES === "1" ? { ...result, resources } : result) }, null, 2));
