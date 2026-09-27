import { test, expect } from "@playwright/test";
test.beforeEach(async ({ context, browserName }) => {
  // Only this synthetic publisher test needs loopback access. Real publisher
  // embeds load the public HTTPS origin, not a private/local network resource.
  if (browserName === "chromium")
    await context.grantPermissions(["local-network-access"], {
      origin: "http://127.0.0.1:4175",
    });
});
async function checkFit(frameLocator, selector) {
  await expect(frameLocator.locator(selector)).toBeVisible();
  await expect
    .poll(() =>
      frameLocator
        .locator(selector)
        .evaluate((n) =>
          Math.abs(
            innerHeight - Math.ceil(n.getBoundingClientRect().bottom + scrollY),
          ),
        ),
    )
    .toBeLessThanOrEqual(2);
}
test("Studio preview and pasted embed fit the artwork at every preview width", async ({
  page,
}, info) => {
  await page.goto(
    "/?view=studio&topic=current&template=poll-wide&lang=de&theme=dark&editor=1&workspace=preview",
  );
  await expect(
    page.locator(".studio-current-preview-image > svg"),
  ).toBeVisible();
  await page.getByRole("button", { name: "Embed", exact: true }).click();
  const modal = page.locator(".widget-share-modal");
  for (const name of ["Artikel", "Handy", "Breit"]) {
    await modal.getByRole("button", { name, exact: true }).click();
    await checkFit(modal.frameLocator("iframe"), ".studio-standalone-embed");
    const container = modal.locator(".static-embed-preview"),
      stage = modal.locator(".static-embed-stage");
    await expect
      .poll(
        async () =>
          (await container.boundingBox()).height -
          (await stage.boundingBox()).height,
      )
      .toBeLessThanOrEqual(2);
  }
  await page.screenshot({ path: info.outputPath("studio-embed-fit.png") });
  const code = await modal.locator(".code-label code").textContent();
  await page.route("http://127.0.0.1:4175/article", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: `<!doctype html><style>body{margin:0}#article{width:390px}</style><div id="article">${code}</div>`,
    }),
  );
  await page.goto("http://127.0.0.1:4175/article");
  for (const width of [390, 760, 1000]) {
    await page
      .locator("#article")
      .evaluate((n, w) => (n.style.width = w + "px"), width);
    await checkFit(page.frameLocator("iframe"), ".studio-standalone-embed");
  }
});
test("regular copied embeds auto-size on another origin, ignore forged messages, and preview uses the content height", async ({
  page,
}, info) => {
  await page.goto("/?region=bundestag&lang=de");
  await page
    .locator(".results-card .widget-share-trigger:not(.widget-png-trigger)")
    .click();
  const modal = page.locator(".widget-share-modal");
  await checkFit(modal.frameLocator("iframe"), ".widget-embed-page");
  const code = await modal.locator(".code-label code").textContent();
  expect(code).toContain("data-pollframe-autoheight");
  expect(code).toContain("/embed-resize.js");
  const fallback = Number(code.match(/height="(\d+)"/)[1]);
  const content = await modal.frameLocator('iframe').locator('.widget-embed-page').evaluate(n=>Math.ceil(n.getBoundingClientRect().bottom));
  expect(Math.abs(fallback-content)).toBeLessThanOrEqual(2);
  await page.route("http://127.0.0.1:4175/article", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: `<!doctype html><style>body{margin:0}#article{width:390px}</style><div id="article">${code}</div>`,
    }),
  );
  await page.goto("http://127.0.0.1:4175/article");
  for (const width of [390, 760, 1100]) {
    await page
      .locator("#article")
      .evaluate((n, w) => (n.style.width = w + "px"), width);
    await checkFit(page.frameLocator("iframe"), ".widget-embed-page");
  }
  const iframe = page.locator("iframe"),
    height = await iframe.getAttribute("height");
  await page.evaluate(() =>
    window.dispatchEvent(
      new MessageEvent("message", {
        origin: "http://127.0.0.1:4174",
        source: window,
        data: { type: "pollframe:embed-size", height: 1 },
      }),
    ),
  );
  expect(await iframe.getAttribute("height")).toBe(height);
  await page.screenshot({ path: info.outputPath("publisher-embed-fit.png") });
});
