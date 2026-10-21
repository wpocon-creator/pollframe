import { ACCOUNT_UI_ENABLED } from "./account-feature.js";
import { requestAccount } from "./account-request.js";
let generation = 0;
if (typeof window !== "undefined")
  window.addEventListener("pollframe-account-changed", () => {
    generation++;
  });
export const accountGeneration = () => generation;
export async function accountRequest(
  path,
  body,
  method = body ? "POST" : "GET",
) {
  if (!/^\/api\/(account|auth)\//.test(path))
    throw Error("Invalid account endpoint");
  const response = await fetch(path, {
    method,
    credentials: "same-origin",
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
    headers: {
      "Content-Type": "application/json",
      "Accept-Language": document.documentElement.lang || "en",
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const result = await response.json().catch(() => null);
  if (!response.ok) {
    const error = Error(
      result?.message || result?.error || "Account request unavailable",
    );
    error.code = response.status === 401 ? "ACCOUNT_REQUIRED" : result?.code;
    error.status = response.status;
    throw error;
  }
  return result;
}
export async function requireAccount() {
  let session;
  try {
    session = await accountRequest("/api/auth/get-session");
  } catch (cause) {
    // A temporary outage is not evidence that the visitor has signed out.
    // Never save anonymously, but don't send them through registration again.
    if (cause.status !== 401) {
      const language = document.documentElement.lang;
      const error = Error(language === "de"
        ? "Das Konto ist gerade nicht erreichbar. Bitte versuche es gleich erneut."
        : language === "es"
          ? "La cuenta no está disponible ahora. Vuelve a intentarlo en un momento."
          : "Your account is temporarily unavailable. Please try again shortly.");
      error.code = "ACCOUNT_UNAVAILABLE";
      throw error;
    }
  }
  if (!session?.user?.emailVerified) {
    if (ACCOUNT_UI_ENABLED) requestAccount("save");
    const language = document.documentElement.lang;
    const error = Error(
      language === "de"
        ? "Melde dich an oder erstelle ein kostenloses Konto, um zu speichern."
        : language === "es"
          ? "Accede o crea una cuenta gratuita para guardar."
          : "Sign in or create a free account to save.",
    );
    error.code = "ACCOUNT_REQUIRED";
    throw error;
  }
  return session.user;
}
export async function accountDocuments(kind) {
  const epoch = generation;
  try {
    const session = await accountRequest("/api/auth/get-session");
    if (!session?.user?.emailVerified) return [];
    const documents = await accountRequest("/api/account/documents");
    return epoch === generation
      ? documents.items
          .filter((item) => item.kind === kind)
          .map((item) => ({ ...item, owner: session.user.id }))
      : [];
  } catch {
    return [];
  }
}
export async function saveAccountDocument(
  kind,
  name,
  payload,
  id = crypto.randomUUID(),
) {
  const user = await requireAccount();
  const item = await accountRequest(
    `/api/account/documents/${encodeURIComponent(id)}`,
    { kind, name, payload, expectedOwner: user.id },
    "PUT",
  );
  return { ...item, owner: user.id };
}
