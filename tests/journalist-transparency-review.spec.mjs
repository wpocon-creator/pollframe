import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {unzipSync,strFromU8} from 'fflate';

async function openInfo(page,template,extra='') {
  await page.goto(`/?view=studio&lang=de&template=${template}&editor=1${extra}`);
  await expect(page.locator('.studio-current-preview-image > svg')).toBeVisible();
  await page.getByRole('button',{name:'Info',exact:true}).click();
  const dialog=page.getByRole('dialog',{name:'Info',exact:true});
  await dialog.getByText('Quellen, Methode und Vergleichsgrenzen',{exact:true}).click();
  return dialog;
}

test('newsroom: trace latest poll, distinguish comparison date and archive a verifiable package',async({page},info)=>{
  const raw=JSON.parse(await readFile('public/data/bundestag.json','utf8'));
  const poll=raw.polls.at(-1);
  const dialog=await openInfo(page,'poll-classic');
  await expect(dialog).toContainText('Stichprobe: n = '+poll.sample.toLocaleString('de-DE'));
  await expect(dialog).toContainText('Befragungszeitraum: '+poll.fieldwork.join(' – '));
  await expect(dialog).toContainText('Auftraggeber'); // explicitly unavailable, not silently substituted with DAWUM
  await expect(dialog).toContainText('Hier nicht verfügbar');
  await expect(dialog).toContainText('Vergleichsbasis für Veränderungen');
  await expect(dialog).toContainText('keine berechneten Konfidenzintervalle');
  await expect(dialog.getByRole('link',{name:'Nachweis dieser Messung'})).toHaveAttribute('href',`https://dawum.de/Bundestag/INSA/${poll.date}/`);
  await expect(dialog).toContainText('weder das erhebende Institut noch der Auftraggeber');
  const pending=page.waitForEvent('download');
  await dialog.getByRole('button',{name:'Publikationspaket herunterladen'}).click();
  const download=await pending;
  await download.saveAs(info.outputPath('current-publication.zip'));
  const files=unzipSync(await readFile(await download.path()));
  const data=JSON.parse(strFromU8(files['data.json'])).snapshot;
  for(const row of data.rows) expect(row.value).toBe(poll.results[row.id]);
  const settings=JSON.parse(strFromU8(files['settings.json'])).settings;
  expect(settings.template).toBe('poll-classic');
  expect(settings.region).toBe('bundestag');
  expect(settings.lang).toBe('de');
  expect(strFromU8(files['sources.txt'])).toContain('Ein PNG hält');
  expect(strFromU8(files['caption.txt'])).toContain(data.baselineDate);
  await page.screenshot({path:info.outputPath('current-evidence.png')});
});

test('newsroom: independently recompute the historical receipt and distinguish it from the smoothed line',async({page},info)=>{
  const dialog=await openInfo(page,'history-original','&range=five&mode=trend');
  await expect(dialog).toContainText('vor der zeitlichen Glättung');
  await expect(dialog).toContainText('Institute mit Veröffentlichungen im Zeitraum');
  await expect(dialog).toContainText('Separater Punkt, nicht der Linienwert');
  await dialog.getByText('Institutsdurchschnitt nachrechnen (vor Glättung)',{exact:true}).click();
  const pending=page.waitForEvent('download');
  await dialog.getByRole('button',{name:'Umfragen und Gewichte herunterladen'}).click();
  const download=await pending;
  const receipt=JSON.parse(await readFile(await download.path(),'utf8'));
  const raw=JSON.parse(await readFile('public/data/bundestag.json','utf8'));
  expect(receipt.institutes).toBeGreaterThan(1);
  for(const included of receipt.polls) {
    expect(raw.polls.some(p=>p.date===included.date&&p.pollster===included.pollster&&JSON.stringify(p.results)===JSON.stringify(included.results))).toBe(true);
    expect((Date.parse(receipt.date)-Date.parse(included.date))/86400000).toBeLessThanOrEqual(45);
  }
  for(const [party,calculation] of Object.entries(receipt.parties)) {
    const values=receipt.polls.filter(p=>Number.isFinite(p.results[party])).map(p=>p.results[party]);
    if(!values.length) {expect(calculation.value).toBeNull();continue;}
    expect(calculation.value).toBeCloseTo(values.reduce((a,b)=>a+b,0)/values.length,10);
    expect(calculation.weights.reduce((sum,row)=>sum+row.weight,0)).toBeCloseTo(1,10);
  }
  await download.saveAs(info.outputPath('recalculated-history.json'));
  const packagePending=page.waitForEvent('download');
  await dialog.getByRole('button',{name:'Publikationspaket herunterladen'}).click();
  const archive=await packagePending;
  await archive.saveAs(info.outputPath('historical-publication.zip'));
  const files=unzipSync(await readFile(await archive.path()));
  expect(files['calculator.mjs']).toBeTruthy();
  expect(files['verify.mjs']).toBeTruthy();
  const input=JSON.parse(strFromU8(files['inputs.json']));
  const snapshot=JSON.parse(strFromU8(files['data.json'])).snapshot;
  const {makeTrend,makeAverageSeries}=await import('../src/poll-history-calculator.js');
  expect(makeTrend(input.polls,input.selectedPollsters,input.start,input.end,input.parties,input.smoothingDays)).toEqual(snapshot.trend);
  expect(makeAverageSeries(input.polls,input.selectedPollsters,input.averageDates,input.parties.map(p=>p.id))).toEqual(snapshot.averages);
  await page.screenshot({path:info.outputPath('historical-evidence.png')});
});

// Withdrawn approval templates are checked independently in studio-paused-approval.spec.mjs.
// A restriction on one data source must not prevent auditing unrelated map exports.
test('newsroom: original map dates are audited as visible text, not SVG tooltips',async({page},info)=>{
  const dialog=await openInfo(page,'map-original');
  await expect(dialog).toContainText('unterschiedliche Befragungstermine');
  await expect(dialog).toContainText('gilt nicht für jedes Land');
  await expect(dialog.getByRole('link',{name:'Umfragen und Methodik auf Pollframe'})).toHaveAttribute('href','/?view=map&country=de&lang=de');
  await dialog.getByText('Umfragen je Bundesland',{exact:true}).click();
  await expect(dialog.getByRole('link',{name:'Bayern ↗'})).toHaveAttribute('href','/?region=bayern&lang=de');
  await dialog.getByRole('button',{name:'Schließen',exact:true}).click();
  const svg=page.locator('.studio-current-preview-image > svg');
  // Audit records, rather than declaring SVG <title> text visible in a PNG.
  const labels=await svg.locator('text').allTextContents();
  const tooltips=await svg.locator('path > title').allTextContents();
  await expect(svg.locator('[data-map-date]')).toHaveCount(16);
  for(const text of tooltips) {
    const date=text.match(/\d{4}-\d{2}-\d{2}/)?.[0];
    expect(date).toBeTruthy();
    expect(labels.some(label=>label.includes(date))).toBe(true);
  }
  await info.attach('map-date-audit.json',{body:JSON.stringify({visibleText:labels,nonPrintedTooltips:tooltips},null,2),contentType:'application/json'});
  await page.screenshot({path:info.outputPath('map-dates-visible.png')});
});
