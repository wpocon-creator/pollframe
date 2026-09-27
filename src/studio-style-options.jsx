import React, { useEffect, useRef, useState } from "react";
import StudioRange from "./studio-range.jsx";
import StudioSelect from "./studio-select.jsx";
import { searchRows } from "./studio-search-core.js";
import TextControls, { textRoleLabels } from "./studio-text-controls.jsx";
import { TEXT_ROLES } from "./studio-text-style.js";
const numbers = [
  ["titleSize", ["Titelgröße", "Title size", "Tamaño del título"], 24, 64],
  [
    "subtitleSize",
    ["Unterzeilengröße", "Subtitle size", "Tamaño del subtítulo"],
    18,
    30,
  ],
  ["noteSize", ["Anmerkungsgröße", "Note size", "Tamaño de nota"], 16, 24],
  [
    "titleLeading",
    ["Titel: Zeilenabstand", "Title line spacing", "Interlineado del título"],
    1.35,
    1.5,
    0.05,
  ],
  [
    "cornerRadius",
    ["Eckenrundung", "Corner radius", "Radio de esquinas"],
    0,
    80,
  ],
  [
    "barScale",
    ["Balkenstärke", "Bar thickness", "Grosor de barras"],
    0.5,
    1.6,
    0.05,
  ],
  [
    "historyLineWidth",
    ["Linienstärke", "Line width", "Grosor de líneas"],
    1,
    7,
    0.25,
  ],
  [
    "historyPointSize",
    ["Punktgröße", "Point size", "Tamaño de puntos"],
    1,
    5,
    0.25,
  ],
  [
    "historyLabelSize",
    [
      "Zeitachse: Beschriftungsgröße",
      "Timeline label size",
      "Tamaño de etiquetas temporales",
    ],
    15,
    22,
  ],
];
export default function StyleOptions({ draft, edit, l }) {
  const section = useRef(null);
  useEffect(() => { section.current?.scrollIntoView({block:'start'}); }, []);
  const [query, setQuery] = useState("");
  const items = [
    ...numbers.map(([key, label, min, max, step = 1]) => ({
      key,
      label,
      control: (
        <StudioRange
          min={min}
          max={max}
          step={step}
          value={draft[key]}
          onChange={(e) => edit({ [key]: Number(e.target.value) })}
        />
      ),
    })),
    ...[
      [
        "titleAlign",
        ["Titel ausrichten", "Title alignment", "Alineación del título"],
      ],
      [
        "subtitleAlign",
        [
          "Unterzeile ausrichten",
          "Subtitle alignment",
          "Alineación del subtítulo",
        ],
      ],
      [
        "noteAlign",
        ["Anmerkung ausrichten", "Note alignment", "Alineación de nota"],
      ],
    ].map(([key, label]) => ({
      key,
      label,
      control: (
        <StudioSelect
          value={draft[key]}
          onChange={(e) => edit({ [key]: e.target.value })}
        >
          <option value="left">{l("Links", "Left", "Izquierda")}</option>
          <option value="center">{l("Mitte", "Centre", "Centro")}</option>
          <option value="right">{l("Rechts", "Right", "Derecha")}</option>
        </StudioSelect>
      ),
    })),
    ...[
      ["showGrid", ["Rasterlinien", "Gridlines", "Cuadrícula"]],
      [
        "monochrome",
        ["Einfarbiger Druck", "Monochrome print", "Impresión monocroma"],
      ],
    ].map(([key, label]) => ({
      key,
      label,
      control: (
        <input
          type="checkbox"
          checked={draft[key]}
          onChange={(e) => edit({ [key]: e.target.checked })}
        />
      ),
    })),
    {
      key: "historyEventStyle",
      label: ["Ereignislinien", "Event lines", "Líneas de acontecimientos"],
      control: (
        <StudioSelect
          value={draft.historyEventStyle}
          onChange={(e) => edit({ historyEventStyle: e.target.value })}
        >
          <option value="line">{l("Durchgezogen", "Solid", "Continua")}</option>
          <option value="dashed">
            {l("Gestrichelt", "Dashed", "Discontinua")}
          </option>
          <option value="band">
            {l("Hinterlegtes Band", "Shaded band", "Franja sombreada")}
          </option>
        </StudioSelect>
      ),
    },
    ...TEXT_ROLES.map((role) => ({
      key: role,
      label: [
        textRoleLabels(l)[role],
        role,
        "font typography text colour color italic cursive schrift farbe kursiv",
      ],
      control: (
        <TextControls
          state={{ ...draft, headline: "", subtitle: "", editorNote: "" }}
          textPart={role}
          contextual
          styleOnly
          change={edit}
          l={l}
        />
      ),
    })),
  ];
  const found = searchRows(
    items,
    query,
    (item) => item.label.join(" ") + " " + item.key,
  );
  return (
    <section className="studio-style-advanced" ref={section}>
      <h3>
        {l(
          "Erweiterte Stileinstellungen",
          "Advanced style settings",
          "Ajustes avanzados del estilo",
        )}
      </h3>
      <label>
        {l("Einstellung suchen", "Find a setting", "Buscar un ajuste")}
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={l(
            "Schrift, Quellen, Linien, Ecken…",
            "Font, sources, lines, corners…",
            "Fuente, líneas, esquinas…",
          )}
        />
      </label>
      <p>
        {l(
          "Gestaltung für alle Grafiktypen. Nicht passende Optionen werden beim Anwenden ausgelassen. Daten, Texte, Zeiträume und Ereignisauswahl gehören zum Design, nicht zum Stil.",
          "Appearance across chart types. Incompatible options are skipped when applied. Data, wording, periods and event choices belong to the design, not the style.",
          "Aspecto para todos los tipos de gráficas. Se omiten las opciones incompatibles. Los datos, textos, periodos y selección de acontecimientos pertenecen al diseño, no al estilo.",
        )}
      </p>
      {found.map((item) => (
        <details key={item.key} open={query ? true : undefined}>
          <summary>
            {Array.isArray(item.label) &&
            item.label.length === 3 &&
            !TEXT_ROLES.includes(item.key)
              ? l(...item.label)
              : item.label[0]}
          </summary>
          {item.control}
        </details>
      ))}
      {!found.length && (
        <p>
          {l(
            "Keine passende Einstellung.",
            "No matching setting.",
            "Ningún ajuste coincide.",
          )}
        </p>
      )}
    </section>
  );
}
