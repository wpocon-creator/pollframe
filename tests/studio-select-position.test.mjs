import test from "node:test";
import assert from "node:assert/strict";
import { studioSelectPosition } from "../src/studio-select-position.js";

test("transformed centered dialogs do not apply their screen offset twice", () => {
  const host = { left: 260, top: 113, right: 1180, bottom: 788, originLeft: 261, originTop: 114 };
  const anchor = { left: 283, top: 652, bottom: 696, width: 180 };
  const pos = studioSelectPosition(anchor, { top: 0, width: 1440, height: 900 }, 4, host);
  assert.equal(pos.left + host.originLeft, anchor.left);
  assert.equal(pos.top + host.originTop + pos.maxHeight, anchor.top - 6);
  assert.ok(pos.top + host.originTop >= host.top + 12);
});
test("short menus stay below when possible and stay within phone/dialog edges", () => {
  for (const width of [320, 390, 768, 1440]) {
    const host = { left: 12, top: 100, right: width - 12, bottom: 700, originLeft: 0, originTop: 0 };
    const anchor = { left: width - 100, top: 160, bottom: 204, width: 90 };
    const pos = studioSelectPosition(anchor, { top: 0, width, height: 800 }, 2, host);
    assert.equal(pos.top, 210);
    assert.ok(pos.left >= host.left + 12);
    assert.ok(pos.left + pos.width <= host.right - 12);
    assert.ok(pos.top + pos.maxHeight <= host.bottom - 12);
  }
});
test("ordinary viewport portals keep viewport coordinates and bounded long lists", () => {
  const pos = studioSelectPosition({ left: 60, top: 100, bottom: 144, width: 200 }, { top: 0, width: 390, height: 844 }, 60);
  assert.deepEqual(pos, { left: 60, top: 150, width: 200, maxHeight: 288 });
});
