import test from "node:test";
import assert from "node:assert/strict";
import { customEvents } from "../src/studio-custom-events.js";
import { studioEvents } from "../src/studio-events.js";
import { eventLabelMetrics } from "../src/event-marker-layout.js";
import { eventLayout } from "../src/studio-event-layout.js";
import { normalizeStudioState } from "../src/studio-model.js";
test("custom context and category survive saving without accepting markup or poll values",()=>{
  const event=customEvents([{id:"custom-context",date:"2024-12-31",label:"Context",description:"<script>example</script>",category:"global",results:{party:100}}])[0];
  assert.equal(event.category,"global");assert.ok(!event.description.includes("<"));assert.equal(event.results,undefined);
});
test("own annotations reject invalid dates, unsafe links and duplicate IDs; source data stay locked", () => {
  const good = {
    id: "custom-own",
    date: "2024-02-29",
    label: "My annotation",
    source: "https://example.com/source",
    value: 99,
  };
  const rows = customEvents([
    good,
    good,
    { ...good, id: "custom-two", date: "2025-02-29" },
    { ...good, id: "custom-three", source: "javascript:alert(1)" },
  ]);
  assert.equal(rows.length, 2);
  assert.equal(rows[1].source, "");
  assert.equal(rows[0].value, undefined);
  assert.equal(rows[0].custom, true);
  assert.equal(customEvents("invalid").length, 0);
  assert.equal(
    customEvents([{ ...good, source: "https://user:password@example.com" }])[0]
      .source,
    "",
  );
  const state = normalizeStudioState({
    historyCustomEvents: JSON.stringify([good]),
  });
  assert.deepEqual(customEvents(state.historyCustomEvents), [rows[0]]);
  const official = { id: "election", category: "national" };
  assert.deepEqual(studioEvents({ events: [official] }, state)[0], official);
});
test("long titles wrap, density limits apply and variable widths never collide in a lane", () => {
  const rows = Array.from({ length: 70 }, (_, i) => ({
    id: "e" + i,
    date: i * 13,
    ...eventLabelMetrics(i % 2 ? "Longword".repeat(12) : "Short title"),
  }));
  for (const row of rows)
    assert.ok(row.labelLines.every((line) => line.length <= 27));
  for (let layers = 0; layers <= 4; layers++)
    for (let limit = 0; limit <= 16; limit++) {
      const { visible, hidden } = eventLayout(rows, {
        x: (d) => d,
        left: 70,
        right: 850,
        layers,
        limit,
      });
      assert.equal(visible.length + hidden.length, rows.length);
      for(let lane=0;lane<layers;lane++) assert.ok(visible.filter(e=>e.lane===lane).length <= limit);
      for (const a of visible) {
        assert.ok(a.center - a.labelWidth / 2 >= 70);
        assert.ok(a.center + a.labelWidth / 2 <= 850);
        for (const b of visible)
          if (a !== b && a.lane === b.lane)
            assert.ok(
              Math.abs(a.center - b.center) >=
                (a.labelWidth + b.labelWidth) / 2 + 4 - 0.001,
            );
      }
    }
});
