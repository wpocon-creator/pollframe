const ALLOWED_EVENTS = new Set([
  "install_prompt_accepted",
  "install_completed",
  "ios_install_instructions_opened",
  "app_opened_standalone",
  "engaged_60_seconds",
  "country_switch_de",
  "country_switch_uk",
  "country_switch_es",
  "country_switch_all",
  "view_country_de",
  "view_country_uk",
  "view_country_es",
  "view_country_all",
  "view_history_de",
  "view_history_uk",
  "view_history_es",
  "view_map_de",
  "view_map_uk",
  "view_map_es",
  "view_issues_uk",
  "view_issues_es",
  "view_approval_de",
  "view_watchlist",
  "png_dialog_opened",
  "png_export_downloaded",
  "png_export_shared",
  "share_dialog_opened",
  "share_link_copied",
  "embed_code_copied",
  "source_note_copied",
  "csv_downloaded",
]);

const sentOnce = new Set();

export function trackAggregateEvent(event) {
  if (!import.meta.env.PROD || !ALLOWED_EVENTS.has(event)) return false;
  if (window.location.protocol !== "https:") return false;
  if (document.documentElement.dataset.embed === "true") return false;

  const body = JSON.stringify({ event });
  try {
    if (navigator.sendBeacon?.("/api/analytics", new Blob([body], { type: "application/json" }))) return true;
  } catch {
    // Some browsers reject Blob-backed beacons under a strict CSP. The request below is equivalent.
  }

  fetch("/api/analytics", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
    keepalive: true,
    credentials: "same-origin",
  }).catch(() => {});
  return true;
}

export function trackAggregateEventOnce(event, scope = event) {
  const key = `${event}:${scope}`;
  if (sentOnce.has(key)) return false;
  const sent = trackAggregateEvent(event);
  if (sent) sentOnce.add(key);
  return sent;
}
