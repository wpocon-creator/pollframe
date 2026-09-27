import React, { useEffect, useRef, useState } from "react";
// Keep native keyboard/touch behaviour; coalesce chart rendering, not the thumb.
export default function StudioRange({
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  session,
  onStart,
  onCommit,
  hideNumber = false,
  ...props
}) {
  const [draft, setDraft] = useState(Number(value));
  const [numberText, setNumberText] = useState(String(value));
  const typing = useRef(false);
  const pending = useRef(null),
    frame = useRef(0),
    active = useRef(false),
    latest = useRef();
  latest.current = { onChange, onCommit, onStart, session };
  useEffect(() => {
    if (pending.current === null) setDraft(Number(value));
    if (!typing.current) setNumberText(String(value));
  }, [value]);
  const begin = () => {
    if (active.current) return;
    active.current = true;
    latest.current.session?.begin();
    latest.current.onStart?.();
  };
  const flush = () => {
    cancelAnimationFrame(frame.current);
    if (pending.current !== null) {
      const next = pending.current;
      pending.current = null;
      latest.current.onChange?.({ target: { value: String(next) } });
    }
  };
  const end = () => {
    flush();
    if (!active.current) return;
    active.current = false;
    requestAnimationFrame(() => {
      if (latest.current.onCommit) latest.current.onCommit();
      else latest.current.session?.end();
    });
  };
  useEffect(
    () => () => {
      cancelAnimationFrame(frame.current);
      if (active.current) latest.current.session?.end();
    },
    [],
  );
  const change = (next) => {
    begin();
    setDraft(next);
    if (!typing.current) setNumberText(String(next));
    pending.current = next;
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(flush);
  };
  return (
    <span className="studio-range-control">
      <input
        {...props}
        type="range"
        min={min}
        max={max}
        step={step}
        value={draft}
        style={{
          "--range-fill": `${(100 * (draft - Number(min))) / (Number(max) - Number(min) || 1)}%`,
        }}
        onPointerDown={begin}
        onChange={(e) => change(Number(e.target.value))}
        onPointerUp={end}
        onPointerCancel={end}
        onKeyUp={end}
        onBlur={end}
      />
      {!hideNumber && <input
        className="studio-range-value"
        aria-label={`${props["aria-label"] || "Value"} (123)`}
        type="number"
        min={min}
        max={max}
        step={step}
        value={numberText}
        onFocus={() => {
          typing.current = true;
        }}
        onChange={(e) => {
          setNumberText(e.target.value);
          if (e.target.value === "") return;
          const n = Number(e.target.value);
          if (Number.isFinite(n) && n >= Number(min) && n <= Number(max))
            change(n);
        }}
        onBlur={() => {
          typing.current = false;
          const n =
            numberText.trim() === "" ? Number(value) : Number(numberText);
          const bounded = Math.max(
            Number(min),
            Math.min(Number(max), Number.isFinite(n) ? n : Number(value)),
          );
          const snapped = Number(
            (
              Number(min) +
              Math.round((bounded - Number(min)) / Number(step)) * Number(step)
            ).toFixed(5),
          );
          change(snapped);
          end();
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
        }}
      />}
    </span>
  );
}
