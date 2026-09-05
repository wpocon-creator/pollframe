import { test, expect } from "@playwright/test";

// Local visual explorations. Kept outside the CI list; useful when reviewing
// the next iteration rather than shipping a hidden design selector.
test("compare compact approval designs", async ({page}, testInfo) => {
  await page.goto('/?view=approval&country=de&lang=de');
  const card = page.locator('.approval-current-card').first();
  await expect(card).toBeVisible();
  const common = `.approval-current-card{padding:3rem .85rem .65rem}.approval-current-card h2{font-size:1.1rem}.approval-current-values{margin:.65rem 0;gap:.55rem}.approval-current-values>div{background:transparent;padding:.3rem 0}.approval-current-values strong{font-size:1.5rem}.approval-current-card>footer{margin-top:.45rem;padding-top:.45rem}`;
  const variants = {
    'A-columns': `.approval-current-values{grid-template-columns:repeat(3,minmax(0,1fr))}.approval-current-values>.approval-net-value{grid-column:auto;display:block}.approval-current-values span{font-size:.7rem;min-height:2.6em}.approval-current-values strong{margin:.15rem 0}.approval-current-values>div+div{border-left:1px solid var(--line)!important;padding-left:.6rem}.approval-net-value strong{font-size:1.25rem}`,
    'B-rows': `.approval-current-values{grid-template-columns:1fr}.approval-current-values>div{display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--line)!important}.approval-current-values>.approval-net-value{grid-column:auto}.approval-current-values strong{margin:0}.approval-net-value strong{font-size:1.1rem}`,
    'C-headline': `.approval-current-values{grid-template-columns:1.15fr 1fr}.approval-current-values>div:first-child{grid-row:1/3;border-right:1px solid var(--line)!important}.approval-current-values>div:first-child strong{font-size:2.9rem;margin:.45rem 0}.approval-current-values>.approval-net-value{grid-column:2;display:block}.approval-net-value strong{font-size:1.1rem}`,
  };
  for(const [name, css] of Object.entries(variants)) {
    const style = await page.addStyleTag({content:common+css});
    await card.screenshot({path:`test-results/design-review/${testInfo.project.name}/${name}.png`});
    console.log(name, await card.evaluate(node=>Math.round(node.getBoundingClientRect().height)));
    await style.evaluate(node=>node.remove());
  }
});
