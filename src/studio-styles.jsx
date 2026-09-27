import React, { useEffect, useRef, useState } from "react";
import StudioResourceDialog from "./studio-resource-dialog.jsx";
import { normalizeStyle, stylePatch } from "./studio-style-model.js";
import { listStyles, saveStyle, deleteStyle } from "./studio-style-library.js";
import { parseStyle, styleDocument, saveFile } from "./studio-editor-files.js";
import { STUDIO_FONTS, studioFont } from "./studio-fonts.js";
import { useStudioFont } from "./studio-font-loader.js";

export default function StudioStyles({ state, template, update, onClose, l }) {
  const [items, setItems] = useState([]),
    [draft, setDraft] = useState(() => normalizeStyle(state));
  const [id, setId] = useState(null),
    [name, setName] = useState(""),
    [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false),
    [ready, setReady] = useState(false),
    file = useRef(null);
  useStudioFont(draft.font);
  const failure = () =>
    setMessage(
      l(
        "Das hat nicht geklappt. Prüfe die Datei oder den freien Browser-Speicher. Deine Grafik wurde nicht verändert.",
        "Could not complete this action. Check the file or browser storage. Your graphic was not changed.",
        "No se pudo completar la acción. Comprueba el archivo o el espacio del navegador. La gráfica no ha cambiado.",
      ),
    );
  useEffect(() => {
    let active = true;
    listStyles()
      .then((rows) => {
        if (active) {
          setItems(rows);
          setReady(true);
        }
      })
      .catch(() => {
        if (active) failure();
      });
    return () => {
      active = false;
    };
  }, []);
  const edit = (patch) =>
    setDraft((current) => normalizeStyle({ ...current, ...patch }));
  const fresh = () => {
    setDraft(normalizeStyle(state));
    setName("");
    setId(null);
    setMessage("");
  };
  const field = (key, label, min, max, step = 1) => (
    <label>
      {label} <output>{draft[key]}</output>
      <input
        type="range"
        aria-label={label}
        min={min}
        max={max}
        step={step}
        value={draft[key]}
        onChange={(e) => edit({ [key]: Number(e.target.value) })}
      />
    </label>
  );
  async function persist() {
    if (busy || !name.trim()) return;
    setBusy(true);
    try {
      const record = await saveStyle(name, draft, id);
      setId(record.id);
      setItems(await listStyles());
      setMessage(
        l(
          "Stil gespeichert. In jeder Studio-Grafik unter Stile verfügbar.",
          "Style saved. Available under Styles in every Studio graphic.",
          "Estilo guardado. Disponible en Estilos en todas las gráficas de Studio.",
        ),
      );
    } catch {
      failure();
    } finally {
      setBusy(false);
    }
  }
  return (
    <StudioResourceDialog
      footer={<>
        <button className="primary-button" onClick={()=>{update(stylePatch(draft,template),true);onClose();}}>{l("Auf diese Grafik anwenden","Apply to this graphic","Aplicar a esta gráfica")}</button>
        <button className="secondary-button" disabled={busy || !name.trim()} onClick={persist}>{l("Stil speichern","Save style","Guardar estilo")}</button>
      </>}
      title={l("Stile", "Styles", "Estilos")}
      onClose={onClose}
      l={l}
      wide
    >
      <p>
        {l(
          "Ein Stil überträgt Schrift, Hintergrund, Ecken und Strichstärken – keine Daten, Texte, Parteifarben, Achsenskalierung oder Ereignisauswahl. Nicht passende Einstellungen werden beim Anwenden ausgelassen. Individuelle Elementanpassungen bleiben erhalten.",
          "A style transfers typography, background, corners and stroke widths—not data, text, party colours, axis scales or event selections. Incompatible settings are skipped. Individual element overrides are preserved.",
          "Un estilo transfiere tipografía, fondo, esquinas y grosor de trazos, no datos, textos, colores de partidos, escalas ni selección de acontecimientos. Se omiten ajustes incompatibles y se conservan los ajustes individuales de elementos.",
        )}
      </p>
      <div className="studio-style-layout">
        <aside
          className="studio-style-list"
          aria-label={l("Meine Stile", "My styles", "Mis estilos")}
        >
          <button className="secondary-button" onClick={fresh}>
            {l(
              "Neuer Stil aus dieser Grafik",
              "New style from this graphic",
              "Nuevo estilo de esta gráfica",
            )}
          </button>
          {ready && !items.length && (
            <p>
              {l(
                "Noch keine gespeicherten Stile.",
                "No saved styles yet.",
                "Todavía no hay estilos guardados.",
              )}
            </p>
          )}
          {items.map((item) => (
            <button
              key={item.id}
              className="studio-style-card"
              aria-pressed={id === item.id}
              onClick={() => {
                setId(item.id);
                setName(item.name);
                setDraft(normalizeStyle(item.style));
                setMessage("");
              }}
            >
              <span
                className="studio-style-chip"
                style={{
                  background:
                    item.style.background ||
                    (item.style.theme === "dark" ? "#171c24" : "#ffffff"),
                  color: item.style.theme === "dark" ? "#ffffff" : "#171c24",
                  borderRadius: Math.min(item.style.cornerRadius, 12),
                }}
              >
                Aa
              </span>
              {item.name}
            </button>
          ))}
          <button
            className="secondary-button"
            onClick={() => file.current.click()}
          >
            {l("Stil importieren", "Import style", "Importar estilo")}
          </button>
          <input
            ref={file}
            hidden
            type="file"
            accept=".json,application/json"
            onChange={async (e) => {
              const selected = e.target.files?.[0];
              e.target.value = "";
              if (!selected) return;
              try {
                if (selected.size > 20000) throw Error("size");
                const text = await selected.text();
                const next = parseStyle(text);
                setDraft(next);
                setName(
                  String(
                    JSON.parse(text).name ||
                      selected.name.replace(/\.json$/i, ""),
                  ).slice(0, 80),
                );
                setId(null);
                setMessage(
                  l(
                    "Importiert. Zum Behalten speichern; zum Übertragen anwenden.",
                    "Imported. Save to keep it; apply to update the graphic.",
                    "Importado. Guarda para conservarlo; aplica para actualizar la gráfica.",
                  ),
                );
              } catch {
                failure();
              }
            }}
          />
        </aside>
        <div className="studio-style-form">
          <div
            className="studio-style-sample"
            aria-label={l(
              "Stilvorschau – Beispieldarstellung",
              "Style preview—illustration",
              "Vista previa del estilo: ejemplo",
            )}
            style={{
              background:
                draft.background ||
                (draft.theme === "dark" ? "#171c24" : "#ffffff"),
              color: draft.theme === "dark" ? "#f6f7fa" : "#17212d",
              fontFamily: studioFont(draft.font),
              borderRadius: draft.cornerRadius,
              textAlign: draft.titleAlign,
            }}
          >
            <strong
              style={{
                fontSize: draft.titleSize * 0.7,
                fontWeight: draft.titleWeight,
              }}
            >
              {name || l("Dein Stil", "Your style", "Tu estilo")}
            </strong>
            <svg viewBox="0 0 300 65" aria-hidden="true">
              <rect
                x="0"
                y="12"
                width="130"
                height={12 * draft.barScale}
                fill="currentColor"
                opacity=".65"
              />
              <path
                d="M160 45 L195 32 L230 40 L270 14 L300 20"
                fill="none"
                stroke="currentColor"
                strokeWidth={draft.historyLineWidth}
              />
            </svg>
            <span>
              {l(
                "Stilprobe, keine Umfragedaten",
                "Style sample, not polling data",
                "Muestra de estilo, no datos de encuestas",
              )}
            </span>
          </div>
          <label>
            {l("Stilname", "Style name", "Nombre del estilo")}
            <input
              value={name}
              maxLength={80}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <div className="studio-style-pair">
            <label>
              {l("Schriftart", "Font", "Fuente")}
              <select
                aria-label={l("Schriftart", "Font", "Fuente")}
                value={draft.font}
                onChange={(e) => edit({ font: e.target.value })}
              >
                {draft.font.startsWith("custom-") && (
                  <option value={draft.font}>
                    {l(
                      "Eigene Schrift (lokal)",
                      "Custom font (local)",
                      "Fuente propia (local)",
                    )}
                  </option>
                )}
                {STUDIO_FONTS.map(([key, label]) => (
                  <option key={key} value={key}>
                    {key === "auto"
                      ? l("Je nach Design", "Design default", "Según el diseño")
                      : label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {l("Darstellung", "Appearance", "Apariencia")}
              <select
                aria-label={l("Darstellung", "Appearance", "Apariencia")}
                value={draft.theme}
                onChange={(e) => edit({ theme: e.target.value })}
              >
                <option value="light">{l("Hell", "Light", "Claro")}</option>
                <option value="dark">{l("Dunkel", "Dark", "Oscuro")}</option>
              </select>
            </label>
          </div>
          <div className="studio-style-pair">
            <label>
              {l("Hintergrundfarbe", "Background colour", "Color del fondo")}
              <input
                type="color"
                aria-label={l("Hintergrundfarbe", "Background colour", "Color del fondo")}
                value={
                  draft.background ||
                  (draft.theme === "dark" ? "#171c24" : "#ffffff")
                }
                onChange={(e) => edit({ background: e.target.value })}
              />
              <button
                className="secondary-button"
                onClick={() => edit({ background: "" })}
              >
                {l(
                  "Design-Hintergrund",
                  "Design background",
                  "Fondo del diseño",
                )}
              </button>
            </label>
            <label>
              {l("Textausrichtung", "Text alignment", "Alineación del texto")}
              <select
                aria-label={l("Textausrichtung", "Text alignment", "Alineación del texto")}
                value={draft.titleAlign}
                onChange={(e) =>
                  edit({
                    titleAlign: e.target.value,
                    subtitleAlign: e.target.value,
                    noteAlign: e.target.value,
                  })
                }
              >
                <option value="left">{l("Links", "Left", "Izquierda")}</option>
                <option value="center">{l("Mitte", "Centre", "Centro")}</option>
                <option value="right">{l("Rechts", "Right", "Derecha")}</option>
              </select>
            </label>
          </div>
          <div className="studio-style-pair">
            {field(
              "titleSize",
              l("Titelgröße", "Title size", "Tamaño del título"),
              24,
              64,
            )}
            {field(
              "subtitleSize",
              l("Unterzeilengröße", "Subtitle size", "Tamaño del subtítulo"),
              18,
              30,
            )}
            {field(
              "cornerRadius",
              l("Eckenrundung", "Corner radius", "Radio de esquinas"),
              0,
              80,
            )}
            {field(
              "barScale",
              l("Balkenstärke", "Bar thickness", "Grosor de barras"),
              0.5,
              1.6,
              0.05,
            )}
            {field(
              "historyLineWidth",
              l("Linienstärke", "Line width", "Grosor de líneas"),
              1,
              7,
              0.25,
            )}
            {field(
              "historyLabelSize",
              l(
                "Verlaufsbeschriftung",
                "Timeline label size",
                "Tamaño de etiquetas temporales",
              ),
              15,
              22,
            )}
          </div>
          {draft.font.startsWith("custom-") && (
            <p>
              {l(
                "Eigene Schriften müssen auf diesem Gerät importiert sein. Die Stildatei enthält keine Schriftdatei; Embed unterstützt eigene Schriften noch nicht.",
                "Custom fonts must be imported on this device. Style files do not include font files; embeds do not yet support custom fonts.",
                "Las fuentes propias deben importarse en este dispositivo. El estilo no incluye archivos de fuentes; las inserciones aún no las admiten.",
              )}
            </p>
          )}
          <div className="studio-style-actions">
            <button
              className="secondary-button"
              onClick={() =>
                saveFile(
                  JSON.stringify(
                    { ...styleDocument(draft), name: name.trim() },
                    null,
                    2,
                  ),
                  "application/json",
                  "pollframe-style.json",
                )
              }
            >
              {l(
                "Sicherung herunterladen",
                "Download backup",
                "Descargar copia",
              )}
            </button>
            {id && (
              <button
                className="secondary-button"
                disabled={busy}
                onClick={async () => {
                  if (
                    !confirm(
                      l(
                        "Diesen gespeicherten Stil löschen? Bereits gestaltete Grafiken bleiben unverändert.",
                        "Delete this saved style? Existing graphics stay unchanged.",
                        "¿Eliminar este estilo? Las gráficas existentes no cambian.",
                      ),
                    )
                  )
                    return;
                  setBusy(true);
                  try {
                    await deleteStyle(id);
                    setItems(await listStyles());
                    setId(null);
                  } catch {
                    failure();
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                {l("Löschen", "Delete", "Eliminar")}
              </button>
            )}
          </div>
        </div>
      </div>
      <p role="status">{message}</p>
      <p>
        {l(
          "Stile werden nur in diesem Browser gespeichert, nicht in einem Konto. Das Löschen der Website-Daten löscht sie ebenfalls. Lade für einen Gerätewechsel oder als Sicherung die Stildatei herunter. Hintergrundbilder sind kein Bestandteil eines Stils.",
          "Styles are stored only in this browser, not an account. Clearing site data deletes them. Download a backup to keep them or move to another device. Background images are not included in a style.",
          "Los estilos se guardan solo en este navegador, no en una cuenta. Al borrar los datos del sitio se eliminan. Descarga una copia para conservarlos o cambiar de dispositivo. Los estilos no incluyen imágenes de fondo.",
        )}
      </p>
    </StudioResourceDialog>
  );
}
