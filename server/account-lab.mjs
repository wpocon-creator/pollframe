// Local security/integration lab. Deliberately not imported by the Cloudflare Worker.
import { betterAuth } from "better-auth";
import { getMigrations } from "better-auth/db/migration";
import { DatabaseSync } from "node:sqlite";
import { randomBytes, randomUUID } from "node:crypto";
import { normalizeStudioState } from "../src/studio-model.js";
import { normalizeStyle } from "../src/studio-style-model.js";

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
  const send =
    (kind) =>
    async ({ user, url }) => {
      // Test addresses only. No external delivery and no credentials in logs.
      outbox.push({
        id: randomUUID(),
        kind,
        to: user.email,
        url,
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
        "/sign-in/email": { window: 60, max: 5 },
        "/sign-up/email": { window: 60, max: 5 },
        "/request-password-reset": { window: 60, max: 3 },
        "/send-verification-email": { window: 60, max: 3 },
      },
    },
    advanced: {
      cookiePrefix: "pollframe-lab",
      useSecureCookies: false,
      defaultCookieAttributes: { httpOnly: true, sameSite: "lax" },
      ipAddress: { ipAddressHeaders: ["x-lab-peer"] },
    },
    user: { deleteUser: { enabled: true } },
  };
  const { runMigrations } = await getMigrations(options);
  await runMigrations();
  db.exec(`CREATE TABLE IF NOT EXISTS studio_document (
    id TEXT NOT NULL, owner TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
    kind TEXT NOT NULL CHECK(kind IN ('design','style')), name TEXT NOT NULL,
    payload TEXT NOT NULL, updated_at TEXT NOT NULL,
    PRIMARY KEY(owner,id)); CREATE INDEX IF NOT EXISTS studio_document_owner ON studio_document(owner);`);
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
      if (new TextEncoder().encode(raw).length > 300_000)
        return json({ error: "Too large" }, 413);
      try {
        body = JSON.parse(raw);
      } catch {
        return json({ error: "Invalid JSON" }, 400);
      }
      if (!body || typeof body !== "object" || Array.isArray(body))
        return json({ error: "Object required" }, 400);
      // The lab never collects real user addresses accidentally.
      if (body.email && !/^[^\s@]+@[^\s@]+\.test$/i.test(body.email))
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
    request = new Request(request, { headers: safeHeaders });
    if (url.pathname === "/api/account/capabilities")
      return json({
        localOnly: true,
        emailDelivery: "test-outbox",
        subscriptions: false,
      });
    if (url.pathname.startsWith("/api/auth/")) {
      const response = await auth.handler(request);
      const wrapped = new Response(response.body, response);
      Object.entries(headers).forEach(([k, v]) => wrapped.headers.set(k, v));
      return wrapped;
    }
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.emailVerified)
      return json({ error: "Sign in required" }, 401);
    const owner = session.user.id;
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
