// Worker-generated responses do not inherit the static asset _headers file.
// Preserve the document CSP supplied by the asset/SEO layer, but cover every
// API, redirect and error response too. Embeds are intentionally frameable.
export function secureResponse(response, request) {
  const headers = new Headers(response.headers);
  const embed = new URL(request.url).pathname === "/embed.html";
  headers.set("strict-transport-security", "max-age=31536000");
  headers.set("x-content-type-options", "nosniff");
  headers.set("referrer-policy", "no-referrer");
  headers.set("x-permitted-cross-domain-policies", "none");
  headers.set("cross-origin-opener-policy", "same-origin");
  headers.set("origin-agent-cluster", "?1");
  if (!headers.has("permissions-policy")) headers.set("permissions-policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=()");
  const ancestors = embed ? "frame-ancestors *" : "frame-ancestors 'none'";
  if (!headers.has("content-security-policy")) {
    headers.set("content-security-policy", `default-src 'none'; base-uri 'none'; object-src 'none'; form-action 'none'; ${ancestors}`);
  } else if (!/frame-ancestors\s/i.test(headers.get("content-security-policy"))) {
    headers.append("content-security-policy", ancestors);
  }
  if (embed) headers.delete("x-frame-options");
  else headers.set("x-frame-options", "DENY");
  if (new URL(request.url).pathname.startsWith("/pf-ops/")) {
    headers.set("cache-control", "no-store");
    headers.set("x-robots-tag", "noindex, nofollow, noarchive");
  }
  return new Response(request.method === "HEAD" ? null : response.body, { status: response.status, statusText: response.statusText, headers });
}

export class RequestError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

// Count bytes while reading, not after buffering an arbitrarily large body.
export async function readBoundedBody(request, maximum) {
  const declared = request.headers.get("content-length");
  if (declared && (!/^\d+$/.test(declared) || Number(declared) > maximum)) throw new RequestError(413, "Request too large");
  if (!request.body) return "";
  const reader = request.body.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let bytes = 0, text = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > maximum) { await reader.cancel(); throw new RequestError(413, "Request too large"); }
      text += decoder.decode(value, { stream: true });
    }
    return text + decoder.decode();
  } catch (error) {
    await reader.cancel().catch(() => {});
    if (error instanceof RequestError) throw error;
    throw new RequestError(400, "Invalid request body");
  } finally { reader.releaseLock(); }
}

export function isRecord(value) { return value !== null && typeof value === "object" && !Array.isArray(value); }

// Reports need the affected public view, not credentials, recovery tokens,
// private editorial text, nested return URLs or arbitrary external links.
export function reportPage(value) {
  const url = new URL(String(value));
  if (url.protocol !== "https:" || !["pollframe.com", "www.pollframe.com", "de.pollframe.workers.dev"].includes(url.hostname)) throw new Error("Invalid page");
  url.username = ""; url.password = ""; url.hash = ""; url.port = "";
  if (/^\/(?:api|pf-ops|account|auth)(?:\/|$)/i.test(url.pathname)) url.pathname = "/";
  const allowed = new Set(["view", "page", "country", "region", "lang", "template", "topic", "range", "mode", "from", "to", "format", "theme", "party", "parties", "pollsters"]);
  for (const key of [...url.searchParams.keys()]) {
    if (!allowed.has(key)) url.searchParams.delete(key);
    else url.searchParams.set(key, url.searchParams.get(key).slice(0, 128));
  }
  return url.href;
}

export const ADMIN_WINDOW_MS = 15 * 60 * 1000;
export const ADMIN_ATTEMPTS = 12;

export function rateAddress(address) {
  if (!address.includes(":")) return address;
  try {
    const canonical = new URL(`http://[${address}]/`).hostname.slice(1, -1);
    const [left, right] = canonical.split("::");
    const start = left ? left.split(":") : [];
    const end = right ? right.split(":") : [];
    const groups = right === undefined ? start : [...start, ...Array(8 - start.length - end.length).fill("0"), ...end];
    if (groups.length !== 8) return "unknown";
    const words = groups.map(value => parseInt(value, 16));
    if (words.slice(0, 5).every(value => value === 0) && words[5] === 65535) return [words[6] >> 8, words[6] & 255, words[7] >> 8, words[7] & 255].join(".");
    // Rotating IPv6 privacy addresses in the same /64 must not reset limits.
    return words.slice(0, 4).map(value => value.toString(16)).join(":") + "::/64";
  } catch { return "unknown"; }
}

// Stored in one Durable Object across all edge locations. The transaction also
// prevents parallel attempts from reading and incrementing the same old count.
export async function reserveAdminAttempt(storage, id, now = Date.now()) {
  return storage.transaction(async (transaction) => {
    const key = `auth:${id}`;
    const previous = await transaction.get(key);
    const state = previous && previous.until > now ? previous : { count: 0, until: now + ADMIN_WINDOW_MS };
    if (state.count >= ADMIN_ATTEMPTS) return { allowed: false, retryAfter: Math.max(1, Math.ceil((state.until - now) / 1000)) };
    await transaction.put(key, { ...state, count: state.count + 1 });
    return { allowed: true };
  });
}
