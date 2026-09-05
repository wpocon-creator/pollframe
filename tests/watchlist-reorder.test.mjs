import assert from "node:assert/strict";
import test from "node:test";

import { documentScrollMetrics, verticalEdgeScrollSpeed } from "../src/watchlistReorder.js";

test("watchlist scrolling trusts the visual window position in an installed iOS app", () => {
  assert.deepEqual(documentScrollMetrics({
    windowY: 640,
    pageYOffset: 640,
    rootTop: 0,
    documentTop: 0,
    bodyTop: 0,
    rootHeight: 2400,
    documentHeight: 2400,
    bodyHeight: 2400,
    viewportHeight: 800,
  }), { position: 640, maximum: 1600 });
});

test("watchlist auto-scroll is inactive between the two edge zones", () => {
  assert.equal(verticalEdgeScrollSpeed(150, 800), 0);
  assert.equal(verticalEdgeScrollSpeed(500, 800), 0);
  assert.equal(verticalEdgeScrollSpeed(664, 800), 0);
  assert.equal(verticalEdgeScrollSpeed(Number.NaN, 800), 0);
});

test("watchlist auto-scroll accelerates smoothly toward both screen edges", () => {
  const viewport = 800;
  const shallowBottom = verticalEdgeScrollSpeed(690, viewport);
  const middleBottom = verticalEdgeScrollSpeed(730, viewport);
  const deepBottom = verticalEdgeScrollSpeed(790, viewport);
  const bottom = verticalEdgeScrollSpeed(800, viewport);
  assert.ok(shallowBottom > 0 && shallowBottom < middleBottom);
  assert.ok(middleBottom < deepBottom && deepBottom < bottom);
  assert.ok(bottom <= 1100);
  assert.equal(verticalEdgeScrollSpeed(900, viewport), bottom);

  const shallowTop = verticalEdgeScrollSpeed(110, viewport);
  const middleTop = verticalEdgeScrollSpeed(70, viewport);
  const deepTop = verticalEdgeScrollSpeed(10, viewport);
  const top = verticalEdgeScrollSpeed(0, viewport);
  assert.ok(shallowTop < 0 && Math.abs(shallowTop) < Math.abs(middleTop));
  assert.ok(Math.abs(middleTop) < Math.abs(deepTop) && Math.abs(deepTop) < Math.abs(top));
  assert.ok(top >= -1100);
  assert.equal(verticalEdgeScrollSpeed(-100, viewport), top);
});

test("watchlist auto-scroll follows the pointer inside an offset visual viewport", () => {
  const viewportTop = 140;
  const viewportHeight = 600;
  assert.ok(verticalEdgeScrollSpeed(145, viewportHeight, viewportTop) < 0);
  assert.equal(verticalEdgeScrollSpeed(440, viewportHeight, viewportTop), 0);
  assert.ok(verticalEdgeScrollSpeed(735, viewportHeight, viewportTop) > 0);
});
