import { emailOTP } from "better-auth/plugins";
import { createAuthMiddleware, APIError } from "better-auth/api";
import { passwordStrength } from "../src/password-policy.js";

// Better Auth owns OTP generation, hashing, attempt limits and atomic consumption.
// Account existence is only revealed after the caller proves access to the inbox.
export const emailFirstPlugin = (send) => {
  const plugin = emailOTP({
    otpLength: 6,
    expiresIn: 600,
    allowedAttempts: 5,
    storeOTP: "hashed",
    // Per-address and atomic guards below own the tighter budgets. The library
    // IP ceiling must leave room for several people on one household network.
    rateLimit: { window: 60, max: 40 },
    sendVerificationOTP: ({ email, otp, type }, ctx) => {
      if (type !== "sign-in") throw Error("Unsupported email code purpose");
      return send("code")({ user: { email }, otp }, ctx.request);
    },
  });
  return {
    ...plugin,
    // No extra OTP reset/change-email API: the existing, tested link-based
    // recovery flow remains authoritative.
    endpoints: {
      sendVerificationOTP: plugin.endpoints.sendVerificationOTP,
      checkVerificationOTP: plugin.endpoints.checkVerificationOTP,
      signInEmailOTP: plugin.endpoints.signInEmailOTP,
    },
    hooks: {
      ...plugin.hooks,
      before: [
        {
          matcher: (ctx) => ctx.path === "/sign-in/email-otp",
          handler: createAuthMiddleware(async (ctx) => {
            // This endpoint is registration-only. First validate inbox proof
            // using the library's hashed-code/attempt checks; never reveal
            // whether an address exists to someone without its valid code.
            try {
              await plugin.endpoints.checkVerificationOTP({
                context: ctx.context,
                request: ctx.request,
                body: {
                  email: ctx.body?.email,
                  otp: ctx.body?.otp,
                  type: "sign-in",
                },
              });
            } catch (error) {
              if (error?.body?.code === "USER_NOT_FOUND") return;
              throw error;
            }
            throw new APIError("FORBIDDEN", {
              code: "PASSWORD_LOGIN_REQUIRED",
              message: "Sign in with your password, or reset it if needed.",
            });
          }),
        },
        {
          matcher: (ctx) =>
            [
              "/email-otp/send-verification-otp",
              "/email-otp/check-verification-otp",
            ].includes(ctx.path),
          handler: createAuthMiddleware(async (ctx) => {
            // Validate purpose before any account lookup. Otherwise an unused
            // purpose could fail differently for existing and new addresses.
            if (ctx.body?.type !== "sign-in")
              throw new APIError("BAD_REQUEST", {
                code: "UNSUPPORTED_CODE_PURPOSE",
                message: "Unsupported code purpose",
              });
            return {
              context: {
                context: {
                  // This request needs actual delivery acceptance, not background best-effort
                  // success. Override ONLY its request-local runner, not the shared context
                  // or password-reset responses (which must stay enumeration-resistant).
                  runInBackgroundOrAwait: async (promise) => {
                    try {
                      await promise;
                    } catch {
                      throw new APIError("SERVICE_UNAVAILABLE", {
                        code: "EMAIL_DELIVERY_UNAVAILABLE",
                        message:
                          "Email delivery is temporarily unavailable. Please try again later.",
                      });
                    }
                  },
                },
              },
            };
          }),
        },
      ],
    },
  };
};

// A fresh, verified session is required by Better Auth's server-only setPassword.
// This can only ADD a password, never replace an existing one. Reset remains a
// separate, single-use email-link flow which revokes other sessions.
export async function initialPassword(auth, request, body, email = "") {
  if (
    typeof body?.password !== "string" ||
    body.password.length < 15 ||
    body.password.length > 128
  )
    return Response.json({ error: "PASSWORD_LENGTH" }, { status: 400 });
  if (!passwordStrength(body.password, email).accepted)
    return Response.json({ code: "PASSWORD_TOO_WEAK" }, { status: 400 });
  try {
    return await auth.api.setPassword({
      headers: request.headers,
      body: { newPassword: body.password },
      asResponse: true,
    });
  } catch {
    return Response.json({ error: "PASSWORD_SETUP_FAILED" }, { status: 400 });
  }
}
