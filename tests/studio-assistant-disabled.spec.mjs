import {test,expect} from '@playwright/test';
import {readdir,readFile} from 'node:fs/promises';
test('normal Studio has no assistant, no model bundle, and retains the manual editor',async({page})=>{
 const requested=[];page.on('request',r=>requested.push(r.url()));
 await page.goto('/?view=studio&lang=de');
 await expect(page.locator('.studio-shell')).toBeVisible();
 expect(requested.some(url=>/studio-canvas-selection-/.test(url))).toBe(false);
 await expect(page.getByRole('button',{name:'KI-Assistent',exact:true})).toHaveCount(0);
 await page.goto('/?view=studio&topic=current&template=poll-wide&lang=de&editor=1&workspace=edit&localAI=1');
 await expect(page.locator('.studio-current-preview-image svg')).toBeVisible();
 await expect(page.getByRole('button',{name:'KI-Assistent',exact:true})).toHaveCount(0);
 await expect(page.locator('.studio-assistant')).toHaveCount(0);
 await expect(page.locator('.has-assistant')).toHaveCount(0);
 await expect(page.getByRole('button',{name:'Design speichern',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Schriftart ändern'}).first().click();
 await expect(page.locator('.studio-font-library')).toBeVisible();
 expect(requested.filter(url=>/studio-assistant|studio-intent|\/api\/studio-assistant/.test(url))).toEqual([]);
 const files=await readdir('dist/assets');expect(files.filter(f=>/^studio-(assistant|intent)/.test(f))).toEqual([]);
 for(const f of files.filter(f=>f.endsWith('.js'))){const text=await readFile(`dist/assets/${f}`,'utf8');expect(text).not.toContain('/api/studio-assistant');expect(text).not.toContain('Pollframe Intent');}
});
