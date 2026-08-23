const ALLOWED_EVENTS = new Set([
  "install_prompt_accepted",
  "install_completed",
  "ios_install_instructions_opened",
  "country_switch_de",
  "country_switch_uk",
  "country_switch_es",
  "country_switch_all",
]);

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
