import { NOTICE_IDS } from "../src/notice-policy.js";
import { reserveAccountAttempt } from "./account-throttle.mjs";

const authPaths = new Set([
  "/get-session",
  "/sign-up/email",
  "/sign-in/email",
  "/sign-in/email-otp",
  "/sign-out",
  "/request-password-reset",
  "/reset-password",
  "/verify-email",
  "/send-verification-email",
  "/update-user",
  "/change-password",
  "/delete-user",
  "/change-email",
  "/email-otp/send-verification-otp",
  "/email-otp/check-verification-otp",
  "/two-factor/enable",
  "/two-factor/disable",
  "/two-factor/verify-totp",
  "/two-factor/verify-backup-code",
  "/two-factor/generate-backup-codes",
]);
export function allowedAuthPath(path) {
  return (
    authPaths.has(path.replace(/^\/api\/auth/, "")) ||
    /^\/api\/auth\/reset-password\/[a-zA-Z0-9_-]{1,200}$/.test(path)
  );
}

// Re-enter a factor for destructive/sensitive changes. A stolen authenticated
// cookie plus password must not silently remove the authenticator protection.
export async function sensitiveAccountChange(auth, request, body, security) {
  const path = new URL(request.url).pathname;
  if (path.startsWith("/api/auth/two-factor/") && body?.trustDevice === true)
    return { code: "TRUSTED_DEVICES_DISABLED", status: 400 };
  if (
    path === "/api/auth/update-user" &&
    (typeof body?.name !== "string" ||
      !body.name.trim() ||
      body.name.length > 80 ||
      /[\u0000-\u001f]/.test(body.name) ||
      Object.keys(body).some((k) => k !== "name"))
  )
    return { code: "INVALID_PROFILE", status: 400 };
  const stepUp = [
    "/api/auth/two-factor/disable",
    "/api/auth/change-password",
    "/api/auth/change-email",
    "/api/auth/delete-user",
    "/api/auth/two-factor/generate-backup-codes",
  ].includes(path);
  const verify = [
    "/api/auth/two-factor/verify-totp",
    "/api/auth/two-factor/verify-backup-code",
  ].includes(path);
  if (request.method !== "POST" || (!stepUp && !verify)) return null;
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.twoFactorEnabled) return null;
  if (security && (verify || body?.factorCode || body?.recoveryCode)) {
    const limit = await reserveAccountAttempt(
      security.db,
      request,
      security.secret,
      Date.now(),
      session.user.id,
    );
    if (!limit.allowed) return { code: "TOO_MANY_REQUESTS", status: 429 };
  }
  if (!stepUp) return null;
  if (
    !/^[0-9]{6}$/.test(body?.factorCode || "") &&
    typeof body?.recoveryCode !== "string"
  )
    return { code: "SECOND_FACTOR_REQUIRED", status: 403 };
  try {
    // A wrong password must not consume a one-use recovery code. This stays a
    // server-only check; /verify-password is deliberately not publicly routed.
    if (body.recoveryCode && path !== "/api/auth/change-email") {
      const password =
        path === "/api/auth/change-password"
          ? body.currentPassword
          : body.password;
      if (typeof password !== "string" || !password || password.length > 128)
        return { code: "INVALID_PASSWORD", status: 400 };
      const checked = await auth.api.verifyPassword({
        headers: request.headers,
        body: { password },
        asResponse: true,
      });
      if (!checked.ok) return { code: "INVALID_PASSWORD", status: 400 };
    }
    const response = await (
      body.recoveryCode ? auth.api.verifyBackupCode : auth.api.verifyTOTP
    )({
      headers: request.headers,
      body: { code: body.recoveryCode || body.factorCode, trustDevice: false },
      asResponse: true,
    });
    if (!response.ok) return { code: "INVALID_SECOND_FACTOR", status: 403 };
  } catch {
    return { code: "INVALID_SECOND_FACTOR", status: 403 };
  }
  return null;
}

export async function accountNotices(db, owner, request, body) {
  const path = new URL(request.url).pathname;
  if (path === "/api/account/notices" && request.method === "GET") {
    const { results } = await db
      .prepare("SELECT notice,shown_at FROM account_notice WHERE owner=?")
      .bind(owner)
      .all();
    return { items: results };
  }
  if (path !== "/api/account/notices/claim" || request.method !== "POST")
    return null;
  if (!NOTICE_IDS.includes(body?.id))
    return { error: "Invalid notice", status: 400 };
  const now = new Date().toISOString(),
    cutoff = new Date(Date.now() - 60000).toISOString();
  const result = await db
    .prepare(
      "INSERT INTO account_notice(owner,notice,shown_at) SELECT ?,?,? WHERE NOT EXISTS(SELECT 1 FROM account_notice WHERE owner=? AND (notice=? OR shown_at>?)) ON CONFLICT(owner,notice) DO NOTHING",
    )
    .bind(owner, body.id, now, owner, body.id, cutoff)
    .run();
  return { claimed: result.meta.changes === 1 };
}

export async function safeAuthResponse(response) {
  if (
    !response.ok ||
    !response.headers.get("content-type")?.includes("application/json")
  )
    return response;
  const data = await response.json();
  if (data && typeof data === "object" && !Array.isArray(data)) {
    delete data.token;
    if (data.session) delete data.session.token;
  }
  const headers = new Headers(response.headers);
  headers.delete("content-length");
  return Response.json(data, { status: response.status, headers });
}

export async function accountSessions(db, owner, currentId, request) {
  const path = new URL(request.url).pathname;
  if (path === "/api/account/sessions" && request.method === "GET") {
    const { results } = await db
      .prepare(
        "SELECT id,createdAt,updatedAt,expiresAt,userAgent FROM session WHERE userId=? AND expiresAt>? ORDER BY createdAt DESC",
      )
      .bind(owner, new Date().toISOString())
      .all();
    return {
      items: results.map((r) => ({
        ...r,
        userAgent: String(r.userAgent || "").slice(0, 240),
        current: r.id === currentId,
      })),
    };
  }
  if (
    path === "/api/account/sessions/revoke-others" &&
    request.method === "POST"
  ) {
    await db
      .prepare("DELETE FROM session WHERE userId=? AND id<>?")
      .bind(owner, currentId)
      .run();
    return { revoked: true };
  }
  const id = path.match(
    /^\/api\/account\/sessions\/([a-zA-Z0-9_-]{1,100})$/,
  )?.[1];
  if (id && request.method === "DELETE") {
    if (id === currentId)
      return { error: "Use sign out for the current session", status: 400 };
    const result = await db
      .prepare("DELETE FROM session WHERE userId=? AND id=?")
      .bind(owner, id)
      .run();
    return result.meta.changes
      ? { revoked: true }
      : { error: "Not found", status: 404 };
  }
  return null;
}
