import { rateAddress } from "../worker/security.js";

const rules = new Map([
  // seconds, per-email ceiling, shared-network ceiling. The email budget is
  // independent of IP, so rotating networks cannot target one account faster.
  ["/api/auth/sign-in/email", [60, 10, 40]],
  ["/api/auth/sign-up/email", [3600, 5, 30]],
  ["/api/auth/email-otp/send-verification-otp", [600, 5, 20]],
  ["/api/auth/email-otp/check-verification-otp", [60, 10, 40]],
  ["/api/auth/sign-in/email-otp", [60, 10, 40]],
  ["/api/auth/request-password-reset", [3600, 5, 20]],
  ["/api/auth/send-verification-email", [3600, 5, 20]],
  ["/api/auth/reset-password", [60, 5]],
  ["/api/auth/delete-user", [60, 3]],
  ["/api/auth/change-password", [60, 3]],
  ["/api/auth/change-email", [3600, 3]],
  ["/api/auth/two-factor/enable", [60, 3]],
  ["/api/auth/two-factor/disable", [60, 3]],
  ["/api/auth/two-factor/verify-totp", [60, 5]],
  ["/api/auth/two-factor/verify-backup-code", [60, 5]],
  ["/api/auth/two-factor/generate-backup-codes", [60, 3]],
]);

export const accountRateRules = Object.fromEntries(
  [...rules].map(([path, [window, max, network = max]]) => [
    path.replace(/^\/api\/auth/, ""),
    { window, max: network },
  ]),
);

// Additional atomic guard: read-then-write library rate counters alone can
// race when several login requests arrive simultaneously. Reuse the existing
// table with a distinct namespace; no schema migration or new paid service.
export async function reserveAccountAttempt(
  db,
  request,
  secret,
  now = Date.now(),
  factorOwner = null,
  email = null,
) {
  const path = new URL(request.url).pathname;
  // factorOwner comes only from a server-verified session, never the body/IP.
  // Share one atomic budget across all authenticated factor/step-up endpoints.
  const rule =
    request.method === "POST" && (factorOwner ? [60, 5] : rules.get(path));
  if (!rule) return { allowed: true };
  const [seconds, maximum, networkMaximum = maximum] = rule;
  const address = rateAddress(
    request.headers.get("cf-connecting-ip") || "unknown",
  );
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const normalizedEmail =
    typeof email === "string" && email.length <= 320
      ? email.trim().toLowerCase()
      : "";
  const scopes = factorOwner
    ? [[`factor-user:${factorOwner}`, maximum]]
    : [
        [`network:${address}`, networkMaximum],
        ...(normalizedEmail ? [[`email:${normalizedEmail}`, maximum]] : []),
      ];
  for (const [scope, limit] of scopes) {
    const signature = await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode("account-throttle-v2:" + scope),
    );
    const digest = Array.from(new Uint8Array(signature), (x) =>
      x.toString(16).padStart(2, "0"),
    ).join("");
    const id = `pf-atomic:${factorOwner ? "factor-step-up" : path}:${digest}`;
    const cutoff = now - seconds * 1000;
    const row = await db
      .prepare(
        `INSERT INTO rateLimit(id,key,count,lastRequest) VALUES(?,?,1,?)
    ON CONFLICT(key) DO UPDATE SET
      count=CASE WHEN lastRequest<=? THEN 1 ELSE count+1 END,
      lastRequest=CASE WHEN lastRequest<=? THEN excluded.lastRequest ELSE lastRequest END
    WHERE lastRequest<=? OR count<? RETURNING count`,
      )
      .bind(id, id, now, cutoff, cutoff, cutoff, limit)
      .first();
    if (!row) {
      const previous = await db
        .prepare("SELECT lastRequest FROM rateLimit WHERE key=?")
        .bind(id)
        .first();
      return {
        allowed: false,
        retryAfter: Math.max(
          1,
          Math.ceil(
            ((previous?.lastRequest ?? now) + seconds * 1000 - now) / 1000,
          ),
        ),
      };
    }
  }
  return { allowed: true };
}
