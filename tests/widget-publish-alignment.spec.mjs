import { test, expect } from '@playwright/test';

test.use({ serviceWorkers: 'block' });

const pages = [
  ['German polls', '/?region=bundestag&lang=de'],
  ['UK polls', '/?region=uk-westminster&lang=en-GB'],
  ['Spanish polls', '/?region=spain-congress&lang=es'],
  ['German approval', '/?view=approval&country=de&lang=de'],
  ['UK approval', '/?view=approval&country=uk&lang=en-GB'],
  ['Spanish concerns', '/?view=spain-issues&country=es&lang=es'],
];

for (const [name, url] of pages) {
  test(`${name}: every square publishing icon is centred`, async ({page}, info) => {
    await page.addInitScript(() => localStorage.setItem('opinion-poll-text-size', 'large'));
    await page.goto(url);
    await expect(page.locator('.widget-share-trigger').first()).toBeVisible();
    for (const width of [1440, 390]) {
      await page.setViewportSize({width, height:1000});
      await page.emulateMedia({colorScheme:width===390?'dark':'light'});
      await expect.poll(() => page.locator('.widget-share-trigger').evaluateAll(buttons => buttons.filter(b=>b.getBoundingClientRect().width).flatMap(button => {
        const svg=button.querySelector('svg'), b=button.getBoundingClientRect(), s=svg.getBoundingClientRect();
        const dx=Math.abs(s.x+s.width/2-b.x-b.width/2),dy=Math.abs(s.y+s.height/2-b.y-b.height/2);
        return dx>.6||dy>.6 ? [{name:button.getAttribute('aria-label'),dx,dy}] : [];
      }))).toEqual([]);
      const buttons=page.locator('.widget-share-trigger:visible');
      for (const button of await buttons.all()) {
        await expect(button).toHaveAccessibleName(/\S/);
        const rect=await button.boundingBox();
        expect(Math.abs(rect.width-rect.height)).toBeLessThan(1);
      }
      if(name==='German polls') await page.locator('.historical-main-publish-tools').screenshot({path:info.outputPath(`publish-${width}.png`)});
    }
  });
}

test('centred publish controls still open both dialogs with named controls', async ({page}) => {
  await page.goto('/?region=bundestag&lang=en-GB');
  const tools=page.locator('.historical-main-publish-tools');
  await tools.getByRole('button',{name:'Share & embed',exact:true}).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('dialog').getByRole('button',{name:'Close',exact:true}).click();
  await tools.getByRole('button',{name:'Export PNG',exact:true}).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('dialog')).toContainText('PNG');
});
