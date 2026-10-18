import { expect, test } from "@playwright/test";

const cases = [
  ["de", "/?region=bundestag&range=all&mode=trend", "/data/bundestag.json"],
  ["uk", "/?region=uk-westminster&range=all&mode=trend", "/data/uk-westminster.json"],
  ["es", "/?region=spain-congress&range=all&mode=trend&lang=es", "/data/spain-congress.json"],
];

for (const [country, url, dataUrl] of cases) {
  test(`${country} average endpoint and latest individual poll remain distinct and verifiable`, async ({ page }, testInfo) => {
    test.skip(!['chromium-desktop', 'firefox-desktop', 'webkit-desktop'].includes(testInfo.project.name), "desktop end labels only");
    await page.goto(url);
    await expect(page.locator(".results-card .result-row").first()).toBeVisible();
    await expect(page.locator(".series-end-label text").first()).toBeVisible();
    const response = await page.request.get(dataUrl);
    expect(response.ok()).toBe(true);
    const data = await response.json();
    const context = JSON.parse(await page.locator('main[data-studio-context]').getAttribute('data-studio-context'));
    const selected = new Set(context.pollsters.split(','));
    const selectedPolls = data.polls.filter(poll => selected.has(poll.pollster));
    const latest = selectedPolls.at(-1);
    const current = await page.locator(".results-card .result-row").evaluateAll((rows) => Object.fromEntries(rows.map((row) => {
      const party = row.querySelector(".party-name")?.textContent?.trim();
      const value = row.querySelector("strong")?.textContent?.trim();
      return [party, value];
    })));
    const endpoints = await page.locator(".series-end-label").evaluateAll((labels) => labels.map((label) => ({
      valueText: label.querySelector('.series-end-value')?.textContent?.trim(),
      partyId: label.dataset.partyId,
      deltaText: label.querySelector('.series-period-delta')?.textContent?.trim(),
      startDate: label.dataset.startDate,
      endDate: label.dataset.endDate,
      startValue: Number(label.dataset.startValue),
      endValue: Number(label.dataset.endValue),
    })));
    let compared = 0;
    for (const label of endpoints) {
      const match = label.valueText?.match(/^(.*) ([0-9]+(?:[.,][0-9]+)?)%$/);
      expect(match, `readable endpoint label: ${label.valueText}`).toBeTruthy();
      const delta = label.deltaText?.match(/^([+-]?[0-9]+(?:[.,][0-9]+)?) (?:Pp\.|pp)$/);
      expect(delta, `separate change figure: ${label.deltaText}`).toBeTruthy();
      expect(label.startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(label.endDate >= label.startDate).toBe(true);
      expect(Math.abs(Number(delta[1].replace(',', '.')) - (label.endValue - label.startValue))).toBeLessThanOrEqual(0.051);
      // The line is an equal-institute average, NOT the newest individual poll.
      // Recompute its endpoint independently from the public source records.
      const cutoff = Date.parse(`${label.endDate}T12:00:00Z`) - 45 * 86400000;
      const lastPerInstitute = [...selected].map(id => selectedPolls.findLast(poll => poll.pollster === id && poll.date <= label.endDate))
        .filter(poll => poll && Date.parse(`${poll.date}T12:00:00Z`) >= cutoff);
      const values = lastPerInstitute.map(poll => poll.results[label.partyId]).filter(Number.isFinite);
      const expectedAverage = values.reduce((sum, value) => sum + value, 0) / values.length;
      expect(label.endValue, `${match[1]} average endpoint`).toBeCloseTo(expectedAverage, 8);
      expect(Number(match[2].replace(',', '.')), `${match[1]} displayed average`).toBeCloseTo(expectedAverage, 1);
      if (!(match[1] in current)) continue;
      const currentValue = Number(current[match[1]].replace("%", "").replace(",", "."));
      expect(currentValue, `${match[1]} latest individual poll`).toBeCloseTo(latest.results[label.partyId], 1);
      if (!latest.synthetic) {
        const marker = page.locator(`.latest-individual-poll[data-party-id="${label.partyId}"]`);
        await expect(marker).toHaveAttribute('data-date', latest.date);
        expect(Number(await marker.getAttribute('data-value'))).toBe(latest.results[label.partyId]);
        await expect(marker.locator('title')).toContainText(data.pollsters[latest.pollster]);
      }
      compared += 1;
    }
    expect(compared).toBe(Math.min(endpoints.length, Object.keys(current).length));
    expect(compared).toBeGreaterThanOrEqual(5);
  });
}
