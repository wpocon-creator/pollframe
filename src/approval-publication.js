// Re-enable only after documented permission and a review of its exact scope.
// This is not an environment toggle: a scheduled job must not override it.
import { canUseSource } from './source-permissions.js';
export const PUBLISH_FGW_APPROVAL = canUseSource('fgw-direct', 'display') && canUseSource('fgw-direct', 'publicData');

export function publicApprovalData(data) {
  return {
    generatedAt: data?.generatedAt ?? null,
    countries: data?.countries?.es ? { es: data.countries.es } : {},
    events: (data?.events ?? []).filter(event => event.country === "es"),
    publicationStatus: { de: "withheld-pending-permission", uk: "withheld-pending-permission" },
  };
}

export function isWithheldApprovalRequest(url) {
  let path;
  try { path = decodeURIComponent(url.pathname).replace(/\/+$/, ""); } catch { path = url.pathname; }
  return path === "/de/regierung/zufriedenheit"
    || url.searchParams.get("view") === "approval";
}

export function approvalUnavailableResponse(request) {
  const lang = new URL(request.url).searchParams.get("lang") ?? "de";
  const [title, text, back] = lang === "es"
    ? ["Temporalmente no disponible", "Las series de aprobación se han retirado mientras se aclaran los permisos de reutilización.", "Volver a Pollframe"]
    : lang.startsWith("en")
      ? ["Temporarily unavailable", "Approval series have been withdrawn while reuse permissions are clarified.", "Back to Pollframe"]
      : ["Vorübergehend nicht verfügbar", "Die Zufriedenheitsreihen sind bis zur Klärung der Nutzungsrechte nicht verfügbar.", "Zurück zu Pollframe"];
  return new Response(request.method === "HEAD" ? null : `<!doctype html><html lang="${lang === "es" ? "es" : lang.startsWith("en") ? "en" : "de"}"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} · Pollframe</title><body><main><h1>${title}</h1><p>${text}</p><a href="/">${back}</a></main></body></html>`, {
    status: 410,
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "x-robots-tag": "noindex, noarchive", "x-content-type-options": "nosniff", "content-security-policy": "default-src 'none'; base-uri 'none'; form-action 'none'" },
  });
}
