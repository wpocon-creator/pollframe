import test from "node:test";
import assert from "node:assert/strict";
import { elementStyles } from "../src/studio-elements.js";
import { studioCapabilities } from "../src/studio-capabilities.js";
import { normalizeEdit } from "../src/studio-edit-model.js";
test("presentation overrides cannot replace protected text/data or inject SVG", () => {
  assert.deepEqual(elementStyles("invalid"), {});
  assert.deepEqual(
    elementStyles(
      JSON.stringify({
        "value-1": {
          scale: 90,
          x: Infinity,
          y: -200,
          text: "99%",
          href: "javascript:alert(1)",
        },
        "<script>": { scale: 1 },
      }),
    ),
    { "value-1": { scale: 1.6, x: 0, y: -24 } },
  );
  assert.equal(normalizeEdit({ density: 2 }).density, 1);
  assert.deepEqual(elementStyles('{"__proto__":{"scale":1}}'), {});
});
test("only supported chart controls are available", () => {
  assert.equal(
    studioCapabilities({ topic: "current", design: "material" }).bars,
    false,
  );
  assert.equal(
    studioCapabilities({ topic: "current", design: "news" }).bars,
    true,
  );
  assert.equal(
    studioCapabilities({ topic: "approval-current", design: "pie" }).axis,
    false,
  );
  assert.equal(
    studioCapabilities({ topic: "approval", design: "aligned" }).events,
    false,
  );
  assert.equal(
    studioCapabilities({ topic: "history", design: "original" }).events,
    true,
  );
});
