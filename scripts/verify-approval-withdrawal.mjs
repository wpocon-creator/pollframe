import { chromium, firefox } from "playwright";
import assert from "node:assert/strict";
const origin = process.argv[2] ?? "http://127.0.0.1:4188";
for (const [name, engine, viewport] of [["desktop", chromium, {width:1440,height:1000}], ["mobile", chromium, {width:390,height:844}], ["firefox", firefox, {width:1280,height:900}]]) {
  const browser = await engine.launch({headless:true});
  try {
    const page = await browser.newPage({viewport, serviceWorkers:"block"});
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.route(/cloudflareinsights|\/api\/analytics/, route => route.abort());
    await page.goto(`${origin}/?lang=de`);
    await page.getByRole("heading", {name:"Deutschland im Überblick", exact:true}).waitFor();
    assert.equal(await page.locator('a[href*="regierung/zufriedenheit"],a[href*="view=approval"]').count(), 0);
    assert.ok(!(await page.locator("body").innerText()).includes("Studio"));
    await page.screenshot({path:`/tmp/pollframe-withdrawal-${name}.png`,fullPage:true});
    await page.goto(`${origin}/sources?lang=de`);
    await page.getByText(/frühere Angabe einer FGW-Freigabe war nicht belegt/).waitFor();
    for (const path of ["/de/regierung/zufriedenheit", "/embed.html?view=approval&widget=approval-current", "/?view=approval&country=de"]) {
      const response = await page.goto(origin + path);
      assert.equal(response.status(), 410);
    }
    const response = await page.request.get(`${origin}/data/approval.json?withdrawal-check=1`);
    assert.deepEqual(Object.keys((await response.json()).countries), ["es"]);
    assert.deepEqual(errors, []);
    console.log(`${name}: withdrawn data, corrected sources, blocked embeds, clean overview; no runtime errors`);
  } finally { await browser.close(); }
}
