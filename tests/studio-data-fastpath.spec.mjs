import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
test.use({serviceWorkers:'block'});
const examples=[
 ['snapshot',{widget:'current-average',studioSource:'1'}],
 ['history',{range:'year',mode:'both',studioHistorySource:'1'}],
 ['seats',{widget:'modelled-seats',studioExtraSource:'1'}],
 ['tendencies',{widget:'tendencies',studioExtraSource:'1'}],
 ['map',{view:'map',studioExtraSource:'1'}],
];
for(const [kind,extra] of examples)test(`data-only ${kind} preserves provenance without rendering a duplicate chart`,async({page})=>{
 const params=new URLSearchParams({region:'berlin',embed:'1',lang:'en-GB',...extra});
 // This assertion is about the latest poll across all available institutes,
 // not the intentionally narrower default institute selection.
 const data=kind==='snapshot'?JSON.parse(await readFile(new URL('../public/data/berlin.json',import.meta.url),'utf8')):null;
 if(data)params.set('pollsters',Object.keys(data.pollsters).join(','));
 if(kind==='map')params.delete('region');
 await page.goto('/embed.html?'+params);
 const node=page.locator(`[data-studio-${kind}]`);
 await expect(node).toBeAttached();
 const snapshot=JSON.parse(await node.getAttribute(`data-studio-${kind}`));
 expect(snapshot.rows.length).toBeGreaterThan(0);
 expect(snapshot.source).toMatch(/dawum/i);
 expect(snapshot.license).toContain('ODbL');
 expect(snapshot.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
 await expect(node).toHaveAttribute('hidden','');
 await expect(page.locator('.poll-chart,.result-list,.tendency-grid,.parliament-grid,.poll-map-module')).toHaveCount(0);
 if(kind==='snapshot'){
   const poll=data.polls.at(-1);
   expect(snapshot.selectedPollsters.sort()).toEqual(Object.keys(data.pollsters).sort());
   expect(snapshot.date).toBe(poll.date);
   for(const row of snapshot.rows)expect(row.value).toBe(poll.results[row.id]);
 }
 if(kind==='history'){
   expect(snapshot.calculationInputs.polls.length).toBeGreaterThan(0);
   expect(snapshot.eventCatalogue.length).toBeGreaterThan(0);
   expect(snapshot.trend.length).toBeGreaterThan(0);
 }
});
test('ordinary current-poll embeds still render the chart',async({page})=>{
 await page.goto('/embed.html?region=berlin&embed=1&widget=current-average&lang=en-GB');
 await expect(page.locator('.result-list')).toBeVisible();
 await expect(page.locator('[data-studio-snapshot]')).toHaveCount(0);
});
