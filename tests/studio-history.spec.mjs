import {test,expect} from '@playwright/test';
import {HISTORY_DESIGNS} from '../src/studio-history-model.js';
import {readFile} from 'node:fs/promises';
test.use({serviceWorkers:'block',video:'off'});
test('all historical designs render real series in light and dark without clipped text',async({page,isMobile},info)=>{
  test.setTimeout(120000);
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/?view=studio&topic=history&editor=1&workspace=edit&template=history-original&lang=de&range=five');
  const svg=page.locator('.studio-current-preview-image svg');
  await expect(svg).toBeVisible({timeout:35000});
  await page.locator('.studio-tools').getByRole('button',{name:'Diagramm',exact:true})[isMobile?'tap':'click']();
  for(const theme of ['light','dark']) {
    if(theme==='dark')await page.getByRole('button',{name:'Dunkel',exact:true})[isMobile?'tap':'click']();
    for(const design of HISTORY_DESIGNS) {
      await page.locator('.studio-tools').getByRole('button',{name:design.name[0],exact:true}).click();
      await expect(svg).toHaveAttribute('data-history-design',design.design);
      expect(await svg.locator('[data-history-party]').count()).toBeGreaterThan(2);
      expect(await svg.innerHTML()).not.toMatch(/NaN|Infinity/);
      const overflow=await svg.locator('text').evaluateAll(nodes=>nodes.filter(n=>{const r=n.getBoundingClientRect(),s=n.ownerSVGElement.getBoundingClientRect();return r.left<s.left-1||r.right>s.right+1;}).map(n=>n.textContent));
      expect(overflow).toEqual([]);
      await svg.screenshot({path:info.outputPath(`${design.design}-${theme}.png`)});
    }
  }
  expect(errors).toEqual([]);
  expect(await page.locator('.studio-brand svg').count()).toBe(0);
});
test('historical editor, CSV, PNG and embed preserve the chosen series',async({page,isMobile},info)=>{
  await page.goto('/?view=studio&topic=history&editor=1&workspace=edit&template=history-wide&lang=de&parties=1,2&events=&range=custom&from=2025-01-01&to=2026-01-01');
  const svg=page.locator('.studio-current-preview-image svg');await expect(svg).toBeVisible({timeout:35000});
  await page.locator('.studio-tools').getByRole('button',{name:'Diagramm',exact:true})[isMobile?'tap':'click']();
  await page.locator('.studio-tools').getByRole('button',{name:'Daten',exact:true}).click();
  await page.getByRole('combobox',{name:'Reihendarstellung',exact:true}).selectOption('polls');
  await expect(svg.locator('[data-history-party] circle').first()).toBeVisible();
  const parties=await svg.locator('[data-history-party]').evaluateAll(nodes=>nodes.map(n=>[n.dataset.historyParty,n.dataset.value]));
  await page.locator('.studio-tools').getByRole('button',{name:'Ausgabe',exact:true})[isMobile?'tap':'click']();
  const csvPending=page.waitForEvent('download');await page.getByRole('button',{name:'Berechnete Zeitreihe als CSV',exact:true}).click();const csv=await csvPending;
  expect(await readFile(await csv.path(),'utf8')).toContain('2025-');
  const pngPending=page.waitForEvent('download');await page.getByRole('button',{name:'PNG herunterladen',exact:true}).click();
  await page.locator("dialog[open]").getByRole("button",{name:"PNG herunterladen",exact:true}).click();const png=await pngPending;const buffer=await readFile(await png.path());expect(buffer.readUInt32BE(16)).toBe(1920);expect(buffer.length).toBeGreaterThan(15000);await png.saveAs(info.outputPath('history.png'));
  if(await page.locator("dialog[open]").count())await page.locator("dialog[open]").getByRole("button",{name:"Schließen"}).click();
  await page.getByRole('button',{name:'Embed',exact:true}).click();const code=await page.locator('dialog[open] textarea').inputValue();
  const url=code.match(/src="([^"]+)"/)[1].replaceAll('&amp;','&');
  await page.goto(url);const embed=page.locator('svg[data-history-design]');await expect(embed).toBeVisible({timeout:35000});
  expect(await embed.locator('[data-history-party]').evaluateAll(nodes=>nodes.map(n=>[n.dataset.historyParty,n.dataset.value]))).toEqual(parties);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});

test('editor handles long Spanish copy, undo, source selections and empty charts',async({page,isMobile},info)=>{
  let sourceRequests=0;page.on('request',request=>{if(request.url().includes('studioHistorySource=1'))sourceRequests++;});
  const params=new URLSearchParams({view:'studio',topic:'history',editor:'1',workspace:'edit',template:'history-square',lang:'es',range:'five',titleSize:'44',historyLabelSize:'22',subtitleSize:'30',noteSize:'24',font:'mono',headline:'Cómo ha cambiado la intención de voto en Alemania: cinco años de encuestas electorales',subtitle:'Encuestas nacionales de los institutos seleccionados: evolución de los partidos y sus diferencias a lo largo del tiempo.',editorNote:'Las encuestas son estimaciones sujetas a incertidumbre, no una predicción del resultado electoral.'});
  await page.goto('/?'+params);
  const svg=page.locator('.studio-current-preview-image svg');await expect(svg).toBeVisible({timeout:35000});
  const clipped=await svg.locator('text').evaluateAll(nodes=>nodes.filter(n=>{const r=n.getBBox(),s=n.ownerSVGElement,v=s.viewBox.baseVal,m=s.getScreenCTM().inverse().multiply(n.getScreenCTM());return [[r.x,r.y],[r.x+r.width,r.y+r.height]].map(([x,y])=>new DOMPoint(x,y).matrixTransform(m)).some(p=>p.x<-.5||p.x>v.width+.5||p.y<-.5||p.y>v.height+.5);}).map(n=>n.textContent));
  expect(clipped).toEqual([]);
  const headerOverlap=await svg.locator(':scope > g > text').evaluateAll(nodes=>{const bounds=nodes.filter(n=>Number(n.getAttribute('font-size'))>=30).map(n=>n.getBBox());return bounds.some((r,i)=>bounds.slice(i+1).some(s=>r.x<s.x+s.width&&s.x<r.x+r.width&&r.y<s.y+s.height&&s.y<r.y+r.height));});
  expect(headerOverlap).toBe(false);
  await page.screenshot({path:info.outputPath('spanish-editor.png'),fullPage:true});
  const tap=async name=>page.locator('.studio-tools').getByRole('button',{name,exact:true})[isMobile?'tap':'click']();
  await tap('Gráfica');
  await page.locator('.studio-tools').getByRole('button',{name:HISTORY_DESIGNS.find(d=>d.id==='history-wide').name[2],exact:true}).click();
  await tap('Datos');
  await expect(page.getByRole('combobox',{name:/^Máximo de la escala/})).toHaveCount(1);
  expect(await page.getByRole('slider',{name:/Grosor de barras/}).count()).toBe(0);
  const endpoint=svg.locator('[data-history-party]').first();const first=await endpoint.getAttribute('data-value');
  await tap('Gráfica');
  await page.locator('.studio-tools').getByRole('button',{name:'Nombre',exact:true}).click();
  await tap('Deshacer');await expect(endpoint).toHaveAttribute('data-value',first);
  await page.locator('.studio-tools').getByRole('button',{name:HISTORY_DESIGNS.find(d=>d.id==='history-panels').name[2],exact:true}).click();
  await tap('Datos');
  await page.getByRole('checkbox',{name:'Mostrar valores finales',exact:true}).uncheck();
  expect((await svg.locator('text').allTextContents()).some(text=>/ · [\d,]+%/.test(text))).toBe(false);
  expect(sourceRequests).toBe(1);
  await page.reload();await expect(svg).toHaveAttribute('data-history-design','panels');
  expect((await svg.locator('text').allTextContents()).some(text=>/ · [\d,]+%/.test(text))).toBe(false);
  const url=new URL(page.url());url.searchParams.set('parties','');url.searchParams.set('events','');await page.goto(url.href);
  await expect(svg).toBeVisible();await expect(svg).toContainText('No hay partidos con datos seleccionados');
  expect(await svg.locator('[data-history-party]').count()).toBe(0);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});

// Full editing is intentionally unavailable on phones; preview/export coverage
// remains in studio-polish and the dedicated phone guard in studio-workspace.
test.beforeEach(async ({ page }, info) => {
  const viewport=info.project.use.viewport;
  test.skip(Boolean(info.project.use.isMobile && viewport && Math.min(viewport.width,viewport.height)<600), "Full editor is desktop/tablet only");
});
