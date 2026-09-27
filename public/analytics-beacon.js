import { analyticsExcluded } from "./analytics-preference.js";

// Local previews must never pollute the live property's statistics, even when
// opened manually (navigator.webdriver is false in the user's own browser).
const publicHost = ["pollframe.com", "www.pollframe.com", "de.pollframe.workers.dev"].includes(location.hostname);
if (publicHost && !analyticsExcluded()) {
  const token = document.querySelector("script[data-pollframe-beacon]")?.dataset.pollframeBeacon;
  if (/^[a-f0-9]{32}$/.test(token || "")) {
    const source = "https://static.cloudflareinsights.com/beacon.min.js";
    const policy = window.trustedTypes?.createPolicy("pollframe-analytics", {
      createScriptURL(value) { if (value !== source) throw new TypeError("Unexpected analytics source"); return value; },
    });
    const script = document.createElement("script");
    script.type = "module";
    script.src = policy ? policy.createScriptURL(source) : source;
    script.dataset.cfBeacon = JSON.stringify({ token });
    document.head.append(script);
  }
}
