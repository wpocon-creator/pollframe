import test from "node:test";
import assert from "node:assert/strict";
import { passwordStrength } from "../src/password-policy.js";
import { createAccountLab } from "../server/account-lab.mjs";

test("meter rejects common patterns, repeats, short and overlong inputs without composition rules", () => {
  for (const password of [
    "passwordpassword",
    "qwertyqwertyqwerty",
    "passwortpasswort",
    "contraseñacontraseña",
    "12345678901234567890",
    "a".repeat(128),
    "😀".repeat(14),
    "A".repeat(129),
    null,
  ])
    assert.equal(passwordStrength(password).accepted, false);
  for (const password of [
    "violet lanterns orbit quiet mountains",
    "Fictional release test account passphrase 2026",
  ])
    assert.equal(passwordStrength(password).accepted, true);
});

test("server rejects weak passwords in every write flow, not just the browser", async () => {
  const lab = await createAccountLab();
  const base = "http://127.0.0.1:4173",
    email = "strength@example.test",
    strong = "Fictional strength check passphrase 2026";
  let cookie = "";
  const call = (path, body) =>
    lab.handle(
      new Request(base + path, {
        method: body ? "POST" : "GET",
        headers: { origin: base, "content-type": "application/json", cookie },
        ...(body ? { body: JSON.stringify(body) } : {}),
      }),
    );
  const weak = async (path, body) => {
    const r = await call(path, body);
    assert.equal(r.status, 400, await r.clone().text());
    assert.equal((await r.json()).code, "PASSWORD_TOO_WEAK");
  };
  try {
    await weak("/api/auth/sign-up/email", {
      email,
      name: "Test",
      password: "passwordpassword",
    });
    assert.equal(
      lab.outbox.length,
      0,
      "weak signup must not send a verification mail",
    );
    await call("/api/auth/email-otp/send-verification-otp", {
      email,
      type: "sign-in",
    });
    const r = await call("/api/auth/sign-in/email-otp", {
      email,
      otp: lab.outbox.at(-1).otp,
    });
    assert.equal(r.status, 200);
    cookie = r.headers
      .getSetCookie()
      .map((c) => c.split(";")[0])
      .join("; ");
    await weak("/api/account/initial-password", {
      password: "passwortpasswort",
    });
    assert.equal(
      (await call("/api/account/initial-password", { password: strong }))
        .status,
      200,
    );
    await weak("/api/auth/change-password", {
      currentPassword: strong,
      newPassword: "qwertyqwertyqwerty",
      revokeOtherSessions: true,
    });
    await call("/api/auth/request-password-reset", { email, redirectTo: base });
    const token = new URL(lab.outbox.at(-1).url).pathname.split("/").at(-1);
    await weak("/api/auth/reset-password", {
      token,
      newPassword: "passwordpassword",
    });
    assert.equal(
      (
        await call("/api/auth/reset-password", {
          token,
          newPassword: strong + " changed",
        })
      ).status,
      200,
      "weak submission must not consume the reset token",
    );
  } finally {
    lab.close();
  }
});
