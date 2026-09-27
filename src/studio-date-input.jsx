import React, { useEffect, useState } from "react";
// Keep partial typing local. Native segmented date controls can commit a single
// digit immediately, moving focus before a user can type 10–31 or month 10–12.
export function parseStudioDate(value) {
  const text = String(value || "").trim();
  const parts = /^(\d{1,2})[./\s-](\d{1,2})[./\s-](\d{4})$/.exec(text);
  const iso = parts
    ? `${parts[3]}-${parts[2].padStart(2, "0")}-${parts[1].padStart(2, "0")}`
    : text;
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) &&
    Number.isFinite(Date.parse(iso)) &&
    new Date(iso).toISOString().slice(0, 10) === iso
    ? iso
    : "";
}
export default function StudioDateInput({
  value,
  onChange,
  label,
  required = false,
}) {
  const [draft, setDraft] = useState(value || "");
  useEffect(() => setDraft(value || ""), [value]);
  return (
    <input
      type="text"
      inputMode="numeric"
      aria-label={label}
      placeholder="DD.MM.YYYY"
      value={draft}
      required={required}
      onChange={(e) => {
        setDraft(e.target.value);
        e.target.setCustomValidity("");
      }}
      onBlur={(e) => {
        const iso = parseStudioDate(draft);
        e.target.setCustomValidity(
          draft && !iso ? "DD.MM.YYYY / YYYY-MM-DD" : "",
        );
        onChange(iso);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          e.currentTarget.blur();
        }
      }}
    />
  );
}
