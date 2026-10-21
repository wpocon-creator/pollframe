// Memory only. Capture before Studio sanitises its URL and before the optional
// account chunk loads. Never store recovery tokens in browser storage or logs.
let pending = null;
export function captureAccountRecovery(search, browser = globalThis.window) {
  const query = new URLSearchParams(search);
  if (!["reset", "sign-in"].includes(query.get("account"))) return;
  const token = query.get("token");
  pending =
    query.get("account") === "sign-in"
      ? { action: "sign-in" }
      : token && token.length <= 2048 && !query.has("error")
        ? { token }
        : { token: "", invalid: true };
  // Remove credentials before lazy chunks, analytics and configured links run.
  // The in-memory handoff survives Studio's own URL normalization.
  if (browser?.history && browser.location) {
    const url = new URL(browser.location.href);
    url.searchParams.delete("token");
    url.searchParams.delete("account");
    if (query.get("error") === "INVALID_TOKEN")
      url.searchParams.delete("error");
    browser.history.replaceState(browser.history.state, "", url);
  }
}
export const pendingAccountRecovery = () => pending;
export const clearAccountRecovery = () => {
  pending = null;
};
