import { expect, test } from "@playwright/test";

const phoneProjects = new Set(["pixel-5", "galaxy-s9", "iphone-13-chromium"]);

const deItems = [
  { id: "de-overview", country: "de", regionSlug: "bundestag", type: "snapshot", partyIds: [], label: "Bundestag · aktueller Stand", layout: "wide", createdAt: "2026-08-07T10:00:00.000Z", lastSnapshot: null },
  { id: "de-green", country: "de", regionSlug: "bundestag", type: "party", partyIds: ["4"], label: "Grüne · Bundestag", layout: "square", createdAt: "2026-08-07T10:01:00.000Z", lastSnapshot: null },
  { id: "de-berlin-spd", country: "de", regionSlug: "berlin", type: "party", partyIds: ["2"], label: "SPD · Berlin", layout: "tall", createdAt: "2026-08-07T10:02:00.000Z", lastSnapshot: null },
  { id: "de-coalition", country: "de", regionSlug: "bundestag", type: "coalition", partyIds: ["1", "2", "4"], label: "CDU/CSU + SPD + Grüne · Bundestag", layout: "large", createdAt: "2026-08-07T10:03:00.000Z", lastSnapshot: null },
  { id: "de-saxony-left", country: "de", regionSlug: "sachsen", type: "party", partyIds: ["5"], label: "Linke · Sachsen", layout: "square", createdAt: "2026-08-07T10:04:00.000Z", lastSnapshot: null },
  { id: "de-map-leader", country: "de", regionSlug: "bundestag", type: "map", partyIds: [], mapMode: "leader", label: "Deutschland · Stärkste Partei", layout: "large", createdAt: "2026-08-07T10:05:00.000Z", lastSnapshot: null },
];

const ukItems = [
  { id: "uk-overview", country: "uk", regionSlug: "uk-westminster", type: "snapshot", partyIds: [], label: "Westminster · latest trend", layout: "wide", createdAt: "2026-08-07T10:00:00.000Z", lastSnapshot: null },
  { id: "uk-labour", country: "uk", regionSlug: "uk-westminster", type: "party", partyIds: ["201"], label: "Labour · United Kingdom", layout: "large", createdAt: "2026-08-07T10:01:00.000Z", lastSnapshot: null },
  { id: "uk-conservative", country: "uk", regionSlug: "uk-westminster", type: "party", partyIds: ["206"], label: "Conservative · United Kingdom", layout: "square", createdAt: "2026-08-07T10:02:00.000Z", lastSnapshot: null },
  { id: "uk-reform", country: "uk", regionSlug: "uk-westminster", type: "party", partyIds: ["207"], label: "Reform UK · United Kingdom", layout: "tall", createdAt: "2026-08-07T10:03:00.000Z", lastSnapshot: null },
  { id: "uk-map-labour", country: "uk", regionSlug: "uk-westminster", type: "map", partyIds: [], mapMode: "party", mapPartyId: "201", label: "UK · Labour 2024", layout: "large", createdAt: "2026-08-07T10:04:00.000Z", lastSnapshot: null },
];

test("captures installed Watchlist layouts for visual review", async ({ page }, testInfo) => {
  test.skip(!phoneProjects.has(testInfo.project.name), "phone visual review only");
  await page.addInitScript(({ german, uk }) => {
    const original = window.matchMedia.bind(window);
    window.matchMedia = (query) => query === "(display-mode: standalone)"
      ? { matches: true, media: query, onchange: null, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true; } }
      : original(query);
    window.localStorage.setItem("pollframe-watchlist-de-v2", JSON.stringify(german));
    window.localStorage.setItem("pollframe-watchlist-uk-v2", JSON.stringify(uk));
    window.localStorage.setItem("pollframe-notification-intro-de", "seen");
    window.localStorage.setItem("pollframe-notification-intro-uk", "seen");
  }, { german: deItems, uk: ukItems });

  await page.goto("/?view=watchlist&country=de");
  await expect(page.locator(".watch-card")).toHaveCount(deItems.length);
  await expect(page.getByRole("heading", { level: 1, name: "Watchlist" })).toBeVisible();
  await expect(page.locator(".watch-card-map .watch-mini-map-de")).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("watchlist-de-viewport.png"), fullPage: false });
  await page.screenshot({ path: testInfo.outputPath("watchlist-de-full.png"), fullPage: true });
  await page.getByRole("button", { name: /Bearbeiten|Edit/i }).click();
  await expect(page.locator(".watch-card-editbar")).toHaveCount(deItems.length);
  const beforeOrder = await page.locator(".watch-card").evaluateAll((cards) => cards.map((card) => card.dataset.watchId));
  await page.locator(".watch-card").nth(1).dragTo(page.locator(".watch-card").first());
  await expect.poll(() => page.locator(".watch-card").evaluateAll((cards) => cards.map((card) => card.dataset.watchId))).not.toEqual(beforeOrder);
  await page.screenshot({ path: testInfo.outputPath("watchlist-edit-mode.png"), fullPage: false });
  await page.getByRole("button", { name: /Fertig|Done/i }).click();

  await page.getByRole("button", { name: /Watchlist-Eintrag hinzufügen|Add Watchlist item/i }).click();
  await expect(page.locator(".watch-gallery")).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("watchlist-gallery.png"), fullPage: false });
  await page.getByRole("button", { name: /Schließen|Close/i }).click();
  await page.locator(".watch-card-map").click();
  await expect(page).toHaveURL(/view=map/);

  await page.goto("/?view=watchlist&country=uk");
  await expect(page.locator(".watch-card")).toHaveCount(ukItems.length);
  await expect(page.locator(".watchlist-hero")).toContainText("United Kingdom");
  await expect(page.locator(".watch-card-map .watch-mini-map-uk svg")).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("watchlist-uk-viewport.png"), fullPage: false });

  const dimensions = await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.width + 2);
});
