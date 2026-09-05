import { test, expect } from "@playwright/test";

test.describe("server-readable SEO and real routing", () => {
  test.skip(!process.env.POLLFRAME_TEST_BASE_URL, "requires a Worker URL, not Vite's development SPA fallback");

  test("polls, language links and attribution work with JavaScript disabled", async ({ browser }, testInfo) => {
    const context = await browser.newContext({ javaScriptEnabled: false, viewport: testInfo.project.use.viewport });
    const page = await context.newPage();
    try {
      for (const [path, locale] of [["/de/bundestag/umfragen", "de"], ["/uk", "de"], ["/es/encuestas", "en-US"], ["/de/landtagswahl/berlin/umfragen", "es"]]) {
        const response = await page.goto(`${process.env.POLLFRAME_TEST_BASE_URL}${path}?lang=${locale}`);
        expect(response.status()).toBe(200);
        await expect(page.locator("html")).toHaveAttribute("lang", locale);
        await expect(page.locator("#seo-initial-content")).toBeVisible();
        expect(await page.locator("tbody tr").count()).toBeGreaterThan(3);
        await expect(page.locator("time")).toHaveAttribute("datetime", /^\d{4}-\d{2}-\d{2}$/);
        await expect(page.locator('link[rel="alternate"][hreflang]')).toHaveCount(5);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
      }
      await page.screenshot({ path: testInfo.outputPath("seo-no-javascript.png"), fullPage: true });
    } finally { await context.close(); }
  });

  test("missing pages are 404, favicon is an image, and the old dashboard entry still opens", async ({ page, request }) => {
    for (const path of ["/not-a-real-pollframe-page", "/uk/missing", "/de/landtagswahl/nowhere/umfragen", "/missing-image.png"]) {
      expect((await request.get(path)).status()).toBe(404);
    }
    const icon = await request.get("/favicon.ico");
    expect(icon.status()).toBe(200);
    expect(icon.headers()["content-type"]).toMatch(/image/);
    const response = await page.goto("/pf-ops/3f592c524cff69071b258ce63776e793/reports");
    expect(response.status()).toBe(200);
    await expect(page.getByLabel("Dashboard key")).toBeVisible();
    expect(response.headers()["x-robots-tag"]).toContain("noindex");
  });

  test("client metadata does not undo explicit translated canonical URLs", async ({ page }, testInfo) => {
    await page.goto("/uk?lang=de");
    await expect(page.locator("#seo-initial-content")).toHaveCount(0);
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", "https://pollframe.com/uk?lang=de");
    await expect(page.locator("html")).toHaveAttribute("lang", "de");
    await page.screenshot({ path: testInfo.outputPath("seo-interactive-uk-german.png"), fullPage: false });
  });
});
