import { test, expect } from "@playwright/test";
async function result(page) {
  await page.goto("/?view=party-match&lang=en-GB");
  await page.locator('.pm-lengths input[value="8"]').check();
  await page.locator(".pm-start-card > .pm-primary").click();
  for (let i = 0; i < 8; i++) {
    await page
      .locator(".pm-choices label")
      .nth(i % 3)
      .click();
    await page.locator(".pm-question-actions .pm-primary").click();
  }
  await expect(page.locator(".pm-results")).toBeVisible();
}
async function choose(page, label, option) {
  await page.getByRole("combobox", { name: label, exact: true }).click();
  await page.getByRole("option", { name: option, exact: true }).click();
}
test("question comparison has visible answer positions, honest unknowns and standard dropdowns", async ({
  page,
}, info) => {
  await result(page);
  const section = page.locator(".pm-self-compare");
  await section.getByRole("combobox").click();
  await page.getByRole("option", { name: "BSW", exact: true }).click();
  await expect(section.locator(".pm-comparison-question")).toHaveCount(8);
  await expect(section.locator(".pm-answer-matrix > div")).toHaveCount(24);
  await expect(section.locator(".pm-missing-answer")).toContainText([
    "Not clearly established",
  ]);
  const first = section.locator(".pm-comparison-question").first();
  await expect(first.locator('[data-yours="true"] .pm-person-tag')).toHaveText(
    "You",
  );
  await first.locator("summary").click();
  await expect(first.locator(".pm-source-citation a")).toHaveAttribute(
    "href",
    /^https:/,
  );
  await expect(section.getByRole("combobox")).toContainText("BSW");
  await expect(page.locator(".pm-pairwise")).toHaveCount(0);
  expect(
    await page
      .locator(".pm-result-context")
      .evaluate((el) => getComputedStyle(el).position),
  ).toBe("static");
  await section.scrollIntoViewIfNeeded();
  await page.screenshot({ path: info.outputPath("comparison.png") });
});
test("spectrum explains its basis and stays readable with large text on phone and tablet", async ({
  page,
}, info) => {
  await result(page);
  const section = page.locator(".pm-policy-profile");
  await section.locator(".pm-view-heading").getByRole("combobox").click();
  await page.getByRole("option", { name: "SPD", exact: true }).click();
  await expect(section.locator(".pm-profile-rail")).toHaveCount(4);
  await section
    .locator(".pm-view-heading")
    .getByRole("button", { name: "Sources & method", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText(
    "three answered questions",
  );
  await page.keyboard.press("Escape");
  for (const width of [320, 390, 820, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.evaluate(() => {
      document.documentElement.style.fontSize = "25px";
      document.documentElement.dataset.theme = "dark";
    });
    await section.scrollIntoViewIfNeeded();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth - innerWidth,
      ),
    ).toBeLessThanOrEqual(1);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await section.scrollIntoViewIfNeeded();
  await page.screenshot({
    path: info.outputPath("spectrum-phone.png"),
    fullPage: false,
  });
});
test("each result section opens its own Studio graphic and exposes type-specific controls", async ({
  page,
}, info) => {
  await result(page);
  await page
    .locator(".pm-topics")
    .getByRole("button", { name: "Design in Studio", exact: true })
    .click();
  await expect(page.locator(".pm-studio-editor")).toHaveCount(0);
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await expect(
    page
      .locator(".pm-studio-editor")
      .getByRole("combobox", { name: "Graphic type", exact: true }),
  ).toContainText("Topic agreement");
  await expect(page.locator(".pm-style-choice")).toHaveCount(4);
  await choose(page, "Graphic type", "Political spectrum");
  await expect(
    page.getByRole("slider", { name: "Marker size", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("slider", { name: "Bar thickness", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Your axes", exact: true }).click();
  await page.getByRole("button", { name: "Text", exact: true }).click();
  await page
    .locator('.pm-studio-editor input[maxlength="100"]')
    .fill("My political profile");
  await page
    .getByRole("textbox", { name: "Annotation", exact: true })
    .fill("A personal questionnaire, not a poll.");
  await page.getByRole("button", { name: "Export PNG", exact: true }).click();
  await expect(
    page.getByRole("dialog").locator(".pm-export-preview img"),
  ).toBeVisible();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Close", exact: true })
    .click();
  await page.screenshot({
    path: info.outputPath("personal-editor.png"),
    fullPage: true,
  });
});
test("unsaved results can be designed in the gallery without silently persisting political data", async ({
  page,
}) => {
  await result(page);
  const before = await page.locator(".pm-score").allTextContents();
  await page
    .getByRole("button", { name: "Design in Studio", exact: true })
    .first()
    .click();
  await page
    .locator("main")
    .getByRole("link", { name: "Studio", exact: true })
    .click();
  await expect(
    page.getByRole("combobox", { name: "Choose result", exact: true }),
  ).toContainText("Current result (not saved)");
  await expect(page.locator(".pm-personal-thumbnail")).toHaveCount(18);
  await page.locator(".pm-personal-thumbnail").first().click();
  await page
    .getByRole("button", { name: "Back to result", exact: true })
    .click();
  await expect(page.locator(".pm-score")).toHaveText(before);
  expect(
    await page.evaluate(async () => {
      const { listPrivateResults } = await import(
        "/src/party-match-storage.js"
      );
      return (await listPrivateResults()).length;
    }),
  ).toBe(0);
});
test("saved results appear in the Studio gallery with real data, searching and a multiple-result selector", async ({
  page,
}, info) => {
  await result(page);
  await page
    .getByRole("button", { name: "Design in Studio", exact: true })
    .first()
    .click();
  await page
    .getByRole("button", { name: "Save on this device", exact: true })
    .click();
  await page.getByRole("dialog").locator("input").fill("First questionnaire");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Save on this device", exact: true })
    .click();
  await page.evaluate(async () => {
    const { listPrivateResults, savePrivateResult } = await import(
      "/src/party-match-storage.js"
    );
    const [d] = await listPrivateResults();
    const { questionsForLength } = await import("/src/party-match-data.js"),
      { calculateMatches } = await import("/src/party-match-model.js"),
      { resultDocument } = await import("/src/party-match-design.js");
    const questions = questionsForLength(8),
      answers = Object.fromEntries(questions.map((q) => [q.id, { value: 1 }]));
    await savePrivateResult(
      "Second questionnaire",
      resultDocument(calculateMatches(answers, questions), 8, "en-GB", {
        answers,
        questions,
      }),
      { ...d.design, style: "ranking-rings" },
      null,
      true,
    );
  });
  await page
    .locator("main")
    .getByRole("link", { name: "Studio", exact: true })
    .click();
  await expect(page.locator(".pm-private-gallery")).toBeVisible();
  await expect(page.locator(".pm-personal-thumbnail")).toHaveCount(18);
  await choose(page, "Choose result", "First questionnaire");
  const firstImage = await page
    .locator(".pm-personal-thumbnail img")
    .first()
    .getAttribute("src");
  await choose(page, "Choose result", "Second questionnaire");
  await expect(
    page.locator(".pm-personal-thumbnail img").first(),
  ).not.toHaveAttribute("src", firstImage);
  await choose(page, "Personal graphic type", "Political spectrum");
  await expect(page.locator(".pm-personal-thumbnail")).toHaveCount(3);
  await page
    .getByRole("combobox", { name: "Choose result", exact: true })
    .click();
  await expect(
    page.getByRole("option", { name: "First questionnaire", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await page.locator(".studio-search input").fill("my results modern");
  await expect(page.locator(".pm-personal-thumbnail")).toHaveCount(2);
  await page.locator(".studio-search input").fill("First questionnaire");
  await expect(
    page.getByRole("combobox", { name: "Choose result", exact: true }),
  ).toContainText("First questionnaire");
  await expect(page.locator(".pm-personal-thumbnail")).toHaveCount(3);
  await expect
    .poll(() => new URL(page.url()).searchParams.has("q"))
    .toBe(false);
  await page.screenshot({
    path: info.outputPath("my-results.png"),
    fullPage: true,
  });
  await page.evaluate(async () => {
    const { listPrivateResults, savePrivateResult } = await import(
      "/src/party-match-storage.js"
    );
    const [record] = await listPrivateResults(),
      legacy = { ...record.document };
    delete legacy.insights;
    await savePrivateResult(
      "Legacy result",
      legacy,
      { style: "pollframe" },
      null,
      true,
    );
  });
  await page.locator(".studio-search input").fill("");
  await choose(page, "Choose result", "Legacy result");
  await expect(
    page.getByRole("combobox", { name: "Personal graphic type", exact: true }),
  ).toContainText("All graphics");
  await expect(page.locator(".pm-personal-thumbnail")).toHaveCount(8);
});
