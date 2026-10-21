import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { base32 } from "@better-auth/utils/base32";
import { createAccountLab } from "../server/account-lab.mjs";

const base = "http://127.0.0.1:4173",
  password = "An independently chosen passphrase 2026!";
function client(lab) {
  const jar = new Map();
  const call = async (path, body, method = body ? "POST" : "GET") => {
    const response = await lab.handle(
      new Request(base + path, {
        method,
        headers: {
          origin: base,
          "content-type": "application/json",
          cookie: [...jar].map(([k, v]) => `${k}=${v}`).join("; "),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      }),
    );
    for (const cookie of response.headers.getSetCookie()) {
      const pair = cookie.split(";")[0],
        i = pair.indexOf("=");
      jar.set(pair.slice(0, i), pair.slice(i + 1));
    }
    return response;
  };
  return { call };
}
async function create(lab, email = "security@example.test") {
  const c = client(lab);
  assert.equal(
    (
      await c.call("/api/auth/sign-up/email", {
        email,
        password,
        name: "Security test",
        callbackURL: base,
      })
    ).status,
    200,
  );
  const mail = lab.outbox.findLast(
    (m) => m.kind === "verify" && m.to === email,
  );
  assert.ok(mail);
  assert.ok(
    (await lab.handle(new Request(mail.url, { headers: { origin: base } })))
      .status < 400,
  );
  assert.equal(
    (await c.call("/api/auth/sign-in/email", { email, password })).status,
    200,
  );
  return c;
}
async function enroll(c) {
  const response = await c.call("/api/auth/two-factor/enable", { password });
  assert.equal(response.status, 200, await response.clone().text());
  const setup = await response.json();
  const secret = new URL(setup.totpURI).searchParams.get("secret");
  // Independent RFC 6238 implementation: test the standard, not the same
  // library helper as production (the URI contains a base32-encoded key).
  const code = () => {
    const counter = Buffer.alloc(8);
    counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30000)));
    const h = createHmac("sha1", base32.decode(secret))
        .update(counter)
        .digest(),
      o = h[19] & 15;
    return String((h.readUInt32BE(o) & 0x7fffffff) % 1000000).padStart(6, "0");
  };
  assert.equal((await c.call("/api/auth/get-session")).status, 200);
  assert.equal(
    (await (await c.call("/api/auth/get-session")).json()).user
      .twoFactorEnabled,
    false,
  );
  const verified = await c.call("/api/auth/two-factor/verify-totp", {
    code: await code(),
    trustDevice: false,
  });
  assert.equal(verified.status, 200, await verified.clone().text());
  assert.equal(
    (await (await c.call("/api/auth/get-session")).json()).user
      .twoFactorEnabled,
    true,
  );
  return { code, codes: setup.backupCodes };
}

test("password then 2FA is required; email proof cannot bypass it; recovery codes work once", async () => {
  const lab = await createAccountLab();
  try {
    const owner = await create(lab),
      previous = client(lab);
    await previous.call("/api/auth/sign-in/email", {
      email: "security@example.test",
      password,
    });
    const { code, codes } = await enroll(owner);
    assert.equal(
      (await previous.call("/api/account/documents")).status,
      401,
      "enabling 2FA must revoke older sessions",
    );
    const passwordClient = client(lab);
    const login = await passwordClient.call("/api/auth/sign-in/email", {
      email: "security@example.test",
      password,
    });
    assert.equal(login.status, 200);
    const challenge = await login.json();
    assert.equal(challenge.twoFactorRedirect, true);
    assert.equal(challenge.token, undefined);
    assert.equal(
      (await passwordClient.call("/api/account/documents")).status,
      401,
    );
    assert.equal(
      (
        await passwordClient.call("/api/auth/two-factor/verify-totp", {
          code: await code(),
          trustDevice: true,
        })
      ).status,
      400,
    );
    assert.equal(
      (
        await passwordClient.call("/api/auth/two-factor/verify-totp", {
          code: await code(),
          trustDevice: false,
        })
      ).status,
      200,
    );
    const session = await (
      await passwordClient.call("/api/auth/get-session")
    ).json();
    assert.equal(session.session.token, undefined);
    const emailClient = client(lab);
    assert.equal(
      (
        await emailClient.call("/api/auth/email-otp/send-verification-otp", {
          email: "security@example.test",
          type: "sign-in",
        })
      ).status,
      200,
    );
    const otp = lab.outbox.findLast((m) => m.kind === "code").otp;
    const otpLogin = await emailClient.call("/api/auth/sign-in/email-otp", {
      email: "security@example.test",
      otp,
    });
    assert.equal(otpLogin.status, 403, await otpLogin.clone().text());
    assert.equal((await otpLogin.json()).code, "PASSWORD_LOGIN_REQUIRED");
    assert.equal(
      (await emailClient.call("/api/account/documents")).status,
      401,
    );
    const recoveryLogin = await emailClient.call("/api/auth/sign-in/email", {
      email: "security@example.test",
      password,
    });
    assert.equal(recoveryLogin.status, 200);
    assert.equal((await recoveryLogin.json()).twoFactorRedirect, true);
    assert.equal(
      (
        await emailClient.call("/api/auth/two-factor/verify-backup-code", {
          code: codes[0],
          trustDevice: false,
        })
      ).status,
      200,
    );
    assert.equal(
      (await emailClient.call("/api/account/documents")).status,
      200,
    );
    assert.equal(
      (
        await emailClient.call("/api/auth/two-factor/verify-backup-code", {
          code: codes[0],
          trustDevice: false,
        })
      ).status,
      401,
      "recovery code must not be reusable",
    );
  } finally {
    lab.close();
  }
});

test("sensitive settings require step-up; session listings and notices are owner-scoped", async () => {
  const lab = await createAccountLab();
  try {
    const c = await create(lab),
      { code } = await enroll(c);
    for (const body of [
      { name: "x", twoFactorEnabled: false },
      { name: "x", emailVerified: true },
      { name: "x", image: "https://evil.test/t.gif" },
    ])
      assert.equal((await c.call("/api/auth/update-user", body)).status, 400);
    assert.equal(
      (await c.call("/api/auth/update-user", { name: "Updated name" })).status,
      200,
    );
    for (const [path, body] of [
      ["/two-factor/disable", { password }],
      [
        "/change-password",
        { currentPassword: password, newPassword: password + " changed" },
      ],
      ["/delete-user", { password }],
      ["/change-email", { newEmail: "new@example.test", callbackURL: base }],
    ])
      assert.equal((await c.call("/api/auth" + path, body)).status, 403, path);
    const listed = await (await c.call("/api/account/sessions")).json();
    assert.ok(listed.items.length);
    assert.ok(listed.items.every((s) => s.token === undefined));
    assert.ok(listed.items.some((s) => s.current));
    assert.equal((await c.call("/api/auth/list-sessions")).status, 404);
    assert.equal(
      (await c.call("/api/auth/get-totp-uri", { password })).status,
      404,
    );
    const me = await (await c.call("/api/auth/get-session")).json();
    assert.equal(
      (
        await c.call("/api/account/notices/claim", {
          id: "feedback-v1",
          expectedOwner: "not-me",
        })
      ).status,
      409,
    );
    const claims = await Promise.all(
      Array.from({ length: 8 }, () =>
        c
          .call("/api/account/notices/claim", { id: "feedback-v1" })
          .then((r) => r.json()),
      ),
    );
    assert.equal(claims.filter((r) => r.claimed).length, 1);
    assert.equal(
      (
        await (
          await c.call("/api/account/notices/claim", { id: "studio-guide-v1" })
        ).json()
      ).claimed,
      false,
      "one notice per minute across devices",
    );
    const second = await create(lab, "other@example.test");
    assert.deepEqual(
      (await (await second.call("/api/account/notices")).json()).items,
      [],
    );
    assert.equal(
      (
        await second.call(
          "/api/account/sessions/" + encodeURIComponent(listed.items[0].id),
          null,
          "DELETE",
        )
      ).status,
      404,
    );
    assert.equal(
      (
        await c.call("/api/auth/two-factor/disable", {
          password,
          factorCode: await code(),
        })
      ).status,
      200,
    );
    assert.equal(
      (await (await c.call("/api/auth/get-session")).json()).user
        .twoFactorEnabled,
      false,
    );
    assert.ok(me.user.id);
  } finally {
    lab.close();
  }
});

test("resetting the password cannot remove 2FA; a wrong password cannot consume a recovery code", async () => {
  const lab = await createAccountLab();
  try {
    const c = await create(lab),
      { codes } = await enroll(c);
    const wrong = await c.call("/api/auth/two-factor/disable", {
      password: "not the account password",
      recoveryCode: codes[2],
    });
    assert.equal(wrong.status, 400);
    assert.equal((await wrong.json()).code, "INVALID_PASSWORD");
    assert.equal(
      (
        await c.call("/api/auth/request-password-reset", {
          email: "security@example.test",
          redirectTo: base + "/?account=reset",
        })
      ).status,
      200,
    );
    const mail = lab.outbox.findLast((m) => m.kind === "reset");
    assert.ok(mail);
    const token = new URL(mail.url).pathname.split("/").at(-1),
      newPassword = password + " reset";
    assert.equal(
      (await c.call("/api/auth/reset-password", { token, newPassword })).status,
      200,
    );
    assert.equal((await c.call("/api/account/documents")).status, 401);
    const after = client(lab);
    const login = await after.call("/api/auth/sign-in/email", {
      email: "security@example.test",
      password: newPassword,
    });
    assert.equal((await login.json()).twoFactorRedirect, true);
    assert.equal((await after.call("/api/account/documents")).status, 401);
    assert.equal(
      (
        await after.call("/api/auth/two-factor/verify-backup-code", {
          code: codes[2],
          trustDevice: false,
        })
      ).status,
      200,
      "wrong password must leave this recovery code usable",
    );
    assert.equal((await after.call("/api/account/documents")).status, 200);
    assert.equal(
      (
        await after.call("/api/auth/delete-user", {
          password: newPassword,
          recoveryCode: codes[3],
        })
      ).status,
      200,
    );
    assert.equal((await after.call("/api/account/documents")).status, 401);
  } finally {
    lab.close();
  }
});
