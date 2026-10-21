import { test, expect } from "@playwright/test";
test("exactly two answers in a dimension produce no scale or marker in the real results UI", async ({
  page,
}) => {
  await page.goto("/?view=party-match&lang=de");
  await page.locator('.pm-lengths input[value="8"]').check();
  await page.locator(".pm-start-card>.pm-primary").click();
  await answer(page, 8, [0, 1, 2, 4]);
  await expect(page.locator(".pm-policy-profile .pm-profile-rail")).toHaveCount(
    0,
  );
  await expect(
    page.locator(".pm-policy-profile .pm-profile-insufficient"),
  ).toHaveCount(2);
  await expect(page.locator(".pm-topics .pm-topic-result")).toHaveCount(0);
});

async function choose(page, label, name) {
  await page.getByRole("combobox", { name: label, exact: true }).click();
  await page.getByRole("option", { name, exact: true }).click();
}
async function answer(page, n, allowed = null) {
  for (let i = 0; i < n; i++) {
    if (allowed && !allowed.includes(i))
      await page.locator(".pm-question-actions>.pm-text-button").click();
    else {
      await page
        .locator(".pm-choices label")
        .nth(i % 3)
        .click();
      await page.locator(".pm-question-actions .pm-primary").click();
    }
  }
  await expect(page.locator(".pm-results")).toBeVisible();
}
const noOverflow = async (page) =>
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth - innerWidth,
    ),
  ).toBeLessThanOrEqual(1);
for (const round of ["economy", "social", "climate-energy"])
  test(`${round}: 15 questions, scoped results, source receipt and no misleading overall profile`, async ({
    page,
  }, info) => {
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("/?view=party-match&lang=en-GB");
    await page.locator(`.pm-topic-entry-card[data-round="${round}"]`).click();
    await answer(page, 15);
    await expect(page.locator(".pm-result-context")).toContainText("15 / 15");
    await expect(page.locator(".pm-policy-profile")).toHaveCount(0);
    await expect(
      page.locator(".pm-self-compare .pm-comparison-question"),
    ).toHaveCount(15);
    const allowed = await page.evaluate(
      () => innerWidth >= 768 && Math.min(screen.width, screen.height) >= 600,
    );
    if (allowed) {
      await page
        .locator(".pm-topics")
        .getByRole("button", { name: "Design in Studio", exact: true })
        .click();
      await expect(page.locator(".pm-studio-preview img")).toBeVisible();
      const src = await page
        .locator(".pm-studio-preview img")
        .getAttribute("src");
      expect(decodeURIComponent(src)).toContain("2025 programmes");
      await page.getByRole("button", { name: "Edit", exact: true }).click();
      await page
        .getByRole("combobox", { name: "Graphic type", exact: true })
        .click();
      await expect(
        page.getByRole("option", { name: "Political spectrum", exact: true }),
      ).toHaveCount(0);
      await page.keyboard.press("Escape");
      await page.goBack();
      // Studio uses the in-memory result, not localStorage or a URL with answers.
      await expect(page.locator(".pm-results")).toBeVisible();
      await expect(page.locator(".pm-result-context")).toContainText("15 / 15");
    }
    await page.evaluate(() => {
      document.documentElement.style.fontSize = "24px";
      document.documentElement.dataset.theme = "dark";
    });
    await noOverflow(page);
    await page.locator(".pm-topics").scrollIntoViewIfNeeded();
    await page.screenshot({ path: info.outputPath(`${round}-results.png`) });
    expect(errors).toEqual([]);
  });
test("independent readable scales, exact threshold at three answers, separate comparison markers", async ({
  page,
}, info) => {
  await page.goto("/?view=party-match&lang=en-GB");
  await page.locator('.pm-lengths input[value="8"]').check();
  await page.locator(".pm-start-card>.pm-primary").click();
  await answer(page, 8);
  const section = page.locator(".pm-policy-profile");
  await expect(section.locator(".pm-profile-card")).toHaveCount(2);
  await choose(page, "Dimension 1", "Climate ambition");
  const climate = section.locator("[data-dimension=climate]");
  await expect(climate.locator(".pm-profile-rail")).toHaveCount(0);
  await expect(climate.locator(".pm-profile-insufficient")).toBeVisible();
  await choose(page, "Dimension 2", "Economy");
  await expect(
    section.locator("[data-dimension=economy] .pm-profile-rail"),
  ).toHaveCount(1);
  await choose(page, "Dimension 1", "Economy");
  await expect(section.locator(".pm-profile-card").first()).toHaveAttribute(
    "data-dimension",
    "economy",
  );
  await expect(section.locator(".pm-profile-card").last()).toHaveAttribute(
    "data-dimension",
    "climate",
  );
  await section
    .getByRole("combobox", { name: "Compare with", exact: true })
    .count()
    .then(async (n) => {
      if (n) await choose(page, "Compare with", "SPD");
      else {
        await section.locator(".pm-view-heading").getByRole("combobox").click();
        await page.getByRole("option", { name: "SPD", exact: true }).click();
      }
    });
  await expect(
    section.locator("[data-dimension=economy] .pm-profile-person"),
  ).toHaveCount(2);
  const sameRow = await section
    .locator("[data-dimension=economy] .pm-profile-person")
    .evaluateAll(
      (rows) =>
        rows[0].getBoundingClientRect().bottom >
        rows[1].getBoundingClientRect().top,
    );
  expect(sameRow).toBe(false);
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "24px";
    document.documentElement.dataset.theme = "dark";
  });
  await section.scrollIntoViewIfNeeded();
  await noOverflow(page);
  await section.screenshot({ path: info.outputPath("policy-profile.png") });
});
