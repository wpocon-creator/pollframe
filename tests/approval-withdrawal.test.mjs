import test from "node:test";
import assert from "node:assert/strict";
import { readFile, mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { runInNewContext } from "node:vm";
import { publicApprovalData, PUBLISH_FGW_APPROVAL } from "../src/approval-publication.js";
import worker from "../worker/index.js";

const released = JSON.parse(await readFile(new URL("../public/data/approval.json", import.meta.url)));
const dirty = {...released, countries: {...released.countries, de: {series: {leader: [{positive: 24}]}}, uk: {series: {}}}, events: [...released.events, {country: "de", source: "https://www.forschungsgruppe.de"}]};

test("publication policy strips withheld countries and does not mutate the private source", () => {
  assert.equal(PUBLISH_FGW_APPROVAL, false);
  const output = publicApprovalData(dirty);
  assert.deepEqual(Object.keys(output.countries), ["es"]);
  assert.deepEqual(output.countries.es, released.countries.es);
  assert.ok(dirty.countries.de);
  assert.ok(!JSON.stringify(output).includes("forschungsgruppe"));
  assert.deepEqual(publicApprovalData(null).countries, {});
});

test("live data route cannot restore FGW from an old asset, cache-buster or upstream fallback", async () => {
  for (const origin of ["https://pollframe.com", "https://www.pollframe.com", "https://de.pollframe.workers.dev"]) {
    for (const method of ["GET", "HEAD"]) {
      for (const body of [JSON.stringify(dirty), "not json"]) {
        const response = await worker.fetch(new Request(`${origin}/data/approval.json?old=1`, {method}), {ASSETS: {fetch: async () => new Response(body)}});
        assert.equal(response.status, 200);
        assert.equal(response.headers.get("cache-control"), "no-store");
        if (method === "HEAD") assert.equal(await response.text(), "");
        else assert.equal((await response.json()).countries.de, undefined);
      }
    }
  }
});

test("old public links and every approval embed fail closed without touching data", async () => {
  for (const path of ["/de/regierung/zufriedenheit", "/de/regierung/zufriedenheit/?lang=en-GB", "/de/regierung/%7Aufriedenheit", "/?view=approval&country=de", "/embed.html?view=approval&widget=approval-current&metric=government", "/embed.html?view=approval&country=uk&lang=es"]) {
    const response = await worker.fetch(new Request(`https://pollframe.com${path}`), {ASSETS: {fetch: () => {throw Error("Must not load data");}}});
    assert.equal(response.status, 410, path);
    assert.match(response.headers.get("x-robots-tag"), /noindex/);
    assert.match(await response.text(), /permission|Nutzungsrechte|permisos/);
  }
});

test("updater runs with network disabled and cannot reintroduce FGW or Ipsos", async () => {
  const root = await mkdtemp(join(tmpdir(), "pollframe-withdrawal-test-"));
  await mkdir(join(root, "public/data"), {recursive:true});
  await writeFile(join(root, "public/data/approval.json"), JSON.stringify(dirty));
  const script = new URL("../scripts/update-approval-data.mjs", import.meta.url).href;
  execFileSync(process.execPath, ["--input-type=module", "-e", `globalThis.fetch = () => {throw Error('Unexpected network fetch');}; await import(${JSON.stringify(script)});`], {cwd:root, env:{...process.env, POLLFRAME_INCLUDE_IPSOS:"1", POLLFRAME_REFRESH_CIS_APPROVAL:"0"}});
  const output = JSON.parse(await readFile(join(root, "public/data/approval.json")));
  assert.deepEqual(Object.keys(output.countries), ["es"]);
  assert.deepEqual(output.countries.es.series, released.countries.es.series);
});

test("published UI, sitemap and app cache cannot advertise or restore the withdrawn feature", async () => {
  const read = file => readFile(new URL(`../${file}`, import.meta.url), "utf8");
  assert.ok(!(await read("public/sitemap.xml")).includes("regierung/zufriedenheit"));
  assert.ok(!(await read("index.html")).includes("regierung/zufriedenheit"));
  const app = await read("src/main.jsx");
  assert.ok(!app.includes('<ApprovalOverviewEntry country="de"'));
  assert.ok(!app.includes('id: "approval", icon:'));
  assert.ok(!app.includes("has permitted Pollframe"));
  const sw = await read("public/sw.js");
  assert.match(sw, /pollframe-app-rights-20260921/);
  assert.match(sw, /pollframe-data-release-/);
  assert.match(sw, /withheld-pending-permission/);
});

test("service worker deletes old app/data caches and withholds approval even while offline", async () => {
  const handlers = {};
  const deleted = [];
  const origin = "https://pollframe.com";
  runInNewContext(await readFile(new URL("../public/sw.js", import.meta.url), "utf8"), {
    URL, Response, Request,
    self: {location:{origin}, addEventListener:(name, fn) => {handlers[name] = fn;}, registration:{}, clients:{claim:async()=>{}}},
    caches: {keys:async()=>["pollframe-data-release-20260912-data","pollframe-app-v44-data","pollframe-app-rights-20260921-data","unrelated"], delete:async key=>{deleted.push(key);}},
  });
  let activation;
  handlers.activate({waitUntil:pending=>{activation=pending;}});
  await activation;
  assert.deepEqual(deleted.sort(), ["pollframe-app-v44-data", "pollframe-data-release-20260912-data"]);
  for (const path of ["/data/approval.json", "/data/approval.json?v=old", "/de/regierung/zufriedenheit", "/?view=approval&country=de"]) {
    let result;
    handlers.fetch({request:new Request(origin+path),respondWith:pending=>{result=pending;}});
    const response = await result;
    if(path.startsWith("/data/")) assert.deepEqual((await response.json()).countries, {});
    else assert.equal(response.status, 410);
  }
});
