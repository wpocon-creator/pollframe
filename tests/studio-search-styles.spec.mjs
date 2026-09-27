import {test,expect} from '@playwright/test';
test.use({serviceWorkers:'block',video:'off'});
test('descriptive searches update the gallery without changing its topic',async({page})=>{
  await page.goto('/?view=studio&lang=en-GB&profile=current-poll');
  const search=page.getByRole('searchbox');
  for(const [query,id]of [['modern','poll-material'],['simple modern','poll-wide'],['traditional','poll-classic'],['detailed','poll-paper']]){
    await search.fill(query);
    await expect(page.locator('.studio-template-card').first()).toHaveAttribute('id',`studio-${id}`);
    await expect(page.locator('.studio-gallery-meta')).not.toContainText('No direct match');
    expect(await page.locator('.studio-template-card').evaluateAll(nodes=>nodes.every(node=>node.id.startsWith('studio-poll-')))).toBe(true);
  }
  await search.press('Enter');await expect(search).not.toBeFocused();
  await page.goto('/?view=studio&lang=de&topic=all');
  await page.getByRole('searchbox').fill('detailed change');
  await expect(page.locator('.studio-template-card').first()).toHaveAttribute('id','studio-tendencies-table');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});
