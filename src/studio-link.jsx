import React from "react";
import { routeQueryForLocation } from "./public-routes.js";
import { isGermanRegion } from "./german-region-ids.js";

export function StudioLink({
  sourceUrl,
  profile = "chart",
  locale = "de",
  element = null,
  context = {},
}) {
  profile =
    { approval: "approval-history", "party-grid": "tendencies" }[profile] ||
    profile;
  // The approval catalogue is paused until its data can be offered again.
  if (profile.startsWith("approval")) return null;
  if (
    ![
      "chart",
      "current-poll",
      "seat-grid",
      "party-history",
      "approval-history",
      "approval-current",
      "map",
      "majority",
      "tendencies",
    ].includes(profile)
  )
    return null;
  let inherited = {};
  try {
    inherited = JSON.parse(
      element?.closest("[data-studio-context]")?.dataset.studioContext ?? "{}",
    );
  } catch {
    /* Optional publishing context. */
  }
  const seed = { ...inherited, ...context };
  if (
    seed.region &&
    !isGermanRegion(seed.region)
  )
    return null;
  const params = routeQueryForLocation(
    new URL(sourceUrl ?? window.location.href, window.location.origin),
  );
  for (const [key, value] of Object.entries(seed))
    if (value !== undefined && value !== null) params.set(key, String(value));
  // Never replace a UK/Spanish graph with German data behind this action.
  if (
    ["uk", "es"].includes(params.get("country")) ||
    ["uk-westminster", "spain-congress"].includes(params.get("region"))
  )
    return null;
  if (
    profile.startsWith("approval") &&
    (params.get("compare") === "1" || params.get("mode") === "compare")
  )
    return null;
  if (
    params.has("region") &&
    !isGermanRegion(params.get("region"))
  )
    return null;
  if (profile === "party-history" && params.has("period"))
    params.set("range", params.get("period"));
  if (profile === "approval-current") {
    const metric = element?.id?.match(
      /^approval-current-(leader|government)$/,
    )?.[1];
    if (metric) params.set("metric", metric);
  }
  if (profile === "approval-history") {
    if (params.has("answers"))
      params.set("answer", params.get("answers").split(",")[0]);
    if (params.has("display")) params.set("mode", params.get("display"));
    if (params.get("range") === "one") params.set("range", "year");
  }
  for (const key of ["editor", "workspace", "template", "topic", "q"])
    params.delete(key);
  params.delete("embed");
  params.set("view", "studio");
  params.set("profile", profile);
  params.set("context", "1");
  params.set("lang", locale);
  params.set(
    "back",
    `${window.location.pathname}${window.location.search}${window.location.hash}`,
  );
  return (
    <a className="studio-more-designs secondary-button" href={`/?${params}`}>
      <span aria-hidden="true">▦</span>
      {locale === "de"
        ? "Andere Designs ansehen"
        : locale === "es"
          ? "Ver otros diseños"
          : "See other designs"}
    </a>
  );
}
