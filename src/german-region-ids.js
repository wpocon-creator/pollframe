// Lightweight validation for publishing entry points; do not load Studio's
// translated catalogue and fuzzy-search index on an ordinary polling page.
export const GERMAN_REGION_IDS = [
  "bundestag", "baden-wuerttemberg", "bayern", "berlin", "brandenburg",
  "bremen", "hamburg", "hessen", "mecklenburg-vorpommern", "niedersachsen",
  "nordrhein-westfalen", "rheinland-pfalz", "saarland", "sachsen",
  "sachsen-anhalt", "schleswig-holstein", "thueringen",
];
const ids = new Set(GERMAN_REGION_IDS);
export const isGermanRegion = id => ids.has(id);
