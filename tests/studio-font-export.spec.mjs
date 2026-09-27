import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
test("dark editor choices are readable; selected font is in SVG, PNG and live embed", async ({
  page,
}, info) => {
  await page.addInitScript(() =>
    localStorage.setItem("opinion-poll-theme", "dark"),
  );
  await page.goto(
    "/?view=studio&topic=current&country=de&lang=de&template=poll-wide&editor=1&workspace=edit&theme=dark&cornerRadius=60&titleSize=64&subtitle=Die%20aktuelle%20Sonntagsfrage",
  );
  await expect(page.locator(".studio-current-preview-image svg")).toBeVisible();
  await page.getByRole("button", { name: "Schriftart ändern" }).first().click();
  const library = page.locator('.studio-font-library');
  await library.getByRole('searchbox').fill('Lora');
  await library.locator('.studio-font-row').click();
  await expect
    .poll(() =>
      page.evaluate(() =>
        [...document.fonts].some(
          (f) => f.family === "PF Lora" && f.status === "loaded",
        ),
      ),
    )
    .toBe(true);
  const colors = await page
    .locator(".studio-choice button[aria-pressed=false]")
    .first()
    .evaluate((n) => ({
      fg: getComputedStyle(n).color,
      bg: getComputedStyle(n).backgroundColor,
      text: n.textContent,
    }));
  expect(colors.fg).not.toBe(colors.bg);
  expect(colors.text.length).toBeGreaterThan(1);
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "SVG", exact: true }).click();
  const svg = await pending,
    content = await readFile(await svg.path(), "utf8");
  expect(content).toContain("@font-face");
  expect(content).toContain("PF Lora");
  expect(content).toContain("data:font/woff2;base64,");
  await page
    .getByRole("button", { name: "PNG herunterladen", exact: true })
    .click();
  const dialog = page.locator(".png-options-modal");
  await expect(dialog.locator(".studio-current-art")).toBeVisible();
  const pngPending = page.waitForEvent("download");
  await dialog
    .getByRole("button", { name: "PNG herunterladen", exact: true })
    .click();
  const png = await pngPending;
  await png.saveAs(info.outputPath("lora-dark.png"));
  const bytes = await readFile(await png.path());
  expect(bytes.length).toBeGreaterThan(20000);
  const pixels = await page.evaluate(async (base64) => {
    const image = new Image();
    image.src = "data:image/png;base64," + base64;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(image, 0, 0);
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let count = 0;
    for (let i = 3; i < data.length; i += 4) if (data[i] > 0) count++;
    return { corner: data[3], ratio: count / (canvas.width * canvas.height) };
  }, bytes.toString("base64"));
  expect(pixels.corner).toBe(0);
  expect(pixels.ratio).toBeGreaterThan(0.8);
  await page.screenshot({
    path: info.outputPath("publish-dark.png"),
    fullPage: true,
  });
  await dialog.getByRole("button", { name: "Schließen" }).click();
  const offer=page.getByRole('dialog',{name:'Gestaltung wiederverwenden?',exact:true});
  await offer.getByRole('button',{name:'Als Stil speichern',exact:true}).click();
  const wizard=page.getByRole('dialog',{name:'Neuen Stil erstellen',exact:true});
  await expect(wizard.locator('.studio-style-chart-preview svg')).toBeVisible();
  await wizard.getByRole('button',{name:'Schließen',exact:true}).click();
  await page.getByRole("button", { name: "Embed", exact: true }).click();
  const code = await page.locator(".widget-share-modal .code-label code").textContent();
  await page.goto(code.match(/src="([^"]+)"/)[1].replaceAll("&amp;", "&"));
  await expect
    .poll(() =>
      page.evaluate(() =>
        [...document.fonts].some(
          (f) => f.family === "PF Lora" && f.status === "loaded",
        ),
      ),
    )
    .toBe(true);
  await page.screenshot({
    path: info.outputPath("embed-lora-dark.png"),
    fullPage: true,
  });
});

// Full editing is intentionally unavailable on phones; preview/export coverage
// remains in studio-polish and the dedicated phone guard in studio-workspace.
test.beforeEach(async ({ page }, info) => {
  const viewport=info.project.use.viewport;
  test.skip(Boolean(info.project.use.isMobile && viewport && Math.min(viewport.width,viewport.height)<600), "Full editor is desktop/tablet only");
});
