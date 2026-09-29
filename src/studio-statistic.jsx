import StudioSvg from "./studio-svg.jsx";
import { studioNumber } from "./studio-format.js";
import { useStudioFont } from "./studio-font-loader.js";
import { studioFont, textX, textAnchor } from "./studio-fonts.js";
import React, { useId } from "react";
import { wrapText } from "./studio-text-layout.js";
import {studioRegionName} from './studio-regions.js';

const colour = (raw, dark) =>
  raw === "var(--party-union)" ||
  (dark && ["#181818", "#000000", "#202428"].includes(raw))
    ? dark
      ? "#d6dce5"
      : "#202428"
    : raw || "#718096";
export const StatisticDesign = React.memo(function StatisticDesign({
  snapshot,
  state,
  template,
  svgRef,
  backgroundImage,
}) {
  useStudioFont(state.font);
  const id = useId().replace(/[^\w-]/g, ""),
    l = (de, en, es) =>
      state.lang === "de" ? de : state.lang === "es" ? es : en;
  const topic = template.topic,
    design = template.design,
    seats = topic === "seats",
    majority = topic === "majority",
    approval = topic === "approval-current",
    changes = topic === "tendencies";
  const bg = state.background || (state.theme === "dark" ? "#141e2b" : "#fff"),
    dark =
      [1, 3, 5].reduce(
        (n, p, i) =>
          n + parseInt(bg.slice(p, p + 2), 16) * [0.2126, 0.7152, 0.0722][i],
        0,
      ) < 140;
  const ink = dark ? "#f4f7fb" : "#172130",
    muted = dark ? "#bbc7d5" : "#526173",
    grid = dark ? "#354357" : "#e2e7ed",
    panel = dark ? "#202d3d" : "#f0f4f8";
  const palette = Object.fromEntries(
    (state.palette || "")
      .split(",")
      .filter(Boolean)
      .map((v) => v.split(":")),
  );
  const font = studioFont(
    state.font,
    state.font === "serif" ||
      (state.font === "auto" && design.includes("table"))
      ? "Georgia, serif"
      : state.font === "mono"
        ? "Courier New, monospace"
        : "Arial, sans-serif",
  );
  const rows = (snapshot.rows || [])
    .filter(
      (row) => Number.isFinite(row.value) && (!changes || row.slug !== "other"),
    )
    .map((row) => ({
      ...row,
      color: state.monochrome
        ? ink
        : colour(palette[row.id] || row.color, dark),
    }));
  const selected =
    state.parties === null
      ? rows
      : rows.filter((row) => state.parties.split(",").includes(String(row.id)));
  // Seat/answer compositions must retain the whole denominator, even when highlighting.
  const displayed = seats || approval || majority ? rows : selected;
  const ordered = [...displayed].sort((a, b) =>
    state.order === "name"
      ? a.name.localeCompare(b.name, state.lang)
      : b.value - a.value,
  );
  const fmt = (n) =>
    Number.isFinite(n)
      ? studioNumber(n, state.lang, {
          maximumFractionDigits: seats || majority ? 0 : state.precision,
          minimumFractionDigits: seats || majority ? 0 : state.precision,
        })
      : "—";
  const signed = (n) =>
    Number.isFinite(n) ? `${n > 0 ? "+" : ""}${fmt(n)}` : "—";
  const unit = seats || majority ? l("Sitze", "seats", "escaños") : "%";
  const defaultTitle = seats
    ? l(
        "So sähe der Bundestag rechnerisch aus",
        "A modelled Bundestag",
        "Un Bundestag modelizado",
      )
    : majority
      ? l(
          "Koalitionsmehrheiten",
          "Coalition majorities",
          "Mayorías de coalición",
        )
      : changes
        ? l(
            "Was sich in den Umfragen verändert",
            "What has changed in polling",
            "Qué ha cambiado en las encuestas",
          )
        : snapshot.title;
  const title = state.headline || (state.region!=='bundestag' ? `${studioRegionName(state.region,state.lang)} · ${seats ? l('Modellierte Sitzverteilung','Modelled seats','Escaños modelizados') : defaultTitle}` : defaultTitle),
    titleSize = state.titleSize,
    titleLines = wrapText(title, 840, titleSize, font, state.titleWeight),
    sub = wrapText(state.subtitle, 840, state.subtitleSize, font);
  const top =
    110 +
    state.topPadding +
    (state.subtitle ? state.subtitleGap : 0) +
    titleLines.length * titleSize * state.titleLeading +
    (state.subtitle ? sub.length * (state.subtitleSize * 1.45) : 0);
  const notes = wrapText(state.editorNote, 840, state.noteSize, font);
  const baseHeight =
    (template.preset === "portrait"
      ? 760
      : template.preset === "square"
        ? 660
        : 430) * state.density;
  const rowSpace =
    design.includes("table") ||
    ["bars", "dots", "diverging", "dumbbell", "change-poster"].includes(design)
      ? ordered.length * 78
      : design.includes("cards") || design === "poster"
        ? Math.ceil(ordered.length / 2) * 165
        : baseHeight;
  const body =
      design === "native"
        ? approval
          ? 240
          : seats
            ? 190 + ordered.length * 70
            : majority
              ? 80 + Math.min(5, snapshot.coalitions?.length || 1) * 115
              : ordered.length * 78 + 40
        : approval && design === "pie"
          ? 500
          : approval
            ? ["bars", "dots", "table"].includes(design)
              ? ordered.length * 78 + 30
              : design === "strip"
                ? 390
                : design === "poster"
                  ? 760
                  : Math.ceil(ordered.length / 2) * 165 + 30
            : Math.max(
                majority ? 590 : design === "hemicycle" ? 530 : seats && design === "ring" ? 560 : seats && design === "waffle" ? 32 + Math.ceil(snapshot.totalSeats / 30) * 23 + 140 : 0,
                baseHeight,
                rowSpace,
              ),
    // The legend occupies its own band, never the majority total's chart area.
    hasSeatLegend = seats && ['hemicycle', 'waffle', 'ring', 'strip'].includes(design),
    legendTop = top + body + 28,
    bottom = top + body + (hasSeatLegend ? Math.ceil(ordered.length / 3) * 38 + 28 : 0),
    H =
      bottom +
      150 +
      (state.editorNote ? notes.length * (state.noteSize * 1.45) : 0);
  const text = (x, y, value, size = 22, props = {}) => (
    <text x={x} y={y} fontSize={size} fill={ink} {...props}>
      {value}
    </text>
  );
  const label = (x, y, value, size = 20, limit = 24, props = {}) =>
    wrapText(
      value,
      limit * size * 0.53,
      size,
      font,
      props.fontWeight || 400,
    ).map((line, i) =>
      text(x, y + i * (size * 1.45), line, size, { ...props, key: i }),
    );
  const total = seats || majority ? snapshot.totalSeats : 100,
    threshold = snapshot.majority;
  const max = Math.max(1, ...ordered.map((row) => row.value));
  const coalitionRows = () => {
    if (state.coalition !== null) {
      const ids = new Set(state.coalition.split(","));
      const members = rows.filter((r) => ids.has(String(r.id)));
      return members.length
        ? [
            {
              parties: members.map((r) => r.id),
              seats: members.reduce((s, r) => s + r.value, 0),
            },
          ]
        : [];
    }
    return (snapshot.coalitions || []).slice(
      0,
      design === "duel" ? 2 : design === "coalition-cards" ? 4 : 5,
    );
  };
  const combinations = majority ? coalitionRows() : [];
  const allNames = (c) =>
    c.parties
      .map((id) => rows.find((r) => String(r.id) === String(id))?.name)
      .filter(Boolean)
      .join(" + ");
  const stacked = (items, x, y, width, height, denominator) => {
    let offset = 0;
    return items.map((row) => {
      const w = (width * row.value) / denominator;
      const node = (
        <rect
          key={row.id}
          data-party-id={row.id}
          data-value={row.value}
          x={x + offset}
          y={y}
          width={w}
          height={height}
          fill={row.color}
        />
      );
      offset += w;
      return node;
    });
  };
  return (
    <StudioSvg
      state={state}
      forwardedRef={svgRef}
      xmlns="http://www.w3.org/2000/svg"
      className="studio-current-art studio-statistic-art"
      viewBox={`0 0 960 ${H}`}
      width="960"
      height={H}
      role="img"
      aria-label={`${title}. ${snapshot.date}`}
      data-statistic={topic}
      data-design={design}
      data-total={total}
      data-majority={threshold}
    >
      <title>{title}</title>
      <desc>
        {ordered.map((r) => `${r.name}: ${r.value} ${unit}`).join("; ")}
      </desc>
      <defs>
        <clipPath id={`stat-${id}`}>
          <rect
            width="960"
            height={H}
            rx={state.cornerRadius ?? (state.edges === "rounded" ? 24 : 0)}
          />
        </clipPath>
      </defs>
      <g clipPath={`url(#stat-${id})`} fontFamily={font}>
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
        {text(48, 36, "POLLFRAME", 16, { letterSpacing: 2, fontWeight: 700 })}
        {text(
          912,
          36,
          seats || majority
            ? l(
                "SITZMODELL · KEINE PROGNOSE",
                "SEAT MODEL · NOT A FORECAST",
                "MODELO · NO ES UN PRONÓSTICO",
              )
            : approval
              ? "POLITBAROMETER"
              : studioRegionName(state.region,state.lang),
          14,
          { textAnchor: "end", fill: muted },
        )}
        <g data-editor-target="text">
          {titleLines.map((line, i) =>
            text(
              textX(state.titleAlign),
              88 + state.topPadding + i * titleSize * state.titleLeading,
              line,
              titleSize,
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
            sub.map((line, i) =>
              text(
                textX(state.subtitleAlign),
                98 +
                  state.topPadding +
                  state.subtitleGap +
                  titleLines.length * titleSize * state.titleLeading +
                  i * (state.subtitleSize * 1.45),
                line,
                state.subtitleSize,
                {
                  key: i,
                  fill: muted,
                  textAnchor: textAnchor(state.subtitleAlign),
                },
              ),
            )}
        </g>
        {text(
          48,
          top - 10,
          `${studioRegionName(state.region,state.lang)} · ${snapshot.date}${changes ? ` · ${l("Veränderung seit", "Change since", "Cambio desde")}: ${snapshot.baselineDate || l("Vergleichsdatum fehlt", "baseline date unavailable", "fecha de referencia no disponible")}` : approval ? ` · ${snapshot.leader || ""}` : ""}`,
          18,
          { fill: muted, 'data-editor-target':'output' },
        )}
        <g data-editor-target="chart">
          {approval &&
            design === "native" &&
            (() => {
              const positive = rows.find((r) => r.id === "positive"),
                negative = rows.find((r) => r.id === "negative");
              const pair = [positive, negative].filter(Boolean),
                denominator = pair.reduce((n, r) => n + r.value, 0);
              return (
                <g data-native="approval">
                  <rect
                    x="48"
                    y={top}
                    width="864"
                    height="132"
                    rx="14"
                    fill={panel}
                  />
                  {[
                    ...pair,
                    {
                      id: "net",
                      name: l("Differenz", "Difference", "Diferencia"),
                      value: snapshot.net,
                    },
                  ].map((r, i) => (
                    <g key={r.id}>
                      {label(68 + i * 288, top + 32, r.name, 18, 22)}
                      {text(
                        68 + i * 288,
                        top + 99,
                        `${r.id === "net" ? signed(r.value) : fmt(r.value)}${r.id === "net" ? " pp" : "%"}`,
                        42,
                        { fontWeight: 700, fill: r.id === "net" ? muted : ink },
                      )}
                    </g>
                  ))}
                  {denominator > 0 &&
                    stacked(pair, 48, top + 156, 864, 16, denominator)}
                  {text(
                    48,
                    top + 207,
                    l(
                      "Balken: Verhältnis positiver zu negativer Antworten",
                      "Bar: ratio of positive to negative answers",
                      "Barra: proporción de respuestas positivas y negativas",
                    ),
                    16,
                    { fill: muted },
                  )}
                </g>
              );
            })()}
          {approval &&
            design === "pie" &&
            (() => {
              let start = -Math.PI / 2;
              return (
                <g data-approval-pie="true">
                  {rows
                    .filter((r) => r.value > 0)
                    .map((row) => {
                      const end = start + (row.value / 100) * Math.PI * 2,
                        a = start;
                      start = end;
                      const cx = 286,
                        cy = top + 242,
                        r = 205;
                      const d = `M${cx} ${cy}L${cx + r * Math.cos(a)} ${cy + r * Math.sin(a)}A${r} ${r} 0 ${row.value > 50 ? 1 : 0} 1 ${cx + r * Math.cos(end)} ${cy + r * Math.sin(end)}Z`;
                      return row.value >= 100 ? (
                        <circle
                          key={row.id}
                          data-value={row.value}
                          cx={cx}
                          cy={cy}
                          r={r}
                          fill={row.color}
                        />
                      ) : (
                        <path
                          key={row.id}
                          data-value={row.value}
                          d={d}
                          fill={row.color}
                          stroke={bg}
                          strokeWidth="3"
                        />
                      );
                    })}
                  {rows.map((row, i) => (
                    <g key={row.id}>
                      <circle
                        cx="550"
                        cy={top + 86 + i * 135}
                        r="7"
                        fill={row.color}
                      />
                      {label(570, top + 92 + i * 135, row.name, 20, 27)}
                      {text(
                        570,
                        top + 164 + i * 135,
                        `${fmt(row.value)}%`,
                        38,
                        { fontWeight: 700 },
                      )}
                    </g>
                  ))}
                </g>
              );
            })()}
          {seats && design === "native" && (
            <g data-native="seats">
              {text(
                48,
                top + 28,
                `${ordered.length} ${l("Parteien", "parties", "partidos")} · ${snapshot.representedVote?.toLocaleString(state.lang, { maximumFractionDigits: 1 }) ?? "—"}% ${l("vertretene Stimmen", "represented vote", "votos representados")}`,
                22,
              )}
              {stacked(rows, 48, top + 68, 864, 42, total)}
              <path
                d={`M${48 + (864 * threshold) / total} ${top + 60}v58`}
                stroke={ink}
                strokeWidth="3"
              />
              {ordered.map((row, i) => (
                <g key={row.id} data-party-id={row.id} data-value={row.value}>
                  <circle
                    cx="60"
                    cy={top + 168 + i * 70}
                    r="8"
                    fill={row.color}
                  />
                  {label(82, top + 175 + i * 70, row.name, 20, 19)}
                  <rect
                    x="315"
                    y={top + 159 + i * 70}
                    width={(480 * row.value) / max}
                    height="18"
                    rx="5"
                    fill={row.color}
                  />
                  {text(908, top + 178 + i * 70, row.value, 28, {
                    textAnchor: "end",
                    fontWeight: 700,
                  })}
                </g>
              ))}
            </g>
          )}
          {majority && design === "native" && (
            <g data-native="majority">
              {text(
                48,
                top + 25,
                `${l("Mehrheit", "Majority", "Mayoría")}: ${threshold} ${unit}`,
                24,
                { fontWeight: 700 },
              )}
              {combinations.map((c, i) => {
                const n = c.seats,
                  gap = n - threshold,
                  y = top + 82 + i * 115;
                return (
                  <g
                    key={c.parties.join("-")}
                    data-coalition={c.parties.join(",")}
                    data-seats={n}
                    data-gap={gap}
                  >
                    {label(48, y, allNames(c), 21, 44)}
                    {text(910, y, `${n} ${unit}`, 28, {
                      textAnchor: "end",
                      fontWeight: 700,
                    })}
                    {text(
                      910,
                      y + 35,
                      `${signed(gap)} ${l("zur Mehrheit", "to majority", "respecto a la mayoría")}`,
                      18,
                      {
                        textAnchor: "end",
                        fill:
                          gap >= 0
                            ? dark
                              ? "#65d6a9"
                              : "#146749"
                            : dark
                              ? "#ff95a8"
                              : "#a72c45",
                      },
                    )}
                    <path d={`M48 ${y + 67}H912`} stroke={grid} />
                  </g>
                );
              })}
            </g>
          )}
          {["hemicycle", "waffle"].includes(design) && (
            <>
              {(() => {
                const units = rows.flatMap((row) =>
                  Array.from({ length: row.value }, () => row),
                );
                const columns = 30,
                  radial = [30, 36, 42, 48, 54, 60, 66, 72, 78, 84, 60];
                const positions = radial
                  .flatMap((count, ring) =>
                    Array.from({ length: count }, (_, slot) => ({
                      angle: Math.PI - (slot / (count - 1)) * Math.PI,
                      r: 130 + ring * 26,
                    })),
                  )
                  .sort((a, b) => b.angle - a.angle || a.r - b.r);
                return units.map((row, i) => {
                  let x, y;
                  if (design === "waffle") {
                    x = 80 + (i % columns) * 27;
                    y = top + 32 + Math.floor(i / columns) * 23;
                  } else {
                    const { angle, r } = positions[i];
                    x = 480 + Math.cos(angle) * r;
                    y = top + 390 - Math.sin(angle) * r;
                  }
                  return (
                    <circle
                      key={i}
                      data-seat-party={row.id}
                      cx={x}
                      cy={y}
                      r={design === "waffle" ? 7.5 : 5.6}
                      fill={row.color}
                    />
                  );
                });
              })()}
              {text(
                480,
                design === "hemicycle" ? top + 350 : top + body - 70,
                `${threshold} / ${total}`,
                34,
                { textAnchor: "middle", fontWeight: 700 },
              )}
              {text(
                480,
                design === "hemicycle" ? top + 380 : top + body - 42,
                l(
                  "Sitze für eine Mehrheit",
                  "Seats for a majority",
                  "Escaños para una mayoría",
                ),
                18,
                { textAnchor: "middle", fill: muted },
              )}
            </>
          )}
          {design === "ring" && (
            <>
              {(() => {
                let offset = 0;
                const circumference = 2 * Math.PI * 195;
                return rows.map((row) => {
                  const length = (row.value / total) * circumference,
                    node = (
                      <circle
                        key={row.id}
                        data-party-id={row.id}
                        data-value={row.value}
                        cx="480"
                        cy={top + 285}
                        r="195"
                        fill="none"
                        stroke={row.color}
                        strokeWidth="85"
                        strokeDasharray={`${length} ${circumference - length}`}
                        strokeDashoffset={-offset}
                        transform={`rotate(-90 480 ${top + 285})`}
                      />
                    );
                  offset += length;
                  return node;
                });
              })()}
              {text(480, top + 280, total, 66, {
                textAnchor: "middle",
                fontWeight: 700,
              })}
              {text(
                480,
                top + 315,
                l("modellierte Sitze", "modelled seats", "escaños modelizados"),
                20,
                { textAnchor: "middle", fill: muted },
              )}
            </>
          )}
          {design === "strip" && (
            <>
              {stacked(rows, 60, top + 95, 840, 90, total)}
              {seats && (
                <g>
                  <path
                    d={`M${60 + (840 * threshold) / total} ${top + 64}v150`}
                    stroke={ink}
                    strokeWidth="3"
                  />
                  {text(
                    60 + (840 * threshold) / total,
                    top + 45,
                    `${l("Mehrheit", "Majority", "Mayoría")}: ${threshold}`,
                    22,
                    { textAnchor: "middle" },
                  )}
                </g>
              )}
              {approval &&
                text(
                  480,
                  top + 255,
                  `${l("Nettobewertung", "Net rating", "Valoración neta")}: ${signed(snapshot.net)} pp`,
                  32,
                  { textAnchor: "middle", fontWeight: 700 },
                )}
            </>
          )}
          {["bars", "dots"].includes(design) &&
            ordered.map((row, i) => {
              const y = top + 45 + i * 78,
                x = 300 + (480 * row.value) / (approval ? 100 : max);
              return (
                <g key={row.id} data-party-id={row.id} data-value={row.value}>
                  {label(48, y, row.name, 20, 21)}
                  {state.showGrid && (
                    <path
                      d={`M300 ${y - 7}H780`}
                      stroke={grid}
                      strokeWidth={design === "bars" ? 24 * state.barScale : 2}
                    />
                  )}{" "}
                  {design === "bars" ? (
                    <rect
                      x="300"
                      y={y - 19}
                      width={x - 300}
                      height={24 * state.barScale}
                      fill={row.color}
                    />
                  ) : (
                    <circle cx={x} cy={y - 7} r="10" fill={row.color} />
                  )}{" "}
                  {text(890, y, `${fmt(row.value)}${approval ? "%" : ""}`, 26, {
                    textAnchor: "end",
                    fontWeight: 700,
                  })}
                </g>
              );
            })}
          {design === "columns" &&
            ordered.map((row, i) => {
              const cell = 840 / ordered.length,
                x = 60 + i * cell,
                w = Math.min(
                  cell * 0.82,
                  Math.min(90, cell * 0.6) * state.barScale,
                ),
                h = ((body - 125) * row.value) / max;
              return (
                <g key={row.id} data-party-id={row.id} data-value={row.value}>
                  <rect
                    x={x + (cell - w) / 2}
                    y={bottom - 75 - h}
                    width={w}
                    height={h}
                    fill={row.color}
                  />
                  {text(x + cell / 2, bottom - 95 - h, fmt(row.value), 28, {
                    textAnchor: "middle",
                    fontWeight: 700,
                  })}
                  {label(
                    x + cell / 2,
                    bottom - 42,
                    row.name,
                    20,
                    Math.floor(cell / 12),
                    { textAnchor: "middle" },
                  )}
                </g>
              );
            })}
          {["table", "cards"].includes(design) &&
            ordered.map((row, i) => {
              const card = design !== "table",
                x = card ? 48 + (i % 2) * 450 : 48,
                y = top + 35 + (card ? Math.floor(i / 2) * 165 : i * 78);
              return (
                <g key={row.id} data-party-id={row.id} data-value={row.value}>
                  {card ? (
                    <rect
                      x={x}
                      y={y - 20}
                      width="426"
                      height="146"
                      rx="12"
                      fill={panel}
                    />
                  ) : (
                    <path d={`M48 ${y + 34}H912`} stroke={grid} />
                  )}
                  <rect
                    x={x + 12}
                    y={y - 4}
                    width="5"
                    height={card ? 110 : 24}
                    fill={row.color}
                  />
                  {label(x + 28, y + 10, row.name, 19, card ? 30 : 42)}
                  {text(
                    card ? x + 28 : 870,
                    card ? y + 96 : y + 10,
                    `${fmt(row.value)}${approval ? "%" : ""}`,
                    card ? 48 : 30,
                    { fontWeight: 700, textAnchor: card ? "start" : "end" },
                  )}
                </g>
              );
            })}
          {approval && design === "poster" && (
            <g>
              <rect
                x="48"
                y={top + 20}
                width="864"
                height="390"
                rx="16"
                fill={panel}
              />
              {text(
                88,
                top + 95,
                l("Eher gut", "Rather good", "Más bien bien"),
                30,
                { fill: muted },
              )}
              {text(
                88,
                top + 255,
                `${fmt(rows.find((r) => r.id === "positive")?.value)}%`,
                142,
                { fontWeight: 700, fill: dark ? "#6dddb1" : "#146e4c" },
              )}
              {text(
                88,
                top + 330,
                `${l("Nettobewertung", "Net rating", "Valoración neta")}: ${signed(snapshot.net)} pp`,
                29,
              )}
              {stacked(rows, 60, top + 470, 840, 40, 100)}
              {ordered.map((row, i) => (
                <g key={row.id}>
                  <circle
                    cx="72"
                    cy={top + 555 + i * 58}
                    r="9"
                    fill={row.color}
                  />
                  {label(96, top + 562 + i * 58, row.name, 22, 50)}
                  {text(890, top + 562 + i * 58, `${fmt(row.value)}%`, 28, {
                    textAnchor: "end",
                    fontWeight: 700,
                  })}
                </g>
              ))}
            </g>
          )}
          {majority &&
            design !== "native" &&
            combinations.map((c, i) => {
              const members = c.parties
                  .map((id) => rows.find((r) => String(r.id) === String(id)))
                  .filter(Boolean),
                n = c.seats ?? members.reduce((sum, r) => sum + r.value, 0),
                gap = n - threshold,
                card = ["coalition-cards", "duel"].includes(design),
                x = card ? 48 + (i % 2) * 450 : 48,
                y = top + 45 + (card ? Math.floor(i / 2) * 240 : i * 95),
                w = card ? 390 : 840;
              return (
                <g
                  key={c.parties.join("-")}
                  data-coalition={c.parties.join(",")}
                  data-seats={n}
                  data-gap={gap}
                >
                  {card && (
                    <rect
                      x={x}
                      y={y - 28}
                      width="426"
                      height="220"
                      rx="14"
                      fill={panel}
                    />
                  )}
                  {label(
                    x + 12,
                    y,
                    allNames(c),
                    card ? 20 : 22,
                    card ? 28 : 60,
                  )}
                  {design === "distance" ? (
                    <>
                      <path
                        d={`M${x + 500} ${y + 22}v38`}
                        stroke={muted}
                        strokeWidth="2"
                      />
                      <rect
                        x={
                          x +
                          500 +
                          (Math.min(0, gap) /
                            Math.max(threshold, total - threshold)) *
                            200
                        }
                        y={y + 28}
                        width={
                          (Math.abs(gap) /
                            Math.max(threshold, total - threshold)) *
                          200
                        }
                        height="20"
                        fill={gap >= 0 ? "#22996c" : "#ca536b"}
                      />
                    </>
                  ) : (
                    design !== "coalition-table" && (
                      <>
                        {stacked(
                          members,
                          x + 12,
                          y + (card ? 82 : 38),
                          w,
                          card ? 26 : 18,
                          total,
                        )}
                        <path
                          d={`M${x + 12 + (w * threshold) / total} ${y + (card ? 75 : 33)}v${card ? 42 : 30}`}
                          stroke={ink}
                          strokeWidth="3"
                        />
                      </>
                    )
                  )}
                  {text(
                    card ? x + 16 : 900,
                    card ? y + 156 : y + 73,
                    `${n} · ${signed(gap)} ${l("zur Mehrheit", "to majority", "respecto a la mayoría")}`,
                    card ? 22 : 19,
                    {
                      textAnchor: card ? "start" : "end",
                      fill:
                        gap >= 0
                          ? dark
                            ? "#65d6a9"
                            : "#146749"
                          : dark
                            ? "#ff95a8"
                            : "#a72c45",
                      fontWeight: 700,
                    },
                  )}
                </g>
              );
            })}
          {changes &&
            ordered.map((row, i) => {
              const delta = Number.isFinite(row.delta) ? row.delta : null,
                card = design === "change-cards",
                x = card ? 48 + (i % 2) * 450 : 48,
                y = top + 40 + (card ? Math.floor(i / 2) * 165 : i * 78),
                extent = Math.max(
                  1,
                  ...ordered.map((r) => Math.abs(r.delta || 0)),
                ),
                changeColor =
                  delta > 0
                    ? dark
                      ? "#5fd5a3"
                      : "#147348"
                    : delta < 0
                      ? dark
                        ? "#ff94a8"
                        : "#b23850"
                      : muted;
              return (
                <g
                  key={row.id}
                  data-party-id={row.id}
                  data-value={row.value}
                  data-delta={delta ?? ""}
                >
                  {card && (
                    <rect
                      x={x}
                      y={y - 22}
                      width="426"
                      height="146"
                      rx="12"
                      fill={panel}
                    />
                  )}
                  {label(x + 12, y, row.name, 21, 25)}
                  {design === "dumbbell" &&
                    Number.isFinite(row.previousValue) && (
                      <>
                        <line
                          x1={320 + (row.previousValue / 50) * 430}
                          x2={320 + (row.value / 50) * 430}
                          y1={y - 7}
                          y2={y - 7}
                          stroke={row.color}
                          strokeWidth="4"
                        />
                        <circle
                          cx={320 + (row.previousValue / 50) * 430}
                          cy={y - 7}
                          r="8"
                          fill={bg}
                          stroke={row.color}
                          strokeWidth="3"
                        />
                        <circle
                          cx={320 + (row.value / 50) * 430}
                          cy={y - 7}
                          r="8"
                          fill={row.color}
                        />
                      </>
                    )}
                  {["diverging", "change-poster"].includes(design) && (
                    <>
                      <path
                        d={`M560 ${y - 26}v44`}
                        stroke={grid}
                        strokeWidth="2"
                      />
                      {delta !== null && (
                        <rect
                          x={560 + (Math.min(0, delta) / extent) * 180}
                          y={y - 22}
                          width={(Math.abs(delta) / extent) * 180}
                          height="28"
                          fill={changeColor}
                        />
                      )}
                    </>
                  )}
                  {design === "change-table" &&
                    text(
                      480,
                      y,
                      `${fmt(row.previousValue)} → ${fmt(row.value)} %`,
                      22,
                      { textAnchor: "middle" },
                    )}
                  {design === "native" &&
                    text(645, y, `${fmt(row.value)}%`, 28, {
                      fontWeight: 700,
                      textAnchor: "end",
                    })}
                  {text(
                    card ? x + 14 : 908,
                    card ? y + 86 : y,
                    `${signed(delta)} pp`,
                    card ? 43 : 26,
                    {
                      textAnchor: card ? "start" : "end",
                      fill: changeColor,
                      fontWeight: 700,
                    },
                  )}
                </g>
              );
            })}
          {!ordered.length &&
            text(
              480,
              top + 120,
              l(
                "Keine Daten ausgewählt",
                "No data selected",
                "No hay datos seleccionados",
              ),
              28,
              { textAnchor: "middle" },
            )}
        </g>
        {((seats &&
          ["hemicycle", "waffle", "ring", "strip"].includes(design)) ||
          (approval && design === "strip")) && (
          <g data-editor-target="color">
            {ordered.map((row, i) => (
              <g
                key={row.id}
                data-editor-target="legend"
                data-legend-id={row.id}
                data-layout-width="284"
                data-layout-height={hasSeatLegend ? "36" : "23"}
                transform={`translate(${48 + (i % 3) * 294},${hasSeatLegend ? legendTop + Math.floor(i / 3) * 38 : bottom + Math.floor(i / 3) * 25 - 65})`}
              >
                <circle cx="7" cy="-6" r="6" fill={row.color} />
                {text(
                  22,
                  0,
                  `${row.name} ${fmt(row.value)}${approval ? "%" : ""}`,
                  17,
                  { 'data-text-width': 262 },
                )}
              </g>
            ))}
          </g>
        )}
        <g data-editor-target="output">
          <path d={`M48 ${bottom + 22}H912`} stroke={grid} />
          {text(
            48,
            bottom + 49,
            seats || majority
              ? `${total} ${l("Sitze · Sainte-Laguë · ab 5% · Mehrheit", "seats · Sainte-Laguë · 5% threshold · majority", "escaños · Sainte-Laguë · umbral 5% · mayoría")}: ${threshold}`
              : approval
                ? l(
                    "Originalanteile · übrige Antworten nicht neu verteilt",
                    "Original shares · remaining answers are not redistributed",
                    "Porcentajes originales · no se redistribuyen otras respuestas",
                  )
                : l(
                    "Differenz in Prozentpunkten · keine Veränderung in Prozent",
                    "Difference in percentage points · not percent change",
                    "Diferencia en puntos porcentuales · no variación porcentual",
                  ),
            16,
            { fill: muted },
          )}
          {text(
            48,
            bottom + 73,
            majority
              ? l(
                  "Rechnerische Kombinationen, keine Koalitionsprognose.",
                  "Mathematical combinations, not a coalition forecast.",
                  "Combinaciones matemáticas, no un pronóstico de coaliciones.",
                )
              : seats
                ? l(
                    "Vereinfachtes Modell ohne Wahlkreise und Grundmandatsklausel.",
                    "Simplified model without constituencies or basic-mandate exception.",
                    "Modelo simplificado sin circunscripciones ni excepción de mandatos directos.",
                  )
                : approval
                  ? l(
                      "Frage und Methode: forschungsgruppe.de",
                      "Question and methodology: forschungsgruppe.de",
                      "Pregunta y metodología: forschungsgruppe.de",
                    )
                  : design === "dumbbell"
                    ? l(
                        "Hohl: Vergleichswert · Voll: aktueller Wert",
                        "Hollow: comparison · solid: current",
                        "Hueco: comparación · sólido: actual",
                      )
                    : "",
            16,
            { fill: muted },
          )}
          <a
            href={svgRef ? snapshot.sourceUrl : undefined}
            target="_blank"
            rel="noreferrer"
          >
            {text(
              48,
              bottom + 99,
              approval
                ? snapshot.source
                : "DAWUM · dawum.de · ODbL 1.0: odbl.dawum.de",
              16,
              { fill: muted },
            )}
          </a>
        </g>
        <g data-editor-target="note">
          {state.editorNote &&
            notes.map((line, i) =>
              text(
                textX(state.noteAlign),
                bottom + 130 + i * (state.noteSize * 1.45),
                line,
                state.noteSize,
                {
                  key: i,
                  fill: muted,
                  textAnchor: textAnchor(state.noteAlign),
                },
              ),
            )}
        </g>
      </g>
    </StudioSvg>
  );
});
