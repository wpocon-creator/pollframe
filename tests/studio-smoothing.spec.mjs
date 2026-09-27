import { test, expect } from "@playwright/test";
const base =
  "/?view=studio&lang=en-GB&editor=1&workspace=edit&range=five&events=";
const paths = (svg) =>
  svg
    .locator('[data-history-party] > g > path[fill="none"]')
    .evaluateAll((nodes) => nodes.map((n) => n.getAttribute("d")));
async function choose(page, scope, value) {
  const slider=scope.getByRole("slider", { name: "Line smoothing", exact: true });
  await slider.focus();await slider.press("Home");
  for(let i=0;i<["None","Light","Medium","Strong"].indexOf(value);i++)await slider.press("ArrowRight");
}

test("smoothing changes the actual line without reloading, supports undo, and matches PNG and embed", async ({
  page,
}, info) => {
  await page.goto(base + "&template=history-original");
  const svg = page.locator(".studio-current-preview-image > svg");
  await expect(svg).toHaveAttribute("data-direct-edit-ready", "true");
  const raw = await paths(svg);
  const dots = () =>
    svg
      .locator(".studio-latest-poll")
      .evaluateAll((nodes) => nodes.map((n) => n.textContent));
  const originalDots = await dots();
  const reloads = [];
  page.on("request", (r) => {
    if (r.url().includes("studioHistorySource")) reloads.push(r.url());
  });
  const panel = page.locator(".studio-inspector-panel");
  await panel.getByRole("button", { name: "Chart", exact: true }).click();
  await choose(page, panel, "Strong");
  await expect.poll(() => paths(svg)).not.toEqual(raw);
  const strong = await paths(svg);
  expect(await dots()).toEqual(originalDots);
  await expect(svg).toContainText("±112 days");
  expect(reloads).toEqual([]);
  await page.keyboard.press("Control+z");
  await expect.poll(() => paths(svg)).toEqual(raw);
  await page.keyboard.press("Control+Shift+z");
  await expect.poll(() => paths(svg)).toEqual(strong);
  await page.reload();
  await expect(svg).toBeVisible();
  await expect.poll(() => paths(svg)).toEqual(strong);
  await page.getByRole("button", { name: "Download PNG", exact: true }).click();
  const png = page.getByRole("dialog");
  await expect(png).toBeVisible();
  const exported = png
    .locator("svg")
    .filter({ has: page.locator("[data-history-party]") });
  await expect(exported).toBeVisible();
  expect(await paths(exported)).toEqual(strong);
  await png.getByRole("button", { name: "Close", exact: true }).click();
  const params = new URL(page.url()).searchParams;
  params.set("studioDesign", "1");
  params.set("workspace", "preview");
  await page.goto("/embed.html?" + params);
  const embed = page.locator(".studio-standalone-embed svg").first();
  await expect(embed).toBeVisible();
  expect(await paths(embed)).toEqual(strong);
  await embed.screenshot({ path: info.outputPath("smoothed-embed.png") });
});

test("select a series, Edit, change smoothing and keep the selection dialog stable", async ({
  page,
}, info) => {
  await page.goto(base + "&template=approval-original");
  const svg = page.locator(".studio-current-preview-image > svg");
  await expect(svg).toHaveAttribute("data-direct-edit-ready", "true");
  const line = svg
    .locator('[data-history-party] > g > path[fill="none"]')
    .last();
  const point = await line.evaluate((path) => {
    const p = path.getPointAtLength(path.getTotalLength() * 0.47);
    const s = new DOMPoint(p.x, p.y).matrixTransform(path.getScreenCTM());
    return { x: s.x, y: s.y };
  });
  await page.mouse.click(point.x, point.y);
  await expect(page.locator(".studio-selection-bubble")).toBeVisible();
  await page.locator(".studio-selection-bubble").click();
  const dialog = page.getByRole("dialog", {
    name: "Edit selection",
    exact: true,
  });
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByRole("slider", { name: "Line smoothing", exact: true }),
  ).toBeVisible();
  const initial = await paths(svg);
  await choose(page, dialog, "Strong");
  await expect.poll(() => paths(svg)).not.toEqual(initial);
  await expect(dialog).toContainText("3 passes");
  await choose(page, dialog, "None");
  await expect(dialog).toContainText("No smoothing");
  expect((await paths(svg)).every((p) => !p.includes("C"))).toBe(true);
  await expect(svg).toContainText("no smoothing");
  await page.screenshot({ path: info.outputPath("smoothing-selection.png") });
  await dialog.getByRole("button", { name: "Close", exact: true }).click();
  await expect(page.locator(".studio-selection-bubble")).toBeVisible();
});

test("party timelines support smoothing; current bars do not offer it", async ({
  page,
}) => {
  await page.goto(base + "&template=party-original");
  const svg = page.locator(".studio-current-preview-image > svg");
  await expect(svg).toBeVisible();
  const panel = page.locator(".studio-inspector-panel");
  await panel.getByRole("button", { name: "Chart", exact: true }).click();
  const before = await paths(svg);
  await choose(page, panel, "Light");
  await expect.poll(() => paths(svg)).not.toEqual(before);
  await page.goto(base + "&template=poll-classic");
  await expect(svg).toBeVisible();
  await panel.getByRole("button", { name: "Chart", exact: true }).click();
  await expect(
    panel.getByRole("slider", { name: "Line smoothing", exact: true }),
  ).toHaveCount(0);
});
