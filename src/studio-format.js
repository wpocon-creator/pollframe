// Reuse ICU formatters across thumbnails and editor renders. Formatting remains
// identical to Intl/toLocaleString; only formatter construction is shared.
const numbers = new Map(), dates = new Map();
function formatter(cache, Type, locale, options) {
  const key = JSON.stringify([locale, options]);
  if (!cache.has(key)) {
    if (cache.size >= 64) cache.delete(cache.keys().next().value);
    cache.set(key, new Type(locale, options));
  }
  return cache.get(key);
}
export const studioNumber = (value, locale, options = {}) =>
  formatter(numbers, Intl.NumberFormat, locale, options).format(value);
export const studioDate = (value, locale, options = {}) =>
  formatter(dates, Intl.DateTimeFormat, locale, options).format(value);
