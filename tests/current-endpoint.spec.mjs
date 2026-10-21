import { expect, test } from "@playwright/test";

const cases = [
  ["de", "/?region=bundestag&range=all&mode=trend"],
  ["uk", "/?region=uk-westminster&range=all&mode=trend"],
  ["es", "/?region=spain-congress&range=all&mode=trend&lang=es"],
];

for (const [country, url] of cases) {
  test(`${country} latest individual poll marker matches the current card`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium-desktop", "desktop end labels only");
    await page.goto(url);
    await expect(page.locator(".results-card .result-row").first()).toBeVisible();
    await expect(page.locator(".series-end-label text").first()).toBeVisible();
    await expect(page.locator(".latest-individual-poll").first()).toBeVisible();
    const current = await page.locator(".results-card .result-row").evaluateAll((rows) => Object.fromEntries(rows.map((row) => {
      const party = row.querySelector(".party-name")?.textContent?.trim();
      const value = row.querySelector("strong")?.textContent?.trim();
      return [party, value];
    })));
    const averages = await page.locator(".series-end-label text").evaluateAll(labels => labels.map(label => [...label.childNodes].filter(node => node.nodeType === Node.TEXT_NODE).map(node => node.textContent).join("")));
    for (const label of averages) expect(label.trim()).toMatch(/^.* [0-9]+(?:[.,][0-9]+)?%$/);
    // Period-change tspans are intentionally separate from the endpoint value.
    for (const delta of await page.locator(".series-period-delta").allTextContents())
      expect(delta.trim()).toMatch(/^[+-]?[0-9]+(?:[.,][0-9]+)? (?:Pp\.|pp)$/);
    // The current card is an individual poll. The labelled line is a polling
    // average, so forcing those values to agree would conceal a data error.
    // Compare the separate latest-poll markers, retaining numeric assertions.
    const endpoints = await page.locator(".latest-individual-poll title").allTextContents();
    let compared = 0;
    for (const label of endpoints) {
      const match = label.trim().match(/^(.*): ([0-9]+(?:[.,][0-9]+)?)% · /);
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
