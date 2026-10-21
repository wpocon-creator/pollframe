export const text = (de, en, es) => ({ de, en, es });
export const localText = (value, locale) =>
  value[locale === "de" ? "de" : locale === "es" ? "es" : "en"];
export const position = (value, page, de, en, es, source) => ({
  value,
  page,
  note: text(de, en, es),
  ...(source ? { source } : {}),
});
export const unresolved = (page = null) =>
  position(
    null,
    page,
    "Für diese genaue Aussage ist in den geprüften Quellen keine eindeutige Position belegt.",
    "The reviewed sources do not establish a clear position on this exact statement.",
    "Las fuentes revisadas no acreditan una postura clara sobre esta afirmación concreta.",
  );
