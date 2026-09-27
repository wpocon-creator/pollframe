import React from "react";
import { normalizeTextStyles, TEXT_ROLES } from "./studio-text-style.js";
import StudioFontButton from "./studio-font-picker.jsx";
import StudioRange from "./studio-range.jsx";
import StudioColour from "./studio-colour.jsx";
import StudioSelect from "./studio-select.jsx";
import { StudioChoice } from "./studio-choice.jsx";
export const textRoleLabels = (l) => ({
  headline: l("Titel", "Title", "Título"),
  subtitle: l("Unterzeile", "Subtitle", "Subtítulo"),
  editorNote: l("Anmerkung", "Note", "Nota"),
  labels: l("Parteien & Legende", "Parties & legend", "Partidos y leyenda"),
  values: l("Werte", "Values", "Valores"),
  axes: l("Achsen", "Axes", "Ejes"),
  sources: l("Quellen & Datenstand", "Sources & dates", "Fuentes y fechas"),
});
export default function TextControls({
  state,
  change,
  l,
  textPart,
  setTextPart,
  contextual,
  session,
  snapshot,
  styleOnly = false,
}) {
  const names = textRoleLabels(l),
    editable = ["headline", "subtitle", "editorNote"].includes(textPart),
    styles = normalizeTextStyles(state.textStyles),
    style = styles[textPart] || {};
  const set = (patch) =>
    change({
      textStyles: JSON.stringify({
        ...styles,
        [textPart]: { ...style, ...patch },
      }),
    });
  const prefix = {
    headline: "title",
    subtitle: "subtitle",
    editorNote: "note",
  }[textPart];
  return (
    <>
      {!contextual && (
        <label>
          {l("Textbereich", "Text element", "Elemento de texto")}
          <StudioSelect
            value={textPart}
            onChange={(e) => setTextPart(e.target.value)}
          >
            {TEXT_ROLES.map((role) => (
              <option key={role} value={role}>
                {names[role]}
              </option>
            ))}
          </StudioSelect>
        </label>
      )}
      {editable && !styleOnly ? (
        <label>
          {names[textPart]}
          <textarea
            rows="3"
            value={state[textPart]}
            maxLength={
              textPart === "headline"
                ? 100
                : textPart === "subtitle"
                  ? 160
                  : 180
            }
            placeholder={
              textPart === "headline"
                ? snapshot?.title ||
                  l("Eigene Überschrift", "Your headline", "Tu título")
                : l(
                    "Hier Text hinzufügen…",
                    "Add text here…",
                    "Añade texto aquí…",
                  )
            }
            onChange={(e) => change({ [textPart]: e.target.value })}
          />
        </label>
      ) : (
        <p className="studio-control-hint">
          {l(
            "Du kannst die Darstellung ändern. Wortlaut, Werte und Quellen bleiben unverändert.",
            "Change the presentation; wording, values and sources remain unchanged.",
            "Puedes cambiar el aspecto; el texto, los valores y las fuentes no cambian.",
          )}
        </p>
      )}
      <label>
        {l("Schriftgröße", "Text size", "Tamaño de texto")}
        <StudioRange
          session={session}
          min={
            editable
              ? textPart === "headline"
                ? 24
                : textPart === "subtitle"
                  ? 18
                  : 16
              : 85
          }
          max={
            editable
              ? textPart === "headline"
                ? 64
                : textPart === "subtitle"
                  ? 30
                  : 24
              : 135
          }
          value={
            editable
              ? state[prefix + "Size"]
              : Math.round((style.scale || 1) * 100)
          }
          onChange={(e) =>
            editable
              ? change({ [prefix + "Size"]: Number(e.target.value) })
              : set({ scale: Number(e.target.value) / 100 })
          }
        />
      </label>
      <StudioFontButton
        value={style.font || state.font}
        onChange={(font) => set({ font })}
        l={l}
      />
      <div className="studio-choice">
        <button
          type="button"
          aria-pressed={style.italic === true}
          onClick={() => set({ italic: !style.italic })}
        >
          <em>{l("Kursiv", "Italic", "Cursiva")}</em>
        </button>
        <button
          type="button"
          aria-pressed={
            (style.weight ||
              (textPart === "headline" ? state.titleWeight : 400)) >= 700
          }
          onClick={() =>
            set({
              weight:
                (style.weight ||
                  (textPart === "headline" ? state.titleWeight : 400)) >= 700
                  ? 400
                  : 700,
            })
          }
        >
          <strong>{l("Fett", "Bold", "Negrita")}</strong>
        </button>
      </div>
      <StudioColour
        label={l("Textfarbe", "Text colour", "Color del texto")}
        value={style.color || (state.theme === "dark" ? "#f4f7fb" : "#172130")}
        onChange={(color) => set({ color })}
        l={l}
      />
      {editable && (
        <StudioChoice
          value={state[prefix + "Align"]}
          onChange={(e) => change({ [prefix + "Align"]: e.target.value })}
        >
          <option value="left">{l("Links", "Left", "Izquierda")}</option>
          <option value="center">{l("Mitte", "Centre", "Centro")}</option>
          <option value="right">{l("Rechts", "Right", "Derecha")}</option>
        </StudioChoice>
      )}
      <small>
        {l(
          "Schriftänderungen gelten nur für diesen Textbereich. Lange Beschriftungen werden an ihren Platz angepasst.",
          "Typography changes apply to this text element. Long labels are fitted to their available space.",
          "Los cambios tipográficos solo afectan a este elemento. Las etiquetas largas se ajustan al espacio disponible.",
        )}
      </small>
    </>
  );
}
