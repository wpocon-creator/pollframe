import { betterAuth } from "better-auth";
import { accountOptions } from "../server/account-options.mjs";
import { initialPassword } from "../server/email-first.mjs";
import { accountMessage } from "../server/account-message.mjs";
import { deliverAccountMail } from "../server/account-mail.mjs";
import { checkedAccountOrigin } from "../server/account-origin.mjs";
import {
  exportAccountData,
  removeAccountVerifications,
} from "../server/account-data.mjs";
import { reserveAccountAttempt } from "../server/account-throttle.mjs";
import {
  allowedAuthPath,
  sensitiveAccountChange,
  accountNotices,
  accountSessions,
  safeAuthResponse,
} from "../server/account-controls.mjs";
import {
  normalizeStudioState,
  isPausedStudioRequest,
} from "../src/studio-model.js";
import { normalizeStyle } from "../src/studio-style-model.js";
import {
  createPrivateResultStore,
  privateResultsReady,
  RESULT_CONSENT_VERSION,
} from "../server/private-result-store.mjs";

const headers = {
  "cache-control": "no-store, private",
  "content-type": "application/json; charset=utf-8",
  "x-content-type-options": "nosniff",
  "referrer-policy": "no-referrer",
  "content-security-policy":
    "default-src 'none'; frame-ancestors 'none'; base-uri 'none'",
  "x-frame-options": "DENY",
  "x-robots-tag": "noindex, nofollow, noarchive",
};
const json = (body, status = 200) => Response.json(body, { status, headers });
export const accountReady = (env) =>
  env.ACCOUNTS_ENABLED === "true" &&
  Boolean(
    env.ACCOUNTS_DB &&
      env.AUTH_SECRET?.length >= 40 &&
      env.RESEND_API_KEY &&
      /^[^\s@]+@pollframe\.com$/.test(env.AUTH_FROM || ""),
  );

export function createAccountService(env, { fetchMail = fetch, baseURL } = {}) {
  baseURL = checkedAccountOrigin(baseURL);
  if (!accountReady(env))
    return async () => json({ enabled: false, localOnly: false }, 503);
  const db = env.ACCOUNTS_DB;
  const privateStore = createPrivateResultStore(db, env);
  const send =
    (kind) =>
    async ({ user, url, otp, newEmail }, request) => {
      // Enforce our own hard free-tier ceilings, atomically. Failed sends also
      // consume the allowance. Never silently upgrade or log verification links.
      const day = new Date().toISOString().slice(0, 10),
        month = day.slice(0, 7);
      for (const [key, limit] of [
        [day, 95],
        [month, 2800],
      ]) {
        const result = await db
          .prepare(
            "INSERT INTO mail_budget(period,n) VALUES(?,1) ON CONFLICT(period) DO UPDATE SET n=n+1 WHERE n<? RETURNING n",
          )
          .bind(key, limit)
          .first();
        if (!result) throw Error("Mail allowance exhausted");
      }
      const link = url ? new URL(url) : null;
      if (link && link.origin !== baseURL) throw Error("Invalid mail origin");
      await deliverAccountMail(fetchMail, env.RESEND_API_KEY, {
        from: `Pollframe <${env.AUTH_FROM}>`,
        to: [user.email],
        ...accountMessage(
          kind,
          { url, otp, newEmail },
          request?.headers?.get("accept-language") || "en",
        ),
      });
    };
  return async (request) => {
    const url = new URL(request.url),
      path = url.pathname;
    if (url.origin !== baseURL) return json({ error: "Untrusted host" }, 403);
    const origin = request.headers.get("origin");
    if (path.startsWith("/api/auth/") && !allowedAuthPath(path))
      return json({ error: "Not found" }, 404);
    // Opening a signed email link is a cross-site top-level navigation. It
    // must work without granting cross-site access to sessions/documents.
    const emailLink =
      request.method === "GET" &&
      (path === "/api/auth/verify-email" ||
        /^\/api\/auth\/reset-password\/[^/]+$/.test(path));
    if (
      !emailLink &&
      ((origin && origin !== url.origin) ||
        request.headers.get("sec-fetch-site") === "cross-site")
    )
      return json({ error: "Untrusted origin" }, 403);
    if (!["GET", "POST", "PUT", "DELETE"].includes(request.method))
      return json({ error: "Method not allowed" }, 405);
    if (request.method !== "GET" && origin !== url.origin)
      return json({ error: "Origin required" }, 403);
    if (path === "/api/account/capabilities")
      return json({
        enabled: true,
        localOnly: false,
        emailDelivery: "verified-domain",
        subscriptions: false,
        privateResults: privateResultsReady(env),
        privateResultsConsent: RESULT_CONSENT_VERSION,
      });
    // No session token means no session. Avoid unnecessary adapter/schema and
    // database-rate-counter work on anonymous header/recovery probes. Never
    // infer a signed-in identity here; any actual cookie uses Better Auth.
    if (request.method === "GET" && path === "/api/auth/get-session") {
      const prefix =
        baseURL === "https://pollframe.com" ? "pollframe" : "pollframe-preview";
      const tokenName = `__Secure-${prefix}.session_token=`;
      const hasToken = (request.headers.get("cookie") || "")
        .split(";")
        .some(
          (part) =>
            part.trimStart().startsWith(tokenName) &&
            part.trimStart().slice(tokenName.length).trim(),
        );
      if (!hasToken) return json(null);
    }
    // Explicitly absent in production, even for authenticated users.
    if (path.includes("test-outbox")) return json({ error: "Not found" }, 404);
    let body;
    if (["POST", "PUT"].includes(request.method)) {
      if (!request.headers.get("content-type")?.startsWith("application/json"))
        return json({ error: "JSON required" }, 415);
      if (Number(request.headers.get("content-length")) > 100000)
        return json({ error: "Too large" }, 413);
      const reader = request.body?.getReader(),
        chunks = [];
      let size = 0;
      if (reader)
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          size += value.byteLength;
          if (size > 100000) {
            await reader.cancel();
            return json({ error: "Too large" }, 413);
          }
          chunks.push(value);
        }
      const bytes = new Uint8Array(size);
      let offset = 0;
      for (const chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.length;
      }
      const raw = new TextDecoder().decode(bytes);
      try {
        body = JSON.parse(raw);
      } catch {
        return json({ error: "Invalid JSON" }, 400);
      }
      if (!body || typeof body !== "object" || Array.isArray(body))
        return json({ error: "Object required" }, 400);
      request = new Request(request.url, {
        method: request.method,
        headers: request.headers,
        body: raw,
      });
    }
    const attempt = await reserveAccountAttempt(
      db,
      request,
      env.AUTH_SECRET,
      undefined,
      null,
      body?.email,
    );
    if (!attempt.allowed)
      return Response.json(
        { code: "TOO_MANY_REQUESTS" },
        {
          status: 429,
          headers: { ...headers, "retry-after": String(attempt.retryAfter) },
        },
      );
    if (
      path === "/api/auth/delete-user" &&
      request.method === "POST" &&
      (typeof body?.password !== "string" ||
        !body.password ||
        body.password.length > 128)
    )
      return json({ code: "PASSWORD_REQUIRED" }, 400);
    // Better Auth starts asynchronous adapter initialization. Construct it only
    // after early responses, inside the request that will actually await it.
    // A capabilities probe must not leave a pending cross-request promise.
    const auth = betterAuth(
      accountOptions({
        database: db,
        secret: env.AUTH_SECRET,
        send,
        baseURL,
        beforeDelete: (user) => removeAccountVerifications(db, user),
      }),
    );
    if (path.startsWith("/api/auth/")) {
      const denied = await sensitiveAccountChange(auth, request, body, {
        db,
        secret: env.AUTH_SECRET,
      });
      if (denied) return json({ code: denied.code }, denied.status);
      const result = await safeAuthResponse(await auth.handler(request)),
        h = new Headers(result.headers);
      for (const [key, value] of Object.entries(headers)) h.set(key, value);
      // Don't expose account existence through a provider/allowance failure:
      // reset requests return the same acknowledgement for known/unknown mail.
      // Validation, CSRF and rate-limit errors retain their original status.
      if (
        path === "/api/auth/request-password-reset" &&
        (result.ok || result.status >= 500)
      )
        return json({
          status: true,
          message:
            "If this email exists in our system, check your email for the reset link",
        });
      return new Response(result.body, { status: result.status, headers: h });
    }
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.emailVerified)
      return json({ error: "Sign in required" }, 401);
    const owner = session.user.id;
    if (body?.expectedOwner && body.expectedOwner !== owner)
      return json(
        { error: "Account changed; retry", code: "ACCOUNT_CHANGED" },
        409,
      );
    const notices = await accountNotices(db, owner, request, body);
    if (notices) return json(notices, notices.status || 200);
    const sessions = await accountSessions(
      db,
      owner,
      session.session.id,
      request,
    );
    if (sessions) return json(sessions, sessions.status || 200);
    if (path === "/api/account/export" && request.method === "GET")
      return json(await exportAccountData(db, owner));
    if (path === "/api/account/initial-password" && request.method === "POST") {
      // Reject repeat setup before the expensive hash. Existing passwords must
      // only change through the authenticated reset/change-password flows.
      const existing = await db
        .prepare(
          "SELECT id FROM account WHERE userId=? AND providerId='credential' AND password IS NOT NULL",
        )
        .bind(owner)
        .first();
      if (existing) return json({ code: "PASSWORD_ALREADY_SET" }, 409);
      const response = await initialPassword(
        auth,
        request,
        body,
        session.user.email,
      );
      const h = new Headers(response.headers);
      for (const [key, value] of Object.entries(headers)) h.set(key, value);
      return new Response(response.body, {
        status: response.status,
        headers: h,
      });
    }
    const privateResponse = await privateStore(request, owner, body);
    if (privateResponse) return privateResponse;
    if (path === "/api/account/documents" && request.method === "GET") {
      const { results } = await db
        .prepare(
          "SELECT id,kind,name,payload,updated_at FROM studio_document WHERE owner=? ORDER BY updated_at DESC",
        )
        .bind(owner)
        .all();
      return json({
        items: results.map(({ payload, updated_at, ...item }) => ({
          ...item,
          payload: JSON.parse(payload),
          updatedAt: updated_at,
        })),
      });
    }
    const id = path.match(
      /^\/api\/account\/documents\/([a-zA-Z0-9_-]{1,80})$/,
    )?.[1];
    if (!id) return json({ error: "Not found" }, 404);
    if (request.method === "DELETE") {
      const result = await db
        .prepare("DELETE FROM studio_document WHERE owner=? AND id=?")
        .bind(owner, id)
        .run();
      return result.meta.changes
        ? json({ deleted: true })
        : json({ error: "Not found" }, 404);
    }
    if (request.method === "GET") {
      const item = await db
        .prepare(
          "SELECT id,kind,name,payload,updated_at FROM studio_document WHERE owner=? AND id=?",
        )
        .bind(owner, id)
        .first();
      return item
        ? json({
            id: item.id,
            kind: item.kind,
            name: item.name,
            payload: JSON.parse(item.payload),
            updatedAt: item.updated_at,
          })
        : json({ error: "Not found" }, 404);
    }
    if (request.method === "PUT") {
      if (
        !["design", "style"].includes(body.kind) ||
        typeof body.name !== "string" ||
        !body.name.trim() ||
        !body.payload ||
        typeof body.payload !== "object" ||
        Array.isArray(body.payload)
      )
        return json({ error: "Invalid document" }, 400);
      if (body.kind === "design" && isPausedStudioRequest(body.payload))
        return json(
          { error: "Approval designs are temporarily unavailable" },
          409,
        );
      if (
        body.payload.document?.format === "pollframe-private-result-v1" ||
        body.payload.format === "pollframe-private-result-v1" ||
        body.payload.topic === "personal"
      )
        return json(
          {
            error:
              "Personal results require the separate private-result storage and consent",
          },
          400,
        );
      const payload =
        body.kind === "style"
          ? normalizeStyle(body.payload)
          : normalizeStudioState({ ...body.payload, workspace: "preview" });
      const name = body.name.trim().slice(0, 80),
        updatedAt = new Date().toISOString();
      // Single statement enforces the per-user limit even under parallel writes.
      const result = await db
        .prepare(
          "INSERT INTO studio_document(id,owner,kind,name,payload,updated_at) SELECT ?,?,?,?,?,? WHERE (SELECT COUNT(*) FROM studio_document WHERE owner=?)<100 OR EXISTS(SELECT 1 FROM studio_document WHERE owner=? AND id=?) ON CONFLICT(owner,id) DO UPDATE SET kind=excluded.kind,name=excluded.name,payload=excluded.payload,updated_at=excluded.updated_at",
        )
        .bind(
          id,
          owner,
          body.kind,
          name,
          JSON.stringify(payload),
          updatedAt,
          owner,
          owner,
          id,
        )
        .run();
      return result.meta.changes
        ? json({ id, kind: body.kind, name, payload, updatedAt })
        : json({ error: "Maximum 100 documents" }, 409);
    }
    return json({ error: "Method not allowed" }, 405);
  };
}

export async function handleAccounts(request, env) {
  if (!accountReady(env))
    return json({ enabled: false, localOnly: false }, 503);
  try {
    return await createAccountService(env)(request);
  } catch {
    return json(
      {
        error:
          "Kontodienst derzeit nicht verfügbar. Bitte später erneut versuchen.",
      },
      503,
    );
  }
}
