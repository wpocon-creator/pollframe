import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
test.use({ serviceWorkers: "block", video: "off" });
const open = async (page, template = "poll-classic", extra = "") => {
  await page.goto(`/?view=studio&lang=de&editor=1&template=${template}${extra}`);
  await expect(page.locator(".studio-current-preview-image svg")).toBeVisible({
    timeout: 30000,
  });
};
test("journalist can trace the poll and preserve a source note", async ({
  page,
}, info) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await open(page);
  await page.getByRole("button", { name: "Info", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("Stichprobe");
  await expect(dialog).toContainText("Vergleichsbasis");
  await expect(dialog).toContainText("keine Wahlprognose");
  const source = dialog.getByRole("link", {
    name: "Veröffentlichung dieser Messung",
  });
  await expect(source).toHaveAttribute(
    "href",
    /^https:\/\/dawum.de\/.+\/\d{4}-\d{2}-\d{2}\/$/,
  );
  const download = page.waitForEvent("download");
  await dialog.getByRole("button", { name: "Beleg herunterladen" }).click();
  expect((await download).suggestedFilename()).toMatch(/^pollframe-sources/);
  const bounds = await dialog.boundingBox(),
    viewport = page.viewportSize();
  expect(bounds.height).toBeLessThanOrEqual(viewport.height * 0.75 + 1);
  expect(
    Math.abs(bounds.y + bounds.height / 2 - viewport.height / 2),
  ).toBeLessThan(3);
  await page.screenshot({ path: info.outputPath("info-current.png") });
  await dialog.getByRole("button", { name: "Schließen" }).click();
  await expect(
    page.getByRole("button", { name: "Info", exact: true }),
  ).toBeFocused();
  expect(errors).toEqual([]);
});
test("create, persist and apply one style to another family without changing data", async ({
  page,
}, info) => {
  await open(page);
  await page.getByRole("button", { name: "Stile", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Stilname", { exact: true }).fill("Redaktion Nacht");
  await dialog.getByLabel("Schriftart", { exact: true }).selectOption("serif");
  await dialog.getByLabel("Darstellung", { exact: true }).selectOption("dark");
  await dialog
    .getByRole("slider", { name: "Eckenrundung", exact: true })
    .fill("24");
  await dialog
    .getByRole("button", { name: "Stil speichern", exact: true })
    .click();
  await expect(dialog.locator("p[role=status]")).toContainText("Stil gespeichert");
  await page.screenshot({ path: info.outputPath("styles.png") });
  await dialog
    .getByRole("button", { name: "Auf diese Grafik anwenden" })
    .click();
  await expect
    .poll(() => new URL(page.url()).searchParams.get("font"))
    .toBe("serif");
  await expect
    .poll(() => new URL(page.url()).searchParams.get("theme"))
    .toBe("dark");
  await open(
    page,
    "history-original",
    "&range=year&mode=linear&headline=Redaktion",
  );
  const before = await page
    .locator(".studio-current-preview-image svg")
    .textContent();
  await page.getByRole("button", { name: "Stile", exact: true }).click();
  await dialog.getByRole("button", { name: /Aa\s*Redaktion Nacht/ }).click();
  await dialog
    .getByRole("button", { name: "Auf diese Grafik anwenden" })
    .click();
  await expect
    .poll(() => new URL(page.url()).searchParams.get("font"))
    .toBe("serif");
  const params = new URL(page.url()).searchParams;
  expect(params.get("mode")).toBe("linear");
  expect(params.get("range")).toBe("year");
  expect(params.get("headline")).toBe("Redaktion");
  expect(
    await page.locator(".studio-current-preview-image svg").textContent(),
  ).toBe(before);
  await page.getByRole("button", { name: "Info", exact: true }).click();
  await expect(dialog).toContainText("45 Tage");
  await expect(dialog).toContainText("Ausgewählte Institute");
  await dialog.getByRole("button", { name: "Schließen" }).click();
  await page.screenshot({ path: info.outputPath("history-styled.png") });
  await page.getByRole('button',{name:'PNG herunterladen',exact:true}).click();
  const pngDialog=page.getByRole('dialog',{name:'PNG exportieren'});
  await expect(pngDialog.locator('.studio-png-exact-preview svg')).toBeVisible();
  const pending=page.waitForEvent('download');
  await pngDialog.getByRole('button',{name:'PNG herunterladen',exact:true}).click();
  const download=await pending, png=await readFile(await download.path());
  expect(png.subarray(0,8)).toEqual(Buffer.from([137,80,78,71,13,10,26,10]));
  expect(png.length).toBeGreaterThan(15000);
  await download.saveAs(info.outputPath('styled-history.png'));
  await pngDialog.getByRole('button',{name:/Schließen|Close/}).click();
  await page.getByRole('button',{name:'Embed',exact:true}).click();
  const frame=page.locator('.embed-live-preview iframe');
  await expect(frame).toBeVisible();
  const url=new URL(await frame.getAttribute('src'),page.url());
  expect(url.searchParams.get('font')).toBe('serif');
  expect(url.searchParams.get('theme')).toBe('dark');
  expect(url.searchParams.get('mode')).toBe('linear');
});

test('normal Bundestag workflow exposes methods, poll releases and a usable CSV',async({page},info)=>{
  await page.goto('/?region=bundestag&lang=de');
  const current=page.locator('.results-card').first();
  await current.getByRole('button',{name:'So wird diese Grafik gelesen'}).click();
  const dialog=page.getByRole('dialog');
  await expect(dialog).toContainText('Stichprobe');
  await expect(dialog).toContainText('Prozentpunkten');
  await page.screenshot({path:info.outputPath('normal-current-info.png')});
  await dialog.getByRole('button',{name:'Erklärung schließen'}).click();
  const table=page.locator('.poll-table-section');
  await table.locator('summary').click();
  await expect(table).toContainText('INSA');
  const download=page.waitForEvent('download');
  await table.getByRole('button',{name:/CSV/}).click();
  const csv=await readFile(await (await download).path(),'utf8');
  expect(csv).toContain('fieldwork_start');expect(csv).toContain('source_url');expect(csv).toContain('license');
  expect(csv).toMatch(/https:\/\/dawum.de\/Bundestag\//);
});
test("source notes distinguish modelling and approval; Spanish controls are translated", async ({
  page,
}) => {
  await open(page, "seats-original");
  await page.getByRole("button", { name: "Info", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("Sainte-Laguë");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Schließen" })
    .click();
  await open(page, "approval-current-pie");
  await page.getByRole("button", { name: "Info", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("Originalfrage");
  await expect(page.getByRole("dialog")).toContainText(
    "keine eigenständig erhobene Antwortkategorie",
  );
  await page.goto("/?view=studio&lang=es&editor=1&template=poll-classic");
  await page.getByRole("button", { name: "Estilos", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("Nombre del estilo");
  await expect(page.getByRole("dialog")).not.toContainText("Stil speichern");
});

test('import rejects unsafe content; applying a style is one undo step',async({page,isMobile},info)=>{
  test.skip(isMobile,'Full editor is deliberately desktop/tablet only');
  await open(page,'poll-classic','&workspace=edit&theme=light');
  await page.getByRole('button',{name:'Stile',exact:true}).click();
  const dialog=page.getByRole('dialog');
  const imported={type:'pollframe-style',version:1,name:'Importtest',style:{font:'serif',theme:'dark',titleSize:48,headline:'DO NOT APPLY',axisMax:8,source:'fake'}};
  await dialog.locator('input[type=file]').setInputFiles({name:'style.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(imported))});
  await expect(dialog.getByLabel('Stilname',{exact:true})).toHaveValue('Importtest');
  await dialog.getByRole('button',{name:'Auf diese Grafik anwenden'}).click();
  await expect.poll(()=>new URL(page.url()).searchParams.get('font')).toBe('serif');
  expect(new URL(page.url()).searchParams.get('headline')).not.toBe('DO NOT APPLY');
  expect(new URL(page.url()).searchParams.get('axisMax')).toBe('0');
  await page.keyboard.press('Control+z');
  await expect.poll(()=>new URL(page.url()).searchParams.get('font')).toBe('auto');
  await expect.poll(()=>new URL(page.url()).searchParams.get('theme')).toBe('light');
  await page.evaluate(()=>{document.documentElement.dataset.theme='dark';});
  await page.getByRole('button',{name:'Stile',exact:true}).click();
  await page.screenshot({path:info.outputPath('styles-dark-dialog.png')});
  const bg=await dialog.evaluate(node=>getComputedStyle(node).backgroundColor);
  expect(bg).not.toBe('rgb(255, 255, 255)');
  await dialog.locator('input[type=file]').setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from('{"type":"not-a-style"}')});
  await expect(dialog.locator('p[role=status]')).toContainText('nicht geklappt');
});
