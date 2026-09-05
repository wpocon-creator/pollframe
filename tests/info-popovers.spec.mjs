import { expect, test } from "@playwright/test";

test.use({ serviceWorkers: "block" });

async function openInfoWithin(container) {
  const info = container.locator("details.graph-info-popover").first();
  await expect(info).toBeVisible();
  await info.locator("summary").click();
  const card = info.locator(".graph-info-card");
  await expect(card).toBeVisible();
  return { info, card, text: (await card.innerText()).replaceAll(/\s+/g, " ").trim() };
}

async function closeInfo(info) {
  await info.locator(".graph-info-card header button").click();
  await expect(info).not.toHaveAttribute("open", "");
}

async function expectEveryInfoIsSubstantial(page, minimum = 300) {
  const infos = page.locator("details.graph-info-popover");
  const count = await infos.count();
  expect(count).toBeGreaterThan(0);
  for (let index = 0; index < count; index += 1) {
    const info = infos.nth(index);
    await info.evaluate((node) => node.setAttribute("open", ""));
    const card = info.locator(".graph-info-card");
    const text = (await card.textContent()).replaceAll(/\s+/g, " ").trim();
    expect(text.length, `info ${index + 1} is too short: ${text}`).toBeGreaterThanOrEqual(minimum);
    expect(text).not.toMatch(/\bundefined\b|Diese Erklärung fehlt|explanation is unavailable|Falta esta explicación/i);
    await expect(card.locator("a[href^='http']").first(), `info ${index + 1} has no source link`).toBeAttached();
    await info.evaluate((node) => node.removeAttribute("open"));
  }
}

test("German current, historical and tendency info documents journalist essentials", async ({ page }) => {
  await page.goto("/?region=bundestag&lang=de");
  await expect(page.locator(".results-card")).toBeVisible();

  const current = await openInfoWithin(page.locator(".results-card"));
  expect(current.text).toMatch(/Sonntagsfrage|Bundestag/);
  expect(current.text).toMatch(/veröffentlicht|Befragungszeitraum/);
  expect(current.text).toMatch(/Stichprobe/);
  expect(current.text).toMatch(/Methode/);
  expect(current.text).toMatch(/ODbL 1\.0/);
  expect(current.text).toMatch(/keine Wahlprognose|keine Sitzprojektion/i);
  await expect(current.card.locator("a")).toHaveAttribute("href", /dawum\.de/);
  await closeInfo(current.info);

  const historical = await openInfoWithin(page.locator("section.chart-card").first());
  expect(historical.text).toMatch(/45 Tage/);
  expect(historical.text).toMatch(/gleich gewichtet/);
  expect(historical.text).toMatch(/Veröffentlichungsdatum/);
  expect(historical.text).toMatch(/Stichprobengröße/);
  expect(historical.text).toMatch(/Y-Achse/);
  expect(historical.text).toMatch(/Ursache noch Wirkung/);
  expect(historical.text.length).toBeGreaterThan(1_100);
  await closeInfo(historical.info);

  const tendency = await openInfoWithin(page.locator(".tendency-section"));
  expect(tendency.text).toMatch(/90 Tage/);
  expect(tendency.text).toMatch(/\+1,2 Prozentpunkten/);
  expect(tendency.text).toMatch(/kein statistischer Signifikanztest/);
  expect(tendency.text).toMatch(/unterschiedlichen Instituten/);
  await closeInfo(tendency.info);

  await expectEveryInfoIsSubstantial(page);
});

test("UK polling info distinguishes current polls, archive trend and geography", async ({ page }) => {
  await page.goto("/?region=uk-westminster&lang=en-GB");
  await expect(page.locator(".results-card")).toBeVisible();

  const current = await openInfoWithin(page.locator(".results-card"));
  expect(current.text).toMatch(/individual poll/i);
  expect(current.text).toMatch(/CC BY-SA 4.0/i);
  expect(current.text).toMatch(/Great Britain/);
  expect(current.text).toMatch(/not Northern Ireland/i);
  expect(current.text).toMatch(/not a seat forecast/i);
  await closeInfo(current.info);

  const historical = await openInfoWithin(page.locator("section.chart-card").first());
  expect(historical.text).toMatch(/UK Election Data Vault/);
  expect(historical.text).toMatch(/Great Britain/);
  expect(historical.text).toMatch(/not Northern Ireland/i);
  expect(historical.text).toMatch(/sampling uncertainty|house effects/);
  expect(historical.text).toMatch(/does not establish cause and effect/i);
  await closeInfo(historical.info);

  await expectEveryInfoIsSubstantial(page);
});

test("Spain polling and concerns info includes calculations, survey context and sources", async ({ page }) => {
  await page.goto("/?region=spain-congress&lang=es");
  await expect(page.locator(".results-card")).toBeVisible();
  await expect(page.locator("#spain-pulse")).toBeVisible();
  await expectEveryInfoIsSubstantial(page, 500);

  const change = await openInfoWithin(page.locator(".spain-change-card"));
  expect(change.text).toMatch(/45 días/);
  expect(change.text).toMatch(/mismo peso/);
  expect(change.text).toMatch(/puntos porcentuales/);
  expect(change.text).toMatch(/23 de julio de 2023|23-J de 2023/);
  await closeInfo(change.info);

  await page.goto("/?country=es&view=spain-issues&lang=es");
  await expect(page.locator(".spain-issues-page")).toBeVisible();
  await expectEveryInfoIsSubstantial(page, 650);
  const national = await openInfoWithin(page.locator("#spain-national-concerns"));
  expect(national.text).toMatch(/estudio 3557/i);
  expect(national.text).toMatch(/4(?:[.,])?020 entrevistas telefónicas/i);
  expect(national.text).toMatch(/hasta tres/);
  expect(national.text).toMatch(/final del trabajo de campo/);
  expect(national.text).toMatch(/no una tendencia/i);
  await expect(national.card.locator("a")).toHaveCount(2);
  await closeInfo(national.info);
});

test("approval info retains question, calculation, limitations and direct source", async ({ page }) => {
  await page.goto("/?view=approval&country=de&metric=leader&lang=de");
  await expect(page.locator(".approval-main-chart")).toBeVisible();
  const approval = await openInfoWithin(page.locator(".approval-main-chart"));
  expect(approval.text).toMatch(/Originalfrage/);
  expect(approval.text).toMatch(/Saldo/);
  expect(approval.text).toMatch(/Neutral/);
  expect(approval.text).toMatch(/Ursache und Wirkung/);
  expect(approval.text).toMatch(/Quelle/i);
  expect(approval.text.length).toBeGreaterThan(900);
  await expect(approval.card.locator("a[href^='http']")).toBeVisible();
});

test("current approval info covers every underlying widget control", async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.includes("iphone") && !testInfo.project.name.includes("pixel") && !testInfo.project.name.includes("galaxy"), "phone layering check");
  await page.goto("/?view=approval&country=de&metric=leader&lang=de");
  const info = page.locator(".approval-current-card .graph-info-popover").first();
  await info.locator("summary").click();
  await expect(info.locator(".graph-info-card")).toBeVisible();
  const exposed = await page.locator(".approval-current-tools button,.approval-current-corner-info summary").evaluateAll((controls, openInfo) => controls
    .filter((control) => !control.closest("details")?.isSameNode(openInfo))
    .filter((control) => {
      const rect = control.getBoundingClientRect();
      const top = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
      return top === control || control.contains(top);
    }).length, await info.elementHandle());
  expect(exposed).toBe(0);
});

test("info dialogs stay inside a phone viewport and remain scrollable", async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.includes("iphone") && !testInfo.project.name.includes("pixel") && !testInfo.project.name.includes("galaxy"), "phone-only layout check");
  await page.goto("/?region=bundestag&lang=de");
  const { card } = await openInfoWithin(page.locator("section.chart-card").first());
  const bounds = await card.evaluate((node) => {
    const rect = node.getBoundingClientRect();
    const style = getComputedStyle(node);
    return { top: rect.top, right: rect.right, bottom: rect.bottom, left: rect.left, width: rect.width, height: rect.height, viewportWidth: innerWidth, viewportHeight: innerHeight, centreX: rect.left + rect.width / 2, centreY: rect.top + rect.height / 2, overflowY: style.overflowY, scrollHeight: node.scrollHeight, clientHeight: node.clientHeight };
  });
  expect(bounds.left).toBeGreaterThanOrEqual(-1);
  expect(bounds.right).toBeLessThanOrEqual(bounds.viewportWidth + 1);
  expect(bounds.top).toBeGreaterThanOrEqual(-1);
  expect(bounds.bottom).toBeLessThanOrEqual(bounds.viewportHeight + 1);
  expect(Math.abs(bounds.centreX - bounds.viewportWidth / 2)).toBeLessThanOrEqual(2);
  expect(Math.abs(bounds.centreY - bounds.viewportHeight / 2)).toBeLessThanOrEqual(2);
  expect(bounds.width).toBeGreaterThan(260);
  expect(bounds.height).toBeLessThanOrEqual((bounds.viewportHeight * 0.75) + 2);
  expect(["auto", "scroll"]).toContain(bounds.overflowY);
  expect(bounds.scrollHeight).toBeGreaterThan(bounds.clientHeight);

  await card.evaluate((node) => node.scrollTo({ top: node.scrollHeight }));
  expect(await card.evaluate((node) => node.scrollTop)).toBeGreaterThan(0);
  await card.locator("header button").click();
  await card.locator("xpath=../summary").click();
  await expect.poll(() => card.evaluate((node) => node.scrollTop)).toBe(0);
});
