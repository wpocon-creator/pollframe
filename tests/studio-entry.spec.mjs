import { test, expect } from "@playwright/test";
test("two product sections stay beside the logo without header overlap", async ({
  page,
}, info) => {
  for (const [lang, polls] of [
    ["de", "Umfragen"],
    ["es", "Encuestas"],
    ["en-GB", "Polls"],
  ]) {
    await page.goto(`/?view=studio&lang=${lang}`);
    const nav = page.locator(".product-navigation");
    await expect(nav).toBeVisible();
    await expect(
      nav.getByRole("link", { name: "Studio", exact: true }),
    ).toHaveAttribute("aria-current", "page");
    await expect(
      nav.getByRole("link", { name: polls, exact: true }),
    ).toBeVisible();
    await expect(page.locator(".studio-global-entry")).toHaveCount(0);
    const b = await page.locator(".brand").boundingBox(),
      n = await nav.boundingBox(),
      a = await page.locator(".header-actions").boundingBox();
    expect(n.x).toBeGreaterThanOrEqual(b.x + b.width);
    expect(n.x + n.width).toBeLessThanOrEqual(a.x);
    expect(a.x + a.width).toBeLessThanOrEqual(page.viewportSize().width);
  }
  await page.screenshot({ path: info.outputPath("studio-navigation.png") });
  await page
    .locator(".product-navigation")
    .getByRole("link", { name: "Polls", exact: true })
    .click();
  await expect(page.locator(".product-navigation a[aria-current]")).toHaveText(
    "Polls",
  );
});
test("PNG and embed provide a contextual designs gallery without changing export behaviour", async ({
  page,
}, info) => {
  await page.goto("/?region=bundestag&lang=de");
  const card = page.locator(".results-card");
  await expect(card).toBeVisible();
  await card.locator(".widget-png-trigger").click();
  const png = page.locator(".png-options-modal");
  await expect(png).toBeVisible();
  const designs = png.getByRole("link", { name: "Andere Designs ansehen" });
  await expect(designs).toBeVisible();
  const href = new URL(
    await designs.getAttribute("href"),
    "https://pollframe.com",
  );
  expect(href.searchParams.get("profile")).toBe("current-poll");
  expect(href.searchParams.get("region")).toBe("bundestag");
  expect(href.searchParams.has("theme")).toBe(true);
  await expect(
    png.getByRole("button", { name: "PNG herunterladen", exact: true }),
  ).toBeVisible();
  await png.getByRole("button", { name: "Schließen" }).click();
  await card.locator(".widget-share-trigger:not(.widget-png-trigger)").click();
  const embed = page.locator(".widget-share-modal");
  await expect(embed).toBeVisible();
  const other = embed.getByRole("link", { name: "Andere Designs ansehen" });
  await expect(other).toBeVisible();
  expect(
    new URL(
      await other.getAttribute("href"),
      "https://pollframe.com",
    ).searchParams.get("profile"),
  ).toBe("current-poll");
  await page.screenshot({ path: info.outputPath("embed-studio-entry.png") });
  await other.click();
  await expect(page.locator(".studio-shell")).toBeVisible();
  await expect(page.locator(".is-full-editor")).toHaveCount(0);
  await expect(page.locator(".studio-picture-gallery")).toBeVisible();
});
test("approval handoff preserves the selected metric, answer and display", async ({
  page,
}) => {
  await page.goto(
    "/?view=approval&country=de&metric=government&answers=negative&display=linear&range=five&lang=de&share=1",
  );
  const link = page.locator(".approval-share-card .studio-more-designs");
  await page.locator('.approval-share-trigger').click();
  await expect(link).toBeVisible();
  const params = new URL(
    await link.getAttribute("href"),
    "https://pollframe.com",
  ).searchParams;
  expect(params.get("profile")).toBe("approval-history");
  expect(params.get("metric")).toBe("government");
  expect(params.get("answer")).toBe("negative");
  expect(params.get("mode")).toBe("linear");
  expect(params.get("range")).toBe("five");
});
