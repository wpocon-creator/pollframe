import { test, expect } from "@playwright/test";
import {
  MATCH_QUESTIONS,
  MATCH_PARTIES,
  localText,
} from "../src/party-match-data.js";
import {
  calculateMatches,
  scoreLabel,
  rankLabel,
} from "../src/party-match-model.js";

async function start(page, language = "en-GB") {
  await page.goto(`/?view=party-match&lang=${language}`);
  await page.locator('.pm-lengths input[value="30"]').check();
  await page.locator(".pm-start-card > .pm-primary").click();
}
async function modalFits(page) {
  const r = await page.getByRole("dialog").evaluate((el) => {
    const b = el.getBoundingClientRect();
    return {
      x: b.x,
      y: b.y,
      w: b.width,
      h: b.height,
      vw: innerWidth,
      vh: innerHeight,
      overflow: el.scrollWidth - el.clientWidth,
    };
  });
  expect(Math.abs(r.x + r.w / 2 - r.vw / 2)).toBeLessThan(3);
  expect(Math.abs(r.y + r.h / 2 - r.vh / 2)).toBeLessThan(3);
  expect(r.h).toBeLessThanOrEqual(r.vh * 0.75 + 1);
  expect(r.overflow).toBeLessThan(2);
}
test("positions retain sources without temporarily removed arguments or studies, preserve answers and focus", async ({
  page,
}, info) => {
  await start(page);
  await page.locator('.pm-choices label:has(input[value="1"])').click();
  await page.waitForLoadState("networkidle");
  const snapshot = () =>
    page.evaluate(() => ({
      local: { ...localStorage },
      session: { ...sessionStorage },
      url: location.href,
    }));
  const before = await snapshot(),
    requests = [];
  page.on("request", (r) => {
    if (/^https?:/.test(r.url())) requests.push(r.url());
  });
  const trigger = page.locator(".pm-question-card .pm-arguments-trigger");
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: "Positions & sources" });
  await expect(dialog.locator("article[data-party]")).toHaveCount(7);
  await expect(dialog.locator(".pm-research")).toHaveCount(0);
  await expect(dialog.locator('[data-party="union"]')).not.toContainText(
    "What they argue",
  );
  await expect(dialog.locator('[data-position="1"] article')).toHaveCount(4);
  await expect(dialog.locator('[data-position="-1"] article')).toHaveCount(3);
  for (const p of MATCH_PARTIES) {
    const card = dialog.locator(`[data-party="${p.slug}"]`);
    await expect(card.getByRole("link")).toHaveAttribute(
      "href",
      `${p.source}#page=${MATCH_QUESTIONS[0].positions[p.slug].page}`,
    );
  }
  await expect(dialog.getByText(/not party replies/)).not.toBeVisible();
  await modalFits(page);
  const infoTrigger = dialog
    .getByRole("button", { name: "Sources & method" })
    .first();
  await infoTrigger.click();
  const explanation = page.getByRole("dialog", { name: "Info", exact: true });
  await expect(explanation).toContainText("not party replies");
  await expect(explanation).toContainText("before the 2025 election");
  await page.keyboard.press("Escape");
  await expect(explanation).not.toBeVisible();
  await expect(dialog).toBeVisible();
  await expect(infoTrigger).toBeFocused();
  const scroll = await page.evaluate(() => scrollY);
  await dialog.locator(".pm-dialog-content").hover();
  await page.mouse.wheel(0, 900);
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(scroll);
  await page.screenshot({ path: info.outputPath("arguments.png") });
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await expect(page.locator('.pm-choices input[value="1"]')).toBeChecked();
  expect(await snapshot()).toEqual(before);
  expect(requests).toEqual([]);
});
test("revised question has real unknowns, not invented neutral arguments; Spanish large text and dark theme", async ({
  page,
}, info) => {
  await start(page, "es");
  for (let i = 0; i < 9; i++) {
    await page.locator('.pm-choices label:has(input[value="1"])').click();
    await page.locator(".pm-question-actions .pm-primary").click();
  }
  await expect(page.locator(".pm-question-card h1")).toContainText("reabrirse");
  await page.evaluate(() => {
    document.documentElement.dataset.theme = "dark";
    document.documentElement.style.fontSize = "24px";
  });
  await page.locator(".pm-question-card .pm-arguments-trigger").click();
  const dialog = page.getByRole("dialog", { name: "Posturas y fuentes" });
  await expect(dialog.locator("article[data-party]")).toHaveCount(7);
  await expect(dialog.locator('[data-position="unknown"] article')).toHaveCount(
    1,
  );
  await expect(dialog.locator('[data-position="unknown"]')).toContainText(
    "BSW",
  );
  await expect(dialog.locator('[data-position="0"] article')).toHaveCount(0);
  await expect(dialog.locator('[data-party="union"] a')).toHaveAttribute(
    "href",
    /#page=22$/,
  );
  await expect(dialog.locator('[data-party="bsw"]')).toContainText(
    "sin prueba concluyente",
  );
  await modalFits(page);
  await page.screenshot({
    path: info.outputPath("arguments-spanish-dark-large.png"),
  });
  await dialog.getByRole("button", { name: "Cerrar", exact: true }).click();
  await page.evaluate(() => (document.documentElement.style.fontSize = ""));
  await expect(page.locator(".pm-question-card h1")).toContainText("reabrirse");
});
test("all 30 comparisons reach results, changing a partially documented answer changes only legitimate contributions", async ({
  page,
}, info) => {
  await start(page);
  const answers = {};
  for (const q of MATCH_QUESTIONS) {
    await page.locator('.pm-choices label:has(input[value="1"])').click();
    answers[q.id] = { value: 1 };
    await page.locator(".pm-question-actions .pm-primary").click();
  }
  const assertResults = async () => {
    const expected = calculateMatches(answers);
    expect(await page.locator(".pm-score").allTextContents()).toEqual(
      expected.results.map(scoreLabel),
    );
    expect(await page.locator(".pm-rank-number").allTextContents()).toEqual(
      expected.results.map(rankLabel),
    );
    expect(await page.locator(".pm-party-coverage").allTextContents()).toEqual(
      expected.results.map((p) => `${p.known} / 30 documented`),
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
  };
  await assertResults();
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "22px";
    document.documentElement.dataset.theme = "dark";
  });
  await assertResults();
  await page.screenshot({
    path: info.outputPath("interval-ranking-large.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Edit answers", exact: true }).click();
  await page.getByRole("searchbox").fill("benefit");
  const card = page.locator("#pm-edit-benefit-sanctions");
  await expect(card).toBeVisible();
  await card.locator('.pm-choices label:has(input[value="-1"])').click();
  answers["benefit-sanctions"].value = -1;
  await card.locator('input[type="checkbox"]').check();
  answers["benefit-sanctions"].important = true;
  await card.getByRole("button", { name: "Positions & sources" }).click();
  await expect(page.locator('[data-position="unknown"] article')).toHaveCount(
    3,
  );
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Back to ranking" }).click();
  await assertResults();
});

test("rankings do not overlap at narrow widths and enlarged text", async ({
  page,
}, info) => {
  await start(page);
  for (let i = 0; i < 4; i++) {
    await page.locator('.pm-choices label:has(input[value="1"])').click();
    await page.locator(".pm-question-actions .pm-primary").click();
  }
  await page.locator(".pm-early-result").click();
  // Force the long names and visible uncertainty through the real 30-question workflow.
  await page.getByRole("button", { name: "Edit answers", exact: true }).click();
  for (const card of await page.locator(".pm-edit-card").all()) {
    // Click the visible answer tile, not the clipped native radio underneath it.
    await card.locator(".pm-choices label").first().click();
    await expect(card.locator('input[value="1"]')).toBeChecked();
  }
  await page.getByRole("button", { name: "Back to ranking" }).click();
  for (const width of [320, 390, 820, 1024])
    for (const size of [16, 22, 28]) {
      await page.setViewportSize({ width, height: 900 });
      await page.evaluate(
        (s) => (document.documentElement.style.fontSize = `${s}px`),
        size,
      );
      const problems = await page
        .locator(".pm-party > summary")
        .evaluateAll((summaries) =>
          summaries.flatMap((summary) => {
            const els = [
              ...summary.querySelectorAll(
                ".pm-rank-number, .pm-party-title strong, .pm-party-coverage, .pm-score, .pm-score-track",
              ),
            ];
            return els.flatMap((el, i) => {
              const a = el.getBoundingClientRect();
              const issues =
                el.scrollWidth > el.clientWidth + 1
                  ? [`overflow: ${el.className}`]
                  : [];
              for (const other of els.slice(i + 1)) {
                const b = other.getBoundingClientRect();
                if (
                  Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 &&
                  Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1
                )
                  issues.push(`overlap: ${el.className}/${other.className}`);
              }
              return issues;
            });
          }),
        );
      expect(problems, `${width}px / ${size}px`).toEqual([]);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      ).toBe(true);
    }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: info.outputPath("ranking-phone-28px.png"),
    fullPage: true,
  });
});
