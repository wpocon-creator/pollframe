import React, { useMemo, useState } from "react";
import StudioSelect from "./studio-select.jsx";
import { MATCH_GRAPHICS, MATCH_DESIGNS } from "./party-match-templates.js";
import { MATCH_PARTIES } from "./party-match-data.js";
import { matchDesignSvg } from "./party-match-design.js";
import StudioFontButton from "./studio-font-picker.jsx";
import { MATCH_AXES } from "./party-match-spectrum.js";
import { topicRound } from "./party-match-topic-definitions.js";

export default function PersonalControls({
  doc,
  design,
  update,
  locale,
  c,
  l,
}) {
  const [tab, setTab] = useState("design"),
    s = (a, b, d) => (locale === "de" ? a : locale === "es" ? d : b);
  const change = (key, value) => update({ [key]: value });
  const select = (key, title, options) => (
    <div className="pm-select-field">
      <span>{title}</span>
      <StudioSelect
        aria-label={title}
        value={design[key]}
        onChange={(e) => change(key, e.target.value)}
      >
        {options.map(([v, n]) => (
          <option key={v} value={v}>
            {n}
          </option>
        ))}
      </StudioSelect>
    </div>
  );
  const range = (key, title, min, max, step = 1) => (
    <label>
      {title}
      <input
        aria-label={title}
        type="range"
        min={min}
        max={max}
        step={step}
        value={design[key]}
        onChange={(e) => change(key, e.target.value)}
      />
    </label>
  );
  const check = (key, title) => (
    <label className="pm-control-toggle">
      {title}
      <input
        type="checkbox"
        checked={design[key]}
        onChange={(e) => change(key, e.target.checked)}
      />
    </label>
  );
  const choices = MATCH_DESIGNS.filter(
    (t) =>
      t.graphic === design.graphic && (!doc.round || t.graphic !== "spectrum"),
  );
  const thumbs = useMemo(
    () =>
      Object.fromEntries(
        MATCH_DESIGNS.filter(
          (t) =>
            t.graphic === design.graphic &&
            (!doc.round || t.graphic !== "spectrum"),
        ).map((t) => [
          t.id,
          matchDesignSvg(
            { ...doc, locale },
            {
              style: t.id,
              graphic: t.graphic,
              party: design.party,
              other: design.other,
              dark: design.dark,
              format: design.format,
            },
          ).svg,
        ]),
      ),
    [
      doc,
      locale,
      design.graphic,
      design.party,
      design.other,
      design.dark,
      design.format,
    ],
  );
  const first = design.party === "none" ? doc.rows[0].slug : design.party;
  return (
    <>
      <nav
        className="pm-editor-sections"
        aria-label={s(
          "Editorbereiche",
          "Editor sections",
          "Secciones del editor",
        )}
      >
        {["design", "text", "appearance"].map((id, i) => (
          <button key={id} aria-pressed={tab === id} onClick={() => setTab(id)}>
            {
              [
                s("Diagramm", "Chart", "Gráfica"),
                s("Texte", "Text", "Textos"),
                s("Gestaltung", "Appearance", "Aspecto"),
              ][i]
            }
          </button>
        ))}
      </nav>
      {tab === "design" && (
        <>
          <fieldset>
            <legend>{s("Deine Grafik", "Your graphic", "Tu gráfica")}</legend>
            <label>
              {s("Grafiktyp", "Graphic type", "Tipo de gráfica")}
              <StudioSelect
                aria-label={s("Grafiktyp", "Graphic type", "Tipo de gráfica")}
                value={design.graphic}
                onChange={(e) =>
                  update({
                    graphic: e.target.value,
                    style: undefined,
                    title: "",
                    subtitle: "",
                  })
                }
              >
                {MATCH_GRAPHICS.filter(
                  (g) =>
                    (g.id === "ranking" || doc.insights) &&
                    (!doc.round || g.id !== "spectrum"),
                ).map((g) => (
                  <option value={g.id} key={g.id}>
                    {l(g.name)}
                  </option>
                ))}
              </StudioSelect>
            </label>
            {["topics", "spectrum", "duel"].includes(design.graphic) && (
              <label>
                {c("selectedParty")}
                <StudioSelect
                  aria-label={c("selectedParty")}
                  value={design.graphic === "spectrum" ? design.party : first}
                  onChange={(e) => change("party", e.target.value)}
                >
                  {design.graphic === "spectrum" && (
                    <option value="none">
                      {s(
                        "Nur meine Antworten",
                        "My answers only",
                        "Solo mis respuestas",
                      )}
                    </option>
                  )}
                  {MATCH_PARTIES.map((p) => (
                    <option value={p.slug} key={p.slug}>
                      {p.name}
                    </option>
                  ))}
                </StudioSelect>
              </label>
            )}
            {design.graphic === "duel" && (
              <label>
                {s("Zweite Partei", "Second party", "Segundo partido")}
                <StudioSelect
                  aria-label={s(
                    "Zweite Partei",
                    "Second party",
                    "Segundo partido",
                  )}
                  value={
                    design.other === first
                      ? MATCH_PARTIES.find((p) => p.slug !== first).slug
                      : design.other
                  }
                  onChange={(e) => change("other", e.target.value)}
                >
                  {MATCH_PARTIES.filter((p) => p.slug !== first).map((p) => (
                    <option value={p.slug} key={p.slug}>
                      {p.name}
                    </option>
                  ))}
                </StudioSelect>
              </label>
            )}
            {select("format", s("Format", "Format", "Formato"), [
              ["square", c("square")],
              ["portrait", c("portrait")],
              ["wide", c("wide")],
            ])}
            {design.graphic === "spectrum" &&
              ["spectrumX", "spectrumY"].map((key, i) => (
                <div className="pm-select-field" key={key}>
                  <span>
                    {s("Dimension", "Dimension", "Dimensión")} {i + 1}
                  </span>
                  <StudioSelect
                    aria-label={`${s("Dimension", "Dimension", "Dimensión")} ${i + 1}`}
                    value={design[key]}
                    onChange={(e) => {
                      const other = i === 0 ? "spectrumY" : "spectrumX";
                      update({
                        [key]: e.target.value,
                        ...(design[other] === e.target.value
                          ? { [other]: design[key] }
                          : {}),
                      });
                    }}
                  >
                    {MATCH_AXES.map((a) => (
                      <option key={a.id} value={a.id}>
                        {l(a.name)}
                      </option>
                    ))}
                  </StudioSelect>
                </div>
              ))}
          </fieldset>
          <fieldset>
            <legend>{c("style")}</legend>
            <div className="pm-style-grid">
              {choices.map((style) => (
                <button
                  className="pm-style-choice"
                  key={style.id}
                  aria-pressed={design.style === style.id}
                  onClick={() =>
                    update({
                      style: style.id,
                      ...(style.id === "editorial"
                        ? { font: "Georgia", fontKey: "serif" }
                        : {}),
                    })
                  }
                >
                  <img
                    alt=""
                    src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(thumbs[style.id])}`}
                  />
                  <span>{l(style.name)}</span>
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend>
              {s("Diagrammdetails", "Chart details", "Detalles de la gráfica")}
            </legend>
            {design.graphic === "ranking" &&
              range(
                "topN",
                s("Angezeigte Parteien", "Parties shown", "Partidos mostrados"),
                3,
                7,
              )}
            {[
              "pollframe",
              "editorial",
              "social",
              "ranking-dots",
              "ranking-columns",
              "ranking-cards",
              "ranking-rings",
              "topics-bars",
              "duel-bars",
              "duel-cards",
            ].includes(design.style) &&
              range(
                "barThickness",
                design.style === "ranking-columns"
                  ? s("Säulenbreite", "Column width", "Anchura de columnas")
                  : design.style === "ranking-rings"
                    ? s("Ringstärke", "Ring thickness", "Grosor de anillos")
                    : s("Balkenstärke", "Bar thickness", "Grosor de barras"),
                4,
                32,
              )}
            {(design.graphic === "spectrum" ||
              ["ranking-dots", "duel-bridge"].includes(design.style)) &&
              range(
                "pointSize",
                s("Markierungsgröße", "Marker size", "Tamaño de marcadores"),
                6,
                18,
              )}
            {["ranking-columns", "spectrum-plane", "duel-bridge"].includes(
              design.style,
            ) &&
              check(
                "grid",
                s(
                  "Orientierungslinien",
                  "Reference lines",
                  "Líneas de referencia",
                ),
              )}
            <label className="pm-control-toggle">
              {s("Kurze Parteinamen", "Short party names", "Nombres cortos")}
              <input
                type="checkbox"
                checked={design.labels === "short"}
                onChange={(e) =>
                  change("labels", e.target.checked ? "short" : "full")
                }
              />
            </label>
          </fieldset>
        </>
      )}
      {tab === "text" && (
        <>
          <fieldset>
            <legend>{s("Deine Texte", "Your text", "Tus textos")}</legend>
            <label>
              {c("graphicTitle")}
              <input
                maxLength={100}
                value={design.title}
                placeholder={
                  design.graphic === "ranking"
                    ? doc.round
                      ? l(topicRound(doc.round).resultTitle)
                      : c("resultsTitle")
                    : l(
                        MATCH_GRAPHICS.find((g) => g.id === design.graphic)
                          .name,
                      )
                }
                onChange={(e) => change("title", e.target.value)}
              />
            </label>
            <label>
              {c("subtitle")}
              <textarea
                maxLength={160}
                value={design.subtitle}
                onChange={(e) => change("subtitle", e.target.value)}
              />
            </label>
            <label>
              {s("Anmerkung", "Annotation", "Anotación")}
              <textarea
                maxLength={120}
                value={design.note}
                onChange={(e) => change("note", e.target.value)}
              />
            </label>
          </fieldset>
          <fieldset>
            <legend>{s("Typografie", "Typography", "Tipografía")}</legend>
            <StudioFontButton
              value={
                design.fontKey || (design.font === "Georgia" ? "serif" : "sans")
              }
              onChange={(fontKey) => change("fontKey", fontKey)}
              l={s}
            />
            {range("textScale", c("fontSize"), 0.85, 1.2, 0.05)}
            {range(
              "labelScale",
              s("Beschriftungsgröße", "Label size", "Tamaño de etiquetas"),
              0.85,
              1.35,
              0.05,
            )}
            {design.graphic !== "spectrum" &&
              design.style !== "topics-radar" &&
              range(
                "valueScale",
                s("Größe der Werte", "Value size", "Tamaño de valores"),
                0.85,
                1.5,
                0.05,
              )}
            {select(
              "titleAlign",
              s("Titelausrichtung", "Title alignment", "Alineación del título"),
              [
                ["start", s("Links", "Left", "Izquierda")],
                ["middle", s("Zentriert", "Centred", "Centrado")],
                ["end", s("Rechts", "Right", "Derecha")],
              ],
            )}
          </fieldset>
          <p className="pm-small">{c("lockedResult")}</p>
        </>
      )}
      {tab === "appearance" && (
        <fieldset>
          <legend>
            {s("Farben & Form", "Colours & shape", "Colores y forma")}
          </legend>
          {!design.background && check("dark", c("dark"))}
          <label>
            {s("Akzentfarbe", "Accent colour", "Color de acento")}
            <input
              type="color"
              value={design.accent}
              onChange={(e) => change("accent", e.target.value)}
            />
          </label>
          <label>
            {s(
              "Eigener Hintergrund",
              "Custom background",
              "Fondo personalizado",
            )}
            <input
              type="color"
              value={design.background || (design.dark ? "#15191f" : "#ffffff")}
              onChange={(e) => change("background", e.target.value)}
            />
          </label>
          {design.background && (
            <button
              className="pm-text-button"
              onClick={() => change("background", "")}
            >
              {s(
                "Hintergrund des Farbschemas verwenden",
                "Use theme background",
                "Usar fondo del tema",
              )}
            </button>
          )}
          {range("rounding", c("rounding"), 0, 64, 2)}
        </fieldset>
      )}
    </>
  );
}
