import { expect, test } from "@playwright/test";

const phoneProjects = new Set(["pixel-5", "galaxy-s9", "iphone-13-chromium"]);

const deItems = [
  { id: "de-overview", country: "de", regionSlug: "bundestag", type: "snapshot", partyIds: [], label: "Bundestag · aktueller Stand", layout: "wide", createdAt: "2026-08-07T10:00:00.000Z", lastSnapshot: { date: "2026-08-01", leaders: [{ id: "7", value: 27 }, { id: "1", value: 21 }, { id: "4", value: 12 }, { id: "5", value: 12 }] } },
  { id: "de-green", country: "de", regionSlug: "bundestag", type: "party", partyIds: ["4"], label: "Grüne · Bundestag", layout: "square", createdAt: "2026-08-07T10:01:00.000Z", lastSnapshot: { date: "2026-08-01", value: 12 } },
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

const esItems = [
  { id: "es-issues", country: "es", regionSlug: "spain-congress", type: "issues", partyIds: [], label: "España · CIS", layout: "wide", createdAt: "2026-08-07T10:00:00.000Z", lastSnapshot: null },
  { id: "es-personal", country: "es", regionSlug: "spain-congress", type: "personal-issues", partyIds: [], label: "España · CIS · Personal", layout: "wide", createdAt: "2026-08-07T10:01:00.000Z", lastSnapshot: null },
  { id: "es-economy", country: "es", regionSlug: "spain-congress", type: "economy", partyIds: [], label: "España · CIS · Economía", layout: "large", createdAt: "2026-08-07T10:02:00.000Z", lastSnapshot: null },
  { id: "es-change", country: "es", regionSlug: "spain-congress", type: "spain-change", partyIds: [], label: "España · Cambio desde 2023", layout: "large", createdAt: "2026-08-07T10:03:00.000Z", lastSnapshot: null },
  { id: "es-gap", country: "es", regionSlug: "spain-congress", type: "spain-gap", partyIds: [], label: "España · PP–PSOE", layout: "wide", createdAt: "2026-08-07T10:04:00.000Z", lastSnapshot: null },
  { id: "es-spread", country: "es", regionSlug: "spain-congress", type: "spain-spread", partyIds: [], label: "España · Institutos", layout: "large", createdAt: "2026-08-07T10:05:00.000Z", lastSnapshot: null },
  { id: "es-region", country: "es", regionSlug: "spain-congress", type: "spain-region", areaSlug: "andalucia", partyIds: [], label: "España · Andalucía", layout: "wide", createdAt: "2026-08-07T10:07:00.000Z", lastSnapshot: null },
  { id: "es-map", country: "es", regionSlug: "spain-congress", type: "map", partyIds: [], mapMode: "regions", label: "España · Comunidades", layout: "large", createdAt: "2026-08-07T10:08:00.000Z", lastSnapshot: null },
];

test("captures installed Watchlist layouts for visual review", async ({ page }, testInfo) => {
  test.skip(!phoneProjects.has(testInfo.project.name), "phone visual review only");
  await page.addInitScript(({ german, uk, spanish }) => {
    const original = window.matchMedia.bind(window);
    window.matchMedia = (query) => query === "(display-mode: standalone)"
      ? { matches: true, media: query, onchange: null, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true; } }
      : original(query);
    window.localStorage.setItem("pollframe-watchlist-de-v2", JSON.stringify(german));
    window.localStorage.setItem("pollframe-watchlist-uk-v2", JSON.stringify(uk));
    window.localStorage.setItem("pollframe-watchlist-es-v2", JSON.stringify(spanish));
    window.localStorage.setItem("pollframe-notification-intro-de", "seen");
    window.localStorage.setItem("pollframe-notification-intro-uk", "seen");
    window.localStorage.setItem("pollframe-notification-intro-es", "seen");
  }, { german: deItems, uk: ukItems, spanish: esItems });

  await page.goto("/?view=watchlist&country=de");
  await expect(page.locator(".watch-card")).toHaveCount(deItems.length);
  await expect(page.getByRole("heading", { level: 1, name: "Watchlist" })).toBeVisible();
  await expect(page.locator(".watch-card-map .watch-mini-map-de")).toBeVisible();
  await expect(page.locator(".watch-card-snapshot .watch-snapshot-title")).toContainText("Letzte Umfrage");
  await expect(page.locator(".watch-card-snapshot .watch-snapshot-title time")).toHaveCount(0);
  await expect(page.locator(".watch-card-snapshot .watch-snapshot-list em.up")).not.toHaveCount(0);
  await expect(page.locator(".watch-card-party .watch-current-value").first()).toContainText("Letzte Umfrage");
  await expect(page.locator(".watch-card-party .watch-card-value .up")).not.toHaveCount(0);
  const majorityDistance = page.locator(".watch-card-coalition .watch-majority-status");
  await expect(majorityDistance).toBeVisible();
  await expect(majorityDistance).toContainText(/Sitze (über der Mehrheit|fehlen)|Mehrheit genau erreicht/);
  await expect(majorityDistance).toHaveClass(/\b(?:yes|no)\b/);
  const addButton = page.locator(".watchlist-add-button");
  await expect(addButton).toBeVisible();
  const addBox = await addButton.boundingBox();
  expect(addBox.width).toBeGreaterThanOrEqual(44);
  expect(addBox.height).toBeGreaterThanOrEqual(44);
  const tinyText = await page.evaluate(() => [...document.querySelectorAll(".watchlist-page *, .mobile-app-nav *")].filter((element) => {
    if (element.closest("svg") || element.matches(".section-label")) return false;
    if (![...element.childNodes].some((node) => node.nodeType === Node.TEXT_NODE && node.textContent.trim())) return false;
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0 && Number.parseFloat(style.fontSize) < 11;
  }).map((element) => ({ text: element.textContent.trim().slice(0, 60), size: getComputedStyle(element).fontSize })));
  expect(tinyText, `phone text below 11px: ${JSON.stringify(tinyText)}`).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath("watchlist-de-viewport.png"), fullPage: false });
  await page.screenshot({ path: testInfo.outputPath("watchlist-de-full.png"), fullPage: true });
  await page.getByRole("button", { name: /Bearbeiten|Edit/i }).click();
  await expect(page.locator(".watch-card-editbar")).toHaveCount(deItems.length);
  const beforeOrder = await page.locator(".watch-card").evaluateAll((cards) => cards.map((card) => card.dataset.watchId));
  await page.locator(".watch-card").nth(1).dragTo(page.locator(".watch-card").first());
  await expect.poll(() => page.locator(".watch-card").evaluateAll((cards) => cards.map((card) => card.dataset.watchId))).not.toEqual(beforeOrder);
  await page.screenshot({ path: testInfo.outputPath("watchlist-edit-mode.png"), fullPage: false });
  await page.getByRole("button", { name: /Fertig|Done/i }).click();

  await addButton.click();
  await expect(page.locator(".watch-gallery")).toBeVisible();
  const galleryGeometry = await page.locator(".watch-gallery").evaluate((gallery) => {
    const rect = gallery.getBoundingClientRect();
    const action = gallery.querySelector(".watch-gallery-add").getBoundingClientRect();
    const footer = gallery.querySelector("footer").getBoundingClientRect();
    return {
      viewport: { width: innerWidth, height: innerHeight },
      gallery: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
      action: { x: action.x, width: action.width },
      footerBottom: footer.bottom,
      shellScrolls: gallery.scrollHeight > gallery.clientHeight + 1,
      internalScroll: [...gallery.querySelectorAll("*")].filter((element) => {
        const style = getComputedStyle(element);
        return !element.matches(".select-menu,.multi-menu") && style.display !== "none" && style.visibility !== "hidden" && /auto|scroll/.test(style.overflowY) && element.scrollHeight > element.clientHeight + 1;
      }).map((element) => element.className),
    };
  });
  expect(galleryGeometry.gallery.x).toBeLessThanOrEqual(1);
  expect(galleryGeometry.gallery.y).toBeLessThanOrEqual(1);
  expect(galleryGeometry.gallery.width).toBeGreaterThanOrEqual(galleryGeometry.viewport.width - 1);
  expect(galleryGeometry.gallery.height).toBeGreaterThanOrEqual(galleryGeometry.viewport.height - 1);
  expect(galleryGeometry.action.width).toBeGreaterThanOrEqual(galleryGeometry.viewport.width - 32);
  expect(Math.abs((galleryGeometry.action.x * 2 + galleryGeometry.action.width) - galleryGeometry.viewport.width)).toBeLessThanOrEqual(2);
  expect(galleryGeometry.footerBottom).toBeGreaterThanOrEqual(galleryGeometry.viewport.height - 1);
  expect(galleryGeometry.shellScrolls).toBe(false);
  expect(galleryGeometry.internalScroll.every((className) => className === "watch-gallery-stage")).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("watchlist-gallery.png"), fullPage: false });
  await page.getByRole("button", { name: /Schließen|Close/i }).click();
  await page.locator(".watch-card-map").click();
  await expect(page).toHaveURL(/view=map/);

  await page.goto("/?view=watchlist&country=uk");
  await expect(page.locator(".watch-card")).toHaveCount(ukItems.length);
  await expect(page.locator(".watchlist-hero")).toContainText("United Kingdom");
  await expect(page.locator(".watch-card-map .watch-mini-map-uk svg")).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("watchlist-uk-viewport.png"), fullPage: false });

  await page.goto("/?view=watchlist&country=es&lang=es");
  await expect(page.locator(".watch-card")).toHaveCount(esItems.length);
  await expect(page.locator(".watch-card-spain-gap")).toContainText("PP–PSOE");
  await expect(page.locator(".watch-card-economy")).toContainText(/Percepción económica|Wirtschaftliche Wahrnehmung|Economic perceptions/);
  await expect(page.locator(".watch-card-spain-region")).toContainText(/Andalucía|Andalusien|Andalusia/);
  await expect(page.locator(".watch-card-map .watch-mini-map-es")).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("watchlist-es-light.png"), fullPage: true });
  await page.evaluate(() => { document.documentElement.dataset.theme = "dark"; });
  await page.screenshot({ path: testInfo.outputPath("watchlist-es-dark.png"), fullPage: true });
  await page.locator(".watchlist-add-button").click();
  await expect(page.locator(".watch-widget-types button")).toHaveCount(10);
  await page.getByRole("button", { name: /Regionalstand|Regional update|Situación regional/i }).click();
  await expect(page.locator(".watch-gallery-source .select-control")).toHaveCount(2);
  await page.screenshot({ path: testInfo.outputPath("watchlist-es-gallery.png"), fullPage: false });

  const dimensions = await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.width + 2);
});
