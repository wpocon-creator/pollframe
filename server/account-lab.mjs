// Local security/integration lab. Deliberately not imported by the Cloudflare Worker.
import { betterAuth } from "better-auth";
import { getMigrations } from "better-auth/db/migration";
import { DatabaseSync } from "node:sqlite";
import { randomBytes, randomUUID, createHash } from "node:crypto";
import {
  normalizeStudioState,
  isPausedStudioRequest,
} from "../src/studio-model.js";
import { normalizeStyle } from "../src/studio-style-model.js";
import { readFile } from "node:fs/promises";
import { emailFirstPlugin, initialPassword } from "./email-first.mjs";
import { accountTwoFactor } from "./account-two-factor.mjs";
import { passwordPolicyPlugin } from "./password-policy.mjs";
import {
  accountRateRules,
  reserveAccountAttempt,
} from "./account-throttle.mjs";
import {
  allowedAuthPath,
  sensitiveAccountChange,
  accountNotices,
  accountSessions,
  safeAuthResponse,
} from "./account-controls.mjs";
import {
  exportAccountData,
  removeAccountVerifications,
} from "./account-data.mjs";
import {
  createPrivateResultStore,
  RESULT_CONSENT_VERSION,
} from "./private-result-store.mjs";

const headers = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store, private",
  "Content-Security-Policy":
    "default-src 'none'; frame-ancestors 'none'; base-uri 'none'",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "no-referrer",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
};
const json = (value, status = 200) => Response.json(value, { status, headers });
const idPattern = /^[a-zA-Z0-9_-]{1,80}$/;

export async function createAccountLab({
  database = ":memory:",
  secret = randomBytes(48).toString("base64url"),
  baseURL = "http://127.0.0.1:4173",
} = {}) {
  const base = new URL(baseURL);
  if (base.hostname !== "127.0.0.1" || base.protocol !== "http:")
    throw Error(
      "This lab must remain on loopback HTTP; it is not a production server.",
    );
  const db = new DatabaseSync(database);
  db.exec("PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL;");
  const origins = [
    ...new Set([
      base.origin,
      "http://127.0.0.1:4173",
      "http://127.0.0.1:4174",
      "http://127.0.0.1:4182",
    ]),
  ];
  const outbox = [];
  const dataDb = {
    prepare(sql) {
      return {
        bind(...params) {
          return {
            async first() {
              return db.prepare(sql).get(...params) || null;
            },
            async all() {
              return { results: db.prepare(sql).all(...params) };
            },
            async run() {
              return {
                meta: { changes: db.prepare(sql).run(...params).changes },
              };
            },
          };
        },
      };
    },
  };
  const send =
    (kind) =>
    async ({ user, url, otp }) => {
      // Test addresses only. No external delivery and no credentials in logs.
      outbox.push({
        id: randomUUID(),
        kind,
        to: user.email,
        url,
        ...(otp ? { otp } : {}),
        createdAt: Date.now(),
      });
      if (outbox.length > 100) outbox.shift();
    };
  const options = {
    appName: "Pollframe Konto – lokaler Test",
    database: db,
    secret,
    baseURL: base.origin,
    trustedOrigins: origins,
    plugins: [
      emailFirstPlugin(send),
      accountTwoFactor(),
      passwordPolicyPlugin(),
    ],
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      autoSignIn: false,
      minPasswordLength: 15,
      maxPasswordLength: 128,
      sendResetPassword: send("reset"),
      revokeSessionsOnPasswordReset: true,
    },
    emailVerification: {
      sendOnSignUp: true,
      autoSignInAfterVerification: false,
      expiresIn: 1800,
      sendVerificationEmail: send("verify"),
    },
    session: {
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60 * 24,
      freshAge: 60 * 5,
    },
    rateLimit: {
      enabled: true,
      storage: "database",
      window: 60,
      max: 100,
      customRules: {
        ...accountRateRules,
      },
    },
    advanced: {
      cookiePrefix: "pollframe-lab",
      useSecureCookies: false,
      defaultCookieAttributes: { httpOnly: true, sameSite: "lax" },
      ipAddress: { ipAddressHeaders: ["x-lab-peer"] },
    },
    user: {
      changeEmail: {
        enabled: true,
        sendChangeEmailConfirmation: send("email-change"),
      },
      deleteUser: {
        enabled: true,
        beforeDelete: (user) => removeAccountVerifications(dataDb, user),
      },
    },
  };
  const { runMigrations } = await getMigrations(options);
  await runMigrations();
  db.exec(`CREATE TABLE IF NOT EXISTS studio_document (
    id TEXT NOT NULL, owner TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
    kind TEXT NOT NULL CHECK(kind IN ('design','style')), name TEXT NOT NULL,
    payload TEXT NOT NULL, updated_at TEXT NOT NULL,
    PRIMARY KEY(owner,id)); CREATE INDEX IF NOT EXISTS studio_document_owner ON studio_document(owner);`);
  db.exec(
    `CREATE TABLE IF NOT EXISTS account_notice(owner TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,notice TEXT NOT NULL CHECK(notice IN ('studio-guide-v1','feedback-v1')),shown_at TEXT NOT NULL,PRIMARY KEY(owner,notice));`,
  );
  db.exec(
    (
      await readFile(
        new URL(
          "../migrations/accounts/0002_private_results.sql",
          import.meta.url,
        ),
        "utf8",
      )
    )
      .replace(
        "CREATE TABLE private_result",
        "CREATE TABLE IF NOT EXISTS private_result",
      )
      .replace(
        "CREATE INDEX private_result_owner_updated",
        "CREATE INDEX IF NOT EXISTS private_result_owner_updated",
      ),
  );
  // Only this loopback lab derives its key from the persisted lab secret. The
  // production Worker requires an independent secret configured separately.
  const privateStore = createPrivateResultStore(
    {
      prepare(sql) {
        return {
          bind(...params) {
            return {
              async first() {
                return db.prepare(sql).get(...params) || null;
              },
              async all() {
                return { results: db.prepare(sql).all(...params) };
              },
              async run() {
                const result = db.prepare(sql).run(...params);
                return { meta: { changes: result.changes } };
              },
            };
          },
        };
      },
    },
    {
      PRIVATE_RESULTS_ENABLED: "true",
      PRIVATE_RESULTS_KEY: createHash("sha256")
        .update("private-results-lab-v1:" + secret)
        .digest("base64"),
    },
  );
  const auth = betterAuth(options);
  async function handle(request) {
    const url = new URL(request.url);
    if (!origins.includes(url.origin))
      return json({ error: "Untrusted host" }, 403);
    const origin = request.headers.get("origin");
    if (
      (origin && !origins.includes(origin)) ||
      request.headers.get("sec-fetch-site") === "cross-site"
    )
      return json({ error: "Untrusted origin" }, 403);
    if (!["GET", "HEAD"].includes(request.method) && !origins.includes(origin))
      return json({ error: "Origin required" }, 403);
    if (!["GET", "POST", "PUT", "DELETE"].includes(request.method))
      return json({ error: "Method not allowed" }, 405);
    let body;
    if (request.method === "POST" || request.method === "PUT") {
      if (!request.headers.get("content-type")?.startsWith("application/json"))
        return json({ error: "JSON required" }, 415);
      const raw = await request.text();
      if (new TextEncoder().encode(raw).length > 100_000)
        return json({ error: "Too large" }, 413);
      try {
        body = JSON.parse(raw);
      } catch {
        return json({ error: "Invalid JSON" }, 400);
      }
      if (!body || typeof body !== "object" || Array.isArray(body))
        return json({ error: "Object required" }, 400);
      // The lab never collects real user addresses accidentally.
      if (
        [body.email, body.newEmail].some(
          (email) => email && !/^[^\s@]+@[^\s@]+\.test$/i.test(email),
        )
      )
        return json(
          { error: "Use a .test email address in this local lab" },
          400,
        );
      request = new Request(request.url, {
        method: request.method,
        headers: request.headers,
        body: raw,
      });
    }
    // Always replace caller-supplied IP headers. This lab has exactly one local peer.
    const safeHeaders = new Headers(request.headers);
    safeHeaders.set("x-lab-peer", "127.0.0.1");
    safeHeaders.set("cf-connecting-ip", "127.0.0.1");
    request = new Request(request, { headers: safeHeaders });
    if (url.pathname === "/api/account/capabilities")
      return json({
        localOnly: true,
        emailDelivery: "test-outbox",
        subscriptions: false,
        privateResults: true,
        privateResultsConsent: RESULT_CONSENT_VERSION,
      });
    if (url.pathname.startsWith("/api/auth/")) {
      if (!allowedAuthPath(url.pathname))
        return json({ error: "Not found" }, 404);
      const attempt = await reserveAccountAttempt(
        dataDb,
        request,
        secret,
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
        url.pathname === "/api/auth/delete-user" &&
        request.method === "POST" &&
        (typeof body?.password !== "string" ||
          !body.password ||
          body.password.length > 128)
      )
        return json({ code: "PASSWORD_REQUIRED" }, 400);
      const denied = await sensitiveAccountChange(auth, request, body, {
        db: dataDb,
        secret,
      });
      if (denied) return json({ code: denied.code }, denied.status);
      const response = await safeAuthResponse(await auth.handler(request));
      const wrapped = new Response(response.body, response);
      Object.entries(headers).forEach(([k, v]) => wrapped.headers.set(k, v));
      return wrapped;
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
    const notices = await accountNotices(dataDb, owner, request, body);
    if (notices) return json(notices, notices.status || 200);
    const sessions = await accountSessions(
      dataDb,
      owner,
      session.session.id,
      request,
    );
    if (sessions) return json(sessions, sessions.status || 200);
    if (url.pathname === "/api/account/export" && request.method === "GET")
      return json(await exportAccountData(dataDb, owner));
    if (
      url.pathname === "/api/account/initial-password" &&
      request.method === "POST"
    ) {
      if (
        db
          .prepare(
            "SELECT id FROM account WHERE userId=? AND providerId='credential' AND password IS NOT NULL",
          )
          .get(owner)
      )
        return json({ code: "PASSWORD_ALREADY_SET" }, 409);
      const response = await initialPassword(
        auth,
        request,
        body,
        session.user.email,
      );
      const wrapped = new Response(response.body, response);
      Object.entries(headers).forEach(([k, v]) => wrapped.headers.set(k, v));
      return wrapped;
    }
    const privateResponse = await privateStore(request, owner, body);
    if (privateResponse) return privateResponse;
    if (url.pathname === "/api/account/documents" && request.method === "GET") {
      const items = db
        .prepare(
          "SELECT id,kind,name,payload,updated_at FROM studio_document WHERE owner=? ORDER BY updated_at DESC",
        )
        .all(owner);
      return json({
        items: items.map(({ payload, updated_at, ...row }) => ({
          ...row,
          payload: JSON.parse(payload),
          updatedAt: updated_at,
        })),
      });
    }
    const id = url.pathname.match(/^\/api\/account\/documents\/([^/]+)$/)?.[1];
    if (!id || !idPattern.test(id)) return json({ error: "Not found" }, 404);
    if (request.method === "DELETE") {
      const result = db
        .prepare("DELETE FROM studio_document WHERE owner=? AND id=?")
        .run(owner, id);
      return result.changes
        ? json({ deleted: true })
        : json({ error: "Not found" }, 404);
    }
    if (request.method === "PUT") {
      if (
        !["design", "style"].includes(body.kind) ||
        typeof body.name !== "string" ||
        !body.name.trim() ||
        !body.payload ||
        typeof body.payload !== "object"
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
      // Store editable settings, never user-supplied poll values or sources, executable SVG or arbitrary files.
      const payload =
        body.kind === "style"
          ? normalizeStyle(body.payload)
          : normalizeStudioState({ ...body.payload, workspace: "preview" });
      const existing = db
        .prepare("SELECT id FROM studio_document WHERE owner=? AND id=?")
        .get(owner, id);
      if (
        !existing &&
        db
          .prepare("SELECT COUNT(*) AS n FROM studio_document WHERE owner=?")
          .get(owner).n >= 100
      )
        return json({ error: "Local lab limit: 100 documents" }, 409);
      const name = body.name.trim().slice(0, 80),
        updatedAt = new Date().toISOString();
      db.prepare(
        "INSERT INTO studio_document(id,owner,kind,name,payload,updated_at) VALUES(?,?,?,?,?,?) ON CONFLICT(owner,id) DO UPDATE SET kind=excluded.kind,name=excluded.name,payload=excluded.payload,updated_at=excluded.updated_at",
      ).run(id, owner, body.kind, name, JSON.stringify(payload), updatedAt);
      return json({ id, kind: body.kind, name, payload, updatedAt });
    }
    if (request.method === "GET") {
      const item = db
        .prepare(
          "SELECT id,kind,name,payload FROM studio_document WHERE owner=? AND id=?",
        )
        .get(owner, id);
      return item
        ? json({ ...item, payload: JSON.parse(item.payload) })
        : json({ error: "Not found" }, 404);
    }
    return json({ error: "Method not allowed" }, 405);
  }
  return { handle, outbox, close: () => db.close() };
}
