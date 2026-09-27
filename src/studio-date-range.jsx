import React, { useEffect, useState } from "react";
import StudioDateInput from "./studio-date-input.jsx";
const day = (value) => Math.floor(Date.parse(value) / 86400000);
const iso = (value) => new Date(value * 86400000).toISOString().slice(0, 10);
export default function StudioDateRange({ state, snapshot, change, l }) {
  const max = day(snapshot.date || snapshot.end),
    min = day(
      snapshot.archiveStart ||
        (snapshot.kind === "approval" ? "1997-01-01" : "2017-01-01"),
    );
  const [dates, setDates] = useState({
    start: state.start || snapshot.start,
    end: state.end || snapshot.end,
  });
  useEffect(
    () =>
      setDates({
        start: state.start || snapshot.start,
        end: state.end || snapshot.end,
      }),
    [state.start, state.end, snapshot.start, snapshot.end],
  );
  const start = Math.max(min, Math.min(max, day(dates.start) || min)),
    end = Math.max(start, Math.min(max, day(dates.end) || max));
  const valid =
    dates.start &&
    dates.end &&
    dates.start < dates.end &&
    day(dates.end) <= max;
  const commit = () => {
    if (valid) change({ ...dates, range: "custom" });
  };
  return (
    <div className="studio-date-range">
      <output>
        {dates.start} — {dates.end}
      </output>
      <div
        className="studio-dual-range"
        style={{
          "--start": `${(100 * (start - min)) / (max - min)}%`,
          "--end": `${(100 * (end - min)) / (max - min)}%`,
        }}
      >
        <input
          type="range"
          aria-label={l(
            "Zeitraum: Anfang",
            "Period start",
            "Inicio del periodo",
          )}
          min={min}
          max={max}
          value={start}
          onChange={(e) =>
            setDates((d) => ({
              ...d,
              start: iso(Math.min(Number(e.target.value), end - 1)),
            }))
          }
          onPointerUp={commit}
          onKeyUp={commit}
          onBlur={commit}
        />
        <input
          type="range"
          aria-label={l("Zeitraum: Ende", "Period end", "Fin del periodo")}
          min={min}
          max={max}
          value={end}
          onChange={(e) =>
            setDates((d) => ({
              ...d,
              end: iso(Math.max(Number(e.target.value), start + 1)),
            }))
          }
          onPointerUp={commit}
          onKeyUp={commit}
          onBlur={commit}
        />
      </div>
      <details>
        <summary>
          {l(
            "Datum manuell eingeben",
            "Enter dates manually",
            "Introducir fechas manualmente",
          )}
        </summary>
        <div className="studio-manual-dates">
          {["start", "end"].map((key, i) => (
            <label key={key}>
              {i ? l("Bis", "To", "Hasta") : l("Von", "From", "Desde")}
              <StudioDateInput
                value={dates[key]}
                label={i ? l("Bis", "To", "Hasta") : l("Von", "From", "Desde")}
                onChange={(value) => setDates((d) => ({ ...d, [key]: value }))}
              />
            </label>
          ))}
        </div>
        <small>DD.MM.YYYY / YYYY-MM-DD</small>
        <button
          type="button"
          className="secondary-button"
          disabled={!valid}
          onClick={commit}
        >
          {l("Zeitraum anwenden", "Apply dates", "Aplicar fechas")}
        </button>
      </details>
    </div>
  );
}
