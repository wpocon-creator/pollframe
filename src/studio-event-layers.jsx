import React from "react";

// A discrete decision, not a continuous visual property.
export default function EventLayers({ value, onChange, l }) {
  return <fieldset className="studio-event-layers">
    <legend>{l("Beschriftungsebenen", "Label layers", "Capas de etiquetas")}</legend>
    <div>{[0, 1, 2, 3, 4].map(n => <button key={n} type="button"
      aria-label={n === 0 ? l("Keine Beschriftungsebene", "No label layers", "Sin capas de etiquetas") : l(`${n} Beschriftungsebenen`, `${n} label layers`, `${n} capas de etiquetas`)}
      aria-pressed={value === n} onClick={() => onChange(n)}>{n === 0 ? l("Keine", "None", "Ninguna") : n}</button>)}</div>
  </fieldset>;
}
