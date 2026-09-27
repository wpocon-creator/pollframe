import test from "node:test";
import assert from "node:assert/strict";
import { eventLayout, parseEventLanes } from "../src/studio-event-layout.js";
import { normalizeStudioState } from "../src/studio-model.js";
import { studioPopularity } from "../worker/studio-popularity.js";
test("densities are independent per layer and do not alter requested lanes",()=>{
  const events=Array.from({length:12},(_,i)=>({id:`e-${i}`,date:80+i*70,labelWidth:90}));
  const result=eventLayout(events,{x:d=>d,left:0,right:960,layers:3,limits:{0:0,1:1,2:4},limit:9});
  assert.equal(result.visible.filter(e=>e.lane===0).length,0);
  assert.equal(result.visible.filter(e=>e.lane===1).length,1);
  assert.equal(result.visible.filter(e=>e.lane===2).length,4);
});
test("labels shift to edges to fill space, without changing their date anchors",()=>{
  const result=eventLayout([{id:"a",date:140},{id:"b",date:285}],{x:d=>d,left:0,right:800,layers:1,width:176});
  assert.equal(result.visible.length,2);
  for(const e of result.visible){assert.equal(e.markerX,e.date);assert.ok(Math.abs(e.labelCenter-e.markerX)<=e.labelWidth/2);}
  assert.notEqual(result.visible[1].center,285);
});
test("explicit positions stay pinned across seeds and report impossible collisions",()=>{
  const events=[{id:"a",date:220,forced:true},{id:"b",date:220,forced:true}];
  const result=eventLayout(events,{x:d=>d,left:0,right:800,layers:2,lanes:{a:1,b:1},positions:{a:.275,b:.275}});
  assert.equal(result.visible.length,1);assert.ok(Math.abs(result.visible[0].labelCenter-220)<1e-9);assert.equal(result.hidden[0].reason,"space");
});
test("pinned events do not consume the automatic label budget",()=>{
  const {visible}=eventLayout([{id:'pin',date:100,forced:true},{id:'a',date:350},{id:'b',date:600}],{x:d=>d,left:0,right:800,layers:2,limit:2});
  assert.equal(visible.length,3);
});
test("a fixed-lane pin reserves its slot before a flexible pin at the same date",()=>{
  const result=eventLayout([{id:"flex",date:200,forced:true},{id:"fixed",date:200,forced:true}],{x:d=>d,left:0,right:800,layers:2,lanes:{fixed:0}});
  assert.equal(result.hidden.length,0);
  assert.equal(result.visible.find(e=>e.id==="fixed").lane,0);
  assert.equal(result.visible.find(e=>e.id==="flex").lane,1);
});
test("event packing respects all bounds, explicit lanes and collision reporting", () => {
  const events = Array.from({ length: 40 }, (_, i) => ({
    id: "event-" + i,
    date: Math.floor(i / 3) * 35,
  }));
  for (const layers of [0, 1, 2, 3, 4]) {
    const { visible, hidden } = eventLayout(events, {
      x: (d) => d,
      left: 72,
      right: 824,
      layers,
      limit: 16,
      lanes: { "event-1": 3 },
    });
    assert.equal(visible.length + hidden.length, events.length);
    for (const e of visible) {
      assert.ok(e.lane < layers);
      assert.ok(e.center - 88 >= 72);
      assert.ok(e.center + 88 <= 824);
      for (const other of visible) {
        if (e !== other && e.lane === other.lane)
          assert.ok(Math.abs(e.center - other.center) >= (e.labelWidth + other.labelWidth) / 2 + 4);
      }
    }
  }
  assert.deepEqual(parseEventLanes('{"safe":3,"bad":4,"no":-1}'), { safe: 3 });
});
test("editor settings survive normalization without editable poll/source data", () => {
  const s = normalizeStudioState({
    titleSize: 100,
    cornerRadius: 0,
    edges: "rounded",
    historyLayers: 9,
    historyEventLanes: '{"one":2}',
    titleAlign: "right",
    subtitleAlign: "right",
    topPadding: 999,
    source: "fake",
    results: { afd: 100 },
    font: "lora",
  });
  assert.equal(s.titleSize, 64);
  assert.equal(s.cornerRadius, 0);
  assert.equal(s.historyLayers, 4);
  assert.equal(s.topPadding, 60);
  assert.equal(s.font, "lora");
  assert.equal(s.source, undefined);
  assert.equal(s.results, undefined);
});
test("public Studio counts retain only allowed IDs and remove expired days", async () => {
  const map = new Map([["studio:2000-01-01", { "poll-wide": 9999 }]]);
  const storage = {
    get: async (k) => map.get(k),
    put: async (k, v) => map.set(k, v),
    list: async ({ prefix }) =>
      new Map([...map].filter(([k]) => k.startsWith(prefix))),
    delete: async (keys) => keys.forEach((k) => map.delete(k)),
    transaction: async (fn) => fn(storage),
  };
  const post = (data) =>
    new Request("https://analytics-store/studio", {
      method: "POST",
      body: JSON.stringify(data),
    });
  assert.equal(
    (await studioPopularity(post({ template: "private search text" }), storage))
      .status,
    400,
  );
  assert.equal(
    (
      await studioPopularity(
        post({ template: "poll-wide", ip: "private", query: "private" }),
        storage,
      )
    ).status,
    204,
  );
  const result = await (
    await studioPopularity(
      new Request("https://analytics-store/studio"),
      storage,
    )
  ).json();
  assert.deepEqual(result, { counts: { "poll-wide": 1 } });
  assert.equal(map.has("studio:2000-01-01"), false);
  assert.ok(!JSON.stringify([...map]).includes("private"));
});
