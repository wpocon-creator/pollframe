import { test, expect } from "@playwright/test";

test("original general entry stays first, with three adjacent topic cards below on every device", async ({
  page,
}, info) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const lang of ["de", "es"]) {
    await page.goto(`/?view=party-match&lang=${lang}`);
    await expect(page.locator(".pm-lengths input")).toHaveCount(3);
    await expect(page.locator(".pm-topic-entry-card")).toHaveCount(3);
    for (const dark of [false, true]) {
      await page.evaluate((dark) => {
        document.documentElement.dataset.theme = dark ? "dark" : "light";
        document.documentElement.style.fontSize = dark ? "24px" : "";
      }, dark);
      const boxes = await page
        .locator(".pm-topic-entry-card")
        .evaluateAll((els) =>
          els.map((el) => {
            const b = el.getBoundingClientRect();
            return {
              x: b.x,
              y: b.y,
              right: b.right,
              width: b.width,
              scroll: el.scrollWidth,
              client: el.clientWidth,
            };
          }),
        );
      expect(
        Math.max(...boxes.map((b) => b.y)) - Math.min(...boxes.map((b) => b.y)),
      ).toBeLessThan(2);
      expect(boxes[1].x).toBeGreaterThan(boxes[0].right);
      expect(boxes[2].x).toBeGreaterThan(boxes[1].right);
      for (const box of boxes)
        expect(box.scroll - box.client).toBeLessThanOrEqual(1);
      const positions = await page.evaluate(() => ({
        start: document.querySelector(".pm-start-card").getBoundingClientRect()
          .bottom,
        topics: document
          .querySelector(".pm-topic-entry")
          .getBoundingClientRect().top,
        overflow: document.documentElement.scrollWidth - innerWidth,
      }));
      expect(positions.topics).toBeGreaterThan(positions.start);
      expect(positions.overflow).toBeLessThanOrEqual(1);
      await page
        .locator(".pm-topic-entry")
        .screenshot({
          path: info.outputPath(
            `${lang}-${dark ? "dark-large" : "light"}-topics.png`,
          ),
        });
      if (!dark)
        await page.screenshot({
          path: info.outputPath(`${lang}-entry.png`),
          fullPage: true,
        });
    }
  }
  expect(errors).toEqual([]);
});
test("general length selection and each topic card start the intended questionnaire directly", async ({
  page,
}) => {
  await page.goto("/?view=party-match&lang=de");
  await page.locator('.pm-lengths input[value="8"]').check();
  await page.locator(".pm-start-card>.pm-primary").click();
  await expect(page.locator(".pm-progress-label")).toContainText("1 von 8");
  for (const round of ["economy", "social", "climate-energy"]) {
    await page.goto("/?view=party-match&lang=de");
    await page.locator(`.pm-topic-entry-card[data-round="${round}"]`).click();
    await expect(page.locator(".pm-progress-label")).toContainText("1 von 15");
    await expect(page.locator(".pm-topic-nav button")).toHaveCount(15);
  }
});
