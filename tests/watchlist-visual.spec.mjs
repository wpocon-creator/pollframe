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

test("Watchlist mouse reordering lifts, previews and commits only on release", async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.endsWith("desktop"), "desktop pointer interaction");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.addInitScript((german) => {
    const original = window.matchMedia.bind(window);
    window.matchMedia = (query) => query === "(display-mode: standalone)"
      ? { matches: true, media: query, onchange: null, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true; } }
      : original(query);
    window.localStorage.setItem("pollframe-watchlist-de-v2", JSON.stringify(german));
    window.localStorage.setItem("pollframe-notification-intro-de", "seen");
  }, deItems);
  await page.goto("/?view=watchlist&country=de");
  await expect(page.locator(".watch-card")).toHaveCount(deItems.length);
  await page.getByRole("button", { name: /Bearbeiten|Edit/i }).click();

  const originalOrder = await page.locator(".watchlist-grid > .watch-card").evaluateAll((cards) => cards.map((card) => card.dataset.watchId));
  const sourceCard = page.locator(".watch-card").nth(1);
  const sourceBox = await sourceCard.boundingBox();
  const sourceHandleBox = await sourceCard.locator(".watch-drag-handle").boundingBox();
  const destinationBox = await page.locator(".watch-card").first().boundingBox();
  const start = { x: sourceHandleBox.x + sourceHandleBox.width * .5, y: sourceHandleBox.y + sourceHandleBox.height * .5 };
  const ghost = page.locator("body > .watch-card-drag-shell > .watch-card-drag-ghost");

  // A normal tap and an early movement remain ordinary interactions; only a
  // deliberate hold unlocks the tile.
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  const pressState = await sourceCard.evaluate((card) => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve({
    className: card.className,
  })))));
  expect(pressState.className).toMatch(/is-drag-pressing/);
  await page.mouse.up();
  await expect(sourceCard).not.toHaveClass(/is-drag-pressing/);
  await expect(ghost).toHaveCount(0);
  expect(await page.locator(".watchlist-grid > .watch-card").evaluateAll((cards) => cards.map((card) => card.dataset.watchId))).toEqual(originalOrder);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(start.x, start.y + 16);
  await page.mouse.up();
  await expect(ghost).toHaveCount(0);
  expect(await page.locator(".watchlist-grid > .watch-card").evaluateAll((cards) => cards.map((card) => card.dataset.watchId))).toEqual(originalOrder);

  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await expect(ghost).toBeVisible();
  await expect(ghost).toHaveClass(/is-lifted/);
  await expect.poll(() => ghost.evaluate((card) => new DOMMatrix(getComputedStyle(card).transform).a)).toBeGreaterThan(1);
  await expect.poll(async () => (await ghost.boundingBox()).width).toBeGreaterThan(sourceBox.width);
  await page.mouse.move(destinationBox.x + destinationBox.width / 2, destinationBox.y + 10, { steps: 10 });
  await expect.poll(() => page.locator(".watchlist-grid > .watch-card").evaluateAll((cards) => cards.map((card) => card.dataset.watchId))).not.toEqual(originalOrder);
  await page.waitForTimeout(120);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("pollframe-watchlist-de-v2")).map((item) => item.id))).toEqual(originalOrder);
  const ghostBox = await ghost.boundingBox();
  expect(Math.abs((ghostBox.x + ghostBox.width / 2) - (destinationBox.x + destinationBox.width / 2))).toBeLessThan(35);

  await page.mouse.up();
  await expect(ghost).toHaveCount(0);
  const committedOrder = await page.locator(".watchlist-grid > .watch-card").evaluateAll((cards) => cards.map((card) => card.dataset.watchId));
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("pollframe-watchlist-de-v2")).map((item) => item.id))).toEqual(committedOrder);

  const firstHandle = page.locator(".watch-card").first().locator(".watch-drag-handle");
  await firstHandle.focus();
  await firstHandle.press("ArrowDown");
  await expect.poll(() => page.locator(".watchlist-grid > .watch-card").evaluateAll((cards) => cards.map((card) => card.dataset.watchId))).not.toEqual(committedOrder);
  await expect(page.locator('[aria-live="polite"][aria-atomic="true"]')).toContainText(/Position|position|posición/i);
});

test("Watchlist touch drag follows the finger and commits on touch release", async ({ page, context }, testInfo) => {
  test.skip(!testInfo.project.name.includes("chromium") && !["pixel-5", "galaxy-s9"].includes(testInfo.project.name), "Chromium touch protocol test");
  await page.addInitScript((german) => {
    const original = window.matchMedia.bind(window);
    window.matchMedia = (query) => query === "(display-mode: standalone)"
      ? { matches: true, media: query, onchange: null, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true; } }
      : original(query);
    window.localStorage.setItem("pollframe-watchlist-de-v2", JSON.stringify(german));
    window.localStorage.setItem("pollframe-notification-intro-de", "seen");
    window.__watchHaptics = [];
    Object.defineProperty(navigator, "vibrate", {
      configurable: true,
      value(duration) { window.__watchHaptics.push(duration); return true; },
    });
    // Exercise the native TouchEvent fallback used when an installed Safari
    // app resumes without delivering pointerdown to the React tree.
    window.addEventListener("pointerdown", (event) => event.stopImmediatePropagation(), true);
  }, deItems);
  await page.goto("/?view=watchlist&country=de");
  await expect(page.locator(".watch-card")).toHaveCount(deItems.length);
  await page.getByRole("button", { name: /Bearbeiten|Edit/i }).click();
  const originalOrder = await page.locator(".watchlist-grid > .watch-card").evaluateAll((cards) => cards.map((card) => card.dataset.watchId));
  const cdp = await context.newCDPSession(page);

  // A quick touch and a finger that starts scrolling before the hold delay must
  // never unlock or reorder a widget.
  let sourceBox = await page.locator(".watch-card").nth(1).boundingBox();
  let start = { x: sourceBox.x + sourceBox.width * .62, y: sourceBox.y + sourceBox.height * .54 };
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ ...start, id: 1, radiusX: 6, radiusY: 6, force: .5 }] });
  await page.waitForTimeout(70);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await expect(page.locator("body > .watch-card-drag-shell")).toHaveCount(0);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ ...start, id: 2, radiusX: 6, radiusY: 6, force: .5 }] });
  await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: start.x, y: start.y + 18, id: 2, radiusX: 6, radiusY: 6, force: .5 }] });
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await expect(page.locator("body > .watch-card-drag-shell")).toHaveCount(0);
  expect(await page.locator(".watchlist-grid > .watch-card").evaluateAll((cards) => cards.map((card) => card.dataset.watchId))).toEqual(originalOrder);

  sourceBox = await page.locator(".watch-card").nth(1).boundingBox();
  const sourceCard = page.locator(".watch-card").nth(1);
  const destinationBox = await page.locator(".watch-card").first().boundingBox();
  start = { x: sourceBox.x + sourceBox.width * .62, y: sourceBox.y + sourceBox.height * .54 };
  const finish = { x: destinationBox.x + destinationBox.width / 2, y: destinationBox.y + 10 };
  await page.evaluate(() => { window.__watchHaptics.length = 0; });
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ ...start, id: 1, radiusX: 6, radiusY: 6, force: .5 }] });
  await expect(sourceCard).toHaveClass(/is-drag-pressing/);
  await page.waitForTimeout(80);
  expect(await sourceCard.evaluate((card) => new DOMMatrix(getComputedStyle(card).transform).a)).toBeLessThan(.998);
  const touchGhost = page.locator("body > .watch-card-drag-shell > .watch-card-drag-ghost");
  await expect(touchGhost).toBeVisible();
  await expect(touchGhost).toHaveClass(/is-lifted/);
  await expect.poll(() => touchGhost.evaluate((card) => new DOMMatrix(getComputedStyle(card).transform).a)).toBeGreaterThan(1);
  expect(await page.evaluate(() => window.__watchHaptics)).toEqual([14]);
  const secondTouch = { x: Math.min(start.x + 24, page.viewportSize().width - 8), y: start.y + 8, id: 2, radiusX: 6, radiusY: 6, force: .5 };
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ ...start, id: 1, radiusX: 6, radiusY: 6, force: .5 }, secondTouch] });
  await expect(page.locator("body > .watch-card-drag-shell")).toHaveCount(1);
  for (let step = 1; step <= 8; step += 1) {
    const progress = step / 8;
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: start.x + (finish.x - start.x) * progress, y: start.y + (finish.y - start.y) * progress, id: 1, radiusX: 6, radiusY: 6, force: .5 }, secondTouch] });
  }
  await expect.poll(() => page.locator(".watchlist-grid > .watch-card").evaluateAll((cards) => cards.map((card) => card.dataset.watchId))).not.toEqual(originalOrder);
  await page.waitForTimeout(120);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("pollframe-watchlist-de-v2")).map((item) => item.id))).toEqual(originalOrder);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await expect(page.locator("body > .watch-card-drag-shell > .watch-card-drag-ghost")).toHaveCount(0);
  const committedOrder = await page.locator(".watchlist-grid > .watch-card").evaluateAll((cards) => cards.map((card) => card.dataset.watchId));
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("pollframe-watchlist-de-v2")).map((item) => item.id))).toEqual(committedOrder);
});

test("Watchlist accepts a calm sideways insertion on desktop", async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.endsWith("desktop"), "desktop grid interaction");
  await page.addInitScript((german) => {
    const original = window.matchMedia.bind(window);
    window.matchMedia = (query) => query === "(display-mode: standalone)"
      ? { matches: true, media: query, onchange: null, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true; } }
      : original(query);
    window.localStorage.setItem("pollframe-watchlist-de-v2", JSON.stringify(german));
    window.localStorage.setItem("pollframe-notification-intro-de", "seen");
  }, deItems);
  await page.goto("/?view=watchlist&country=de");
  await expect(page.locator(".watch-card")).toHaveCount(deItems.length);
  await page.getByRole("button", { name: /Bearbeiten|Edit/i }).click();
  const source = page.locator('[data-watch-id="de-saxony-left"]');
  const target = page.locator('[data-watch-id="de-green"]');
  const sourceBox = await source.boundingBox();
  const targetBox = await target.boundingBox();
  const start = { x: sourceBox.x + sourceBox.width * .55, y: sourceBox.y + sourceBox.height * .55 };
  const finish = { x: targetBox.x + 8, y: targetBox.y + targetBox.height * .52 };
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await expect(page.locator("body > .watch-card-drag-shell")).toBeVisible();
  await page.mouse.move(finish.x, finish.y, { steps: 12 });
  await expect.poll(async () => {
    const order = await page.locator(".watchlist-grid > .watch-card").evaluateAll((cards) => cards.map((card) => card.dataset.watchId));
    return order.indexOf("de-saxony-left") < order.indexOf("de-green");
  }).toBe(true);
  const shellBox = await page.locator("body > .watch-card-drag-shell").boundingBox();
  expect(Math.abs((shellBox.x + sourceBox.width * .45) - finish.x)).toBeLessThan(35);
  await page.mouse.up();
  await expect(page.locator("body > .watch-card-drag-shell")).toHaveCount(0);
});

test("Watchlist drag auto-scrolls at both screen edges and stops immediately between them", async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.endsWith("desktop"), "desktop edge-scroll regression");
  await page.addInitScript((german) => {
    const original = window.matchMedia.bind(window);
    window.matchMedia = (query) => query === "(display-mode: standalone)"
      ? { matches: true, media: query, onchange: null, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true; } }
      : original(query);
    window.localStorage.setItem("pollframe-watchlist-de-v2", JSON.stringify(german));
    window.localStorage.setItem("pollframe-notification-intro-de", "seen");
  }, deItems);
  await page.goto("/?view=watchlist&country=de");
  await page.getByRole("button", { name: /Bearbeiten|Edit/i }).click();
  await page.evaluate(() => window.scrollTo(0, 0));

  const sourceBox = await page.locator(".watch-card").first().boundingBox();
  const start = { x: sourceBox.x + sourceBox.width * .55, y: sourceBox.y + sourceBox.height * .5 };
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await expect(page.locator("body > .watch-card-drag-shell")).toBeVisible();

  const viewport = page.viewportSize();
  await page.mouse.move(viewport.width * .5, viewport.height * .55, { steps: 5 });
  const outsideEdge = await page.evaluate(() => window.scrollY);
  await page.waitForTimeout(180);
  expect(await page.evaluate(() => window.scrollY)).toBe(outsideEdge);

  await page.mouse.move(viewport.width * .5, viewport.height - 2, { steps: 7 });
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(outsideEdge + 20);

  await page.mouse.move(viewport.width * .5, viewport.height * .55, { steps: 4 });
  await page.waitForTimeout(50);
  const stoppedAt = await page.evaluate(() => window.scrollY);
  await page.waitForTimeout(180);
  expect(Math.abs((await page.evaluate(() => window.scrollY)) - stoppedAt)).toBeLessThanOrEqual(1);

  await page.mouse.move(viewport.width * .5, 2, { steps: 7 });
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(stoppedAt - 20);
  await page.mouse.move(viewport.width * .5, viewport.height * .55, { steps: 4 });
  await page.waitForTimeout(50);
  const stoppedAfterUp = await page.evaluate(() => window.scrollY);
  await page.waitForTimeout(180);
  expect(Math.abs((await page.evaluate(() => window.scrollY)) - stoppedAfterUp)).toBeLessThanOrEqual(1);
  await page.mouse.up();
  await expect(page.locator("body > .watch-card-drag-shell")).toHaveCount(0);
});

test("Watchlist edit mode permits native scrolling until a deliberate hold", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "iphone-13", "real WebKit touch-action regression");
  await page.addInitScript((german) => {
    const original = window.matchMedia.bind(window);
    window.matchMedia = (query) => query === "(display-mode: standalone)"
      ? { matches: true, media: query, onchange: null, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true; } }
      : original(query);
    window.localStorage.setItem("pollframe-watchlist-de-v2", JSON.stringify(german));
    window.localStorage.setItem("pollframe-notification-intro-de", "seen");
  }, deItems);
  await page.goto("/?view=watchlist&country=de");
  await page.getByRole("button", { name: /Bearbeiten|Edit/i }).click();
  await expect.poll(() => page.locator(".watch-card").first().evaluate((card) => getComputedStyle(card).touchAction)).toMatch(/pan-y/);
});

test("a phone swipe scrolls in edit mode without shrinking, lifting or reordering", async ({page,context},testInfo) => {
  test.skip(testInfo.project.name !== "iphone-13-chromium", "real touch gestures through Chromium CDP");
  await page.addInitScript(items => {
    const original=window.matchMedia.bind(window);
    window.matchMedia=query=>query==='(display-mode: standalone)' ? {matches:true,addEventListener(){},removeEventListener(){}} : original(query);
    localStorage.setItem("pollframe-watchlist-de-v2",JSON.stringify(items));
  },deItems);
  await page.goto('/?view=watchlist&country=de');
  await page.getByRole('button',{name:/Bearbeiten|Edit/i}).click();
  const source=page.locator('.watch-card').first();
  await source.scrollIntoViewIfNeeded();
  const box=await source.boundingBox();
  const y=Math.min(page.viewportSize().height-70,box.y+box.height*.7);
  const x=box.x+box.width*.55;
  const initial=await page.evaluate(()=>window.scrollY);
  const before=await page.locator('.watch-card').evaluateAll(nodes=>nodes.map(node=>node.dataset.watchId));
  const cdp=await context.newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:1}]});
  expect(await source.getAttribute('class')).not.toMatch(/is-drag-pressing/);
  for(let step=1;step<=6;step++) await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y-step*20,id:1}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await expect.poll(()=>page.evaluate(()=>window.scrollY)).toBeGreaterThan(initial+35);
  await page.waitForTimeout(750); // A cancelled hold must not fire after the swipe.
  await expect(page.locator('.watch-card-drag-shell,.is-drag-pressing')).toHaveCount(0);
  expect(await page.locator('.watch-card').evaluateAll(nodes=>nodes.map(node=>node.dataset.watchId))).toEqual(before);
});

test("Watchlist touch auto-scroll follows both phone edges", async ({ page, context }, testInfo) => {
  test.skip(testInfo.project.name !== "iphone-13-chromium", "single Chromium touch edge-scroll regression");
  await page.addInitScript((german) => {
    const original = window.matchMedia.bind(window);
    window.matchMedia = (query) => query === "(display-mode: standalone)"
      ? { matches: true, media: query, onchange: null, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true; } }
      : original(query);
    window.localStorage.setItem("pollframe-watchlist-de-v2", JSON.stringify(german));
    window.localStorage.setItem("pollframe-notification-intro-de", "seen");
    // Force the native TouchEvent fallback used by resumed installed Safari
    // apps, so edge scrolling is covered on that exact input path as well.
    window.addEventListener("pointerdown", (event) => event.stopImmediatePropagation(), true);
  }, deItems);
  await page.goto("/?view=watchlist&country=de");
  await page.getByRole("button", { name: /Bearbeiten|Edit/i }).click();
  const source = page.locator(".watch-card").first();
  await source.scrollIntoViewIfNeeded();
  const sourceBox = await source.boundingBox();
  const start = { x: sourceBox.x + sourceBox.width * .55, y: sourceBox.y + sourceBox.height * .5 };
  const cdp = await context.newCDPSession(page);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ ...start, id: 1, radiusX: 6, radiusY: 6, force: .5 }] });
  await expect(page.locator("body > .watch-card-drag-shell")).toBeVisible();

  const viewport = page.viewportSize();
  const middle = { x: viewport.width * .5, y: viewport.height * .55, id: 1, radiusX: 6, radiusY: 6, force: .5 };
  await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [middle] });
  const outsideEdge = await page.evaluate(() => window.scrollY);
  await page.waitForTimeout(180);
  expect(await page.evaluate(() => window.scrollY)).toBe(outsideEdge);

  await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ ...middle, y: viewport.height - 2 }] });
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(outsideEdge + 15);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [middle] });
  await page.waitForTimeout(50);
  const stoppedAt = await page.evaluate(() => window.scrollY);
  await page.waitForTimeout(180);
  expect(Math.abs((await page.evaluate(() => window.scrollY)) - stoppedAt)).toBeLessThanOrEqual(1);

  await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ ...middle, y: 2 }] });
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(stoppedAt - 15);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [middle] });
  await page.waitForTimeout(50);
  const stoppedAfterUp = await page.evaluate(() => window.scrollY);
  await page.waitForTimeout(180);
  expect(Math.abs((await page.evaluate(() => window.scrollY)) - stoppedAfterUp)).toBeLessThanOrEqual(1);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await expect(page.locator("body > .watch-card-drag-shell")).toHaveCount(0);
});

test("Watchlist cancels safely on window loss and supports an immediate next drag", async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.endsWith("desktop"), "desktop lifecycle interaction");
  await page.addInitScript((german) => {
    const original = window.matchMedia.bind(window);
    window.matchMedia = (query) => query === "(display-mode: standalone)"
      ? { matches: true, media: query, onchange: null, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true; } }
      : original(query);
    window.localStorage.setItem("pollframe-watchlist-de-v2", JSON.stringify(german));
    window.localStorage.setItem("pollframe-notification-intro-de", "seen");
  }, deItems);
  await page.goto("/?view=watchlist&country=de");
  await expect(page.locator(".watch-card")).toHaveCount(deItems.length);
  await page.getByRole("button", { name: /Bearbeiten|Edit/i }).click();
  const originalOrder = await page.locator(".watchlist-grid > .watch-card").evaluateAll((cards) => cards.map((card) => card.dataset.watchId));
  let sourceBox = await page.locator('[data-watch-id="de-green"]').boundingBox();
  let destinationBox = await page.locator('[data-watch-id="de-overview"]').boundingBox();
  await page.mouse.move(sourceBox.x + sourceBox.width * .6, sourceBox.y + sourceBox.height * .55);
  await page.mouse.down();
  await expect(page.locator("body > .watch-card-drag-shell")).toBeVisible();
  await page.mouse.move(destinationBox.x + destinationBox.width / 2, destinationBox.y + 10, { steps: 8 });
  await expect.poll(() => page.locator(".watchlist-grid > .watch-card").evaluateAll((cards) => cards.map((card) => card.dataset.watchId))).not.toEqual(originalOrder);
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  await expect(page.locator("body > .watch-card-drag-shell")).toHaveCount(0);
  expect(await page.locator(".watchlist-grid > .watch-card").evaluateAll((cards) => cards.map((card) => card.dataset.watchId))).toEqual(originalOrder);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("pollframe-watchlist-de-v2")).map((item) => item.id))).toEqual(originalOrder);
  await page.mouse.up();

  sourceBox = await page.locator('[data-watch-id="de-green"]').boundingBox();
  destinationBox = await page.locator('[data-watch-id="de-overview"]').boundingBox();
  await page.mouse.move(sourceBox.x + sourceBox.width * .6, sourceBox.y + sourceBox.height * .55);
  await page.mouse.down();
  await expect(page.locator("body > .watch-card-drag-shell")).toBeVisible();
  await page.mouse.move(destinationBox.x + destinationBox.width / 2, destinationBox.y + 10, { steps: 8 });
  await page.mouse.up();
  sourceBox = await page.locator('[data-watch-id="de-berlin-spd"]').boundingBox();
  await page.mouse.move(sourceBox.x + sourceBox.width * .6, sourceBox.y + sourceBox.height * .45);
  await page.mouse.down();
  await expect(page.locator("body > .watch-card-drag-shell")).toBeVisible();
  await page.waitForTimeout(240);
  await expect(page.locator("body > .watch-card-drag-shell")).toBeVisible();
  await page.mouse.up();
  await expect(page.locator("body > .watch-card-drag-shell")).toHaveCount(0);
});

test("Watchlist ignores malformed and duplicate local entries", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium-desktop", "single storage-hardening regression");
  await page.addInitScript((german) => {
    const original = window.matchMedia.bind(window);
    window.matchMedia = (query) => query === "(display-mode: standalone)"
      ? { matches: true, media: query, onchange: null, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true; } }
      : original(query);
    window.localStorage.setItem("pollframe-watchlist-de-v2", JSON.stringify([
      ...german,
      { ...german[1], label: "duplicate id" },
      { id: "bad-region", country: "de", regionSlug: "not-a-region", type: "snapshot", partyIds: [] },
      { id: "bad-type", country: "de", regionSlug: "bundestag", type: "unknown", partyIds: [] },
      { id: "missing-party", country: "de", regionSlug: "bundestag", type: "party" },
    ]));
  }, deItems);
  await page.goto("/?view=watchlist&country=de");
  await expect(page.locator(".watchlist-grid > .watch-card")).toHaveCount(deItems.length);
  expect(await page.locator(".watchlist-grid > .watch-card").evaluateAll((cards) => cards.map((card) => card.dataset.watchId))).toEqual(deItems.map((item) => item.id));
});

test("captures installed Watchlist layouts for visual review", async ({ page, context }, testInfo) => {
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
  const partyChange = page.locator(".watch-card-party .watch-card-value .watch-change-value.up").first();
  await expect(partyChange).toContainText("Seit letztem Mal");
  const partyValueLayout = await page.locator(".watch-card-party .watch-card-value").first().evaluate((root) => {
    const current = root.querySelector(".watch-current-value").getBoundingClientRect();
    const change = root.querySelector(".watch-change-value").getBoundingClientRect();
    return { currentRight: current.right, changeLeft: change.left, verticalDifference: Math.abs(current.bottom - change.bottom) };
  });
  expect(partyValueLayout.changeLeft).toBeGreaterThanOrEqual(partyValueLayout.currentRight - 1);
  expect(partyValueLayout.verticalDifference).toBeLessThanOrEqual(2);
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
  const beforeOrder = await page.locator(".watchlist-grid > .watch-card").evaluateAll((cards) => cards.map((card) => card.dataset.watchId));
  const sourceBox = await page.locator(".watch-card").nth(1).boundingBox();
  const destinationBox = await page.locator(".watch-card").first().boundingBox();
  const dragStart = { x: sourceBox.x + sourceBox.width * .62, y: sourceBox.y + sourceBox.height * .54 };
  const dragFinish = { x: destinationBox.x + destinationBox.width / 2, y: destinationBox.y + 8 };
  const cdp = await context.newCDPSession(page);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ ...dragStart, id: 1, radiusX: 6, radiusY: 6, force: .5 }] });
  await expect(page.locator("body > .watch-card-drag-shell > .watch-card-drag-ghost")).toBeVisible();
  for (let step = 1; step <= 8; step += 1) {
    const progress = step / 8;
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: dragStart.x + (dragFinish.x - dragStart.x) * progress, y: dragStart.y + (dragFinish.y - dragStart.y) * progress, id: 1, radiusX: 6, radiusY: 6, force: .5 }] });
  }
  await expect.poll(() => page.locator(".watchlist-grid > .watch-card").evaluateAll((cards) => cards.map((card) => card.dataset.watchId))).not.toEqual(beforeOrder);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("pollframe-watchlist-de-v2")).map((item) => item.id))).toEqual(beforeOrder);
  await page.screenshot({ path: testInfo.outputPath("watchlist-dragging.png"), fullPage: false });
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await expect(page.locator("body > .watch-card-drag-shell > .watch-card-drag-ghost")).toHaveCount(0);
  const committedOrder = await page.locator(".watchlist-grid > .watch-card").evaluateAll((cards) => cards.map((card) => card.dataset.watchId));
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("pollframe-watchlist-de-v2")).map((item) => item.id))).toEqual(committedOrder);
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
