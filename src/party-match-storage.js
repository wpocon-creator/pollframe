import {
  validateResultDocument,
  normalizeMatchDesign,
} from "./party-match-design.js";
import {
  requireAccount,
  accountRequest,
  accountGeneration,
} from "./account-client.js";
import { RESULT_CONSENT_VERSION } from "./account-storage-policy.js";

let draft = null;
let questionnaire = null;
if (typeof window !== "undefined")
  window.addEventListener("pollframe-account-changed", (event) => {
    if (!event.detail?.signedIn && draft?.savedId) {
      clearResultDraft();
      window.dispatchEvent(new Event("studio-private-draft-cleared"));
    }
  });
export const keepQuestionnaire = (session) => {
  questionnaire = session;
};
export const takeQuestionnaire = () => {
  const value = questionnaire;
  questionnaire = null;
  return value;
};
export const clearQuestionnaire = () => {
  questionnaire = null;
};
export function setResultDraft(
  document,
  design = {},
  savedId = null,
  savedName = "",
) {
  draft = {
    document: validateResultDocument(document),
    design: normalizeMatchDesign(design),
    savedId,
    savedName,
  };
}
export const getResultDraft = () => draft;
export const clearResultDraft = () => {
  draft = null;
  questionnaire = null;
};
export function openResultStudio(document, design, savedId, savedName) {
  setResultDraft(document, design, savedId, savedName);
  history.pushState(
    null,
    "",
    `/?view=party-match-studio&lang=${encodeURIComponent(draft.document.locale)}`,
  );
  window.dispatchEvent(new PopStateEvent("popstate"));
}

async function transaction(mode, run) {
  const database = await new Promise((resolve, reject) => {
    const req = indexedDB.open("pollframe-private-results", 1);
    req.onupgradeneeded = () =>
      req.result.createObjectStore("results", { keyPath: "id" });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    req.onblocked = () => reject(Error("Storage blocked"));
  });
  return new Promise((resolve, reject) => {
    const tx = database.transaction("results", mode);
    let result;
    try {
      const req = run(tx.objectStore("results"));
      req.onsuccess = () => {
        result = req.result;
      };
    } catch (error) {
      database.close();
      reject(error);
      return;
    }
    tx.oncomplete = () => {
      database.close();
      resolve(result);
    };
    tx.onerror = tx.onabort = () => {
      database.close();
      reject(tx.error || Error("Storage unavailable"));
    };
  });
}
export async function savePrivateResult(
  name,
  document,
  design,
  id,
  explicitConsent = false,
) {
  if (explicitConsent !== true)
    throw Error("Explicit account-storage consent required");
  const record = {
    id:
      typeof id === "string" && /^[a-f0-9-]{36}$/.test(id)
        ? id
        : crypto.randomUUID(),
    name:
      String(name ?? "")
        .trim()
        .slice(0, 80) || "Wahlframe",
    document: validateResultDocument(document),
    design: normalizeMatchDesign(design),
    updatedAt: new Date().toISOString(),
  };
  if (JSON.stringify(record).length > 16000) throw Error("Result too large");
  const user = await requireAccount();
  await accountRequest(
    `/api/account/private-results/${record.id}`,
    {
      name: record.name,
      payload: { document: record.document, design: record.design },
      consent: {
        accepted: true,
        age16Confirmed: true,
        version: RESULT_CONSENT_VERSION,
      },
      expectedOwner: user.id,
    },
    "PUT",
  );
  window.dispatchEvent(new Event("studio-private-results-change"));
  return record;
}
export async function listPrivateResults() {
  const epoch = accountGeneration();
  let rows = [];
  try {
    const session = await accountRequest("/api/auth/get-session");
    if (!session?.user?.emailVerified) return [];
    const cloud = await accountRequest("/api/account/private-results");
    if (epoch !== accountGeneration()) return [];
    rows = cloud.items.map((item) => ({ ...item, ...item.payload }));
  } catch {
    return [];
  }
  return normalizedResults(rows);
}
// Explicit, read-only migration of older device copies. Never auto-upload.
export async function listLegacyPrivateResults() {
  return normalizedResults(
    await transaction("readonly", (store) => store.getAll()),
  );
}
function normalizedResults(rows) {
  return rows
    .flatMap((row) => {
      try {
        if (
          typeof row.id !== "string" ||
          !/^[a-f0-9-]{36}$/.test(row.id) ||
          typeof row.updatedAt !== "string" ||
          !Number.isFinite(Date.parse(row.updatedAt))
        )
          return [];
        return [
          {
            id: row.id,
            name: String(row.name || "").slice(0, 80),
            updatedAt: row.updatedAt,
            document: validateResultDocument(row.document),
            design: normalizeMatchDesign(row.design),
          },
        ];
      } catch {
        return [];
      }
    })
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
export async function deletePrivateResult(id) {
  await requireAccount();
  await accountRequest(
    `/api/account/private-results/${encodeURIComponent(id)}`,
    null,
    "DELETE",
  );
  if (draft?.savedId === id) draft = null;
  window.dispatchEvent(new Event("studio-private-results-change"));
}
