import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {STUDIO_DATASETS,studioRegionName} from '../src/studio-regions.js';

test.use({serviceWorkers:'block'});
const load=async region=>JSON.parse(await readFile(new URL(`../public/data/${region}.json`,import.meta.url),'utf8'));
const choose=async(page,label,option)=>{
  await page.getByRole('combobox',{name:label,exact:true}).click();
  await page.getByRole('option',{name:option,exact:true}).click();
};
const verify=async(svg,poll)=>{
  await expect(svg).toHaveAttribute('data-snapshot-date',poll.date);
  for(const [id,value] of Object.entries(poll.results).filter(([id])=>id!=='0')){
    const row=svg.locator(`[data-party-id="${id}"]`).first();
    await expect(row).toHaveAttribute('data-value',String(value));
  }
};

test('regional search and selection show real state values, preserved on reload',async({page},info)=>{
  const berlin=await load('berlin'),bayern=await load('bayern');
  await page.goto('/?view=studio&lang=en-GB&profile=current-poll&q=Berlni');
  let svg=page.locator('#studio-poll-classic svg').first();
  await verify(svg,berlin.polls.at(-1));
  await expect(svg).toContainText('Berlin');
  await choose(page,'Dataset','Bavaria');
  await verify(svg,bayern.polls.at(-1));
  await expect(svg).toContainText('Bavaria');
  await page.reload();
  await verify(svg,bayern.polls.at(-1));
  await page.screenshot({path:info.outputPath('regional-gallery.png')});
});

test('institute and average controls change actual numbers and survive embeds',async({page},info)=>{
  const d=await load('berlin');
  await page.goto('/?view=studio&lang=en-GB&region=berlin&template=poll-classic&workspace=edit&editor=1');
  const svg=page.locator('.studio-current-preview-image svg').first();
  await verify(svg,d.polls.at(-1));
  await page.getByRole('button',{name:'Content & period',exact:true}).click();
  await page.locator('.studio-institute-picker summary').click();
  await page.getByRole('button',{name:'Only INSA',exact:true}).click();
  await verify(svg,d.polls.filter(p=>p.pollster==='5').at(-1));
  await page.locator('.studio-institute-picker summary').click();
  await page.getByRole('button',{name:'All institutes',exact:true}).click();
  await choose(page,'Data basis','Polling average');
  const at=d.polls.at(-1).date,cutoff=Date.parse(at)-45*864e5;
  const last=new Map(d.polls.filter(p=>Date.parse(p.date)>=cutoff).map(p=>[p.pollster,p]));
  const values=[...last.values()].map(p=>p.results['5']).filter(Number.isFinite);
  await expect.poll(async()=>Number(await svg.locator('[data-party-id="5"]').first().getAttribute('data-value'))).toBeCloseTo(values.reduce((a,b)=>a+b,0)/values.length,6);
  await expect(svg).toContainText('Polling average');
  await page.screenshot({path:info.outputPath('regional-average-editor.png')});
  await page.reload();
  await expect(svg).toContainText('Polling average');
  await expect(svg).toContainText('Berlin');
  await page.getByRole('button',{name:'Embed',exact:true}).click();
  const code=await page.getByRole('dialog').locator('code').innerText();
  expect(code).toContain('region=berlin');
  expect(code).toContain('currentBasis=average');
  const embed=await page.context().newPage();
  await embed.goto(code.match(/src="([^"]+)/)[1].replaceAll('&amp;','&'));
  const embedded=embed.locator('svg.studio-current-art');
  await expect(embedded).toContainText('Berlin');
  await expect.poll(async()=>Number(await embedded.locator('[data-party-id="5"]').first().getAttribute('data-value'))).toBeCloseTo(values.reduce((a,b)=>a+b,0)/values.length,6);
  await embed.close();
  await page.getByRole('dialog').getByRole('button',{name:'Close',exact:true}).click();
  await page.getByRole('button',{name:'Download PNG',exact:true}).click();
  const dialog=page.getByRole('dialog');
  await expect(dialog.locator('.studio-png-exact-preview svg')).toContainText('Berlin');
  const pending=page.waitForEvent('download');
  await dialog.getByRole('button',{name:'Download PNG',exact:true}).click();
  const download=await pending, png=await readFile(await download.path());
  expect(png.subarray(1,4).toString()).toBe('PNG');
  expect(png.length).toBeGreaterThan(15000);
  await download.saveAs(info.outputPath('berlin-average.png'));
});

test('historical provenance lists real publications and draws original poll markers',async({page},info)=>{
  await page.goto('/?view=studio&lang=en-GB&region=berlin&template=history-original&range=year&workspace=edit&editor=1');
  const svg=page.locator('.studio-current-preview-image svg').first();
  await expect(svg).toBeVisible();
  await expect(svg).toContainText('Berlin');
  await page.getByRole('button',{name:'Content & period',exact:true}).click();
  await page.getByRole('checkbox',{name:'Show individual polls on the timeline'}).check();
  await expect(svg.locator('.studio-origin-poll').first()).toBeVisible();
  await page.getByRole('button',{name:/Inspect polls and provenance/}).click();
  const dialog=page.getByRole('dialog');
  await expect(dialog).toContainText('2026-09-11');
  await expect(dialog).toContainText('Forschungsgruppe Wahlen');
  await expect(dialog).toContainText('2026-09-07');
  await page.getByRole('searchbox',{name:'Search polls'}).fill('INSA');
  const institutes=await dialog.locator('tbody tr td:nth-child(2)').allTextContents();
  expect(institutes.length).toBeGreaterThan(0);
  expect(institutes.every(name=>name==='INSA')).toBe(true);
  await page.screenshot({path:info.outputPath('regional-provenance.png')});
});

test('all available states match their latest data, never federal fallback',async({page,browserName})=>{
  test.skip(browserName!=='chromium','Full dataset sweep in Chromium; representative workflows also run in Firefox.');
  test.setTimeout(150000);
  await page.goto('/?view=studio&lang=en-GB&profile=current-poll');
  const svg=page.locator('#studio-poll-classic svg').first();
  for(const [region] of STUDIO_DATASETS){
    await choose(page,'Dataset',studioRegionName(region,'en-GB'));
    await verify(svg,(await load(region)).polls.at(-1));
  }
});

test('regional seat model and party history retain the regional parliament and CDU/CSU identity',async({page})=>{
  await page.goto('/?view=studio&lang=en-GB&region=bayern&template=party-original&editor=1');
  let svg=page.locator('.studio-current-preview-image svg').first();
  await expect(svg).toContainText('CSU');
  await expect(svg).toContainText('Bavaria');
  await page.goto('/?view=studio&lang=en-GB&region=berlin&template=seats-original&editor=1');
  svg=page.locator('.studio-current-preview-image svg').first();
  await expect(svg).toHaveAttribute('data-total','130');
  await expect(svg).toContainText('Berlin');
  await expect(svg).not.toContainText('Bundestag');
});

test('live regional search works at phone and tablet widths in Spanish dark mode',async({page},info)=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto('/?view=studio&lang=es&theme=dark&profile=current-poll');
  await page.getByRole('searchbox').fill('Berlni');
  const svg=page.locator('#studio-poll-classic svg').first();
  await verify(svg,(await load('berlin')).polls.at(-1));
  await expect(svg).toContainText('Berlín');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  await page.screenshot({path:info.outputPath('regional-phone-es-dark.png')});
  await page.setViewportSize({width:820,height:1180});
  await choose(page,'Conjunto de datos','Baviera');
  await verify(svg,(await load('bayern')).polls.at(-1));
  await expect(svg).toContainText('Baviera');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  await page.screenshot({path:info.outputPath('regional-tablet-es-dark.png')});
});
