import { test, expect } from "@playwright/test";
test.skip(
  !process.env.POLLFRAME_ELECTION_RUNTIME,
  "Explicit local Worker integration check; calls official source",
);
test.use({ serviceWorkers: "block" });
test("real local Worker imports matching vote and seat snapshots and serves the detail page", async ({
  page,
  request,
}, info) => {
  const response = await request.get(
    "/api/elections/sachsen-anhalt-2026?archive=1",
  );
  expect(response.ok()).toBe(true);
  const { result } = await response.json();
  expect(result).toBeTruthy();
  expect(result.rows.reduce((sum, row) => sum + row.votes, 0)).toBe(
    result.validVotes,
  );
  expect(result.seatAllocation.publishedAt).toBe(result.publishedAt);
  expect(
    result.seatAllocation.rows.reduce((sum, row) => sum + row.seats, 0),
  ).toBe(result.seatAllocation.total);
  if(Date.parse(result.expiresAt)>Date.now()) {
    await page.goto('/?lang=de');
    await expect(page.locator('.election-teaser')).toBeVisible();
    await page.locator('.election-teaser a').click();
    await expect(page).toHaveURL(/view=election-st2026/);
  }
  await page.goto("/?view=election-st2026&lang=de");
  await expect(page.locator(".election-comparison-table")).toBeVisible();
  await expect(page.locator(".election-party-picker")).toBeVisible();
  await page.screenshot({
    path: info.outputPath("real-election.png"),
    fullPage: true,
  });
});
