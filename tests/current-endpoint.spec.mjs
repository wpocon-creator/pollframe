import { expect, test } from "@playwright/test";

const cases = [
  ["de", "/?region=bundestag&range=all&mode=trend"],
  ["uk", "/?region=uk-westminster&range=all&mode=trend"],
  ["es", "/?region=spain-congress&range=all&mode=trend&lang=es"],
];

for (const [country, url] of cases) {
  test(`${country} historical endpoint matches the current card`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium-desktop", "desktop end labels only");
    await page.goto(url);
    await expect(page.locator(".results-card .result-row").first()).toBeVisible();
    await expect(page.locator(".series-end-label text").first()).toBeVisible();
    const current = await page.locator(".results-card .result-row").evaluateAll((rows) => Object.fromEntries(rows.map((row) => {
      const party = row.querySelector(".party-name")?.textContent?.trim();
      const value = row.querySelector("strong")?.textContent?.trim();
      return [party, value];
    })));
    const endpoints = await page.locator(".series-end-label text").allTextContents();
    let compared = 0;
    for (const label of endpoints) {
      const match = label.trim().match(/^(.*) ([0-9]+(?:[.,][0-9]+)?)%$/);
      expect(match, `readable endpoint label: ${label}`).toBeTruthy();
      // The chart may label one more line than the deliberately compact latest-
      // poll card. Every party visible in both places must still agree exactly.
      if (!(match[1] in current)) continue;
      const endpointValue = Number(match[2].replace(",", "."));
      const currentValue = Number(current[match[1]].replace("%", "").replace(",", "."));
      expect(endpointValue, `${match[1]} endpoint`).toBeCloseTo(currentValue, 1);
      compared += 1;
    }
    expect(compared).toBe(Math.min(endpoints.length, Object.keys(current).length));
    expect(compared).toBeGreaterThanOrEqual(5);
  });
}
