// An opt-out preference, not an identifier. No IP address or user ID is stored.
export function analyticsExcluded() {
  // Never load analytics on account recovery/verification pages. This check
  // runs before the asynchronous account dialog removes the sensitive token.
  const accountQuery = new URLSearchParams(location.search);
  if (["token", "account", "code", "key"].some(key => accountQuery.has(key)) || /^\/(?:api|pf-ops|account|auth)(?:\/|$)/i.test(location.pathname)) return true;
  const choice = new URLSearchParams(location.search).get("analytics");
  try {
    if (choice === "off") localStorage.setItem("pollframe-analytics-off", "1");
    if (choice === "on") localStorage.removeItem("pollframe-analytics-off");
    if (localStorage.getItem("pollframe-analytics-off") === "1") return true;
  } catch { /* The current URL still works when storage is unavailable. */ }
  return choice === "off" || navigator.webdriver === true;
}
