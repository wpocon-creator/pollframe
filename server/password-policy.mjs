import { createAuthMiddleware, APIError } from "better-auth/api";
import { passwordStrength } from "../src/password-policy.js";

export function requireStrongPassword(password, email) {
  if (!passwordStrength(password, email).accepted)
    throw new APIError("BAD_REQUEST", {
      code: "PASSWORD_TOO_WEAK",
      message:
        "Choose a longer, less predictable password (at least 15 characters).",
    });
}
export function passwordPolicyPlugin() {
  return {
    id: "pollframe-password-policy",
    hooks: {
      before: [
        {
          matcher: (ctx) =>
            [
              "/sign-up/email",
              "/change-password",
              "/reset-password",
              "/set-password",
            ].includes(ctx.path),
          handler: createAuthMiddleware(async (ctx) => {
            requireStrongPassword(
              ctx.body?.newPassword ?? ctx.body?.password,
              ctx.body?.email || "",
            );
          }),
        },
      ],
    },
  };
}
