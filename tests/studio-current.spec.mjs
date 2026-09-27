import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";

test.use({ serviceWorkers: "block" });
test("one left-aligned back button returns to thumbnails without leaving Studio", async ({
  page,
}) => {
  await page.goto("/?view=studio&profile=current-poll&lang=de");
  await expect(page.locator(".studio-return")).toHaveCount(0);
  await page.locator("#studio-poll-classic").click();
  const back = page.getByRole("button", { name: "Alle Designs", exact: false });
  await expect(back).toHaveCount(1);
  const box = await back.boundingBox();
  expect(box.x).toBeLessThan(70);
  await back.click();
  await expect(page.locator(".studio-template-card")).toHaveCount(13);
  expect(new URL(page.url()).searchParams.get("view")).toBe("studio");
  await expect(page.locator(".studio-return")).toHaveCount(0);
});
test("pie preserves remainder and plain 3D exports without external materials", async ({
  page,
}, testInfo) => {
  await page.goto("/?view=studio&profile=current-poll&lang=de&parties=1,2,4");
  await page.locator("#studio-poll-pie").click();
  const pie = page.locator(".studio-current-preview-image [data-pie-total]");
  await expect(pie).toHaveAttribute("data-pie-total", "100");
  const sum = await pie
    .locator("path[data-share]")
    .evaluateAll((nodes) =>
      nodes.reduce((s, n) => s + Number(n.dataset.share), 0),
    );
  expect(sum).toBeCloseTo(100, 8);
  await expect(pie).toContainText(/nicht\s*dargestellt/);
  await page
    .getByRole("button", { name: "Alle Designs", exact: false })
    .click();
  await page.locator("#studio-poll-material").click();
  const blocks = page.locator(
    ".studio-current-preview-image [data-design-blocks]",
  );
  await expect(blocks).toHaveAttribute("data-design-blocks", "party-colour");
  expect(await blocks.locator("image").count()).toBe(0);
  {
    const pending = page.waitForEvent("download");
    await page
      .getByRole("button", { name: "PNG herunterladen", exact: true })
      .click();
  await page.locator("dialog[open]").getByRole("button",{name:"PNG herunterladen",exact:true}).click();
    const download = await pending;
    const data = await readFile(await download.path());
    expect(data.length).toBeGreaterThan(15000);
    await download.saveAs(testInfo.outputPath("plain-3d.png"));
  }
  await page.screenshot({
    path: testInfo.outputPath("material-preview.png"),
    fullPage: true,
  });
});
test("thirteen real designs preserve selected poll and parties through preview, PNG and back", async ({
  page,
}, testInfo) => {
  const errors = [],
    requests = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("request", (r) => requests.push(r.url()));
  await page.goto(
    "/?view=studio&lang=de&profile=current-poll&pollsters=1&parties=1,2,4&events=&range=custom&from=2020-01-01&to=2026-09-01",
  );
  await expect(page.locator(".studio-current-art")).toHaveCount(13);
  await expect(page.locator('[data-design="material"]')).toHaveAttribute(
    "data-render-ready",
    "true",
    { timeout: 60000 },
  );
  const parties = await page
    .locator(".studio-current-art")
    .evaluateAll((nodes) =>
      nodes.map((svg) =>
        [...svg.querySelectorAll("[data-party-id]")].map((n) => [
          n.dataset.partyId,
          n.dataset.value,
        ]),
      ),
    );
  expect(parties[0]).toHaveLength(3);
  parties.forEach((rows) => expect(rows).toEqual(parties[0]));
  const date = await page
    .locator(".studio-current-art")
    .first()
    .getAttribute("data-snapshot-date");
  expect(
    new Set(
      await page
        .locator(".studio-current-art")
        .evaluateAll((nodes) => nodes.map((n) => n.dataset.design)),
    ).size,
  ).toBe(13);
  expect(requests.filter((url) => url.includes("studioSource=1"))).toHaveLength(
    1,
  );
  await page.screenshot({
    path: testInfo.outputPath("gallery.png"),
    fullPage: true,
  });
  for (const id of [
    "poll-classic",

    "poll-pie",
    "poll-material",
    "poll-wide",
    "poll-paper",
    "poll-columns",
    "poll-lollipop",
    "poll-dotplot",
    "poll-table",
    "poll-square",
    "poll-poster",
    "poll-signal",
    "poll-ladder",
  ]) {
    await page.locator(`#studio-${id}`).click();
    const svg = page.locator(".studio-current-preview-image svg");
    await expect(svg).toHaveAttribute("data-snapshot-date", date);
    await expect(svg).toHaveAttribute("data-render-ready", "true", {
      timeout: 60000,
    });
    const values = await svg
      .locator("[data-party-id]")
      .evaluateAll((nodes) =>
        nodes.map((n) => [n.dataset.partyId, n.dataset.value]),
      );
    expect(values).toEqual(parties[0]);
    const pending = page.waitForEvent("download");
    await page
      .getByRole("button", { name: "PNG herunterladen", exact: true })
      .click();
  await page.locator("dialog[open]").getByRole("button",{name:"PNG herunterladen",exact:true}).click();
    const file = await pending,
      png = await readFile(await file.path());
    await file.saveAs(testInfo.outputPath(`${id}-export.png`));
    expect(png.readUInt32BE(16)).toBe(1920);
    expect(png.length).toBeGreaterThan(15000);
    if (id === "poll-columns" || id === "poll-ladder")
      await page.screenshot({
        path: testInfo.outputPath(`${id}.png`),
        fullPage: true,
      });
    await page
      .getByRole("button", { name: "Alle Designs", exact: false })
      .click();
    await expect(page.locator(".studio-current-art")).toHaveCount(13);
    expect(new URL(page.url()).searchParams.get("events")).toBe("");
    expect(new URL(page.url()).searchParams.get("start")).toBe("2020-01-01");
  }
  expect(requests.filter((url) => url.includes("studioSource=1"))).toHaveLength(
    1,
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});

test("browser history restores gallery and forward preview, settings use shared header", async ({
  page,
}) => {
  await page.goto("/?view=studio&lang=de&profile=current-poll");
  await expect(page.locator(".studio-current-art")).toHaveCount(13);
  await page.locator("#studio-poll-square").click();
  await expect(page.locator(".studio-current-preview-image svg")).toBeVisible();
  await page.goBack();
  await expect(page.locator(".studio-current-art")).toHaveCount(13);
  await page.goForward();
  await expect(
    page.locator(".studio-current-preview-image svg"),
  ).toHaveAttribute("data-design", "cards");
  await page
    .getByRole("button", { name: "Einstellungen", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
});

test("old international links are explained without replacing their data", async ({
  page,
}) => {
  await page.goto("/?view=studio&country=uk&template=poll-columns&lang=de");
  await expect(
    page.getByRole("heading", { name: "Studio startet mit Deutschland" }),
  ).toBeVisible();
  await expect(page.locator(".studio-current-art")).toHaveCount(0);
  expect(new URL(page.url()).searchParams.get("country")).toBe("uk");
});

test("Spanish selected-party thumbnails and preview have identical captions and values", async ({
  page,
}) => {
  await page.goto("/?view=studio&lang=es&profile=current-poll&parties=1,2");
  await expect(page.locator(".studio-current-art")).toHaveCount(13);
  await expect(page.locator(".studio-current-art").first()).toContainText(
    "La última encuesta electoral",
  );
  await page.locator("#studio-poll-poster").click();
  await expect(page.locator(".studio-current-preview-image svg")).toContainText(
    "La última encuesta electoral",
  );
  await expect(
    page.locator(".studio-current-preview-image [data-party-id]"),
  ).toHaveCount(2);
});

test("long title stays inside every SVG and clear of the publication line in dark mode", async ({
  page,
}) => {
  const headline =
    "Bundestagswahl: So unterscheiden sich die aktuellen Umfragewerte der ausgewählten Parteien im Überblick";
  await page.goto(
    `/?view=studio&profile=current-poll&lang=de&theme=dark&headline=${encodeURIComponent(headline)}`,
  );
  await expect(page.locator(".studio-current-art")).toHaveCount(13);
  const issues = await page.locator(".studio-current-art").evaluateAll((svgs) =>
    svgs.flatMap((svg) => {
      const box = svg.viewBox.baseVal;
      return [...svg.querySelectorAll("text")].flatMap((node) => {
        const b = node.getBBox();
        return b.x < -1 ||
          b.y < -1 ||
          b.x + b.width > box.width + 1 ||
          b.y + b.height > box.height + 1
          ? [`${svg.dataset.design}: ${node.textContent}`]
          : [];
      });
    }),
  );
  expect(issues).toEqual([]);
  expect(
    await page
      .locator(".studio-current-art")
      .evaluateAll((svgs) =>
        svgs.some((svg) => svg.outerHTML.includes("var(--")),
      ),
  ).toBe(false);
  await expect(
    page.locator('[data-design="broadcast"] [data-party-id="1"] rect'),
  ).toHaveAttribute("fill", "#c6cbd1");
  await expect(page.locator('[data-design="ladder"]')).toContainText("22,5%");
  const labels = await page
    .locator(".studio-current-art")
    .first()
    .locator("text")
    .evaluateAll((nodes) =>
      nodes
        .filter((n) => n.textContent.includes("Veröffentlicht"))
        .map((n) => n.getBBox().y),
    );
  expect(labels[0]).toBeGreaterThan(180);
});
