import { test, expect } from '@playwright/test';
import {readFile} from 'node:fs/promises';

const history='/?view=studio&lang=de&template=history-original&editor=1&workspace=edit&range=five';
const items=[
  {id:'party',country:'de',regionSlug:'bundestag',type:'party',partyIds:['4'],layout:'square'},
  {id:'coalition',country:'de',regionSlug:'bundestag',type:'coalition',partyIds:['1','2','4'],layout:'wide'},
  {id:'snapshot',country:'de',regionSlug:'bundestag',type:'snapshot',partyIds:[],layout:'wide'},
  {id:'approval',country:'de',regionSlug:'bundestag',type:'approval',partyIds:[],layout:'wide'},
];
async function preferences(page, theme='light') {
  await page.addInitScript(({items,theme})=>{
    localStorage.setItem('opinion-poll-text-size','large');
    localStorage.setItem('opinion-poll-theme',theme);
    localStorage.setItem('pollframe-watchlist-de-v2',JSON.stringify(items));
    const original=matchMedia.bind(window);
    window.matchMedia=q=>q==='(display-mode: standalone)'?{matches:true,addEventListener(){},removeEventListener(){}}:original(q);
  },{items,theme});
}
const fitsPage=async page=>expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize().width+1);
async function dialogFits(dialog,page) {
  const r=await dialog.boundingBox(), v=page.viewportSize();
  expect(r.x).toBeGreaterThanOrEqual(0);expect(r.x+r.width).toBeLessThanOrEqual(v.width+1);
  expect(r.y).toBeGreaterThanOrEqual(0);expect(r.y+r.height).toBeLessThanOrEqual(v.height+1);
  expect(r.height).toBeLessThanOrEqual(v.height*.76);
  expect(await dialog.evaluate(e=>e.scrollWidth-e.clientWidth)).toBeLessThanOrEqual(2);
}
for(const theme of ['light','dark']) test(`large interface and 200% text: watchlist contains every value (${theme})`,async({page},info)=>{
  await preferences(page,theme);
  await page.setViewportSize({width:390,height:844});
  await page.goto('/?view=watchlist&lang=de');
  await expect(page.locator('.watch-card')).toHaveCount(4);
  await expect(page.locator('.watch-approval-summary')).toBeVisible();
  for(const width of [320,390,768,1280]) {
    await page.setViewportSize({width,height:900});
    for(const size of [null,'32px']){
      await page.evaluate(size=>document.documentElement.style.fontSize=size||'',size);
      // Exercise OS/browser enlargement independently of Pollframe's toggle.
      await page.evaluate(size=>document.documentElement.dataset.text=size?'standard':'large',size);
      await fitsPage(page);
      const violations=await page.locator('.watch-card').evaluateAll(cards=>cards.flatMap(card=>{
        const bounds=card.getBoundingClientRect();
        return [...card.querySelectorAll('h3,strong,.watch-majority-status,td,th,.watch-approval-age')].flatMap(e=>{
          const r=e.getBoundingClientRect();
          return r.width&&r.height&&(r.right>bounds.right+1||r.bottom>bounds.bottom+1||r.left<bounds.left-1)?[{id:card.dataset.watchId,text:e.textContent}]:[];
        });
      }));
      expect(violations,`width=${width} font=${size}`).toEqual([]);
    }
  }
  await page.setViewportSize({width:390,height:844});
  await page.evaluate(()=>{document.documentElement.style.fontSize='';document.documentElement.dataset.text='large';});
  await page.screenshot({path:info.outputPath(`watchlist-large-${theme}.png`),fullPage:true});
  await page.getByRole('button',{name:'Bearbeiten',exact:true}).click();
  await expect(page.locator('.watchlist-v3')).toHaveClass(/is-editing/);
  await fitsPage(page);
  const clipped=await page.locator('.watch-card').evaluateAll(cards=>cards.filter(c=>c.scrollHeight>c.clientHeight+2).map(c=>c.dataset.watchId));
  expect(clipped).toEqual([]);
});

test('styles: large text, narrow screen, nested font picker, preview and save/reopen',async({page},info)=>{
  await preferences(page,'dark');
  await page.setViewportSize({width:390,height:844});
  await page.goto('/?view=studio&lang=de&topic=current');
  await expect(page.locator('html')).toHaveAttribute('data-text','large');
  await page.getByRole('button',{name:'Meine Designs',exact:true}).click();
  await page.getByRole('button',{name:'Stile',exact:true}).click();
  await page.getByRole('button',{name:'+ Neuen Stil erstellen',exact:true}).click();
  const dialog=page.getByRole('dialog',{name:'Neuen Stil erstellen',exact:true});
  await dialogFits(dialog,page);
  await expect(dialog.locator('svg')).toBeVisible();
  await dialog.getByRole('button',{name:/Schriftart ändern/}).click();
  const fonts=page.locator('.studio-font-library');
  await expect(fonts).toBeVisible();
  await fonts.getByRole('button',{name:'Schließen',exact:true}).click();
  await expect(dialog).toBeVisible();
  for(let i=0;i<4;i++)await dialog.getByRole('button',{name:'Weiter',exact:true}).click();
  await dialog.getByLabel('Stilname',{exact:true}).fill('Nachtredaktion – große Schrift');
  await dialog.getByRole('button',{name:'Stil speichern',exact:true}).click();
  await expect(page.locator('.studio-library-grid')).toContainText('Nachtredaktion');
  await page.reload();
  await page.getByRole('button',{name:'Meine Designs',exact:true}).click();
  await page.getByRole('button',{name:'Stile',exact:true}).click();
  await page.locator('.studio-saved-preview').filter({hasText:'Nachtredaktion'}).click();
  const edit=page.getByRole('dialog',{name:'Stil bearbeiten'});
  await expect(edit.getByLabel('Stilname')).toHaveValue('Nachtredaktion – große Schrift');
  await dialogFits(edit,page);
  await page.screenshot({path:info.outputPath('style-phone-dark.png')});
});

test('event pins, fixed lanes, categories, manual elections and label geometry',async({page},info)=>{
  await page.setViewportSize({width:1280,height:900});
  const custom=[{id:'custom-auto',date:'2024-01-15',label:'W'.repeat(75)},{id:'custom-fixed',date:'2024-01-15',label:'Feste Ebene'}];
  const params=new URLSearchParams({historyCustomEvents:JSON.stringify(custom),historyEventLanes:JSON.stringify({'custom-fixed':0}),font:'archivo',historyLabelSize:'22',theme:'dark'});
  await page.goto(history+'&'+params);
  const svg=page.locator('.studio-current-preview-image > svg');
  await expect(svg.locator('[data-event-id=custom-fixed]')).toHaveAttribute('data-event-lane','0');
  await expect(svg.locator('[data-event-id=custom-auto]')).toHaveAttribute('data-event-lane','1');
  const overlaps=await svg.locator('.event-label-bg').evaluateAll(nodes=>nodes.flatMap((a,i)=>{
    const r=a.getBoundingClientRect();return nodes.slice(i+1).filter(b=>{const s=b.getBoundingClientRect();return Math.min(r.right,s.right)-Math.max(r.left,s.left)>1&&Math.min(r.bottom,s.bottom)-Math.max(r.top,s.top)>1}).map(b=>[a.parentElement.dataset.eventId,b.parentElement.dataset.eventId]);
  }));expect(overlaps).toEqual([]);
  const textOverflow=await svg.locator('.event-marker').evaluateAll(nodes=>nodes.filter(n=>{const r=n.querySelector('rect')?.getBBox(),t=n.querySelector('text')?.getBBox();return r&&t&&(t.x<r.x||t.x+t.width>r.x+r.width||t.y<r.y||t.y+t.height>r.y+r.height)}).map(n=>n.dataset.eventId));
  expect(textOverflow).toEqual([]);
  const tools=page.locator('.studio-inspector-panel');
  await tools.getByRole('button',{name:'Ereignisse',exact:true}).click();
  const electionCount=await svg.locator('[data-election-id]').count();expect(electionCount).toBeGreaterThan(0);
  await tools.getByRole('button',{name:'Keine Beschriftungsebene',exact:true}).click();
  await expect(svg.locator('.event-label-bg')).toHaveCount(0);
  await expect(svg.locator('[data-election-id]')).toHaveCount(electionCount);
  await tools.getByRole('button',{name:'2 Beschriftungsebenen',exact:true}).click();
  await expect(svg.locator('[data-event-id=custom-fixed] .event-label-bg')).toBeVisible();
  await tools.getByRole('button',{name:/Ereignisse auswählen/}).click();
  const catalogue=page.getByRole('dialog',{name:'Ereignisse auswählen'});
  await catalogue.getByRole('combobox').first().click();
  await catalogue.getByRole('option',{name:'Nur meine Auswahl',exact:true}).click();
  await expect(svg.locator('[data-election-id]')).toHaveCount(electionCount);
  await catalogue.getByRole('searchbox').fill('Feste Ebene');
  await catalogue.getByRole('combobox',{name:'Auswahl für Feste Ebene',exact:true}).click();
  await catalogue.getByRole('option',{name:'Ausblenden',exact:true}).click();
  await expect(svg.locator('[data-event-id=custom-fixed]')).toHaveCount(0);
  await catalogue.getByRole('button',{name:'Schließen',exact:true}).click();
  await page.screenshot({path:info.outputPath('event-editing-dark.png')});
  await page.reload();
  await expect(svg.locator('[data-event-id=custom-fixed]')).toHaveCount(0);
  await expect(svg.locator('[data-event-id=custom-auto]')).toBeVisible();
});

test('sources: concise panel expands methods, receipt contains known metadata',async({page},info)=>{
  const data=JSON.parse(await readFile(new URL('../public/data/bundestag.json',import.meta.url),'utf8'));
  // Source order resolves equally dated releases, just as latestPollAtOrBefore.
  const latest=data.polls.at(-1);
  await page.goto('/?view=studio&lang=de&template=poll-classic&editor=1');
  await expect(page.locator('.studio-current-preview-image svg')).toBeVisible();
  await page.getByRole('button',{name:'Info',exact:true}).click();
  const dialog=page.getByRole('dialog',{name:'Info',exact:true});
  await dialogFits(dialog,page);
  await expect(dialog.locator('.studio-publication-caption')).toContainText(data.pollsters[latest.pollster]);
  await dialog.getByText('Quellen, Methode und Vergleichsgrenzen',{exact:true}).click();
  await expect(dialog).toContainText('Befragungszeitraum: '+latest.fieldwork.join(' – '));
  await expect(dialog).toContainText('Stichprobe: n = '+latest.sample.toLocaleString('de-DE'));
  await expect(dialog).toContainText('Erhebungsmethode: '+latest.method);
  const pending=page.waitForEvent('download');await dialog.getByRole('button',{name:'Beleg herunterladen',exact:true}).click();
  const download=await pending;await download.saveAs(info.outputPath('source-note.txt'));
});

test('style creation reports blocked storage instead of pretending it saved',async({page})=>{
  await page.goto('/?view=studio&lang=de&topic=current');
  await page.getByRole('button',{name:'Meine Designs',exact:true}).click();
  await page.getByRole('button',{name:'Stile',exact:true}).click();
  await page.getByRole('button',{name:'+ Neuen Stil erstellen',exact:true}).click();
  const dialog=page.getByRole('dialog',{name:'Neuen Stil erstellen'});
  for(let i=0;i<4;i++)await dialog.getByRole('button',{name:'Weiter',exact:true}).click();
  await dialog.getByLabel('Stilname',{exact:true}).fill('Speichern muss ehrlich sein');
  await page.evaluate(()=>{indexedDB.open=()=>{throw new DOMException('Storage denied','SecurityError')};});
  await dialog.getByRole('button',{name:'Stil speichern',exact:true}).click();
  await expect(dialog.getByRole('alert')).toContainText('Speichern fehlgeschlagen');
  await expect(dialog.getByLabel('Stilname')).toHaveValue('Speichern muss ehrlich sein');
  await expect(dialog.getByRole('button',{name:'Stil speichern',exact:true})).toBeEnabled();
});
