import { test, expect } from "@playwright/test";
import { writeFile } from "node:fs/promises";
test("all personal templates: real SVG bounds, text collisions, languages, formats and PNG decoding", async ({
  page,
}, info) => {
  test.setTimeout(180000);
  await page.addInitScript(
    (value) => (window.__layoutOnly = value),
    process.env.POLLFRAME_LAYOUT_ONLY === "1",
  );
  await page.goto("/?view=party-match&lang=en-GB");
  await expect(page.locator(".pm-intro")).toBeVisible();
  const result = await page.evaluate(async () => {
    const { MATCH_QUESTIONS } = await import("/src/party-match-data.js"),
      { calculateMatches } = await import("/src/party-match-model.js"),
      { resultDocument, matchDesignSvg, renderMatchPng } = await import(
        "/src/party-match-design.js"
      ),
      { MATCH_DESIGNS } = await import("/src/party-match-templates.js");
    const answers = Object.fromEntries(
        MATCH_QUESTIONS.map((q, i) => [
          q.id,
          { value: (i % 3) - 1, important: i % 5 === 0 },
        ]),
      ),
      result = calculateMatches(answers),
      failures = [],
      samples = [];
    let checked = 0;
    for (const locale of ["de", "en-GB", "en-US", "es"])
      for (const style of MATCH_DESIGNS)
        for (const format of ["square", "portrait", "wide"])
          for (const dark of [false, true])
            for (const extreme of locale === "de" && !dark
              ? [false, true]
              : [false]) {
              const doc = resultDocument(result, 30, locale, {
                answers,
                questions: MATCH_QUESTIONS,
              });
              const design = {
                style: style.id,
                graphic: style.graphic,
                format,
                dark,
                party: "greens",
                other: "spd",
                ...(extreme
                  ? {
                      title: "W".repeat(100),
                      subtitle: "W".repeat(160),
                      note: "W".repeat(120),
                      font: "Verdana",
                      textScale: 1.2,
                      labelScale: 1.35,
                      valueScale: 1.5,
                      barThickness: 32,
                      pointSize: 18,
                    }
                  : {}),
              };
              let graphic;
              try {
                graphic = matchDesignSvg(doc, design);
              } catch (error) {
                failures.push({
                  style: style.id,
                  format,
                  dark,
                  locale,
                  extreme,
                  error: error.message,
                });
                checked++;
                continue;
              }
              const { svg, width, height } = graphic,
                host = document.createElement("div");
              host.style.cssText =
                "all:initial;position:fixed;left:-10000px;top:0";
              const root = host.attachShadow({ mode: "open" });
              root.innerHTML = svg;
              document.body.append(host);
              const rects = [...root.querySelectorAll("text")].map((el) => {
                const r = el.getBBox();
                return {
                  text: el.textContent,
                  x: r.x,
                  y: r.y,
                  w: r.width,
                  h: r.height,
                };
              });
              const clipped = rects.filter(
                (r) =>
                  r.x < 24 ||
                  r.x + r.w > width - 24 ||
                  r.y < 16 ||
                  r.y + r.h > height - 24,
              );
              const overlaps = rects.flatMap((a, i) =>
                rects
                  .slice(i + 1)
                  .filter(
                    (b) =>
                      Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x) > 1 &&
                      Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y) > 1,
                  )
                  .map((b) => [a.text, b.text]),
              );
              if (clipped.length || overlaps.length)
                failures.push({
                  style: style.id,
                  format,
                  dark,
                  locale,
                  extreme,
                  clipped,
                  overlaps,
                });
              host.remove();
              checked++;
              if (
                locale === "de" &&
                format === "square" &&
                !extreme &&
                !window.__layoutOnly
              ) {
                const blob = await renderMatchPng(doc, design),
                  image = await createImageBitmap(blob);
                if (
                  image.width !== width ||
                  image.height !== height ||
                  blob.size < 18000
                )
                  failures.push({ style: style.id, png: "invalid" });
                image.close();
                if (!dark)
                  samples.push({
                    name: `${style.id}.png`,
                    data: Array.from(new Uint8Array(await blob.arrayBuffer())),
                  });
              }
            }
    return { checked, failures, samples };
  });
  for (const s of result.samples)
    await writeFile(info.outputPath(s.name), Buffer.from(s.data));
  await writeFile(
    info.outputPath("layout-failures.json"),
    JSON.stringify(result.failures, null, 2),
  );
  expect(result.checked).toBe(486);
  expect(result.failures.slice(0, 10)).toEqual([]);
});
