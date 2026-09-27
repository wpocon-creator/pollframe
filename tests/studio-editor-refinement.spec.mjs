import { test, expect } from "@playwright/test";
const url = (topic = "history", extra = "") =>
  `/?view=studio&topic=${topic}&template=${topic === "current" ? "poll-wide" : "history-original"}&lang=de&editor=1&workspace=edit&range=all${extra}`;
const art = (p) => p.locator(".studio-current-preview-image > svg");
async function ready(page, topic = "history", extra = "") {
  await page.goto(url(topic, extra));
  await expect(art(page)).toHaveAttribute("data-direct-edit-ready", "true", {
    timeout: 30000,
  });
}
async function tab(page, name) {
  await page
    .locator(".studio-editor-panel")
    .getByRole("button", { name, exact: true })
    .click();
}
test("bold and italic visibly apply to chart text, and colour edits commit", async ({
  page,
}, info) => {
  await ready(page, "current");
  await page.getByRole("button", { name: "Kursiv", exact: true }).click();
  const title = art(page).locator('[data-editor-target="text"]').first();
  await expect(title).toHaveCSS("font-style", "italic");
  await page.getByRole("button", { name: "Fett", exact: true }).click();
  await expect(title).toHaveCSS("font-weight", "400");
  await page.getByRole("button", { name: "Fett", exact: true }).click();
  await expect(title).toHaveCSS("font-weight", "700");
  await page
    .getByRole("button", { name: "Farben & Hintergrund", exact: true })
    .click();
  const hex = page.getByRole("textbox", {
    name: "Hintergrund HEX",
    exact: true,
  });
  await hex.fill("#26446a");
  await hex.blur();
  await expect(
    art(page).locator('[data-editor-target="image"]').first(),
  ).toHaveAttribute("fill", "#26446a");
  await page.screenshot({ path: info.outputPath("typography-background.png") });
});
test("fixed event layers, separate densities, stable catalogue, proper custom dates", async ({
  page,
}, info) => {
  await ready(page);
  await page
    .getByRole("button", { name: "Ereignisse", exact: true })
    .last()
    .click();
  await page
    .getByRole("button", { name: "3 Beschriftungsebenen", exact: true })
    .last()
    .click();
  await expect(art(page).locator("[data-event-layer]")).toHaveCount(3);
  const density = page.getByRole("slider", {
    name: "Ereignisdichte",
    exact: true,
  });
  await density.focus();
  await density.press("Home");
  await expect(art(page).locator('[data-event-lane="0"]')).toHaveCount(0);
  expect(await art(page).locator(".event-label-bg").count()).toBeGreaterThan(0);
  await expect(art(page).locator("[data-event-layer]")).toHaveCount(3);
  await expect(density.locator("..").locator("input[type=number]")).toHaveCount(
    0,
  );
  await page.getByRole("button", { name: /^Ereignisse auswählen/ }).click();
  const dialog = page.locator(".studio-event-catalogue"),
    box = await dialog.boundingBox();
  await dialog.getByRole("searchbox").fill("zzzzzznone");
  expect((await dialog.boundingBox()).height).toBeCloseTo(box.height, 0);
  await dialog.getByRole("searchbox").fill("");
  await dialog
    .getByRole("button", { name: "+ Eigenes Ereignis", exact: true })
    .click();
  const own = page.locator(".studio-event-dialog");
  await own.getByLabel("Titel", { exact: true }).fill("Redaktioneller Test");
  await own
    .getByRole("textbox", { name: "Datum", exact: true })
    .fill("31.10.2024");
  await own
    .getByRole("textbox", { name: /Beschreibung/ })
    .fill("Kontext für Leserinnen und Leser.");
  await own.getByRole("button", { name: "Speichern", exact: true }).click();
  await expect(own).toHaveCount(0);
  await expect(dialog).toContainText("Redaktioneller Test");
  await dialog.getByRole("button", { name: "Schließen", exact: true }).click();
  await expect(art(page).locator('[data-event-id^="custom-"]')).toContainText(
    "Kontext für Leserinnen und Leser.",
  );
  await page.screenshot({ path: info.outputPath("events-three-layers.png") });
  await page
    .getByRole("button", { name: "Diagramm", exact: true })
    .last()
    .click();
  await expect(page.getByText("Diagrammhöhe", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("slider", { name: "Linienglättung", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Inhalt & Zeitraum", exact: true })
    .click();
  await expect(
    page.getByText("Diagrammhöhe", { exact: true }),
  ).not.toBeVisible();
  await page.getByRole("combobox", { name: "Zeitraum", exact: true }).click();
  await page
    .getByRole("option", { name: "Eigener Zeitraum", exact: true })
    .click();
  await expect(
    page.getByRole("slider", { name: "Zeitraum: Anfang", exact: true }),
  ).toBeVisible();
  await page.getByText("Datum manuell eingeben", { exact: true }).click();
  await page
    .getByRole("textbox", { name: "Von", exact: true })
    .fill("10.11.2023");
  await page
    .getByRole("textbox", { name: "Bis", exact: true })
    .fill("31.12.2024");
  await page.getByRole("textbox", { name: "Bis", exact: true }).blur();
  await page
    .getByRole("button", { name: "Zeitraum anwenden", exact: true })
    .click();
  await expect(art(page)).toHaveAttribute("data-event-start", "2023-11-10");
  await expect(art(page)).toHaveAttribute("data-event-end", "2024-12-31");
});
test("drag banner to another lane preserves date and pin; remove is only this layout", async ({
  page,
}, info) => {
  await ready(page, "history", "&historyLayers=3");
  await expect(art(page)).toHaveAttribute("data-event-edit-ready", "true");
  const svg = art(page),
    marker = svg.locator('.event-marker[data-event-lane="0"]').first();
  const id = await marker.getAttribute("data-event-id"),
    line = marker.locator(".event-context-line"),
    anchor = await line.getAttribute("x1");
  const label = marker.locator(".event-label-bg"),
    box = await label.boundingBox(),
    lane = await svg.locator('[data-event-layer="2"]').boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 12, lane.y + lane.height / 2, {
    steps: 12,
  });
  await page.mouse.up();
  const moved = svg.locator(`[data-event-id="${id}"]`);
  await expect(moved).toHaveAttribute("data-event-lane", "2");
  await expect(moved.locator(".event-context-line")).toHaveAttribute(
    "x1",
    anchor,
  );
  await expect(
    page
      .locator(".studio-selection-bubble")
      .getByRole("button", { name: "Lösen", exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: info.outputPath("event-dragged.png") });
  await page
    .locator(".studio-selection-bubble")
    .getByRole("button", { name: "Aus Anordnung entfernen", exact: true })
    .click();
  await expect(moved).toHaveCount(0);
  await page
    .getByRole("button", { name: "Anordnung erzeugen", exact: true })
    .click();
  await expect(moved).toHaveAttribute("data-event-lane", "2");
  await page.reload();
  await expect(art(page)).toHaveAttribute("data-direct-edit-ready", "true");
  await expect(art(page).locator(`[data-event-id="${id}"]`)).toHaveAttribute(
    "data-event-lane",
    "2",
  );
});
test("right-click an empty layer offers fitting events and exported SVG keeps their pin", async ({
  page,
}, info) => {
  await ready(page, "history", "&historyLayers=2&historyEventLimit=0");
  const svg = art(page);
  await expect(svg).toHaveAttribute("data-event-edit-ready", "true");
  const point = await svg.evaluate((s) => {
    const candidates = JSON.parse(s.dataset.eventCandidates),
      event = candidates.find((e) => e.id === "pandemic") || candidates[0];
    const left = Number(s.dataset.eventLeft),
      right = Number(s.dataset.eventRight),
      x =
        left +
        ((Date.parse(event.date) - Date.parse(s.dataset.eventStart)) /
          (Date.parse(s.dataset.eventEnd) - Date.parse(s.dataset.eventStart))) *
          (right - left);
    const layer = s.querySelector('[data-event-layer="1"]'),
      p = new DOMPoint(
        x,
        Number(layer.getAttribute("y")) +
          Number(layer.getAttribute("height")) / 2,
      ).matrixTransform(s.getScreenCTM());
    return { x: p.x, y: p.y, id: event.id };
  });
  await page.mouse.click(point.x, point.y, { button: "right" });
  await page
    .getByRole("button", { name: "+ Ereignis hinzufügen", exact: true })
    .click();
  const dialog = page.getByRole("dialog", {
    name: "Ereignis hier hinzufügen",
    exact: true,
  });
  await expect(dialog).toBeVisible();
  const choice = dialog.locator(".studio-style-card").first(),
    text = await choice.innerText();
  await choice.click();
  await expect(svg.locator('.event-marker[data-event-lane="1"]')).toHaveCount(
    1,
  );
  await page.screenshot({ path: info.outputPath("event-added-dark.png") });
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "SVG", exact: true }).click();
  const download = await pending;
  const { readFile } = await import("node:fs/promises");
  const exported = await readFile(await download.path(), "utf8");
  expect(exported).toContain(text.split(" · ")[0]);
  expect(exported).not.toContain("data-event-layer=");
});
test("style hover communicates clickability and sidebar resizing does not rewrite the chart", async ({
  page,
}, info) => {
  await ready(page, "current");
  await page.evaluate(async () => {
    const { saveStyle } = await import("/src/studio-style-library.js");
    await saveStyle("Nachtblau", {
      background: "#15243a",
      textStyles: JSON.stringify({ headline: { italic: true, weight: 700 } }),
    });
  });
  const apply = page.getByRole("button", {
    name: "Stil anwenden",
    exact: true,
  });
  await expect(apply).toBeVisible();
  const before = await apply.evaluate(
    (n) => getComputedStyle(n).backgroundColor,
  );
  await apply.hover();
  await expect
    .poll(() => apply.evaluate((n) => getComputedStyle(n).backgroundColor))
    .not.toBe(before);
  await apply.click();
  const card = page
    .getByRole("dialog")
    .getByRole("button", { name: /Nachtblau/ });
  await card.hover();
  await expect(card).toHaveCSS("cursor", "pointer");
  await card.click();
  await expect(
    art(page).locator('[data-editor-target="image"]').first(),
  ).toHaveAttribute("fill", "#15243a");
  const divider = page.getByRole("separator", {
      name: "Breite der Werkzeuge",
      exact: true,
    }),
    box = await divider.boundingBox();
  const titleBefore = await art(page)
    .locator('[data-editor-target="text"]')
    .first()
    .boundingBox();
  await art(page).evaluate((svg) => {
    window.chartMutations = 0;
    window.chartObserver = new MutationObserver(
      (rows) => (window.chartMutations += rows.length),
    );
    window.chartObserver.observe(svg, {
      subtree: true,
      childList: true,
      attributes: true,
    });
  });
  await page.mouse.move(box.x + box.width / 2, box.y + 40);
  await page.mouse.down();
  await page.mouse.move(box.x + 120, box.y + 40, { steps: 15 });
  expect(await page.evaluate(() => window.chartMutations)).toBeLessThan(40);
  await page.mouse.up();
  await page.evaluate(() => window.chartObserver.disconnect());
  const titleAfter = await art(page)
    .locator('[data-editor-target="text"]')
    .first()
    .boundingBox();
  expect(Math.abs(titleAfter.x - titleBefore.x)).toBeLessThan(2);
  await page.setViewportSize({ width: 1024, height: 768 });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(1025);
  await page.screenshot({ path: info.outputPath("tablet-style-controls.png") });
});
test("custom range handles support keyboard and do not cross", async ({
  page,
}, info) => {
  await ready(page, "history", "&range=custom&start=2021-01-01&end=2025-01-01");
  await page
    .getByRole("button", { name: "Inhalt & Zeitraum", exact: true })
    .click();
  const start = page.getByRole("slider", {
    name: "Zeitraum: Anfang",
    exact: true,
  });
  await start.focus();
  await start.press("ArrowRight");
  await expect(art(page)).toHaveAttribute("data-event-start", "2021-01-02", {
    timeout: 30000,
  });
  const end = page.getByRole("slider", { name: "Zeitraum: Ende", exact: true });
  await end.focus();
  await end.press("ArrowLeft");
  await expect(art(page)).toHaveAttribute("data-event-end", "2024-12-31", {
    timeout: 30000,
  });
  const thumb=await start.evaluate(n=>{const r=n.getBoundingClientRect();return {x:r.x+10+(r.width-20)*(Number(n.value)-Number(n.min))/(Number(n.max)-Number(n.min)),y:r.y+r.height/2};});
  await page.mouse.move(thumb.x,thumb.y);await page.mouse.down();await page.mouse.move(thumb.x+22,thumb.y,{steps:6});await page.mouse.up();
  await expect(art(page)).not.toHaveAttribute("data-event-start","2021-01-02",{timeout:30000});
  await expect(art(page)).toHaveAttribute("data-event-end","2024-12-31");
  await page.screenshot({ path: info.outputPath("dual-date-range.png") });
});
