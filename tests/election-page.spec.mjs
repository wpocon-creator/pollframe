import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import {
  parseElectionResults,
  parseElectionSeats,
} from "../worker/election-results.js";
const fixture = JSON.parse(
  readFileSync(
    new URL("./fixtures/election-st2026-tables.json", import.meta.url),
  ),
);
const html = (table) =>
  `Landtagswahl Sachsen-Anhalt 2026<div id="zeitstempel" data-value="${fixture.stamp}"></div><div id="statusXY">2661 von 2661 Wahlbezirken</div><script data-for="ergtable">${JSON.stringify({ x: { tag: { attribs: table } } })}</script>`;
const result = {
  ...parseElectionResults(html(fixture.results), fixture.stamp + 1000),
  seatAllocation: parseElectionSeats(html(fixture.seats), fixture.stamp + 1000),
  expiresAt: "2026-09-11T19:06:45Z",
};
test.use({ serviceWorkers: "block" });
test("official comparisons, small temporary widget, coalition arithmetic and responsive layout", async ({
  page,
}, info) => {
  await page.route("**/api/elections/sachsen-anhalt-2026*", (route) =>
    route.fulfill({ json: { result } }),
  );
  await page.goto("/?lang=de");
  const teaser = page.locator(".election-teaser");
  await expect(teaser).toBeVisible();
  expect((await teaser.boundingBox()).height).toBeLessThan(180);
  await teaser.locator("h2 a").click();
  const table = page.locator(".election-comparison-table");
  await expect(table).toBeVisible();
  const cdu = page
    .locator(".election-comparison-row")
    .filter({ hasText: "CDU" });
  await expect(cdu).toContainText("17,2%");
  await expect(cdu).toContainText("37,1%");
  await expect(cdu).toContainText("-19,9");
  await page.getByLabel("Vergleich mit", { exact: true }).selectOption("poll");
  await expect(page.locator(".election-poll-note").first()).toContainText(
    "03.09.2026",
  );
  await expect(cdu).toContainText("23,0%");
  await expect(cdu).toContainText("-5,8");
  const picker = page.locator(".election-party-picker");
  await picker.getByRole("button", { name: /AfD/ }).click();
  await expect(page.locator(".election-majority-value")).toContainText(
    "3 Sitze fehlen",
  );
  await picker.getByRole("button", { name: /CDU/ }).click();
  await expect(page.locator(".election-majority-value")).toContainText(
    "12 Sitze über der Mehrheit",
  );
  await expect(
    page.locator(".election-majority-value + .election-poll-note"),
  ).toContainText("Koalitionsausschluss");
  await expect(page.locator(".election-stats-grid")).toContainText("77,8%");
  await expect(page.locator(".election-coalitions button:visible")).toHaveCount(
    0,
  );
  await page.locator(".election-other-majorities summary").click();
  await expect(page.locator(".election-coalitions button")).toHaveCount(6);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  const overflow = await page
    .locator(".election-page")
    .evaluate((node) =>
      [...node.querySelectorAll('button,select,[role="cell"]')]
        .filter((item) => item.getBoundingClientRect().right > innerWidth + 1)
        .map((item) => item.textContent),
    );
  expect(overflow).toEqual([]);
  await page.screenshot({
    path: info.outputPath("election-page.png"),
    fullPage: true,
  });
});
test("Spanish and English election views retain readable controls in dark mode", async ({
  page,
}, info) => {
  await page.addInitScript(() =>
    localStorage.setItem("opinion-poll-theme", "dark"),
  );
  await page.route("**/api/elections/sachsen-anhalt-2026*", (route) =>
    route.fulfill({ json: { result } }),
  );
  for (const lang of ["es", "en-GB"]) {
    await page.goto("/?view=election-st2026&lang=" + lang);
    await expect(page.locator(".election-comparison-table")).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await page.locator(".election-section-heading select").selectOption("poll");
    await expect(page.locator(".election-poll-note").first()).toContainText(
      "2026",
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: info.outputPath(`election-${lang}-dark.png`),
      fullPage: true,
    });
  }
});
test("partial counts never invent official seats; absent comparison entries remain missing", async ({
  page,
}) => {
  await page.route("**/api/elections/sachsen-anhalt-2026*", (route) =>
    route.fulfill({ json: { result: { ...result, status: "partial" } } }),
  );
  await page.goto("/?view=election-st2026&lang=de");
  await expect(page.locator(".election-archive-note")).toContainText(
    "keine Hochrechnung",
  );
  await expect(page.locator(".election-party-picker")).toHaveCount(0);
  await expect(
    page.locator(".election-comparison-row").filter({ hasText: "BSW" }),
  ).toContainText("—");
});
