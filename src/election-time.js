export function electionRemaining(timestamp, locale = "de", now = Date.now()) {
  const remaining = Date.parse(timestamp) - now;
  if (!Number.isFinite(remaining)) return "—";
  const seconds = Math.max(0, Math.ceil(remaining / 1000));
  const days = Math.floor(seconds / 86400);
  const clock = [Math.floor(seconds / 3600) % 24, Math.floor(seconds / 60) % 60, seconds % 60]
    .map(value => String(value).padStart(2, "0")).join(":");
  return `${days ? `${days} ${locale === "de" ? "T" : "d"} · ` : ""}${clock}`;
}

export function electionAge(timestamp, locale = "de", now = Date.now()) {
  const elapsed = Math.max(0, now - Date.parse(timestamp));
  if (!Number.isFinite(elapsed)) return "—";
  const minutes = Math.floor(elapsed / 60000);
  if (minutes < 1) return locale === "de" ? "gerade eben" : locale === "es" ? "ahora mismo" : "just now";
  const unit = minutes < 60 ? "minute" : minutes < 1440 ? "hour" : "day";
  const value = unit === "minute" ? minutes : unit === "hour" ? Math.floor(minutes / 60) : Math.floor(minutes / 1440);
  return new Intl.RelativeTimeFormat(locale, { numeric: "always" }).format(-value, unit);
}
export function electionTimestamp(timestamp, locale = "de") {
  if (!Number.isFinite(Date.parse(timestamp))) return "—";
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Berlin" }).format(new Date(timestamp));
}
