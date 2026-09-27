// Translate known collection modes only. Keep original source metadata intact
// in JSON receipts; unknown source-specific method descriptions are not guessed.
const METHODS = {
  "Unbekannt": ["Unknown", "No indicado"],
  "Telefonisch": ["Telephone", "Telefónica"],
  "Online": ["Online", "En línea"],
  "Persönlich": ["Face-to-face", "Presencial"],
  "Telefon & Online": ["Telephone and online", "Telefónica y en línea"],
};
export function pollMethodLabel(method, locale) {
  return locale === "de" ? method : METHODS[method]?.[locale === "es" ? 1 : 0] ?? method;
}
