import { studioCapabilities } from "./studio-capabilities.js";
import StudioRange from "./studio-range.jsx";
import StudioColour from "./studio-colour.jsx";
import React, { lazy, Suspense, useEffect, useRef, useState } from "react";
import {
  EDIT_DEFAULTS,
  EDIT_BAR_DESIGNS,
  EDIT_AXIS_DESIGNS,
} from "./studio-edit-model.js";
import { readBackground } from "./studio-background.js";
import {
  STUDIO_TEMPLATES,
  STUDIO_PARTIES,
  studioText,
} from "./studio-model.js";
import { isTimelineTopic } from "./studio-extra-model.js";
import { StudioChoice } from "./studio-choice.jsx";
import StudioFontButton from "./studio-font-picker.jsx";
import EventControls from "./studio-event-controls.jsx";
import TextControls from "./studio-text-controls.jsx";
import {resetStylePatch} from "./studio-style-model.js";
import StudioDataControls from './studio-data-controls.jsx';
const HistoryControls = lazy(() => import("./studio-history-controls.jsx"));

export function StudioEditorControls({
  state,
  template,
  snapshot,
  update,
  backgroundImage,
  setBackgroundImage,
  l,
  selection,
  session,
  contextual = false,
}) {
  const capabilities = studioCapabilities(template);
  const historical = isTimelineTopic(template.topic),
    approval = template.topic.startsWith("approval"),
    composition = ["seats", "majority", "approval-current", "map"].includes(
      template.topic,
    );
  const historyPoints =
    state.mode === "trend" || state.mode === "both"
      ? snapshot?.trend
      : snapshot?.averages;
  const rows = historical
    ? (snapshot?.rows || [])
        .map((row) => ({
          ...row,
          value: historyPoints?.findLast((p) =>
            Number.isFinite(p.results?.[row.id]),
          )?.results[row.id],
        }))
        .filter((row) => Number.isFinite(row.value))
    : snapshot?.rows || [];
  const [message, setMessage] = useState("");
  const importVersion = useRef(0);
  const [panel, setPanel] = useState("text"),
    [textPart, setTextPart] = useState("headline");
  useEffect(() => {
    if (!selection || ["none", "element"].includes(selection.target))
      return;
    const target = selection.target;
    setPanel(
      ["subtitle", "note", "output"].includes(target)
        ? "text"
        : target === "events"
          ? "events"
          : target,
    );
    if (["text", "subtitle", "note", "output"].includes(target))
      setTextPart(
        { text: "headline", subtitle: "subtitle", note: "editorNote", output:"sources" }[target],
      );
  }, [selection?.target,selection?.revision]);
  const selectedRows = rows
    .filter(
      (row) =>
        composition ||
        approval ||
        template.topic === "party" ||
        (state.parties === null
          ? !historical || snapshot.selectedParties?.includes(row.id)
          : state.parties.split(",").includes(String(row.id))),
    )
    .sort((a, b) =>
      state.order === "name"
        ? a.name.localeCompare(b.name, state.lang)
        : b.value - a.value,
    );
  useEffect(
    () => () => {
      importVersion.current++;
    },
    [],
  );
  const change = update;
  const palette = Object.fromEntries(
    (state.palette || "")
      .split(",")
      .filter(Boolean)
      .map((item) => item.split(":")),
  );
  return (
    <aside
      className="studio-tools"
      aria-label={l("Grafik bearbeiten", "Edit graphic", "Editar gráfica")}
    >
      {!contextual && (
        <nav
          className="studio-editor-tabs"
          aria-label={l("Werkzeuge", "Tools", "Herramientas")}
        >
          {[
            ["text", l("Texte & Schrift", "Text & type", "Texto y tipografía")],
            [
              "data",
              l("Inhalt & Zeitraum", "Content & period", "Contenido y periodo"),
            ],
            ...(capabilities.events
              ? [["events", l("Ereignisse", "Events", "Acontecimientos")]]
              : []),
            ["chart", l("Diagramm", "Chart", "Gráfica")],
            [
              "color",
              l(
                "Farben & Hintergrund",
                "Colours & background",
                "Colores y fondo",
              ),
            ],
          ].map(([id, label]) => (
            <button
              key={id}
              type="button"
              aria-pressed={panel === id}
              onClick={() => setPanel(id)}
            >
              {label}
            </button>
          ))}
        </nav>
      )}
      <fieldset hidden={panel !== "text"}>
        <legend>{l("Text & Schrift", "Text & type", "Texto y tipografía")}</legend>
        <TextControls state={state} change={change} l={l} textPart={textPart} setTextPart={setTextPart} contextual={contextual} session={session} snapshot={snapshot}/>
      </fieldset>
      <fieldset hidden={panel !== "chart"}>
        <legend>{l("Diagramm", "Chart", "Gráfica")}</legend>
        {historical && snapshot && <Suspense fallback={<p>…</p>}><HistoryControls section="chart" state={state} snapshot={snapshot} template={template} change={change} l={l}/></Suspense>}

        {capabilities.order && (
          <label>
            {l("Reihenfolge", "Order", "Orden")}
            <StudioChoice
              value={state.order}
              onChange={(e) => change({ order: e.target.value })}
            >
              <option value="value">{l("Wert", "Value", "Valor")}</option>
              <option value="name">{l("Name", "Name", "Nombre")}</option>
            </StudioChoice>
          </label>
        )}
        {capabilities.highlight && (
          <label>
            {l("Partei hervorheben", "Highlight party", "Destacar partido")}
            <StudioChoice
              value={state.focusParty}
              onChange={(e) => change({ focusParty: e.target.value })}
            >
              <option value="">
                {template.design === "focus"
                  ? l(
                      "Automatisch: stärkste Partei",
                      "Automatic: leading party",
                      "Automático: partido con más apoyo",
                    )
                  : l("Keine", "None", "Ninguno")}
              </option>
              {rows.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.name}
                </option>
              ))}
            </StudioChoice>
          </label>
        )}
        {capabilities.precision && (
          <label>
            {l("Nachkommastellen", "Decimal places", "Decimales")}
            <StudioChoice
              value={state.precision}
              onChange={(e) => change({ precision: Number(e.target.value) })}
            >
              <option value="1">1</option>
              <option value="0">
                0 · {l("gerundet", "rounded", "redondeado")}
              </option>
            </StudioChoice>
            <small>
              {l(
                "Nur die Beschriftung wird gerundet, nicht die Balken oder Rohdaten.",
                "Only labels are rounded, not bars or raw data.",
                "Solo se redondean las etiquetas, no las barras ni los datos originales.",
              )}
            </small>
          </label>
        )}
        {capabilities.bars && (
          <label>
            {l("Balkendicke", "Bar thickness", "Grosor de barras")} ·{" "}
            {Math.round(state.barScale * 100)}%
            <StudioRange
              session={session}
              type="range"
              min="0.5"
              max="1.6"
              step="0.1"
              value={state.barScale}
              onChange={(e) => change({ barScale: Number(e.target.value) })}
            />
          </label>
        )}
        {capabilities.axis && (
          <label>
            {l("Skalenende", "Scale maximum", "Máximo de la escala")}
            <StudioChoice
              value={state.axisMax}
              onChange={(e) => change({ axisMax: Number(e.target.value) })}
            >
              <option value="0">
                {l("Automatisch", "Automatic", "Automático")}
              </option>
              {[40, 50, 75, 100].map((n) => (
                <option value={n} key={n}>
                  {n}%
                </option>
              ))}
            </StudioChoice>
            <small>
              {l(
                "Beginnt immer bei 0. Größere Werte erweitern die Skala automatisch.",
                "Always starts at 0. Higher values automatically expand the scale.",
                "Siempre empieza en 0. Los valores mayores amplían la escala automáticamente.",
              )}
            </small>
          </label>
        )}
        {capabilities.axis && (
          <label>
            {l(
              "Referenzlinie (%) · 0 = aus",
              "Reference line (%) · 0 = off",
              "Línea de referencia (%) · 0 = desactivada",
            )}
            <input
              type="number"
              min="0"
              max="100"
              step="0.5"
              value={state.reference}
              onChange={(e) => change({ reference: Number(e.target.value) })}
            />
            <small>
              {l(
                "Ein frei gewählter Vergleichswert, keine automatisch geprüfte Wahlhürde.",
                "A chosen comparison value, not an automatically verified electoral threshold.",
                "Un valor de comparación elegido, no un umbral electoral verificado automáticamente.",
              )}
            </small>
          </label>
        )}
      </fieldset>

      <fieldset hidden={panel !== "data"}>
        <legend>
          {l("Daten und Auswahl", "Data and selection", "Datos y selección")}
        </legend>
        {!approval&&<StudioDataControls state={state} snapshot={snapshot} template={template} change={change} l={l}/>}
        {template.topic === "map" && (
          <>
            <StudioChoice
              value={state.mapMode}
              onChange={(e) => change({ mapMode: e.target.value })}
            >
              <option value="leader">
                {l("Stärkste Partei", "Leading party", "Partido más votado")}
              </option>
              <option value="party">
                {l("Eine Partei", "One party", "Un partido")}
              </option>
              <option value="growth">
                {l("Zuwachs", "Growth", "Crecimiento")}
              </option>
            </StudioChoice>
            {state.mapMode === "party" && (
              <StudioChoice
                value={state.mapParty}
                onChange={(e) => change({ mapParty: e.target.value })}
              >
                {[
                  ["union", "CDU/CSU"],
                  ["2", "SPD"],
                  ["3", "FDP"],
                  ["4", "Grüne"],
                  ["5", "Linke"],
                  ["7", "AfD"],
                  ["23", "BSW"],
                ].map(([id, name]) => (
                  <option key={id} value={id}>
                    {name}
                  </option>
                ))}
              </StudioChoice>
            )}
          </>
        )}
        {approval && (
          <>
            <label>
              {l("Bewertung von", "Rating of", "Valoración de")}
              <StudioChoice
                value={state.metric}
                onChange={(e) =>
                  change({
                    metric: e.target.value,
                    parties: null,
                    approvalTerms: null,
                  })
                }
              >
                <option value="leader">
                  {l("Kanzler", "Chancellor", "Canciller")}
                </option>
                <option value="government">
                  {l("Regierung", "Government", "Gobierno")}
                </option>
              </StudioChoice>
            </label>
            {historical && (
              <label>
                {l("Antwort", "Answer", "Respuesta")}
                <StudioChoice
                  value={state.answer}
                  onChange={(e) => change({ answer: e.target.value })}
                >
                  <option value="positive">
                    {l("Eher gut", "Rather good", "Más bien bien")}
                  </option>
                  <option value="negative">
                    {l("Eher schlecht", "Rather bad", "Más bien mal")}
                  </option>
                  <option value="net">
                    {l("Nettobewertung", "Net rating", "Valoración neta")}
                  </option>
                </StudioChoice>
              </label>
            )}
          </>
        )}
        {template.topic === "party" && (
          <label>
            {l("Partei", "Party", "Partido")}
            <StudioChoice
              value={snapshot?.rows?.[0]?.slug || state.party}
              onChange={(e) => change({ party: e.target.value, parties: null })}
            >
              {STUDIO_PARTIES.de.filter(([id])=>(snapshot?.availableParties||snapshot?.rows||[]).some(p=>String(p.id)===String(id))).map(([id, slug, name]) => (
                <option key={id} value={slug}>
                  {name}
                </option>
              ))}
            </StudioChoice>
          </label>
        )}
        {historical && snapshot && (
          <Suspense fallback={<p>…</p>}>
            <HistoryControls
              state={state}
              snapshot={snapshot}
              template={template}
              change={change}
              l={l}
            />
          </Suspense>
        )}
        {template.topic === "majority" && (
          <>
            <p>
              {l(
                "Eigenes Bündnis auswählen; alle Sitze bleiben erhalten.",
                "Choose a combination; seat allocation is unchanged.",
                "Elige una combinación; se conserva el reparto de escaños.",
              )}
            </p>
            {rows.map((row) => (
              <label key={row.id}>
                <input
                  type="checkbox"
                  checked={(state.coalition || "")
                    .split(",")
                    .includes(String(row.id))}
                  onChange={(e) => {
                    const ids = new Set(
                      (state.coalition || "").split(",").filter(Boolean),
                    );
                    e.target.checked
                      ? ids.add(String(row.id))
                      : ids.delete(String(row.id));
                    change({ coalition: [...ids].join(",") });
                  }}
                />
                {row.name}
              </label>
            ))}
            <button
              className="secondary-button"
              onClick={() => change({ coalition: null })}
            >
              {l(
                "Vorgeschlagene Kombinationen",
                "Suggested combinations",
                "Combinaciones sugeridas",
              )}
            </button>
          </>
        )}
        {!composition && !approval && template.topic !== "party" && (
          <>
            {" "}
            <div>
              <h3>
                {l(
                  "Angezeigte Parteien",
                  "Displayed parties",
                  "Partidos mostrados",
                )}
              </h3>
              {rows.map((row) => (
                <label key={row.id}>
                  <input
                    type="checkbox"
                    checked={selectedRows.some((item) => item.id === row.id)}
                    onChange={(e) => {
                      const ids = new Set(
                        selectedRows.map((item) => String(item.id)),
                      );
                      e.target.checked
                        ? ids.add(String(row.id))
                        : ids.delete(String(row.id));
                      change({ parties: [...ids].join(",") });
                    }}
                  />
                  {row.name}
                </label>
              ))}
              <small>
                {historical
                  ? l(
                      "Nur ausgewählte Parteien erscheinen. Fehlende Werte werden nicht ergänzt.",
                      "Only selected parties appear. Missing values are not filled in.",
                      "Solo aparecen los partidos seleccionados. No se completan los valores ausentes.",
                    )
                  : l(
                      "Die Grafik kennzeichnet die Auswahl. Im Kreisdiagramm bleibt der Rest bis 100 % sichtbar.",
                      "The graphic identifies the selection. Pie charts retain the remainder to 100%.",
                      "La gráfica indica la selección. El gráfico circular conserva el resto hasta el 100%.",
                    )}
              </small>
            </div>
          </>
        )}
        {composition && (
          <small>
            {l(
              "Die Zusammensetzung bleibt vollständig. Werte und Nenner sind nicht veränderbar.",
              "The composition stays complete. Values and denominators cannot be edited.",
              "La composición permanece completa. No se pueden modificar los valores ni denominadores.",
            )}
          </small>
        )}
      </fieldset>
      <fieldset hidden={panel !== "color"}>
        <legend>{l("Farben", "Colours", "Colores")}</legend>
        {!state.background&&<StudioChoice value={state.theme} onChange={e=>change({theme:e.target.value})}><option value="light">{l("Hell","Light","Claro")}</option><option value="dark">{l("Dunkel","Dark","Oscuro")}</option></StudioChoice>}
        {state.background&&<button type="button" className="secondary-button studio-theme-restore" onClick={()=>change({background:""})}>{l("Standardhintergrund verwenden","Use theme background","Usar el fondo del tema")}</button>}
        <label>
          {l(
            "Grafikecken abrunden",
            "Round graphic corners",
            "Redondear las esquinas",
          )}{" "}
          · {state.cornerRadius}
          <StudioRange
            session={session}
            type="range"
            min="0"
            max="80"
            step="2"
            value={state.cornerRadius}
            onChange={(e) =>
              change({
                cornerRadius: Number(e.target.value),
                edges: Number(e.target.value) ? "rounded" : "sharp",
              })
            }
          />
        </label>
        {!["paper", "print"].includes(template.design) && (
          <label>
            <input
              type="checkbox"
              checked={state.monochrome}
              onChange={(e) => change({ monochrome: e.target.checked })}
            />
            {l(
              "Einfarbig / Druck",
              "Monochrome / print",
              "Monocromo / impresión",
            )}
          </label>
        )}
        {
          <div className="studio-color-row">
            {l("Hintergrund", "Background", "Fondo")}
            <StudioColour
              label={l("Hintergrund", "Background", "Fondo")}
              l={l}
              value={
                state.background ||
                (state.theme === "dark" ? "#101d2c" : "#ffffff")
              }
              onChange={(value) => change({ background: value })}
            />
          </div>
        }
        {template.topic !== "map" &&
          !["paper", "print"].includes(template.design) && (
            <details>
              <summary>
                {l(
                  "Parteifarben anpassen",
                  "Adjust party colours",
                  "Ajustar colores de partidos",
                )}
              </summary>
              {rows.map((row) => (
                <div className="studio-color-row" key={row.id}>
                  {row.name}
                  <StudioColour
                    label={row.name}
                    l={l}
                    value={
                      palette[row.id] ||
                      (/^#[a-f\d]{6}$/i.test(row.color) ? row.color : "#202428")
                    }
                    onChange={(value) =>
                      change({
                        palette: Object.entries({ ...palette, [row.id]: value })
                          .map(([id, v]) => `${id}:${v}`)
                          .join(","),
                      })
                    }
                  />
                </div>
              ))}
            </details>
          )}
      </fieldset>

      {
        <fieldset hidden={panel !== "color" && panel !== "image"}>
          <legend>
            {l(
              "Eigenes Hintergrundbild",
              "Your background image",
              "Tu imagen de fondo",
            )}
          </legend>
          {state.backgroundImage && (
            <label>
              {l("Bildanpassung", "Image fit", "Ajuste de imagen")}
              <StudioChoice
                value={state.imageFit}
                onChange={(e) => change({ imageFit: e.target.value })}
              >
                <option value="cover">
                  {l("Fläche füllen", "Fill area", "Rellenar")}
                </option>
                <option value="contain">
                  {l("Ganzes Bild", "Entire image", "Imagen completa")}
                </option>
              </StudioChoice>
            </label>
          )}
          <label className="studio-import-zone">
            <strong>
              ＋{" "}
              {l(
                "Hintergrund hier importieren",
                "Import background here",
                "Importar fondo aquí",
              )}
            </strong>
            <span>PNG · JPEG · WebP · AVIF · GIF · BMP</span>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/avif,image/gif,image/bmp"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file) return;
                const version = ++importVersion.current;
                try {
                  const image = await readBackground(file);
                  if (version === importVersion.current) {
                    change({ backgroundImage: image });
                    setMessage("");
                  }
                } catch {
                  if (version === importVersion.current)
                    setMessage(
                      l(
                        "Dieses Bild lässt sich nicht öffnen. PNG, JPEG, WebP, AVIF, GIF oder BMP bis 8 MB und 32 Megapixel verwenden.",
                        "Cannot open this image. Use PNG, JPEG, WebP, AVIF, GIF or BMP up to 8 MB and 32 megapixels.",
                        "No se puede abrir la imagen. Usa PNG, JPEG, WebP, AVIF, GIF o BMP de hasta 8 MB y 32 megapíxeles.",
                      ),
                    );
                }
              }}
            />
          </label>
          <small>
            {l(
              "Bleibt auf diesem Gerät, nur für PNG. GIF: ein Standbild. Hinter dem Text liegt eine helle bzw. dunkle Fläche für gute Lesbarkeit. Nutze nur Bilder, die du verwenden darfst.",
              "Stays on this device, PNG only. GIF: a still frame. A light or dark overlay protects readability. Only use images you have permission to use.",
              "Permanece en este dispositivo, solo para PNG. GIF: imagen fija. Una capa clara u oscura mantiene la legibilidad. Usa solo imágenes que tengas permiso para utilizar.",
            )}
          </small>
          {backgroundImage && (
            <button
              className="secondary-button"
              onClick={() => {
                importVersion.current++;
                change({ backgroundImage: "" });
              }}
            >
              {l("Bild entfernen", "Remove image", "Quitar imagen")}
            </button>
          )}
        </fieldset>
      }
      {capabilities.events && snapshot && (
        <fieldset hidden={panel !== "events"}>
          <legend>
            {l(
              "Ereignisse auswählen",
              "Choose events",
              "Elegir acontecimientos",
            )}
          </legend>
          <EventControls
            session={session}
            selectedEventId={selection?.eventId}
            state={state}
            snapshot={snapshot}
            template={template}
            change={change}
            l={l}
          />
        </fieldset>
      )}
      <p role="status">{message}</p>
      {!contextual&&<button
        className="secondary-button"
        onClick={() => {
          importVersion.current++;
          change(resetStylePatch());
        }}
      >
        {l("Stil zurücksetzen", "Reset style", "Restablecer estilo")}
      </button>}
    </aside>
  );
}
