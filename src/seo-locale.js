import { SITE_ORIGIN } from "./site-origin.js";

export const SEO_LOCALES = ["de", "en-GB", "en-US", "es"];
export function defaultPageLocale(path) {
  return /^\/uk(?:\/|$)/.test(path) ? "en-GB" : /^\/es(?:\/|$)/.test(path) ? "es" : "de";
}
export function pageLocale(url) {
  return SEO_LOCALES.includes(url.searchParams.get("lang")) ? url.searchParams.get("lang") : defaultPageLocale(url.pathname);
}
export function localizedCanonical(path, locale) {
  const url = new URL(path.replace(/^\/{2,}/, "/"), SITE_ORIGIN);
  url.protocol = "https:";
  url.host = new URL(SITE_ORIGIN).host;
  url.hash = "";
  url.searchParams.delete("lang");
  if (SEO_LOCALES.includes(locale) && locale !== defaultPageLocale(url.pathname)) url.searchParams.set("lang", locale);
  return url.href;
}

export function languageAlternates(path) {
  return SEO_LOCALES.map((locale) => ({ locale, href: localizedCanonical(path, locale) }));
}
