import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeStudioState,
  studioEmbedParams,
  studioEmbedCode,
  safeStudioBack,
  studioHref,
  STUDIO_TEMPLATES,
  STUDIO_PARTIES,
  CURRENT_DESIGNS,
} from "../src/studio-model.js";

test("graphic corners are validated and round-trip through Studio URLs", () => {
  assert.equal(normalizeStudioState({}).edges, "sharp");
  assert.equal(normalizeStudioState({edges:"unknown"}).edges, "sharp");
  const state = normalizeStudioState({template:"poll-material", edges:"sharp"});
  assert.equal(state.edges, "sharp");
  assert.equal(new URL(studioHref({context:state}), "https://pollframe.com").searchParams.get("edges"), "sharp");
});

test("all studio recipes have a real profile, valid format and stable unique identifier", () => {
  assert.equal(new Set(STUDIO_TEMPLATES.map((item) => item.id)).size, STUDIO_TEMPLATES.length);
  assert.equal(CURRENT_DESIGNS.length, 13);
  assert.equal(new Set(CURRENT_DESIGNS.map((item) => item.design)).size, 13);
  for (const item of STUDIO_TEMPLATES) {
    const state = normalizeStudioState({ template: item.id });
    assert.equal(state.template, item.id);
    assert.ok(
      ["current-poll", "chart", "party-history", "seat-grid", "approval-history", "approval-current", "majority", "tendencies", "map"].includes(
        item.profile,
      ),
    );
    assert.ok(["landscape", "square", "portrait"].includes(item.preset));
    if (item.widget)
      assert.equal(studioEmbedParams(state).get("widget"), item.widget);
  }
});
test("country, party IDs and permitted formats do not drift from the site", () => {
  assert.equal(
    normalizeStudioState({ region: "uk-westminster" }).country,
    "uk",
  );
  assert.equal(
    normalizeStudioState({ country: "uk", template: "seats-wide" }).template,
    "poll-classic",
  );
  assert.equal(
    STUDIO_PARTIES.uk.find((party) => party[1] === "conservative")[0],
    "206",
  );
  for (const country of ["de", "uk", "es"])
    assert.ok(
      STUDIO_PARTIES[country].some(
        (party) => party[1] === normalizeStudioState({ country }).party,
      ),
    );
});
test("date ranges, selections, language and intentional empty filters survive the full recipe", () => {
  const state = normalizeStudioState({
    template: "history-wide",
    country: "uk",
    range: "custom",
    start: "2018-01-01",
    end: "2021-05-01",
    parties: "205,206",
    pollsters: "1,3",
    events: "",
    lang: "es",
    mode: "polls",
  });
  const params = studioEmbedParams(state);
  assert.equal(params.get("from"), "2018-01-01");
  assert.equal(params.get("to"), "2021-05-01");
  assert.equal(params.get("events"), "");
  assert.equal(params.get("parties"), "205,206");
  assert.equal(params.get("pollsters"), "1,3");
  assert.equal(params.get("mode"), "polls");
  assert.equal(params.get("lang"), "es");
  assert.equal(
    new URL(
      studioHref({ context: state }),
      "https://pollframe.com",
    ).searchParams.get("events"),
    "",
  );
});
test("malformed dates and unsupported party periods never silently describe a different graph", () => {
  const invalid = normalizeStudioState({
    template: "history-wide",
    range: "custom",
    start: "2025-02-30",
    end: "2025-05-01",
  });
  assert.equal(invalid.start, "");
  assert.equal(invalid.range, "year");
  const inverted = normalizeStudioState({
    template: "history-wide",
    range: "custom",
    start: "2025-05-01",
    end: "2020-01-01",
  });
  assert.equal(inverted.start, "2020-01-01");
  assert.equal(inverted.end, "2025-05-01");
  assert.equal(
    normalizeStudioState({ template: "party-wide", range: "ten" }).range,
    "all",
  );
});
test("untrusted recipes cannot inject markup, remote data URLs or an external return route", () => {
  for (const value of [
    "https://bad.test",
    "//bad.test",
    "/\\bad.test",
    "/\nbad",
    "/?view=studio",
    null,
  ])
    assert.equal(safeStudioBack(value), "/");
  assert.equal(
    safeStudioBack("/de/deutschland/wahlumfragen/?lang=de"),
    "/de/deutschland/wahlumfragen/?lang=de",
  );
  const state = normalizeStudioState({
    template: "poll-wide",
    headline: '<img src=x onerror="alert(1)">',
    region: "https://bad.test",
    parties: "<script>",
    theme: "url(bad)",
    arbitrary: 3,
  });
  assert.equal(state.region, "bundestag");
  assert.equal(state.parties, null);
  assert.equal(state.theme, "light");
  assert.equal(state.arbitrary, undefined);
  const code = studioEmbedCode(
    "https://pollframe.com/embed.html?x=1&y=2",
    state.headline,
    760,
  );
  assert.ok(!code.includes("<img"));
  assert.ok(code.includes("&lt;img"));
  assert.ok(code.includes("&amp;y=2"));
  assert.equal(
    studioEmbedParams(state, { source: true }).has("headline"),
    false,
  );
  assert.equal(studioEmbedParams(state).get("headline"), state.headline);
});
