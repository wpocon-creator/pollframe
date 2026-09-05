export const SITE_ORIGIN = "https://pollframe.com";
export const LEGACY_SITE_ORIGIN = "https://de.pollframe.workers.dev";

// Keep local previews local, but make newly copied links use the public domain,
// including links copied from an app installed on the previous origin.
export function publicShareOrigin(origin) {
  return [SITE_ORIGIN, LEGACY_SITE_ORIGIN, "https://www.pollframe.com"].includes(origin)
    ? SITE_ORIGIN
    : origin;
}
