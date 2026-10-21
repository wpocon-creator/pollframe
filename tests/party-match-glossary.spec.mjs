import { test, expect } from "@playwright/test";

async function start(page, language = "en-GB") {
  await page.goto(`/?view=party-match&lang=${language}`);
  await page.locator('.pm-lengths input[value="8"]').check();
  await page.locator(".pm-start-card>.pm-primary").click();
  expect(await page.locator(".pm-choices label").allTextContents()).toEqual(
    expect.arrayContaining([
      expect.any(String),
      expect.any(String),
      expect.any(String),
    ]),
  );
  for (const label of await page
    .locator(".pm-choices label")
    .allTextContents()) {
    expect(label).not.toMatch(/[+−≈]/);
  }
}
async function assertDialogLayout(page) {
  const layout = await page.locator(".pm-dialog").evaluate((el) => {
    const r = el.getBoundingClientRect();
    return {
      x: r.x,
      y: r.y,
      width: r.width,
      height: r.height,
      vw: innerWidth,
      vh: innerHeight,
      overflows: el.scrollWidth > el.clientWidth + 1,
      bodyLocked:
        getComputedStyle(document.body).position === "fixed" ||
        getComputedStyle(document.body).overflow === "hidden" ||
        getComputedStyle(document.documentElement).overflow === "hidden",
    };
  });
  expect(Math.abs(layout.x + layout.width / 2 - layout.vw / 2)).toBeLessThan(3);
  expect(Math.abs(layout.y + layout.height / 2 - layout.vh / 2)).toBeLessThan(
    3,
  );
  expect(layout.height).toBeLessThanOrEqual(layout.vh * 0.75 + 1);
  expect(layout.overflows).toBe(false);
  expect(layout.bodyLocked).toBe(true);
}

test("explanations preserve answers, focus, scroll and privacy; keyboard and backdrop closing", async ({
  page,
}, info) => {
  await start(page);
  await page.locator(".pm-choices label").first().click();
  await page.waitForLoadState("networkidle");
  const state = () =>
    page.evaluate(() => ({
      local: { ...localStorage },
      session: { ...sessionStorage },
      cookie: document.cookie,
      url: location.href,
    }));
  const before = await state(),
    requests = [];
  page.on("request", (r) => requests.push(r.url()));
  const trigger = page.locator('h1 [data-term="wealth-tax"]');
  await trigger.focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog", { name: "Wealth tax", exact: true });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("accumulated assets");
  await expect(dialog.getByRole("link")).toHaveAttribute(
    "href",
    "https://www.gesetze-im-internet.de/vstg_1974/__4.html",
  );
  await assertDialogLayout(page);
  await page.screenshot({ path: info.outputPath("glossary-light.png") });
  for (let i = 0; i < 5; i++) {
    await page.keyboard.press("Tab");
    expect(
      await dialog.evaluate((el) => el.contains(document.activeElement)),
    ).toBe(true);
  }
  await dialog.locator("header button").focus();
  await page.keyboard.press("Shift+Tab");
  await expect(dialog.getByRole("link")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await expect(page.locator('.pm-choices input[value="1"]')).toBeChecked();
  await expect(page.locator(".pm-progress-label")).toContainText("1 of 8");
  await trigger.click();
  await dialog.locator(".pm-dialog-content").click();
  await expect(dialog).toBeVisible();
  await page.mouse.click(3, 3);
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
  expect(await state()).toEqual(before);
  expect(requests).toEqual([]);
});

for (const locale of ["de", "en-GB", "en-US", "es"]) {
  test(`long explanations stay centred, scroll internally, and translate: ${locale}`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width: 360, height: 640 });
    await start(page, locale);
    await page.evaluate(() => {
      document.documentElement.dataset.theme = "dark";
      document.documentElement.style.fontSize = "28px";
    });
    for (let i = 0; i < 2; i++)
      await page.locator(".pm-question-actions>.pm-text-button").click();
    const trigger = page.locator('h1 [data-term="third-country"]');
    await expect(trigger).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
    await trigger.click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toContainText(
      locale === "de"
        ? "Herkunftsland"
        : locale === "es"
          ? "país de origen"
          : "country of origin",
    );
    await assertDialogLayout(page);
    expect(
      await dialog.evaluate((el) => el.scrollHeight > el.clientHeight),
    ).toBe(true);
    await dialog.evaluate((el) => {
      el.scrollTop = el.scrollHeight;
    });
    await expect(dialog.locator("header button")).toBeInViewport();
    await expect(dialog.getByRole("link")).toBeInViewport();
    await page.screenshot({
      path: info.outputPath(`glossary-${locale}-large-dark.png`),
    });
    await page.setViewportSize({ width: 640, height: 360 });
    await assertDialogLayout(page);
    await dialog.locator("header button").click();
    await expect(dialog).toHaveCount(0);
    await expect(trigger).toBeFocused();
  });
}

test("party evidence and quick editing expose the same glossary without changing ranking", async ({
  page,
}) => {
  await start(page);
  for (let i = 0; i < 8; i++) {
    await page.locator(".pm-choices label").first().click();
    await page.locator(".pm-question-actions .pm-primary").click();
  }
  const scores = await page.locator(".pm-score").allTextContents();
  const party = page.locator(".pm-party").first();
  await party.locator(":scope>summary").click();
  const evidence = party.locator(".pm-evidence").first();
  await evidence.locator("summary").click();
  await evidence.locator("h3 .pm-term").first().click();
  await expect(page.getByRole("dialog")).toContainText("accumulated assets");
  await page.keyboard.press("Escape");
  await expect(evidence).toHaveAttribute("open", "");
  await evidence
    .getByRole("button", { name: "Edit answer", exact: true })
    .click();
  await page.locator("#pm-edit-wealth h2 .pm-term").first().click();
  await expect(page.getByRole("dialog")).toContainText("accumulated assets");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Back to ranking" }).click();
  expect(await page.locator(".pm-score").allTextContents()).toEqual(scores);
  expect(
    await page.locator("button button, summary button, label button").count(),
  ).toBe(0);
});
