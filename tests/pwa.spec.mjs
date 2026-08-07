import { expect, test } from "@playwright/test";

async function settle(page) {
  await page.waitForLoadState("domcontentloaded");
  await page.evaluate(() => document.fonts?.ready);
}

test.describe("installable Pollframe app", () => {
  test("publishes a complete install manifest and service worker", async ({ request }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium-desktop", "one browser is sufficient for static app assets");
    const manifestResponse = await request.get("/manifest.webmanifest");
    expect(manifestResponse.ok()).toBe(true);
    const manifest = await manifestResponse.json();
    expect(manifest).toMatchObject({ id: "/", name: "Pollframe", short_name: "Pollframe", start_url: "/?view=watchlist&source=app", scope: "/", display: "standalone" });
    expect(manifest.icons).toEqual(expect.arrayContaining([
      expect.objectContaining({ sizes: "192x192", type: "image/png" }),
      expect.objectContaining({ sizes: "512x512", purpose: "maskable" }),
    ]));
    for (const path of ["/manifest-context.js", "/sw.js", "/apple-touch-icon.png", "/pollframe-app-192.png", "/pollframe-app-512.png", "/pollframe-maskable-512.png"]) {
      expect((await request.get(path)).ok(), `${path} should be available`).toBe(true);
    }
  });

  test("the unified app reopens the last country", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "pixel-5", "representative installed app shell");
    await page.addInitScript(() => {
      const original = window.matchMedia.bind(window);
      window.matchMedia = (query) => query === "(display-mode: standalone)"
        ? { matches: true, media: query, onchange: null, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true; } }
        : original(query);
      if (!window.localStorage.getItem("pollframe-last-country")) window.localStorage.setItem("pollframe-last-country", "uk");
      window.localStorage.setItem("pollframe-notification-intro-uk", "seen");
    });
    await page.goto("/?view=watchlist&source=app");
    await settle(page);
    await expect(page.getByRole("heading", { level: 1, name: "Watchlist" })).toBeVisible();
    await expect(page.locator(".watchlist-hero")).toContainText("United Kingdom");
    await expect.poll(() => page.evaluate(() => window.localStorage.getItem("pollframe-last-country"))).toBe("uk");
    await page.goto("/");
    await expect.poll(() => page.evaluate(() => window.localStorage.getItem("pollframe-last-country"))).toBe("de");
    await page.goto("/?view=watchlist&source=app");
    await expect(page.locator(".watchlist-hero")).toContainText("Deutschland");
  });

  test("keeps the app entry in the header and enables installation when eligible", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium-desktop", "desktop Chromium install event simulation");
    await page.goto("/");
    await settle(page);
    await expect(page.getByRole("button", { name: /Pollframe installieren|Install Pollframe/i }).first()).toBeVisible();
    await page.evaluate(() => {
      const prompt = new Event("beforeinstallprompt", { cancelable: true });
      Object.defineProperties(prompt, {
        prompt: { value: () => Promise.resolve() },
        userChoice: { value: Promise.resolve({ outcome: "dismissed", platform: "web" }) },
      });
      window.dispatchEvent(prompt);
    });
    await expect(page.getByRole("button", { name: /Pollframe installieren|Install Pollframe/i }).first()).toBeVisible();
    await page.getByRole("button", { name: /Einstellungen|Settings/i }).click();
    await expect(page.getByRole("heading", { name: /Pollframe auf diesem Gerät|Pollframe on this device/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Kostenlos installieren|Install for free/i })).toBeVisible();
  });

  test("installed phone mode has safe app navigation", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "pixel-5", "representative installed Android shell");
    await page.addInitScript(() => {
      const original = window.matchMedia.bind(window);
      window.matchMedia = (query) => query === "(display-mode: standalone)"
        ? {
            matches: true,
            media: query,
            onchange: null,
            addListener() {},
            removeListener() {},
            addEventListener() {},
            removeEventListener() {},
            dispatchEvent() { return true; },
          }
        : original(query);
    });
    await page.goto("/?region=bundestag");
    await settle(page);
    const navigation = page.locator(".mobile-app-nav");
    await expect(navigation).toBeVisible();
    await expect(navigation.getByRole("link")).toHaveCount(3);
    await expect(navigation.getByRole("link", { name: /Watchlist/i })).toBeVisible();
    await expect(navigation.getByRole("link", { name: /Übersicht|Overview/i })).toHaveAttribute("aria-current", "page");
    await expect(navigation.getByRole("link", { name: /Karte|Map/i })).toBeVisible();
    await expect(page.locator(".watchlist-header-button")).toHaveCount(0);
    await expect(page.getByRole("button", { name: /Pollframe installieren|Install Pollframe/i })).toHaveCount(0);
    await page.evaluate(() => { window.__pollframeNavigationMarker = "kept"; });
    await navigation.getByRole("link", { name: /Karte|Map/i }).click();
    await expect(page).toHaveURL(/view=states/);
    await expect(page.locator(".state-map-app-page .map-section")).toBeVisible();
    await expect(page.locator(".state-map-app-page .poll-map-module")).toHaveCount(0);
    await expect.poll(() => page.evaluate(() => window.__pollframeNavigationMarker)).toBe("kept");
    await page.screenshot({ path: testInfo.outputPath("state-map-app.png"), fullPage: false });
    await page.locator(".mobile-app-nav").getByRole("link", { name: /Übersicht|Overview/i }).click();
    await expect(page).not.toHaveURL(/view=states/);
    await expect.poll(() => page.evaluate(() => window.__pollframeNavigationMarker)).toBe("kept");
    const dimensions = await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth }));
    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.width + 2);
    await page.screenshot({ path: testInfo.outputPath("installed-app.png"), fullPage: false });
  });

  test("keeps the Watchlist exclusive to the installed app", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium-desktop", "one browser is sufficient for the display-mode gate");
    await page.goto("/");
    await settle(page);
    await expect(page.getByRole("link", { name: /Watchlist/i })).toHaveCount(0);
    await page.goto("/?view=watchlist&country=de");
    await settle(page);
    await expect(page.getByRole("heading", { level: 1, name: "Watchlist" })).toHaveCount(0);
    await expect(page.getByRole("heading", { level: 1, name: /Deutschland im Überblick|Germany at a glance/i })).toBeVisible();
  });

  test("iPhone installation explains the native Safari action", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "iphone-13-chromium", "representative iPhone installation guidance");
    await page.goto("/");
    await settle(page);
    await page.getByRole("button", { name: /Pollframe installieren|Install Pollframe/i }).first().click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByText(/Zum Home-Bildschirm|Add to Home Screen/i)).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath("iphone-install.png"), fullPage: false });
  });

  test("keeps the app shell and core polling view usable offline", async ({ page, context }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium-desktop", "service-worker offline test uses desktop Chromium");
    await page.goto("/");
    await page.evaluate(() => navigator.serviceWorker.ready);
    if (!await page.evaluate(() => Boolean(navigator.serviceWorker.controller))) {
      await page.reload();
    }
    await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
    await page.evaluate(() => fetch("/regions.json").then((response) => response.json()));
    await context.setOffline(true);
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { level: 1, name: /Deutschland im Überblick|Germany at a glance/i })).toBeVisible();
    await expect(page.getByRole("status")).toContainText(/Offline|Gespeicherter Datenstand|Saved data shown/);
    await context.setOffline(false);
  });
});
