const STATIC_PATH_ROUTES = new Map([
  ["/countries", { view: "countries" }],
  ["/de/bundestag/umfragen", { region: "bundestag" }],
  ["/de/bundeslaender/karte", { view: "map" }],
  ["/de/regierung/zufriedenheit", { view: "approval", country: "de" }],
  ["/uk", { country: "uk" }],
  ["/uk/westminster/polls", { region: "uk-westminster" }],
  ["/uk/constituencies", { view: "uk-constituencies", country: "uk" }],
  ["/es", { country: "es" }],
  ["/es/encuestas", { region: "spain-congress" }],
  ["/es/preocupaciones", { country: "es", view: "spain-issues" }],
  ["/sources", { page: "lizenzen" }],
  ["/editorial-standards", { page: "redaktion" }],
]);

const GERMAN_STATE_PATH = /^\/de\/landtagswahl\/([a-z0-9-]+)\/umfragen\/?$/;

function normalizedPath(pathname = "/") {
  if (!pathname || pathname === "/") return "/";
  return `/${pathname.split("/").filter(Boolean).join("/")}`;
}

export function routeParamsForPath(pathname) {
  const path = normalizedPath(pathname);
  const staticRoute = STATIC_PATH_ROUTES.get(path);
  if (staticRoute) return { ...staticRoute };
  const stateMatch = path.match(GERMAN_STATE_PATH);
  return stateMatch ? { region: stateMatch[1] } : {};
}

export function routeQueryForLocation(locationLike = window.location) {
  const query = new URLSearchParams(locationLike.search ?? "");
  const pathParams = routeParamsForPath(locationLike.pathname);
  for (const [key, value] of Object.entries(pathParams)) {
    if (!query.has(key)) query.set(key, value);
  }
  return query;
}

export function publicRegionPath(slug) {
  if (slug === "bundestag") return "/de/bundestag/umfragen";
  if (slug === "uk-westminster") return "/uk/westminster/polls";
  if (slug === "spain-congress") return "/es/encuestas";
  return `/de/landtagswahl/${encodeURIComponent(slug)}/umfragen`;
}

export function publicCountryPath(country) {
  if (country === "uk") return "/uk";
  if (country === "es") return "/es";
  return "/";
}

export function publicViewPath(view, country = "de") {
  if (view === "countries") return "/countries";
  if (view === "map") return "/de/bundeslaender/karte";
  if (view === "approval" && country === "de") return "/de/regierung/zufriedenheit";
  if (view === "uk-constituencies") return "/uk/constituencies";
  if (view === "spain-issues") return "/es/preocupaciones";
  return publicCountryPath(country);
}

export function publicPagePath(page) {
  if (page === "lizenzen") return "/sources";
  if (page === "redaktion") return "/editorial-standards";
  return `/?page=${encodeURIComponent(page)}`;
}

export function isPublicContentPath(pathname) {
  const path = normalizedPath(pathname);
  return path === "/" || STATIC_PATH_ROUTES.has(path) || GERMAN_STATE_PATH.test(path);
}
