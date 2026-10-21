import { twoFactor } from "better-auth/plugins";
import { createAuthMiddleware } from "better-auth/api";

// Password sign-in uses the upstream challenge/session-discard hook. Email
// codes are now registration-only. Keep the extra hook as defence in depth
// if that endpoint's policy ever changes; inbox ownership must not bypass 2FA.
export function accountTwoFactor() {
  const plugin = twoFactor({
    issuer: "Pollframe",
    skipVerificationOnEnable: false,
    accountLockout: {
      enabled: true,
      maxFailedAttempts: 5,
      durationSeconds: 900,
    },
  });
  return {
    ...plugin,
    schema: {
      ...plugin.schema,
      twoFactor: {
        ...plugin.schema.twoFactor,
        fields: {
          ...plugin.schema.twoFactor.fields,
          userId: { ...plugin.schema.twoFactor.fields.userId, unique: true },
        },
      },
    },
    hooks: {
      ...plugin.hooks,
      after: [
        ...plugin.hooks.after.map((hook) => ({
          ...hook,
          matcher: (context) =>
            context.path === "/sign-in/email-otp" || hook.matcher(context),
        })),
        {
          matcher: (ctx) =>
            ["/two-factor/verify-totp", "/two-factor/disable"].includes(
              ctx.path,
            ),
          handler: createAuthMiddleware(async (ctx) => {
            const fresh = ctx.context.newSession,
              previous = ctx.context.session;
            if (
              !fresh ||
              !previous ||
              fresh.user.twoFactorEnabled === previous.user.twoFactorEnabled
            )
              return;
            await ctx.context.adapter.deleteMany({
              model: "session",
              where: [
                { field: "userId", value: fresh.user.id },
                { field: "id", value: fresh.session.id, operator: "ne" },
              ],
            });
          }),
        },
      ],
    },
  };
}
