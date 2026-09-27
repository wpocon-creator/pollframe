(function attachPollframeManifest() {
  var link = document.createElement("link");
  link.rel = "manifest";
  link.href = "/manifest.webmanifest";
  document.head.appendChild(link);

  var query = new URLSearchParams(window.location.search);
  var view = query.get("view");
  var page = query.get("page");
  var country = query.get("country");
  var region = query.get("region");
  var targets = [];
  if (!page) {
    if (view === "studio") {
      // Thumbnails use real data too. Never preload federal data for a state
      // design, or unrelated polling data for the map catalogue.
      var german = ["bundestag","baden-wuerttemberg","bayern","berlin","brandenburg","bremen","hamburg","hessen","mecklenburg-vorpommern","niedersachsen","nordrhein-westfalen","rheinland-pfalz","saarland","sachsen","sachsen-anhalt","schleswig-holstein","thueringen"];
      if (country !== "uk" && country !== "es") {
        if ((query.get("template") || "").indexOf("map-") === 0 || query.get("topic") === "map" || query.get("profile") === "map") targets = ["/state-map-data.json"];
        else if (!region || german.indexOf(region) !== -1) targets = ["/data/" + (region || "bundestag") + ".json"];
      }
    }
    else if (view === "approval") targets = ["/data/approval.json"];
    else if (view === "countries") targets = ["/regions.json", "/uk-summary.json", "/spain-summary.json"];
    else if (view === "uk-constituencies") targets = ["/uk-summary.json", "/data/uk-constituencies.json"];
    else if (country === "de") targets = ["/regions.json", "/data/bundestag.json"];
    else if (country === "es") targets = ["/spain-summary.json"].concat(view === "spain-region" ? ["/data/spain-regions.json"] : []);
    else if (country === "uk") targets = ["/uk-summary.json"];
    else if (region) targets = ["/data/" + encodeURIComponent(region) + ".json"];
    else targets = ["/regions.json"];
  }
  targets.forEach(function preloadDataset(href) {
    var preload = document.createElement("link");
    preload.rel = "preload";
    preload.as = "fetch";
    preload.href = href;
    preload.crossOrigin = "anonymous";
    document.head.appendChild(preload);
  });
}());
