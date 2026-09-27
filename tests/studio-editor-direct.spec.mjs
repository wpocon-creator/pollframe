import { test, expect } from "@playwright/test";
const url =
  "/?view=studio&topic=current&template=poll-wide&lang=de&editor=1&workspace=edit";
test("direct selection, protected sources, repeat resize, undo and stationary preview", async ({
  page,
}, info) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(url);
  const svg = page.locator(".studio-current-preview-image > svg");
  await expect(svg).toBeVisible();
  await expect(svg.locator("[data-studio-kind=value]").first()).toBeVisible();
  const before = await svg.boundingBox();
  const separator = page.getByRole("separator", {
    name: "Breite der Werkzeuge",
  });
  await expect(separator).toBeVisible();
  await separator.focus();
  await page.keyboard.press("End");
  const after = await svg.boundingBox();
  expect(after).toEqual(before);
  const artworkRight = await svg.evaluate(
    (s) =>
      new DOMPoint(s.viewBox.baseVal.width, 0).matrixTransform(s.getScreenCTM())
        .x,
  );
  expect(
    Math.abs(
      (await page.locator(".studio-inspector-panel").boundingBox()).x -
        artworkRight,
    ),
  ).toBeLessThan(2);
  await separator.press("Home");
  const values = svg.locator("[data-studio-kind=value]");
  const first = values.first(),
    text = await first.textContent();
  await first.click();
  await expect(page.locator(".studio-resize-handle")).toHaveCount(4);
  const grip = await page.locator(".studio-resize-handle.se").boundingBox();
  await page.mouse.move(grip.x + 5, grip.y + 5);
  await page.mouse.down();
  await page.mouse.move(grip.x + 30, grip.y + 20, { steps: 8 });
  await page.mouse.up();
  await expect(
    page.getByRole("dialog", { name: "Auf ähnliche Elemente anwenden?" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Ja, auf alle" }).click();
  await expect
    .poll(() =>
      values.evaluateAll((ns) =>
        ns.every((n) => n.getAttribute("transform")?.includes("scale(")),
      ),
    )
    .toBe(true);
  expect(await first.textContent()).toBe(text);
  await page.keyboard.press("Control+z");
  await expect
    .poll(() =>
      values.evaluateAll((ns) => ns.every((n) => !n.getAttribute("transform"))),
    )
    .toBe(true);
  const source = svg.locator("[data-studio-kind=output]").first();
  await source.click();
  await expect(
    page.locator(".studio-selection-outline.is-locked"),
  ).toBeVisible();
  await expect(page.locator(".studio-resize-handle")).toHaveCount(0);
  await expect(page.locator(".studio-tools")).toBeVisible();
  await expect(page.getByText("Grafikdesign", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Density", { exact: true })).toHaveCount(0);
  await page.screenshot({ path: info.outputPath("editor-selection.png") });
  expect(errors).toEqual([]);
});

test("marquee, exact sizing, export parity and persistence", async ({
  page,
}, info) => {
  await page.goto(url + "&theme=dark");
  const svg = page.locator(".studio-current-preview-image > svg");
  await expect(svg).toBeVisible();
  const values = svg.locator("[data-studio-kind=value]");
  await expect(values.first()).toBeVisible();
  const a = await values.nth(0).boundingBox(),
    b = await values.nth(1).boundingBox();
  await page.mouse.move(Math.min(a.x, b.x) - 10, a.y - 7);
  await page.mouse.down();
  await page.mouse.move(
    Math.max(a.x + a.width, b.x + b.width) + 5,
    b.y + b.height + 5,
    { steps: 8 },
  );
  await page.mouse.up();
  await expect(page.locator(".studio-selection-outline")).toHaveCount(2);
  const exact = page.getByRole("spinbutton", { name: "Auswahlgröße (123)" });
  await exact.fill("125");
  await exact.press("Enter");
  await expect
    .poll(() => values.nth(0).getAttribute("transform"))
    .toContain("scale(1.25)");
  await expect
    .poll(() => values.nth(1).getAttribute("transform"))
    .toContain("scale(1.25)");
  await expect(page.locator(".studio-repeat-dialog")).toHaveCount(0);
  const transforms = await values.evaluateAll((ns) =>
    ns.map((n) => n.getAttribute("transform")),
  );
  await page
    .getByRole("button", { name: "PNG herunterladen", exact: true })
    .click();
  const png = page.locator(".png-options-modal");
  await expect(png).toBeVisible();
  await expect
    .poll(() =>
      png
        .locator("[data-studio-kind=value]")
        .evaluateAll((ns) => ns.map((n) => n.getAttribute("transform"))),
    )
    .toEqual(transforms);
  await page.screenshot({ path: info.outputPath("editor-png-dark.png") });
  await png.getByRole("button", { name: "Schließen" }).click();
  await page.getByRole("button", { name: "Embed", exact: true }).click();
  const embed = page.locator(".widget-share-modal");
  await expect(embed.locator(".code-label code")).toContainText(
    "elementStyles=",
  );
  await embed.getByRole("button", { name: "Schließen" }).click();
  await page.reload();
  await expect
    .poll(() =>
      page
        .locator(".studio-current-preview-image [data-studio-kind=value]")
        .evaluateAll((ns) => ns.map((n) => n.getAttribute("transform"))),
    )
    .toEqual(transforms);
  await page.screenshot({
    path: info.outputPath("editor-multiselect-dark.png"),
  });
});

test("graphic-specific controls, font import and tablet layout", async ({
  page,
}, info) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const [topic, template, events, bars] of [
    ["current", "poll-wide", false, true],
    ["approval-current", "approval-current-pie", false, false],
    ["history", "history-original", true, false],
    ["approval", "approval-aligned", false, false],
    ["map", "map-atlas", false, false],
  ]) {
    await page.goto(
      `/?view=studio&topic=${topic}&template=${template}&lang=de&editor=1&workspace=edit&theme=dark`,
    );
    await expect(
      page.locator(".studio-current-preview-image > svg"),
    ).toBeVisible();
    await expect(
      page
        .locator(".studio-editor-tabs")
        .getByRole("button", { name: "Ereignisse", exact: true }),
    ).toHaveCount(events ? 1 : 0);
    await page
      .locator(".studio-editor-tabs")
      .getByRole("button", { name: "Diagramm", exact: true })
      .click();
    await expect(
      page.locator("label").filter({ hasText: "Balkendicke" }),
    ).toHaveCount(bars ? 1 : 0);
    await expect(page.getByText("Grafikdesign", { exact: true })).toHaveCount(
      0,
    );
    await expect(page.getByText("Abstände", { exact: true })).toHaveCount(0);
  }
  await page
    .locator(".studio-editor-tabs")
    .getByRole("button", { name: "Texte & Schrift", exact: true })
    .click();
  await page.getByRole("button", { name: "Schriftart ändern" }).first().click();
  const font = page.locator(".studio-font-library");
  await expect(font.locator("input[type=file]")).toBeEnabled();
  await expect(font.getByRole("checkbox")).toHaveCount(0);
  await font.getByRole("button", { name: "Schließen" }).click();
  await page.screenshot({ path: info.outputPath("editor-map-dark.png") });
  expect(errors).toEqual([]);
});

test("native slider drag updates bar geometry and undo as one operation", async ({
  page,
}) => {
  await page.goto(url);
  const svg = page.locator(".studio-current-preview-image > svg");
  await expect(svg).toBeVisible();
  await page
    .locator(".studio-editor-tabs")
    .getByRole("button", { name: "Diagramm", exact: true })
    .click();
  const slider = page
    .locator("label")
    .filter({ hasText: "Balkendicke" })
    .getByRole("slider");
  const bar = svg.locator("[data-party-id] rect").first(),
    height = Number(await bar.getAttribute("height"));
  await slider.scrollIntoViewIfNeeded();
  const box = await slider.boundingBox();
  await page.mouse.move(box.x + box.width * 0.45, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width - 5, box.y + box.height / 2, {
    steps: 15,
  });
  await page.mouse.up();
  await expect
    .poll(async () => Number(await bar.getAttribute("height")))
    .toBeGreaterThan(height);
  await page.getByRole("button", { name: "Rückgängig", exact: true }).click();
  await expect
    .poll(async () => Number(await bar.getAttribute("height")))
    .toBe(height);
});
