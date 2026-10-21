import { test, expect } from "@playwright/test";
import { writeFile } from "node:fs/promises";

test("SVG text geometry and real PNG pixels: all languages, styles, formats, themes and extreme text", async ({
  page,
}, info) => {
  test.setTimeout(120000);
  await page.goto("/?view=party-match&lang=en-GB");
  await expect(page.locator(".pm-intro")).toBeVisible();
  const output = await page.evaluate(async () => {
    const { MATCH_QUESTIONS } = await import("/src/party-match-data.js");
    const { calculateMatches } = await import("/src/party-match-model.js");
    const { resultDocument, matchDesignSvg, renderMatchPng } = await import(
      "/src/party-match-design.js"
    );
    const result = calculateMatches(
      Object.fromEntries(
        MATCH_QUESTIONS.map((q) => [q.id, { value: 1, important: true }]),
      ),
    );
    const checks = [],
      samples = [];
    for (const locale of ["de", "en-GB", "en-US", "es"])
      for (const style of ["pollframe", "editorial", "social"])
        for (const format of ["square", "portrait", "wide"])
          for (const dark of [false, true])
            for (const extreme of [false, true]) {
              const document = resultDocument(result, 30, locale),
                design = {
                  style,
                  format,
                  dark,
                  ...(extreme
                    ? {
                        title: "W".repeat(100),
                        subtitle: "W".repeat(160),
                        textScale: 1.2,
                        font: "Verdana",
                      }
                    : {}),
                };
              const graphic = matchDesignSvg(document, design),
                host = window.document.createElement("div");
              host.style.cssText =
                "all:initial;position:fixed;left:-10000px;top:0";
              // Exports are isolated SVG images, not inline page SVG. App CSS
              // must not alter the font metrics being tested here.
              const shadow = host.attachShadow({ mode: "open" });
              shadow.innerHTML = graphic.svg;
              window.document.body.append(host);
              const rects = [...shadow.querySelectorAll("text")].map((el) => {
                const b = el.getBBox();
                return {
                  value: el.textContent,
                  x: b.x,
                  y: b.y,
                  w: b.width,
                  h: b.height,
                };
              });
              const clipped = rects.filter(
                (b) =>
                  b.x < 40 ||
                  b.x + b.w > graphic.width - 40 ||
                  b.y < 20 ||
                  b.y + b.h > graphic.height - 30,
              );
              const overlaps = rects.flatMap((a, i) =>
                rects
                  .slice(i + 1)
                  .filter(
                    (b) =>
                      Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x) > 1 &&
                      Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y) > 1,
                  )
                  .map((b) => [a.value, b.value]),
              );
              host.remove();
              let pixels = null,
                size = null;
              if (!extreme) {
                const blob = await renderMatchPng(document, design),
                  image = await createImageBitmap(blob),
                  canvas = window.document.createElement("canvas");
                canvas.width = image.width;
                canvas.height = image.height;
                const ctx = canvas.getContext("2d");
                ctx.drawImage(image, 0, 0);
                pixels = [...ctx.getImageData(30, 30, 1, 1).data];
                image.close();
                size = blob.size;
                if (
                  locale === "de" &&
                  ((style === "pollframe" && format === "square") ||
                    (style === "social" && format === "portrait") ||
                    (style === "editorial" && format === "wide"))
                )
                  samples.push({
                    name: `${style}-${format}-${dark ? "dark" : "light"}.png`,
                    bytes: Array.from(new Uint8Array(await blob.arrayBuffer())),
                  });
              }
              checks.push({
                locale,
                style,
                format,
                dark,
                extreme,
                clipped,
                overlaps,
                pixels,
                size,
              });
            }
    return { checks, samples };
  });
  for (const sample of output.samples)
    await writeFile(info.outputPath(sample.name), Buffer.from(sample.bytes));
  expect(output.checks).toHaveLength(144);
  for (const check of output.checks) {
    expect(check.clipped, JSON.stringify(check)).toEqual([]);
    expect(check.overlaps, JSON.stringify(check)).toEqual([]);
    if (check.pixels) {
      expect(check.size).toBeGreaterThan(20000);
      expect(check.pixels).toEqual(
        check.dark ? [21, 25, 31, 255] : [255, 255, 255, 255],
      );
    }
  }
});
