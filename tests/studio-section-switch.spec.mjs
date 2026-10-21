import { test, expect } from "@playwright/test";

test("section switching stays in one document, reuses public snapshots, preserves language and the return page", async ({
  page,
}, info) => {
  test.setTimeout(120000);
  const documents = [],
    errors = [];
  page.on("request", (r) => {
    if (r.isNavigationRequest() && r.frame() === page.mainFrame())
      documents.push(r.url());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/de/bundestag/umfragen?lang=de");
  await expect(page.locator(".product-sections-bar")).toBeVisible();
  await page.evaluate(
    () => (window.__pollframeSwitchSentinel = "same-document"),
  );
  const measurements = [];
  for (let i = 0; i < 3; i++) {
    const studio = page
      .locator(".product-sections-bar")
      .getByRole("link", { name: "Studio", exact: true });
    await studio.hover();
    const start = Date.now();
    await studio.click();
    await expect(page.locator(".studio-template-card svg").first()).toBeVisible(
      { timeout: 45000 },
    );
    measurements.push(Date.now() - start);
    expect(await page.evaluate(() => window.__pollframeSwitchSentinel)).toBe(
      "same-document",
    );
    await expect(
      page.locator(".product-sections-bar a[aria-current]"),
    ).toHaveText("Studio");
    // Changing presentation sections must not create a new top-level document.
    expect(documents).toHaveLength(1);
    if (i > 0)
      await expect(
        page.locator('iframe[title="Pollframe data source"]'),
      ).toHaveCount(0);
    await page
      .locator(".product-sections-bar")
      .getByRole("link", { name: "Pollframe", exact: true })
      .click();
    await expect(page).toHaveURL(/\/de\/bundestag\/umfragen\?lang=de/);
    await expect(
      page.locator(".product-sections-bar a[aria-current]"),
    ).toHaveText("Pollframe");
  }
  await page.setViewportSize({ width: 390, height: 844 });
  for (const theme of ["light", "dark"]) {
    await page.evaluate(
      (theme) => (document.documentElement.dataset.theme = theme),
      theme,
    );
    await expect(page.locator('.product-sections-bar a[aria-current]')).toHaveCSS('color',
      theme === 'dark' ? 'rgb(243, 243, 239)' : 'rgb(23, 25, 28)');
    // No hover underline from the last desktop click in the phone samples.
    await page.mouse.move(0, 500);
    await page.screenshot({
      path: info.outputPath(`section-switch-${theme}.png`),
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth - innerWidth,
      ),
    ).toBeLessThanOrEqual(1);
  }
  console.log(
    "Section switch timings (local browser, ms):",
    measurements.join(", "),
  );
  expect(errors).toEqual([]);
});

test('compare full document navigation with warm section switching', async ({page}, info) => {
  test.setTimeout(120000);
  const poll='/de/bundestag/umfragen?lang=de';
  const visible=()=>expect(page.locator('.studio-template-card svg').first()).toBeVisible({timeout:45000});
  const old=[], warm=[];
  // Same browser/cache/device: native document navigation reproduces the old
  // switch; normal clicks exercise the new client-side route and RAM reuse.
  for(let i=0;i<3;i++) {
    await page.goto(poll);
    const href=await page.locator('.product-sections-bar a').nth(1).getAttribute('href');
    const start=Date.now();
    await page.goto(href);
    await visible();
    old.push(Date.now()-start);
  }
  for(let i=0;i<3;i++) {
    await page.locator('.product-sections-bar a').first().click();
    await expect(page.locator('.product-sections-bar a[aria-current]')).toHaveText('Pollframe');
    const start=Date.now();
    await page.locator('.product-sections-bar a').nth(1).click();
    await visible();
    warm.push(Date.now()-start);
  }
  const median=a=>[...a].sort((a,b)=>a-b)[1];
  console.log('Switch benchmark (same local browser):',JSON.stringify({documentMs:old,sectionMs:warm,medianDocumentMs:median(old),medianSectionMs:median(warm),reductionPercent:Math.round(100*(1-median(warm)/median(old)))}));
  await page.screenshot({path:info.outputPath('studio-switch-desktop.png')});
});
