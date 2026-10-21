import { emailFirstPlugin } from "./email-first.mjs";
import { checkedAccountOrigin, ACCOUNT_ORIGIN } from "./account-origin.mjs";
import { accountTwoFactor } from "./account-two-factor.mjs";
import { passwordPolicyPlugin } from "./password-policy.mjs";
import { accountRateRules } from "./account-throttle.mjs";
// Shared production policy. No secret defaults and no hostname from request headers.
export function accountOptions({
  database,
  secret,
  send,
  baseURL,
  beforeDelete,
}) {
  if (typeof secret !== "string" || secret.length < 40)
    throw Error("Account secret missing");
  baseURL = checkedAccountOrigin(baseURL);
  return {
    appName: "Pollframe",
    database,
    secret,
    baseURL,
    telemetry: { enabled: false },
    // Library errors can contain database arguments. Record a stable event,
    // never arbitrary error objects, email addresses, passwords or link tokens.
    logger: {
      level: "warn",
      log: (level) =>
        console.warn(
          level === "error"
            ? "[accounts] authentication_error"
            : "[accounts] authentication_warning",
        ),
    },
    trustedOrigins: [baseURL],
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
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: send("reset"),
    },
    emailVerification: {
      sendOnSignUp: true,
      autoSignInAfterVerification: false,
      expiresIn: 1800,
      sendVerificationEmail: send("verify"),
    },
    session: { expiresIn: 60 * 60 * 24 * 7, updateAge: 86400, freshAge: 300 },
    rateLimit: {
      enabled: true,
      storage: "database",
      window: 60,
      max: 80,
      customRules: {
        ...accountRateRules,
      },
    },
    advanced: {
      // The schema is checked by migrations, preflight and real D1 tests.
      // Better Auth's per-instance background schema introspection is not
      // appropriate for request-owned edge instances: it adds many D1 reads
      // even to empty session probes and can outlive the request.
      database: { validateSchema: false },
      cookiePrefix:
        baseURL === ACCOUNT_ORIGIN ? "pollframe" : "pollframe-preview",
      useSecureCookies: true,
      defaultCookieAttributes: { httpOnly: true, sameSite: "lax" },
      ipAddress: { ipAddressHeaders: ["cf-connecting-ip"] },
    },
    user: {
      changeEmail: {
        enabled: true,
        sendChangeEmailConfirmation: send("email-change"),
      },
      deleteUser: { enabled: true, ...(beforeDelete ? { beforeDelete } : {}) },
    },
  };
}
