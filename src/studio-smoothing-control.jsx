import React from "react";
import StudioRange from "./studio-range.jsx";
import { smoothingExplanation } from "./studio-smoothing.js";

export default function SmoothingControl({ state, snapshot, change, l }) {
  const active = ["trend", "both"].includes(state.mode);
  const options = [
    ["none", l("Keine", "None", "Ninguno")],
    ["light", l("Leicht", "Light", "Leve")],
    ["medium", l("Mittel", "Medium", "Medio")],
    ["strong", l("Stark", "Strong", "Fuerte")],
  ];
  return (
    <div className="studio-smoothing-control">
      <label>
        {l("Linienglättung", "Line smoothing", "Suavizado de líneas")}
        <StudioRange
          hideNumber
          min={0}
          max={3}
          step={1}
          aria-label={l(
            "Linienglättung",
            "Line smoothing",
            "Suavizado de líneas",
          )}
          value={
            state.historySmoothing === "auto"
              ? 2
              : Math.max(
                  0,
                  options.findIndex(([id]) => id === state.historySmoothing),
                )
          }
          disabled={!active}
          aria-valuetext={
            state.historySmoothing === "auto"
              ? l("Automatisch", "Automatic", "Automático")
              : options.find(([id]) => id === state.historySmoothing)?.[1]
          }
          onChange={(e) =>
            change({ historySmoothing: options[Number(e.target.value)][0] })
          }
        />
        <output>
          {state.historySmoothing === "auto"
            ? l(
                "Automatisch (Pollframe)",
                "Automatic (Pollframe)",
                "Automático (Pollframe)",
              )
            : options.find(([id]) => id === state.historySmoothing)?.[1]}
        </output>
      </label>
      <button
        type="button"
        className="secondary-button"
        disabled={!active}
        aria-pressed={state.historySmoothing === "auto"}
        onClick={() => change({ historySmoothing: "auto" })}
      >
        {l(
          "Automatisch glätten",
          "Automatic smoothing",
          "Suavizado automático",
        )}
      </button>
      <small>
        {active
          ? smoothingExplanation(snapshot, state.lang)
          : l(
              "Glättung gilt nur für Trendlinien, nicht für Messpunkte oder verbundene Mittelwerte.",
              "Smoothing applies to trend lines, not measurement dots or connected averages.",
              "El suavizado solo se aplica a tendencias, no a puntos de medición ni medias conectadas.",
            )}
      </small>
      {!active && (
        <button
          type="button"
          className="secondary-button"
          onClick={() => change({ mode: "trend" })}
        >
          {l(
            "Trendlinie verwenden",
            "Use trend line",
            "Usar línea de tendencia",
          )}
        </button>
      )}
    </div>
  );
}
