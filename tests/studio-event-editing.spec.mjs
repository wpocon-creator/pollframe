import { test, expect } from "@playwright/test";
import {clickSvg} from "./helpers/svg-interaction.mjs";
const history =
  "/?view=studio&topic=history&template=history-original&lang=de&editor=1&workspace=edit&range=all";
test("native markers, custom events, layers and contextual dialog survive exports", async ({
  page,
}, info) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(history);
  const svg = page.locator(".studio-current-preview-image > svg");
  await expect(svg).toBeVisible();
  await expect(svg).toHaveAttribute("data-direct-edit-ready", "true");
  const labels = svg.locator(".event-marker .event-label-bg");
  await expect(labels.first()).toHaveAttribute("rx", "10");
  expect(await labels.count()).toBeGreaterThan(1);
  await clickSvg(labels.first(),page);
  await page.locator(".studio-selection-bubble").click();
  const dialog = page.locator(".studio-selection-dialog");
  await expect(dialog).toBeVisible();
  const box = await dialog.boundingBox(),
    vp = page.viewportSize();
  expect(Math.abs(box.y + box.height / 2 - vp.height / 2)).toBeLessThan(4);
  expect(box.height).toBeLessThanOrEqual(vp.height * 0.76);
  await dialog.getByRole('button',{name:'3 Beschriftungsebenen',exact:true}).click();
  const focused = dialog.locator(".studio-event-row.is-selected");
  const layerChoice=focused.getByRole('combobox',{name:/Ebene für/});
  await layerChoice.click();
  await dialog.getByRole("option", { name: "Ebene 3", exact: true }).click();
  await expect(layerChoice).toContainText("Ebene 3");
  const density = dialog.getByRole("slider", {
    name: "Ereignisdichte",
    exact: true,
  });
  await density.focus();
  await density.press("Home");
  // Explicitly placing an event pins it. Density zero hides automatic labels,
  // not the editor's explicit choice.
  await expect(svg.locator('.event-marker[data-event-lane="0"]')).toHaveCount(0);
  await expect(svg.locator('.event-marker[data-event-lane="2"]')).not.toHaveCount(0);
  await density.press("End");
  await expect(svg.locator(".event-label-bg").first()).toBeVisible();
  await page.screenshot({
    path: info.outputPath("event-selection-dialog.png"),
  });
  await dialog
    .getByRole("button", { name: "+ Eigenes Ereignis", exact: true })
    .click();
  const event = page.locator(".studio-event-dialog");
  await expect(event).toBeVisible();
  await event
    .getByLabel("Titel", { exact: true })
    .fill("Eigene Redaktionsnotiz");
  await event.getByLabel("Datum", { exact: true }).fill("2024-01-15");
  await event
    .getByLabel("Quelle (optional, HTTPS)", { exact: true })
    .fill("https://example.com/source");
  await event.getByRole("button", { name: "Speichern", exact: true }).click();
  await expect(event).toHaveCount(0);
  await dialog.getByRole("button", { name: "Schließen", exact: true }).click();
  const custom = svg.locator("[data-event-id^=custom-]");
  await expect(custom).toContainText("Eigene Annotation");
  await page.reload();
  await expect(svg.locator("[data-event-id^=custom-]")).toContainText(
    "Eigene Redaktionsnotiz",
  );
  await page
    .getByRole("button", { name: "PNG herunterladen", exact: true })
    .click();
  const png = page.getByRole('dialog',{name:'PNG exportieren'});
  await expect(png.locator("[data-event-id^=custom-]")).toContainText(
    "Eigene Annotation",
  );
  await page.screenshot({ path: info.outputPath("events-export.png") });
  expect(errors).toEqual([]);
});
test("inline text retains typography and motion chooses one axis", async ({
  page,
}, info) => {
  await page.goto(
    "/?view=studio&topic=current&template=poll-wide&lang=de&editor=1&workspace=edit",
  );
  const svg = page.locator(".studio-current-preview-image > svg");
  await expect(svg).toBeVisible();
  await expect(svg).toHaveAttribute("data-direct-edit-ready", "true");
  await clickSvg(svg.locator("[data-editor-target=text]").first(),page,{double:true});
  const edit = page.getByRole("textbox", { name: "Text direkt bearbeiten" });
  await expect(edit).toHaveAttribute("contenteditable", "true");
  await expect(page.locator("textarea.studio-inline-text")).toHaveCount(0);
  await edit.fill("Die Sonntagsfrage im Überblick");
  await page.screenshot({ path: info.outputPath("inline-text.png") });
  await edit.press("Enter");
  await expect(svg).toContainText("Die Sonntagsfrage im Überblick");
  const value = svg.locator("[data-studio-kind=value]").first();
  await clickSvg(value,page);
  const box = await value.evaluate(n=>n.getBoundingClientRect().toJSON());
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    box.x + box.width / 2 + 4,
    box.y + box.height / 2 + 15,
    { steps: 8 },
  );
  await page.mouse.up();
  const repeat = page.locator(".studio-repeat-dialog");
  if (await repeat.isVisible())
    await repeat.getByRole("button", { name: "Nur diese Auswahl" }).click();
  const state = JSON.parse(
      await page
        .locator("[data-assistant-state]")
        .getAttribute("data-assistant-state"),
    ),
    styles = JSON.parse(state.elementStyles);
  expect(Object.values(styles).some((s) => s.y !== 0 && s.x === 0)).toBe(true);
  const clip = page.locator(".studio-inspector-content");
  expect(await clip.evaluate((n) => getComputedStyle(n).overflow)).toBe(
    "hidden",
  );
  expect(await clip.evaluate((n) => getComputedStyle(n).borderRadius)).not.toBe(
    "0px",
  );
});
test("inline long headings reflow, Escape restores and nested font dialogs keep the selection open", async ({
  page,
}, info) => {
  await page.goto(history + "&theme=dark");
  const svg = page.locator(".studio-current-preview-image > svg");
  await expect(svg).toHaveAttribute("data-direct-edit-ready", "true");
  const heading = svg.locator("[data-editor-target=text]").first(),
    original = await heading.textContent();
  await clickSvg(heading,page,{double:true});
  const edit = page.getByRole("textbox", { name: "Text direkt bearbeiten" });
  await edit.fill(
    "Die politische Stimmung in Deutschland: eine lange Überschrift für den historischen Umfragevergleich",
  );
  const editBox = await edit.boundingBox(),
    legend = await svg
      .locator("[data-studio-kind=label]")
      .filter({ hasText: "CDU/CSU" })
      .first()
      .boundingBox();
  if (legend) expect(editBox.y + editBox.height).toBeLessThan(legend.y);
  await page.screenshot({
    path: info.outputPath("long-heading-inline-dark.png"),
  });
  await edit.press("Escape");
  await expect(heading).toHaveText(original);
  await clickSvg(heading,page);
  await page.locator(".studio-selection-bubble").click();
  const dialog = page.locator(".studio-selection-dialog");
  await dialog
    .getByRole("button", { name: "Schriftart ändern" })
    .first()
    .click();
  const fonts = page.locator(".studio-font-library");
  await expect(fonts).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(fonts).toHaveCount(0);
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Schließen", exact: true }).click();
  const tools = page.locator(".studio-inspector-panel .studio-tools");
  await tools.evaluate((n) => (n.scrollTop = n.scrollHeight));
  await expect
    .poll(() => tools.evaluate((n) => n.scrollTop))
    .toBeGreaterThan(0);
  await page.screenshot({
    path: info.outputPath("rounded-inspector-scrolled-dark.png"),
  });
});
