import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";

test("local Studio retires only its own offline worker; Settings retains no visitor option", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.swChecks = { registrations: 0, removed: [] };
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: {
        controller: null,
        register: async () => {
          window.swChecks.registrations++;
          return null;
        },
        getRegistrations: async () =>
          ["/sw.js", "/unrelated-worker.js"].map((path) => ({
            active: { scriptURL: location.origin + path },
            unregister: async () => {
              window.swChecks.removed.push(path);
              return true;
            },
          })),
        addEventListener() {},
        removeEventListener() {},
      },
    });
    localStorage.setItem("pollframe-analytics-off", "1");
  });
  await page.goto("/?view=studio&topic=approval-current&lang=de");
  await expect
    .poll(() => page.evaluate(() => window.swChecks.removed))
    .toEqual(["/sw.js"]);
  expect(await page.evaluate(() => window.swChecks.registrations)).toBe(0);
  await page
    .getByRole("button", { name: "Einstellungen", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Besuchsstatistik", exact: true }),
  ).toHaveCount(0);
  expect(
    await page.evaluate(() => localStorage.getItem("pollframe-analytics-off")),
  ).toBe("1");
});

test("Studio does not reload while navigating; clear search has a touch target", async ({
  page,
}) => {
  const documents = [];
  page.on("request", (r) => {
    if (r.isNavigationRequest() && r.frame() === page.mainFrame())
      documents.push(r.url());
  });
  await page.goto("/?view=studio&topic=current&lang=de");
  const input = page.getByRole("searchbox");
  await input.fill("modern");
  const clear = page.getByRole("button", {
    name: "Suche löschen",
    exact: true,
  });
  const box = await clear.boundingBox();
  expect(box.width).toBeGreaterThanOrEqual(44);
  expect(box.height).toBeGreaterThanOrEqual(44);
  await clear.click();
  await expect(input).toHaveValue("");
  await expect(input).toBeFocused();
  await page.locator("#studio-poll-classic").click();
  await expect(page.locator(".studio-current-preview-image>svg")).toBeVisible({
    timeout: 35000,
  });
  await page.getByRole("button", { name: "Bearbeiten", exact: true }).click();
  await expect(page.locator(".studio-tools")).toBeVisible();
  expect(documents).toHaveLength(1);
});

test("failed editor download leaves the graph and a recovery action, not a white page", async ({
  page,
}) => {
  await page.route("**/assets/studio-editor-controls-*.js", (route) =>
    route.abort(),
  );
  await page.goto(
    "/?view=studio&template=approval-current-pie&editor=1&workspace=edit&lang=de",
  );
  await expect(
    page.getByRole("heading", {
      name: "Dieser Teil konnte nicht geladen werden",
    }),
  ).toBeVisible();
  await expect(page.locator(".studio-current-preview-image>svg")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Neu laden", exact: true }),
  ).toBeVisible();
});

test("approval pie preserves answer shares and rounding in the actual embed", async ({
  page,
}, info) => {
  await page.goto(
    "/?view=studio&template=approval-current-pie&editor=1&lang=de&metric=government",
  );
  const svg = page.locator(".studio-current-preview-image>svg");
  await expect(svg).toBeVisible();
  const values = await svg
    .locator("[data-approval-pie] [data-value]")
    .evaluateAll((nodes) => nodes.map((n) => Number(n.dataset.value)));
  expect(values.reduce((a, b) => a + b, 0)).toBeCloseTo(100, 8);
  await page.getByRole("slider", { name: /Grafikecken abrunden/ }).fill("58");
  await expect(svg.locator("clipPath rect")).toHaveAttribute("rx", "58");
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "PNG herunterladen", exact: true }).click();
  await page.locator("dialog[open]").getByRole("button",{name:"PNG herunterladen",exact:true}).click();
  const download = await pending, bytes = await readFile(await download.path());
  expect(bytes.length).toBeGreaterThan(15000);
  expect(bytes.subarray(1,4).toString()).toBe("PNG");
  expect(bytes.readUInt32BE(16)).toBe(1920);
  await download.saveAs(info.outputPath("approval-pie-export.png"));
  await page.locator("dialog[open]").getByRole("button",{name:"Schließen"}).click();
  await page.getByRole("button", { name: "Embed", exact: true }).click();
  const code = await page.locator("dialog[open] textarea").inputValue();
  const box = await svg.getAttribute("viewBox");
  // SVGAnimatedRect uses float32 in some browsers; compare the actual ratio,
  // not its decimal serialization (808.6 can become 808.5999755859375).
  const dimensions = box.split(" ").slice(2).map(Number);
  const ratio = code.match(/aspect-ratio:([\d.]+)\/([\d.]+)/);
  expect(Number(ratio[1])/Number(ratio[2])).toBeCloseTo(dimensions[0]/dimensions[1], 5);
  await page.goto(code.match(/src="([^"]+)"/)[1].replaceAll("&amp;", "&"));
  await expect(page.locator("svg clipPath rect")).toHaveAttribute("rx", "58");
  expect(
    await page
      .locator("[data-approval-pie] [data-value]")
      .evaluateAll((nodes) => nodes.map((n) => Number(n.dataset.value))),
  ).toEqual(values);
});

for (const template of [
  "poll-classic",
  "history-original",
  "approval-original",
  "approval-current-pie",
  "approval-current-original",
  "seats-original",
  "majority-original",
  "tendencies-original",
  "map-original",
  "map-atlas",
  "map-poster",
  "approval-current-cards",
])
  test(`edited ${template}: text stays separate and inside the graphic`, async ({
    page,
  }, info) => {
    const params = new URLSearchParams({
      view: "studio",
      editor: "1",
      template,
      lang: "es",
      font: "mono",
      titleSize: "44",
      subtitleSize: "30",
      noteSize: "24",
      titleLeading: "1.05",
      density: ".8",
      barScale: "1.6",
      historyLabelSize: "22",
      theme: "dark",
      headline:
        "WWW: Encuestas electorales y valoración del Gobierno en Alemania — análisis detallado",
      subtitle:
        "Comparación de las últimas encuestas: cómo se distribuyen las respuestas y qué muestran los resultados publicados.",
      editorNote:
        "Datos originales y métodos documentados. Esta visualización permite comparar resultados, pero no predice el resultado de unas elecciones.",
      events: "",
    });
    await page.goto("/?" + params);
    const svg = page.locator(".studio-current-preview-image>svg");
    await expect(svg).toBeVisible({ timeout: 35000 });
    const defects = await svg.evaluate((svg) => {
      const root = svg.getBoundingClientRect();
      const nodes = [...svg.querySelectorAll("text")]
        .filter((n) => n.textContent.trim())
        .map((n) => ({ text: n.textContent, r: n.getBoundingClientRect() }));
      const outside = nodes
        .filter(
          ({ r }) =>
            r.left < root.left - 1 ||
            r.right > root.right + 1 ||
            r.top < root.top - 1 ||
            r.bottom > root.bottom + 1,
        )
        .map((n) => n.text);
      const overlaps = [];
      for (let i = 0; i < nodes.length; i++)
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i],
            b = nodes[j];
          if (
            Math.min(a.r.right, b.r.right) - Math.max(a.r.left, b.r.left) >
              1.5 &&
            Math.min(a.r.bottom, b.r.bottom) - Math.max(a.r.top, b.r.top) > 1.5
          )
            overlaps.push([a.text, b.text]);
        }
      return { outside, overlaps };
    });
    await svg.screenshot({ path: info.outputPath(`${template}-edited.png`) });
    expect(defects).toEqual({ outside: [], overlaps: [] });
  });
