import {test,expect} from '@playwright/test';

for(const theme of ['light','dark'])test(`original map dates remain printable and separated in ${theme}`,async({page},info)=>{
  await page.goto(`/?view=studio&lang=de&template=map-original&editor=1&theme=${theme}`);
  const svg=page.locator('.studio-current-preview-image > svg');
  await expect(svg).toBeVisible();
  await expect(svg.locator('[data-map-date]')).toHaveCount(16);
  const collisions=await svg.locator('[data-map-date]').evaluateAll(groups=>groups.flatMap(group=>{
    const [name,date]=[...group.querySelectorAll('text')].map(node=>node.getBBox());
    return name.x+name.width+8>date.x? [group.dataset.mapDate]:[];
  }));
  expect(collisions).toEqual([]);
  await svg.screenshot({path:info.outputPath(`map-${theme}.png`)});
  await page.getByRole('button',{name:'Info',exact:true}).click();
  const dialog=page.getByRole('dialog',{name:'Info',exact:true});
  const pending=page.waitForEvent('download');
  await dialog.getByRole('button',{name:'Publikationspaket herunterladen'}).click();
  await (await pending).saveAs(info.outputPath(`map-${theme}-publication.zip`));
});
