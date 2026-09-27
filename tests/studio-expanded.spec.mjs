import { test, expect } from "@playwright/test";
import { STUDIO_TEMPLATES } from "../src/studio-model.js";
import { readFile } from "node:fs/promises";
test("net approval keeps units and party hue across every design", async ({
  page,
}) => {
  await page.goto(
    "/?view=studio&editor=1&workspace=edit&template=approval-original&metric=government&answer=net&range=five&theme=dark&lang=de&events=",
  );
  const svg = page.locator(".studio-current-preview-image>svg");
  await expect(svg).toBeVisible({ timeout: 35000 });
  const colours = await svg
    .locator('[data-history-party] path[fill="none"]')
    .evaluateAll((nodes) => nodes.map((n) => n.getAttribute("stroke")));
  expect(new Set(colours).size).toBeGreaterThan(2); // outline + Union + SPD; not all grey
  const tools = page.locator(".studio-tools");
  await tools.getByRole("button", { name: "Diagramm", exact: true }).click();
  for (const design of STUDIO_TEMPLATES.filter((t) => t.topic === "approval")) {
    await tools
      .getByRole("button", { name: design.name[0], exact: true })
      .click();
    await expect(svg).toHaveAttribute("data-history-design", design.design);
    expect(Number(await svg.getAttribute("data-axis-min"))).toBe(
      -Number(await svg.getAttribute("data-axis-max")),
    );
    expect((await svg.locator("text").allTextContents()).join(" ")).not.toMatch(
      /\d\s*%/,
    );
  }
  await tools.getByRole("button", { name: "Ausgabe", exact: true }).click();
  const pending = page.waitForEvent("download");
  await tools
    .getByRole("button", { name: "Berechnete Zeitreihe als CSV", exact: true })
    .click();
  const file = await pending;
  expect(await readFile(await file.path(), "utf8")).toContain("net_pp");
});
test.use({ serviceWorkers: "block", video: "off" });
for (const topic of [
  "current",
  "seats",
  "majority",
  "tendencies",
  "party",
  "approval",
  "approval-current",
  "map",
])
  test(`${topic}: all designs, sources and unclipped labels`, async ({
    page,
  }, info) => {
    test.setTimeout(150000);
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    const designs = STUDIO_TEMPLATES.filter((t) => t.topic === topic);
    await page.goto(
      `/?view=studio&topic=${topic}&template=${designs[0].id}&editor=1&workspace=edit&range=five&lang=de`,
    );
    const svg = page.locator(".studio-current-preview-image>svg");
    await expect(svg).toBeVisible({ timeout: 35000 });
    const tools = page.locator(".studio-tools");
    await tools.getByRole("button", { name: "Diagramm", exact: true }).click();
    for (const theme of ["light", "dark"]) {
      if (theme === "dark")
        await page.getByRole("button", { name: "Dunkel", exact: true }).click();
      for (const design of designs) {
        await tools
          .getByRole("button", { name: design.name[0], exact: true })
          .click();
        await expect(svg).toHaveAttribute(
          topic === "party" || topic === "approval"
            ? "data-history-design"
            : "data-design",
          design.design,
        );
        expect(await svg.innerHTML()).not.toMatch(/NaN|Infinity/);
        const clipped = await svg.locator("text").evaluateAll((nodes) =>
          nodes
            .filter((n) => {
              const r = n.getBoundingClientRect(),
                s = n.ownerSVGElement.getBoundingClientRect();
              return (
                r.left < s.left - 1 ||
                r.right > s.right + 1 ||
                r.top < s.top - 1 ||
                r.bottom > s.bottom + 1
              );
            })
            .map((n) => n.textContent),
        );
        expect.soft(clipped, `${design.id} ${theme}`).toEqual([]);
        if (
          topic === "seats" &&
          ["hemicycle", "waffle"].includes(design.design)
        )
          expect(await svg.locator("[data-seat-party]").count()).toBe(630);
        if (topic === "majority") {
          const rows = await svg
            .locator("[data-coalition]")
            .evaluateAll((nodes) =>
              nodes.map((n) => ({
                seats: Number(n.dataset.seats),
                gap: Number(n.dataset.gap),
              })),
            );
          expect(rows.length).toBeGreaterThan(0);
          for (const row of rows) expect(row.gap).toBe(row.seats - 316);
        }
        if (theme === "dark" && design === designs[0])
          await svg.screenshot({ path: info.outputPath(`${topic}-dark.png`) });
      }
    }
    expect(errors).toEqual([]);
  });

test("context editor, plain 3D, rounding, PNG and embed stay identical", async ({
  page,
}, info) => {
  const requests = [];
  page.on("request", (r) => requests.push(r.url()));
  await page.goto(
    "/?view=studio&topic=current&template=poll-material&editor=1&workspace=edit&lang=de",
  );
  const svg = page.locator(".studio-current-preview-image>svg");
  await expect(svg).toHaveAttribute("data-render-ready", "true", {
    timeout: 35000,
  });
  expect(await svg.locator("image").count()).toBe(0);
  expect(
    requests.some((url) =>
      /materials\/|studio-material-(engine|worker|render)/.test(url),
    ),
  ).toBe(false);
  await svg.locator("[data-editor-target=text]").first().click();
  await page
    .getByRole("textbox", { name: "Überschrift", exact: true })
    .fill("Ein Test für die Redaktion");
  await expect(svg).toContainText("Ein Test für die Redaktion");
  await page
    .getByRole("slider", { name: /Grafikecken abrunden/ })
    .fill("24");
  await expect(svg.locator("clipPath rect")).toHaveAttribute("rx", "24");
  const values = await svg
    .locator("[data-party-id]")
    .evaluateAll((nodes) =>
      nodes.map((n) => [n.dataset.partyId, n.dataset.value]),
    );
  const download = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "PNG herunterladen", exact: true })
    .click();
  await page.locator("dialog[open]").getByRole("button",{name:"PNG herunterladen",exact:true}).click();
  const file = await download,
    buffer = await readFile(await file.path());
  expect(buffer.length).toBeGreaterThan(15000);
  expect(buffer.readUInt32BE(16)).toBe(1920);
  await file.saveAs(info.outputPath("plain-3d.png"));
  await page.locator("dialog[open]").getByRole("button",{name:"Schließen"}).click();
  await page.getByRole("button", { name: "Embed", exact: true }).click();
  const code = await page.locator("dialog[open] textarea").inputValue();
  await page.goto(code.match(/src="([^"]+)"/)[1].replaceAll("&amp;", "&"));
  const embed = page.locator("svg[data-design]");
  await expect(embed).toBeVisible({ timeout: 35000 });
  expect(
    await embed
      .locator("[data-party-id]")
      .evaluateAll((nodes) =>
        nodes.map((n) => [n.dataset.partyId, n.dataset.value]),
      ),
  ).toEqual(values);
  await expect(embed).toContainText("Ein Test für die Redaktion");
});

for (const topic of [
  "seats",
  "majority",
  "tendencies",
  "party",
  "approval",
  "approval-current",
  "map",
])
  test(`${topic}: actual PNG and embed preserve the full drawing`, async ({
    page,
  }, info) => {
    const template = STUDIO_TEMPLATES.find((t) => t.topic === topic);
    await page.goto(
      `/?view=studio&editor=1&template=${template.id}&lang=de&range=five&answer=net&metric=government&theme=dark&edges=rounded`,
    );
    const svg = page.locator(".studio-current-preview-image>svg");
    await expect(svg).toBeVisible({ timeout: 35000 });
    const labels = await svg.locator("text").allTextContents(),
      viewBox = await svg.getAttribute("viewBox");
    const pending = page.waitForEvent("download");
    await page
      .getByRole("button", { name: "PNG herunterladen", exact: true })
      .click();
  await page.locator("dialog[open]").getByRole("button",{name:"PNG herunterladen",exact:true}).click();
    const download = await pending,
      buffer = await readFile(await download.path());
    expect(buffer.length).toBeGreaterThan(15000);
    expect(buffer.readUInt32BE(16)).toBe(1920);
    expect(buffer.readUInt32BE(20)).toBeCloseTo(
      Number(viewBox.split(" ")[3]) * 2,
      0,
    );
    await download.saveAs(info.outputPath(`${topic}-export.png`));
    await page.locator("dialog[open]").getByRole("button",{name:"Schließen"}).click();
  await page.getByRole("button", { name: "Embed", exact: true }).click();
    const code = await page.locator("dialog[open] textarea").inputValue();
    await page.goto(code.match(/src="([^"]+)"/)[1].replaceAll("&amp;", "&"));
    const embed = page.locator("svg.studio-current-art");
    await expect(embed).toBeVisible({ timeout: 35000 });
    expect(await embed.getAttribute("viewBox")).toBe(viewBox);
    expect(await embed.locator("text").allTextContents()).toEqual(labels);
    if (topic === "approval") {
      expect(labels.join(" ")).toContain("Prozentpunkte");
      expect(labels.join(" ")).not.toContain("DAWUM");
    }
  });
