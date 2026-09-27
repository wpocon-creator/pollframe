import React, { useEffect, useRef, useState } from "react";
function rgbHsl(hex) {
  const [r, g, b] = [1, 3, 5].map(
      (i) => parseInt(hex.slice(i, i + 2), 16) / 255,
    ),
    max = Math.max(r, g, b),
    min = Math.min(r, g, b),
    d = max - min,
    l = (max + min) / 2;
  return [
    d === 0
      ? 0
      : (max === r
          ? (g - b) / d + (g < b ? 6 : 0)
          : max === g
            ? (b - r) / d + 2
            : (r - g) / d + 4) * 60,
    d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1)),
    l,
  ];
}
function hslHex(h, s, l) {
  const a = s * Math.min(l, 1 - l),
    f = (n) => {
      const k = (n + h / 30) % 12;
      return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))))
        .toString(16)
        .padStart(2, "0");
    };
  return "#" + f(0) + f(8) + f(4);
}
export default function StudioColour({ value, onChange: commit, label, l }) {
  const latest = useRef(commit),
    timer = useRef(null),
    pending = useRef(null);
  latest.current = commit;
  const [preview, setPreview] = useState(value);
  useEffect(() => {
    if (pending.current === null) setPreview(value);
  }, [value]);
  const flush = () => {
    clearTimeout(timer.current);
    timer.current = null;
    if (pending.current !== null) {
      const next = pending.current;
      pending.current = null;
      latest.current(next);
    }
  };
  useEffect(
    () => () => {
      clearTimeout(timer.current);
      if (pending.current !== null) latest.current(pending.current);
    },
    [],
  );
  const onChange = (next) => {
    setPreview(next);
    pending.current = next;
    if (timer.current === null) timer.current = setTimeout(flush, 80);
  };
  const safe = /^#[\da-f]{6}$/i.test(preview) ? preview : "#ffffff",
    [hex, setHex] = useState(safe),
    [h, s, light] = rgbHsl(safe);
  useEffect(() => setHex(safe), [safe]);
  const hue = (v) =>
    onChange(
      hslHex(Number(v), s || 0.7, light === 0 || light === 1 ? 0.5 : light),
    );
  const wheel = (e) => {
    const rect = e.currentTarget.getBoundingClientRect(),
      x = e.clientX - rect.left - rect.width / 2,
      y = e.clientY - rect.top - rect.height / 2;
    hue(((Math.atan2(y, x) * 180) / Math.PI + 450) % 360);
  };
  return (
    <div className="studio-colour-picker" onPointerUp={flush} onBlur={flush}>
      <div className="studio-colour-values">
        <input
          aria-label={label}
          type="color"
          value={safe}
          onChange={(e) => onChange(e.target.value)}
        />
        <input
          aria-label={`${label} HEX`}
          value={hex}
          maxLength="7"
          onChange={(e) => {
            setHex(e.target.value);
            if (/^#[\da-f]{6}$/i.test(e.target.value)) onChange(e.target.value);
          }}
          onBlur={() => setHex(safe)}
        />
      </div>
      <details>
        <summary>
          {l(
            "Farbkreis & Farbton",
            "Colour wheel & hue",
            "Círculo cromático y tono",
          )}
        </summary>
        <div
          className="studio-hue-wheel"
          role="slider"
          tabIndex="0"
          aria-label={l("Farbton", "Hue", "Tono")}
          aria-valuemin="0"
          aria-valuemax="359"
          aria-valuenow={Math.round(h)}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            wheel(e);
          }}
          onPointerMove={(e) => {
            if (e.currentTarget.hasPointerCapture(e.pointerId)) wheel(e);
          }}
          onKeyDown={(e) => {
            if (
              [
                "ArrowLeft",
                "ArrowDown",
                "ArrowRight",
                "ArrowUp",
                "Home",
                "End",
              ].includes(e.key)
            ) {
              e.preventDefault();
              hue(
                e.key === "Home"
                  ? 0
                  : e.key === "End"
                    ? 359
                    : (h +
                        (e.key === "ArrowLeft" || e.key === "ArrowDown"
                          ? -1
                          : 1) +
                        360) %
                      360,
              );
            }
          }}
        >
          <span style={{ background: safe }} />
        </div>
        <label>
          {l("Farbton (°)", "Hue (°)", "Tono (°)")}
          <input
            type="number"
            min="0"
            max="359"
            value={Math.round(h)}
            onChange={(e) => {
              if (e.target.value !== "")
                hue(Math.max(0, Math.min(359, Number(e.target.value))));
            }}
          />
        </label>
        {[
          ["Sättigung", "Saturation", "Saturación", s],
          ["Helligkeit", "Lightness", "Luminosidad", light],
        ].map(([de, en, es, v], i) => (
          <label key={en}>
            {l(de, en, es)}
            <input
              type="range"
              min="0"
              max="100"
              value={Math.round(v * 100)}
              onChange={(e) =>
                onChange(
                  hslHex(
                    h,
                    i === 0 ? Number(e.target.value) / 100 : s,
                    i === 1 ? Number(e.target.value) / 100 : light,
                  ),
                )
              }
            />
          </label>
        ))}
      </details>
    </div>
  );
}
