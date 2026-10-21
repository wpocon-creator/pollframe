// Full browser acceptance environment. This is never imported by the public
// Worker and never has production account/analytics/report bindings.
import production from "./index.js";
import { createAccountService } from "./accounts.js";
import { secureResponse, rateAddress } from "./security.js";
import { TEST_SITE_ORIGIN } from "../src/site-origin.js";
import { cleanupAccounts } from "../server/account-maintenance.mjs";

const robots = "noindex, nofollow, noarchive, nosnippet";
function finish(response, request) {
  const secured = secureResponse(response, request),
    headers = new Headers(secured.headers);
  headers.set("x-robots-tag", robots);
  headers.set("x-pollframe-environment", "test");
  // Do not leave an earlier preview's document/metadata cached on testers' phones.
  if (!new URL(request.url).pathname.startsWith("/assets/"))
    headers.set("cache-control", "no-store");
  return new Response(secured.body, {
    status: secured.status,
    statusText: secured.statusText,
    headers,
  });
}
const notFound = () => new Response("Not found", { status: 404 });
export function previewHtml(html, locale = "de") {
  const copy =
    locale === "es"
      ? [
          "Versión de prueba",
          "Las cuentas están separadas de pollframe.com. Los datos de prueba no se migrarán.",
        ]
      : locale.startsWith("en")
        ? [
            "Test version",
            "Accounts are separate from pollframe.com. Test data will not be migrated.",
          ]
        : [
            "Testversion",
            "Konten sind von pollframe.com getrennt. Testdaten werden nicht übernommen.",
          ];
  const banner = `<aside class="pf-preview-notice" aria-label="${copy[0]}"><strong>Pollframe · ${copy[0]}</strong><span>${copy[1]}</span><a href="/wahlframe">Wahlframe</a><a href="/studio">Studio</a></aside>`;
  return html
    .replace(
      /<meta\s+name="robots"[^>]*>/i,
      `<meta name="robots" content="${robots}">`,
    )
    .replace(/<link\s+rel="canonical"[^>]*>/gi, "")
    .replace("</head>", '<link rel="stylesheet" href="/preview.css"></head>')
    .replace(/<body([^>]*)>/i, `<body$1>${banner}`);
}
export function previewMail(payload) {
  return {
    ...payload,
    from: payload.from.replace(/^Pollframe </, "Pollframe Test <"),
    subject: "[Test] " + payload.subject,
    text: payload.text.replace(
      /(?<![\w.-])pollframe\.com\b/g,
      "test.pollframe.com",
    ),
    ...(payload.html
      ? {
          html: payload.html.replace(
            /(?<![\w.-])pollframe\.com\b/g,
            "test.pollframe.com",
          ),
        }
      : {}),
  };
}
async function burstAllowed(request, env) {
  if (!env.SECURITY_BURST_LIMITER) return true;
  const address = rateAddress(
    request.headers.get("cf-connecting-ip") || "unknown",
  );
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(env.AUTH_SECRET + ":preview:" + address),
  );
  const key = Array.from(new Uint8Array(digest), (v) =>
    v.toString(16).padStart(2, "0"),
  ).join("");
  return (await env.SECURITY_BURST_LIMITER.limit({ key })).success;
}
export default {
  async scheduled(_event, env, ctx) {
    if (env.BROWSER_PREVIEW_ENABLED === "true" && env.ACCOUNTS_DB)
      ctx.waitUntil(cleanupAccounts(env.ACCOUNTS_DB));
  },
  async fetch(request, env, ctx) {
    try {
      const url = new URL(request.url),
        path = url.pathname;
      if (url.protocol === "http:" && url.hostname === "test.pollframe.com") {
        url.protocol = "https:";
        return finish(Response.redirect(url.href, 308), request);
      }
      if (
        url.origin !== TEST_SITE_ORIGIN ||
        env.BROWSER_PREVIEW_ENABLED !== "true"
      )
        return finish(notFound(), request);
      if (path === "/robots.txt")
        return finish(
          new Response("User-agent: *\nDisallow: /\n", {
            headers: { "content-type": "text/plain;charset=utf-8" },
          }),
          request,
        );
      if (path === "/sitemap.xml" || path.startsWith("/pf-ops/"))
        return finish(notFound(), request);
      if (path === "/wahlframe")
        return finish(
          Response.redirect(
            TEST_SITE_ORIGIN +
              "/?view=party-match&lang=" +
              (["de", "en-GB", "en-US", "es"].includes(
                url.searchParams.get("lang"),
              )
                ? url.searchParams.get("lang")
                : "de"),
            302,
          ),
          request,
        );
      if (path.startsWith("/api/auth/") || path.startsWith("/api/account/")) {
        if (!(await burstAllowed(request, env)))
          return finish(
            Response.json(
              { error: "Too many requests" },
              { status: 429, headers: { "retry-after": "60" } },
            ),
            request,
          );
        // Request-owned initialization, strict fixed preview origin, real mail.
        const service = createAccountService(env, {
          baseURL: TEST_SITE_ORIGIN,
          fetchMail: (address, options) => {
            if (address !== "https://api.resend.com/emails")
              throw Error("Unexpected mail service");
            return fetch(address, {
              ...options,
              body: JSON.stringify(previewMail(JSON.parse(options.body))),
            });
          },
        });
        return finish(await service(request), request);
      }
      // Preview visits must not alter production analytics or catalogue ranks.
      if (path === "/api/analytics")
        return finish(
          request.method === "POST"
            ? new Response(null, { status: 204 })
            : notFound(),
          request,
        );
      if (path === "/api/studio-popular")
        return finish(
          request.method === "GET"
            ? Response.json({ counts: {} })
            : new Response(null, { status: 204 }),
          request,
        );
      if (path === "/api/bug-reports")
        return finish(
          Response.json(
            { error: "Testversion: Bitte Feedback im Pollframe-Chat melden." },
            { status: 503 },
          ),
          request,
        );
      if (path === "/manifest.webmanifest") {
        const original = await env.ASSETS.fetch(request),
          manifest = await original.json();
        return finish(
          Response.json({
            ...manifest,
            name: "Pollframe Test",
            short_name: "Pollframe Test",
          }),
          request,
        );
      }
      const response = await production.fetch(
        request,
        { ...env, WEB_ANALYTICS_TOKEN: "" },
        ctx,
      );
      if (
        request.method !== "HEAD" &&
        ![204, 205, 304].includes(response.status) &&
        response.headers.get("content-type")?.includes("text/html")
      ) {
        const headers = new Headers(response.headers);
        headers.delete("content-length");
        headers.delete("etag");
        return finish(
          new Response(
            previewHtml(
              await response.text(),
              url.searchParams.get("lang") || "de",
            ),
            { status: response.status, headers },
          ),
          request,
        );
      }
      return finish(response, request);
    } catch {
      return finish(
        Response.json({ error: "Test service unavailable" }, { status: 503 }),
        request,
      );
    }
  },
};
