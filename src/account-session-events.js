import { ACCOUNT_UI_ENABLED } from "./account-feature.js";
// Invalidate other tabs without sending an account ID, token or document.
// BroadcastChannel is origin-bound and retains no browsing history.
if (
  ACCOUNT_UI_ENABLED &&
  typeof window !== "undefined" &&
  typeof BroadcastChannel !== "undefined"
) {
  const channel = new BroadcastChannel("pollframe-account-state-v1");
  window.addEventListener("pollframe-account-changed", (event) => {
    if (!event.detail?.remote && event.detail?.notifyOtherTabs !== false)
      channel.postMessage({ type: "changed" });
  });
  channel.onmessage = (event) => {
    if (event.data?.type === "changed")
      window.dispatchEvent(
        new CustomEvent("pollframe-account-changed", {
          detail: { remote: true, recheck: true },
        }),
      );
  };
}
