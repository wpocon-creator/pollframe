// Shared by the loopback lab and Worker. Political summaries never enter the
// ordinary design table, public URLs, mail, telemetry or a plaintext DB column.
import {
  validateResultDocument,
  normalizeMatchDesign,
} from "../src/party-match-design.js";
import { RESULT_CONSENT_VERSION } from "../src/account-storage-policy.js";

export { RESULT_CONSENT_VERSION };
export const PRIVATE_RESULT_LIMIT = 30;
const json = (body, status = 200) =>
  Response.json(body, {
    status,
    headers: {
      "cache-control": "no-store, private",
      "content-type": "application/json; charset=utf-8",
      "content-security-policy":
        "default-src 'none'; frame-ancestors 'none'; base-uri 'none'",
      "x-content-type-options": "nosniff",
      "referrer-policy": "no-referrer",
    },
  });
const encoder = new TextEncoder();
const aad = (owner, id) =>
  encoder.encode(JSON.stringify(["pollframe-private-result-v1", owner, id]));
const encode = (bytes) => btoa(String.fromCharCode(...bytes));
const decode = (text) => Uint8Array.from(atob(text), (c) => c.charCodeAt(0));
export function privateResultsReady(env) {
  return (
    env.PRIVATE_RESULTS_ENABLED === "true" &&
    typeof env.PRIVATE_RESULTS_KEY === "string" &&
    /^[A-Za-z0-9+/]{43}=$/.test(env.PRIVATE_RESULTS_KEY)
  );
}
export function normalizeAccountResult(input) {
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw Error("Invalid result");
  // Individual responses are not part of cloud storage, even with consent.
  if (
    Object.hasOwn(input, "answers") ||
    Object.hasOwn(input.document || {}, "answers")
  )
    throw Error("Individual answers not accepted");
  const value = {
    document: validateResultDocument(input.document),
    design: normalizeMatchDesign(input.design || {}),
  };
  if (encoder.encode(JSON.stringify(value)).length > 20000)
    throw Error("Result too large");
  return value;
}
export function createPrivateResultStore(db, env) {
  let key;
  const encryptionKey = () =>
    (key ||= crypto.subtle.importKey(
      "raw",
      decode(env.PRIVATE_RESULTS_KEY),
      { name: "AES-GCM" },
      false,
      ["encrypt", "decrypt"],
    ));
  const open = async (row, owner) => {
    const plain = await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: decode(row.nonce),
        additionalData: aad(owner, row.id),
      },
      await encryptionKey(),
      decode(row.ciphertext),
    );
    const record = JSON.parse(new TextDecoder().decode(plain));
    return {
      id: row.id,
      name: record.name,
      payload: normalizeAccountResult(record.payload),
      consent: record.consent,
      updatedAt: row.updated_at,
    };
  };
  // Must only be called AFTER a verified session and same-origin checks.
  return async (request, owner, body) => {
    const path = new URL(request.url).pathname;
    if (!path.startsWith("/api/account/private-results")) return null;
    const collection = path === "/api/account/private-results";
    const id = path.match(
      /^\/api\/account\/private-results\/([a-zA-Z0-9_-]{1,80})$/,
    )?.[1];
    if (!collection && !id) return json({ error: "Not found" }, 404);
    // Withdrawal must still work if saving is disabled or the key is unavailable.
    if (request.method === "DELETE") {
      const result = await (
        collection
          ? db.prepare("DELETE FROM private_result WHERE owner=?").bind(owner)
          : db
              .prepare("DELETE FROM private_result WHERE owner=? AND id=?")
              .bind(owner, id)
      ).run();
      return collection || result.meta.changes
        ? json({ deleted: true })
        : json({ error: "Not found" }, 404);
    }
    if (!privateResultsReady(env))
      return json({ error: "Private result storage is not enabled" }, 503);
    if (request.method === "GET") {
      if (collection) {
        const { results } = await db
          .prepare(
            "SELECT id,nonce,ciphertext,updated_at FROM private_result WHERE owner=? ORDER BY updated_at DESC",
          )
          .bind(owner)
          .all();
        // Fail closed: an unreadable record is an error, not an empty library.
        return json({
          items: await Promise.all(results.map((row) => open(row, owner))),
        });
      }
      const row = await db
        .prepare(
          "SELECT id,nonce,ciphertext,updated_at FROM private_result WHERE owner=? AND id=?",
        )
        .bind(owner, id)
        .first();
      return row
        ? json(await open(row, owner))
        : json({ error: "Not found" }, 404);
    }
    if (request.method !== "PUT" || collection)
      return json({ error: "Method not allowed" }, 405);
    if (
      body?.consent?.accepted !== true ||
      body.consent.age16Confirmed !== true ||
      body.consent.version !== RESULT_CONSENT_VERSION
    )
      return json(
        {
          error:
            "Current explicit political-result storage consent and age confirmation required",
        },
        400,
      );
    if (
      typeof body.name !== "string" ||
      !body.name.trim() ||
      body.name.length > 80
    )
      return json({ error: "Invalid name" }, 400);
    let payload;
    try {
      payload = normalizeAccountResult(body.payload);
    } catch {
      return json(
        { error: "Invalid result; individual answers are not accepted" },
        400,
      );
    }
    const updatedAt = new Date().toISOString();
    const record = {
      name: body.name.trim(),
      payload,
      consent: {
        version: RESULT_CONSENT_VERSION,
        age16Confirmed: true,
        acceptedAt: updatedAt,
      },
    };
    const nonce = crypto.getRandomValues(new Uint8Array(12));
    const ciphertext = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: nonce, additionalData: aad(owner, id) },
      await encryptionKey(),
      encoder.encode(JSON.stringify(record)),
    );
    // Atomic quota, including concurrent inserts. Account deletion cascades.
    const result = await db
      .prepare(
        "INSERT INTO private_result(id,owner,nonce,ciphertext,updated_at) SELECT ?,?,?,?,? WHERE (SELECT COUNT(*) FROM private_result WHERE owner=?)<? OR EXISTS(SELECT 1 FROM private_result WHERE owner=? AND id=?) ON CONFLICT(owner,id) DO UPDATE SET nonce=excluded.nonce,ciphertext=excluded.ciphertext,updated_at=excluded.updated_at",
      )
      .bind(
        id,
        owner,
        encode(nonce),
        encode(new Uint8Array(ciphertext)),
        updatedAt,
        owner,
        PRIVATE_RESULT_LIMIT,
        owner,
        id,
      )
      .run();
    return result.meta.changes
      ? json({ id, ...record, updatedAt })
      : json({ error: `Maximum ${PRIVATE_RESULT_LIMIT} private results` }, 409);
  };
}
