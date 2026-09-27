import StudioSvg from "./studio-svg.jsx";
import { studioNumber } from "./studio-format.js";
import { useStudioFont } from "./studio-font-loader.js";
import { studioFont, textX, textAnchor } from "./studio-fonts.js";
import React, { useId } from "react";
import { wrapText } from "./studio-text-layout.js";
export const MapDesign = React.memo(function MapDesign({
  snapshot,
  state,
  template,
  svgRef,
  backgroundImage,
}) {
  useStudioFont(state.font);
  const uid = useId().replace(/[^\w]/g, ""),
    l = (de, en, es) =>
      state.lang === "de" ? de : state.lang === "es" ? es : en;
  const bg = state.background || (state.theme === "dark" ? "#182331" : "#fff"),
    dark =
      [1, 3, 5].reduce(
        (n, p, i) =>
          n + parseInt(bg.slice(p, p + 2), 16) * [0.2126, 0.7152, 0.0722][i],
        0,
      ) < 140,
    ink = dark ? "#f5f7fa" : "#172130",
    muted = dark ? "#bdc9d6" : "#526174";
  const font = studioFont(
    state.font,
    state.font === "serif"
      ? "Georgia, serif"
      : state.font === "mono"
        ? "Courier New, monospace"
        : "Arial, sans-serif",
  );
  const title = state.headline || snapshot.title,
    lines = wrapText(title, 840, state.titleSize, font, state.titleWeight),
    sub = wrapText(state.subtitle, 840, state.subtitleSize, font),
    top =
      100 +
      state.topPadding +
      (state.subtitle ? state.subtitleGap : 0) +
      lines.length * state.titleSize * state.titleLeading +
      (state.subtitle ? sub.length * (state.subtitleSize * 1.45) : 0);
  const original = template.design === "map-original";
  const tiles = template.design === "map-tiles",
    poster = template.design === "map-poster",
    body = tiles ? 840 : poster ? 1250 : original ? 1270 : 870,
    H =
      top +
      body +
      190 +
      (state.editorNote
        ? wrapText(state.editorNote, 840, state.noteSize, font).length *
          (state.noteSize * 1.45)
        : 0),
    rows = [...snapshot.rows]
      .map((r) => ({
        ...r,
        valueLabel: Number.isFinite(r.value)
          ? studioNumber(r.value, state.lang, {
              maximumFractionDigits: state.precision,
            }) + (snapshot.mode === "growth" ? " pp" : "%")
          : "—",
      }))
      .sort((a, b) =>
        state.order === "name"
          ? a.name.localeCompare(b.name, state.lang)
          : (b.value ?? -Infinity) - (a.value ?? -Infinity),
      );
  const color = (c) =>
    state.monochrome
      ? ink
      : !c || c.startsWith("var(")
        ? dark
          ? "#d5dce4"
          : "#202428"
        : c;
  const text = (x, y, s, size = 20, p = {}) => (
    <text x={x} y={y} fontSize={size} fill={ink} {...p}>
      {s}
    </text>
  );
  const stale = (row) =>
    (Date.parse(snapshot.date) - Date.parse(row.date)) / 86400000 > 90;
  const fill = (row) =>
    row.parties.length > 1 ? `url(#tie-${uid}-${row.id})` : color(row.color);
  return (
    <StudioSvg
      state={state}
      forwardedRef={svgRef}
      xmlns="http://www.w3.org/2000/svg"
      className="studio-current-art"
      width="960"
      height={H}
      viewBox={`0 0 960 ${H}`}
      data-design={template.design}
      data-statistic="map"
      role="img"
      aria-label={title}
    >
      <defs>
        <clipPath id={`mapclip-${uid}`}>
          <rect
            width="960"
            height={H}
            rx={state.cornerRadius ?? (state.edges === "rounded" ? 24 : 0)}
          />
        </clipPath>
        {rows
          .filter((r) => r.parties.length > 1)
          .map((r) => (
            <pattern
              key={r.id}
              id={`tie-${uid}-${r.id}`}
              width={r.parties.length * 10}
              height="10"
              patternUnits="userSpaceOnUse"
              patternTransform="rotate(35)"
            >
              {r.parties.map((p, i) => (
                <rect
                  key={p.id}
                  x={i * 10}
                  width="10"
                  height="10"
                  fill={color(p.color)}
                />
              ))}
            </pattern>
          ))}
      </defs>
      <g clipPath={`url(#mapclip-${uid})`} fontFamily={font}>
        <rect data-editor-target="image" width="960" height={H} fill={bg} />
        {backgroundImage && (
          <>
            <image
              href={backgroundImage}
              width="960"
              height={H}
              preserveAspectRatio={
                state.imageFit === "contain"
                  ? "xMidYMid meet"
                  : "xMidYMid slice"
              }
            />
            <rect
              width="960"
              height={H}
              fill={bg}
              opacity={state.imageOverlay}
            />
          </>
        )}
        {text(48, 35, "POLLFRAME", 16, { letterSpacing: 2, fontWeight: 700 })}
        <g data-editor-target="text">
          {lines.map((s, i) =>
            text(
              textX(state.titleAlign),
              85 + state.topPadding + i * state.titleSize * state.titleLeading,
              s,
              state.titleSize,
              {
                key: i,
                fontWeight: state.titleWeight,
                textAnchor: textAnchor(state.titleAlign),
              },
            ),
          )}
        </g>
        <g data-editor-target="subtitle">
          {state.subtitle &&
            sub.map((s, i) =>
              text(
                textX(state.subtitleAlign),
                96 +
                  state.topPadding +
                  state.subtitleGap +
                  lines.length * state.titleSize * state.titleLeading +
                  i * (state.subtitleSize * 1.45),
                s,
                state.subtitleSize,
                {
                  key: i,
                  fill: muted,
                  textAnchor: textAnchor(state.subtitleAlign),
                },
              ),
            )}
        </g>
        <g data-editor-target="chart">
          {!tiles && (
            <svg
              x={poster || original ? 188 : 48}
              y={top + 5}
              width={poster || original ? 584 : 440}
              height={poster || original ? 790 : 796}
              viewBox={snapshot.viewBox}
            >
              {rows.map((row) => (
                <path
                  key={row.id}
                  data-state={row.id}
                  data-map-row={original ? row.id : undefined}
                  d={row.path}
                  fill={fill(row)}
                  fillOpacity={row.opacity}
                  stroke={dark ? "#101a26" : "#fff"}
                  strokeWidth="1.4"
                >
                  <title>
                    {row.name}: {row.label} {row.valueLabel} · {row.date}
                  </title>
                </path>
              ))}
            </svg>
          )}
          {original &&
            [
              ...new Map(
                rows.flatMap((r) => r.parties).map((p) => [p.id, p]),
              ).values(),
            ].map((party, i) => (
              <g
                key={party.id}
                transform={`translate(${48 + (i % 3) * 294},${top + 835 + Math.floor(i / 3) * 38})`}
              >
                <circle r="7" fill={color(party.color)} />
                {text(18, 6, party.name || party.label || party.id, 18)}
              </g>
            ))}
          {original && [...rows].sort((a,b) => a.name.localeCompare(b.name, state.lang)).map((row,i) => (
            <g key={`date-${row.id}`} data-map-date={row.id}>
              {text(48 + (i % 2) * 440, top + 940 + Math.floor(i / 2) * 40, row.name, 16)}
              {text(450 + (i % 2) * 440, top + 940 + Math.floor(i / 2) * 40, `${row.date}${stale(row) ? " *" : ""}`, 16, {textAnchor:"end", fill:muted})}
            </g>
          ))}
          {!original &&
            rows.map((row, i) => {
              const x = tiles
                  ? 48 + (i % 4) * 216
                  : poster
                    ? 48 + (i % 2) * 440
                    : 525,
                y = tiles
                  ? top + 30 + Math.floor(i / 4) * 205
                  : poster
                    ? top + 815 + Math.floor(i / 2) * 44
                    : top + 32 + i * 52;
              return (
                <g key={row.id} data-map-row={row.id} data-value={row.value}>
                  {tiles && (
                    <rect
                      x={x}
                      y={y - 20}
                      width="202"
                      height="188"
                      rx="12"
                      fill={dark ? "#253447" : "#eff3f7"}
                    />
                  )}
                  <rect
                    x={x}
                    y={y - 14}
                    width={tiles ? 6 : 10}
                    height={tiles ? 175 : 14}
                    fill={fill(row)}
                  />
                  {wrapText(
                    row.name,
                    tiles ? 175 : poster ? 395 : 365,
                    tiles ? 18 : poster ? 15 : 17,
                    font,
                  ).map((s, j) =>
                    text(x + 17, y + j * 21, s, tiles ? 18 : poster ? 15 : 17, {
                      key: j,
                    }),
                  )}
                  {text(
                    tiles ? x + 17 : poster ? x + 400 : 912,
                    tiles ? y + 95 : poster ? y + 18 : y + 22,
                    `${row.label} ${row.valueLabel}`,
                    tiles ? 21 : poster ? 15 : 17,
                    { textAnchor: tiles ? "start" : "end", fontWeight: 700 },
                  )}
                  {text(
                    x + 17,
                    tiles ? y + 144 : poster ? y + 18 : y + 26,
                    `${row.date}${stale(row) ? " *" : ""}`,
                    tiles ? 16 : 12,
                    { fill: muted },
                  )}
                </g>
              );
            })}
        </g>
        <g data-editor-target="output">
          {text(
            48,
            top + body + 30,
            l(
              "Unterschiedliche Erhebungsstände je Bundesland, kein gleichzeitiges Lagebild.",
              "Different observation dates by state, not a simultaneous snapshot.",
              "Fechas de medición diferentes por región, no una instantánea simultánea.",
            ),
            16,
            { fill: muted },
          )}
          {text(
            48,
            top + body + 56,
            snapshot.mode === "growth"
              ? l(
                  "180-Tage-Trend je Land · Prozentpunkte · kein Wahlergebnis.",
                  "180-day trend per state · percentage points · not an election result.",
                  "Tendencia de 180 días por región · puntos porcentuales · no es un resultado electoral.",
                )
              : l(
                  "Je Institut jüngste Umfrage in 45 Tagen vor der letzten Landesumfrage.",
                  "Latest poll per institute in 45 days before the latest state poll.",
                  "Última encuesta por instituto en los 45 días anteriores a la última encuesta regional.",
                ),
            16,
            { fill: muted },
          )}
          {text(
            48,
            top + body + 81,
            `${rows.map((r) => r.date).sort()[0]} – ${snapshot.date} · ${l("Gleichstände gestreift · * mehr als 90 Tage hinter jüngstem Stand", "Ties striped · * more than 90 days behind latest date", "Empates rayados · * más de 90 días antes de la fecha más reciente")}`,
            14,
            { fill: muted },
          )}
          <a href={svgRef ? snapshot.sourceUrl : undefined}>
            {text(
              48,
              top + body + 106,
              "DAWUM · dawum.de · ODbL 1.0: odbl.dawum.de",
              15,
              { fill: muted },
            )}
          </a>
          <a
            href={
              svgRef
                ? "https://github.com/VictorCazanave/svg-maps/tree/master/packages/germany"
                : undefined
            }
          >
            {text(
              48,
              top + body + 131,
              "MapSVG / Victor Cazanave · @svg-maps/germany · CC BY 4.0 · " +
                l("neu eingefärbt", "recoloured", "colores modificados"),
              14,
              { fill: muted },
            )}
          </a>
          <a
            href={
              svgRef
                ? "https://creativecommons.org/licenses/by/4.0/"
                : undefined
            }
          >
            {text(
              48,
              top + body + 151,
              "creativecommons.org/licenses/by/4.0/",
              13,
              { fill: muted },
            )}
          </a>
        </g>
        {state.editorNote &&
          wrapText(state.editorNote, 840, state.noteSize, font).map((s, i) =>
            text(
              textX(state.noteAlign),
              top + body + 181 + i * (state.noteSize * 1.45),
              s,
              state.noteSize,
              {
                key: i,
                "data-editor-target": "note",
                textAnchor: textAnchor(state.noteAlign),
              },
            ),
          )}
      </g>
    </StudioSvg>
  );
});
