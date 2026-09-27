import React, { lazy, Suspense, useState } from "react";
import Dialog from "./studio-resource-dialog.jsx";
import FontButton from "./studio-font-picker.jsx";
import StudioColour from "./studio-colour.jsx";
import { normalizeStyle } from "./studio-style-model.js";
import { saveStyle } from "./studio-style-library.js";
const StyleOptions = lazy(() => import("./studio-style-options.jsx"));

export default function StyleWizard({
  l,
  state = {},
  item,
  onClose,
  onSaved,
  preview,
}) {
  const [step, setStep] = useState(item ? 4 : 0),
    [draft, setDraft] = useState(() => normalizeStyle(item?.style || state));
  const [name, setName] = useState(item?.name || ""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(false);
  const [advanced, setAdvanced] = useState(false);
  const edit = (patch) =>
    setDraft((old) => normalizeStyle({ ...old, ...patch }));
  const labels = [
    l("Schriftart", "Font", "Fuente"),
    l("Hintergrund", "Background", "Fondo"),
    l("Textgrößen", "Text sizes", "Tamaños de texto"),
    l("Form & Linien", "Shape & strokes", "Forma y trazos"),
    l("Name & Übersicht", "Name & review", "Nombre y resumen"),
  ];
  const slider = (key, label, min, max, increment = 1) => (
    <label key={key}>
      {label} · {draft[key]}
      <input
        type="range"
        min={min}
        max={max}
        step={increment}
        value={draft[key]}
        onChange={(e) => edit({ [key]: Number(e.target.value) })}
      />
    </label>
  );
  const controls = (index) =>
    index === 0 ? (
      <FontButton
        value={draft.font}
        onChange={(font) => edit({ font })}
        l={l}
      />
    ) : index === 1 ? (
      <>
        {!draft.background && (
          <div className="studio-choice">
            {["light", "dark"].map((theme) => (
              <button
                key={theme}
                aria-pressed={draft.theme === theme}
                onClick={() => edit({ theme })}
              >
                {theme === "light"
                  ? l("Hell", "Light", "Claro")
                  : l("Dunkel", "Dark", "Oscuro")}
              </button>
            ))}
          </div>
        )}
        <StudioColour
          label={l(
            "Eigene Hintergrundfarbe",
            "Custom background colour",
            "Color de fondo personalizado",
          )}
          value={
            draft.background || (draft.theme === "dark" ? "#191e25" : "#ffffff")
          }
          onChange={(background) => edit({ background })}
          l={l}
        />
        {draft.background && (
          <button
            type="button"
            className="text-button"
            onClick={() => edit({ background: "" })}
          >
            {l(
              "Standardhintergrund verwenden",
              "Use default background",
              "Usar fondo predeterminado",
            )}
          </button>
        )}
      </>
    ) : index === 2 ? (
      <>
        {slider("titleSize", l("Titel", "Title", "Título"), 24, 64)}
        {slider(
          "subtitleSize",
          l("Unterzeile", "Subtitle", "Subtítulo"),
          18,
          30,
        )}
        {slider("noteSize", l("Anmerkung", "Note", "Nota"), 16, 24)}
      </>
    ) : (
      <>
        {slider(
          "cornerRadius",
          l("Eckenrundung", "Corner radius", "Radio de esquinas"),
          0,
          80,
        )}
        {slider(
          "barScale",
          l("Balkenstärke", "Bar thickness", "Grosor de barras"),
          0.5,
          1.6,
          0.05,
        )}
        {slider(
          "historyLineWidth",
          l("Linienstärke", "Line width", "Grosor de líneas"),
          1,
          7,
          0.25,
        )}
        <svg
          viewBox="0 0 300 36"
          width="100%"
          height="36"
          role="img"
          aria-label={l(
            "Linienvorschau",
            "Line preview",
            "Vista previa de línea",
          )}
        >
          <path
            d="M8 27 L78 16 L145 23 L215 8 L292 15"
            fill="none"
            stroke="currentColor"
            strokeWidth={draft.historyLineWidth}
            strokeLinecap="round"
          />
        </svg>
      </>
    );
  async function save() {
    if (busy || !name.trim()) return;
    setBusy(true);
    setError(false);
    try {
      const result = await saveStyle(name, draft, item?.id);
      onSaved?.(result);
      onClose();
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog
      title={
        item
          ? l("Stil bearbeiten", "Edit style", "Editar estilo")
          : l("Neuen Stil erstellen", "Create a style", "Crear un estilo")
      }
      onClose={onClose}
      l={l}
      footer={
        <>
          {step > 0 && (
            <button
              onClick={() => setStep(step - 1)}
              className="secondary-button"
            >
              {l("Zurück", "Back", "Atrás")}
            </button>
          )}
          {step < 4 ? (
            <button
              className="primary-button"
              onClick={() => setStep(step + 1)}
            >
              {l("Weiter", "Next", "Siguiente")}
            </button>
          ) : (
            <button
              className="primary-button"
              disabled={!name.trim() || busy}
              onClick={save}
            >
              {l("Stil speichern", "Save style", "Guardar estilo")}
            </button>
          )}
        </>
      }
    >
      <progress
        max="5"
        value={step + 1}
        aria-label={l("Fortschritt", "Progress", "Progreso")}
      />
      <p>
        {step + 1}/5 · {labels[step]}
      </p>
      {preview && (
        <div className="studio-style-chart-preview">{preview(draft)}</div>
      )}
      <div className="studio-style-form">
        {step < 4 ? (
          controls(step)
        ) : (
          <>
            <label>
              {l("Stilname", "Style name", "Nombre del estilo")}
              <input
                autoFocus
                maxLength="80"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            {labels.slice(0, 4).map((label, index) => (
              <details key={label}>
                <summary>{label}</summary>
                {controls(index)}
              </details>
            ))}
            <button
              type="button"
              className="secondary-button"
              aria-expanded={advanced}
              onClick={() => setAdvanced(!advanced)}
            >
              {l(
                "Erweiterte Optionen",
                "Advanced options",
                "Opciones avanzadas",
              )}
            </button>
            {advanced && (
              <Suspense
                fallback={
                  <p>
                    {l(
                      "Optionen laden…",
                      "Loading options…",
                      "Cargando opciones…",
                    )}
                  </p>
                }
              >
                <StyleOptions draft={draft} edit={edit} l={l} />
              </Suspense>
            )}
          </>
        )}
      </div>
      <p>
        {l(
          "Ohne Änderung bleiben die Vorgaben erhalten. Der Stil speichert nur Gestaltung, keine Daten oder Texte.",
          "Skip any step to keep its defaults. Styles save presentation only, never data or wording.",
          "Sin cambios se conservan los valores predeterminados. Los estilos solo guardan el aspecto, no datos ni textos.",
        )}
      </p>
      {error && (
        <p role="alert">
          {l(
            "Speichern fehlgeschlagen. Bitte den Browserspeicher prüfen.",
            "Could not save. Please check browser storage.",
            "No se pudo guardar. Comprueba el almacenamiento del navegador.",
          )}
        </p>
      )}
    </Dialog>
  );
}
