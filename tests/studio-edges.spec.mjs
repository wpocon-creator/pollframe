import { test, expect } from "@playwright/test";
test.use({ serviceWorkers: "block" });
test("graphic corners round independently of sharp 3D bars and survive embed", async ({
  page,
}) => {
  await page.goto(
    "/?view=studio&editor=1&template=poll-material&lang=de&parties=1,2,4",
  );
  const svg = page.locator(".studio-current-preview-image>svg");
  await expect(svg).toHaveAttribute("data-render-ready", "true", {
    timeout: 35000,
  });
  await expect(svg.locator("clipPath rect")).toHaveAttribute("rx", "0");
  await page
    .getByRole("slider", { name: /Grafikecken abrunden/ })
    .fill("24");
  await expect(svg.locator("clipPath rect")).toHaveAttribute("rx", "24");
  expect(await svg.locator("image").count()).toBe(0);
  if(await page.locator("dialog[open]").count())await page.locator("dialog[open]").getByRole("button",{name:"Schließen"}).click();
  await page.getByRole("button", { name: "Embed", exact: true }).click();
  const code = await page.locator("dialog[open] textarea").inputValue();
  expect(code).toContain("edges=rounded");
  await page.goto(code.match(/src="([^"]+)"/)[1].replaceAll("&amp;", "&"));
  await expect(page.locator("svg clipPath rect")).toHaveAttribute("rx", "24", {
    timeout: 35000,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
});
