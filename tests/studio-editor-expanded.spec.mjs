import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
test.use({serviceWorkers:'block',video:'off'});
test('editor tools change the shared drawing and produce reusable editorial assets',async({page},info)=>{
  await page.goto('/?view=studio&editor=1&workspace=edit&template=poll-classic&lang=de');
  const svg=page.locator('.studio-current-preview-image svg');
  await expect(svg.locator('[data-party-id]').first()).toBeVisible();
  const values=await svg.locator('[data-party-id]').evaluateAll(nodes=>nodes.map(n=>n.dataset.value).sort());
  await page.locator('.studio-tools').getByRole('button',{name:'Normal',exact:true}).click();
  await page.locator('.studio-tools').getByRole('button',{name:'Diagramm',exact:true}).click();
  await page.locator('.studio-tools').getByRole('button',{name:'Name',exact:true}).click();
  await page.getByRole('spinbutton',{name:/Referenzlinie/}).fill('5');
  await expect(svg.locator('[data-reference]')).toHaveAttribute('data-reference','5');
  await page.locator('.studio-tools').getByRole('button',{name:'AfD',exact:true}).click();
  expect(await svg.locator('[data-party-id]').evaluateAll(nodes=>nodes.map(n=>n.dataset.value).sort())).toEqual(values);
  await page.locator('.studio-tools').getByRole('button',{name:'Ausgabe',exact:true}).click();
  for(const [button,extension] of [['Rohdaten als CSV','csv'],['Gestaltung speichern','json'],['SVG','svg']]) {
    const pending=page.waitForEvent('download');await page.getByRole('button',{name:button,exact:true}).click();
    const download=await pending;const data=await readFile(await download.path(),'utf8');expect(data.length).toBeGreaterThan(100);
    await download.saveAs(info.outputPath(`editor.${extension}`));
    if(extension==='svg'){expect(data).toContain('data-reference="5"');expect(data).toContain('ODC-ODbL');}
    if(extension==='csv'){expect(data).toContain('publication_date');expect(data).toContain('https://dawum.de');}
    if(extension==='json')expect(JSON.parse(data).style.titleWeight).toBe(400);
  }
  await page.locator('input[accept="application/json,.json"]').setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from('{"value":99}')});
  await expect(page.locator('.studio-tools [role=status]')).toContainText('Keine gültige');
  await page.locator('input[accept="application/json,.json"]').setInputFiles({name:'style.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({type:'pollframe-style',version:1,style:{titleWeight:700,reference:10}}))});
  await expect(svg.locator('[data-reference]')).toHaveAttribute('data-reference','10');
  expect(await svg.locator('[data-party-id]').evaluateAll(nodes=>nodes.map(n=>n.dataset.value).sort())).toEqual(values);
  await page.locator('.studio-tools').getByRole('button',{name:'Diagramm',exact:true}).click();
  await page.locator('.studio-tools').getByRole('button',{name:'Diagramm',exact:true}).focus();
  await page.keyboard.press('Control+z');
  await expect(svg.locator('[data-reference]')).toHaveAttribute('data-reference','5');
  await page.keyboard.press('Control+Shift+z');
  await expect(svg.locator('[data-reference]')).toHaveAttribute('data-reference','10');
  await page.evaluate(()=>window.scrollTo(0,0));
  await page.screenshot({path:info.outputPath('expanded-editor.png'),fullPage:true});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});

// Full editing is intentionally unavailable on phones; preview/export coverage
// remains in studio-polish and the dedicated phone guard in studio-workspace.
test.beforeEach(async ({ page }, info) => {
  const viewport=info.project.use.viewport;
  test.skip(Boolean(info.project.use.isMobile && viewport && Math.min(viewport.width,viewport.height)<600), "Full editor is desktop/tablet only");
});
