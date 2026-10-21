import test from "node:test";
import assert from "node:assert/strict";
import { createAccountLab } from "../server/account-lab.mjs";

const base = "http://127.0.0.1:4173";
const password = "A unique email-first test password 2026";
test("email-first: no enumeration before inbox proof, verified registration, password login and single-use codes", async () => {
  const lab = await createAccountLab();
  const call = (path, body, cookie = "") =>
    lab.handle(
      new Request(base + path, {
        method: body ? "POST" : "GET",
        headers: { origin: base, "content-type": "application/json", cookie },
        ...(body ? { body: JSON.stringify(body) } : {}),
      }),
    );
  const address = "email-first@example.test";
  const codePath = "/api/auth/email-otp/";
  try {
    let r = await call(codePath + "send-verification-otp", {
      email: address,
      type: "sign-in",
    });
    assert.deepEqual(await r.json(), { success: true });
    const code = lab.outbox.at(-1).otp;
    assert.match(code, /^\d{6}$/);
    r = await call(codePath + "check-verification-otp", {
      email: address,
      type: "sign-in",
      otp: "not-the-code",
    });
    assert.notEqual((await r.json()).code, "USER_NOT_FOUND");
    r = await call(codePath + "check-verification-otp", {
      email: address,
      type: "sign-in",
      otp: code,
    });
    assert.equal(
      (await r.json()).code,
      "USER_NOT_FOUND",
      "only correct OTP reveals a new address",
    );
    assert.equal(
      (await call("/api/account/initial-password", { password })).status,
      401,
    );
    r = await call("/api/auth/sign-in/email-otp", {
      email: address,
      otp: code,
      name: "Test",
    });
    assert.equal(r.status, 200, await r.clone().text());
    const cookie = r.headers
      .getSetCookie()
      .map((v) => v.split(";")[0])
      .join("; ");
    assert.equal((await r.json()).user.emailVerified, true);
    assert.equal(
      (await call("/api/auth/sign-in/email-otp", { email: address, otp: code }))
        .status,
      400,
      "code cannot be replayed",
    );
    assert.equal(
      (
        await call(
          "/api/account/initial-password",
          { password: "short" },
          cookie,
        )
      ).status,
      400,
    );
    r = await call("/api/account/initial-password", { password }, cookie);
    assert.equal(r.status, 200, await r.clone().text());
    r = await call(
      "/api/account/initial-password",
      { password: password + " replace" },
      cookie,
    );
    assert.notEqual(
      r.status,
      200,
      "initial-password cannot overwrite an existing password",
    );
    r = await call("/api/auth/sign-in/email", { email: address, password });
    assert.equal(r.status, 200, await r.clone().text());
    r = await call(codePath + "send-verification-otp", {
      email: address,
      type: "sign-in",
    });
    assert.deepEqual(
      await r.json(),
      { success: true },
      "existing and new address start responses match",
    );
    r = await call(codePath + "check-verification-otp", {
      email: address,
      type: "sign-in",
      otp: lab.outbox.at(-1).otp,
    });
    assert.deepEqual(await r.json(), { success: true });
    r = await call("/api/auth/sign-in/email-otp", {
      email: address,
      otp: lab.outbox.at(-1).otp,
    });
    assert.equal(r.status, 403, await r.clone().text());
    assert.equal((await r.json()).code, "PASSWORD_LOGIN_REQUIRED");
    assert.equal(
      await (await call("/api/auth/get-session")).json(),
      null,
      "valid email proof cannot create a returning user's session",
    );
  } finally {
    lab.close();
  }
});

test("unused code purposes fail identically for existing and unknown addresses", async () => {
  const lab = await createAccountLab();
  const call = (path, body) =>
    lab.handle(
      new Request(base + path, {
        method: "POST",
        headers: { origin: base, "content-type": "application/json" },
        body: JSON.stringify(body),
      }),
    );
  try {
    await call("/api/auth/sign-up/email", {
      email: "existing@example.test",
      password,
      name: "Test",
    });
    for (const email of ["existing@example.test", "unknown@example.test"]) {
      const r = await call("/api/auth/email-otp/send-verification-otp", {
        email,
        type: "email-verification",
      });
      assert.equal(r.status, 400);
      assert.equal((await r.json()).code, "UNSUPPORTED_CODE_PURPOSE");
    }
  } finally {
    lab.close();
  }
});

test("an interrupted first password setup can be recovered without allowing code-only login", async () => {
  const lab = await createAccountLab();
  const email = "interrupted@example.test";
  const call = (path, body, cookie = "") =>
    lab.handle(
      new Request(base + path, {
        method: body ? "POST" : "GET",
        headers: { origin: base, "content-type": "application/json", cookie },
        ...(body ? { body: JSON.stringify(body) } : {}),
      }),
    );
  try {
    await call("/api/auth/email-otp/send-verification-otp", {
      email,
      type: "sign-in",
    });
    const created = await call("/api/auth/sign-in/email-otp", {
      email,
      otp: lab.outbox.at(-1).otp,
      name: "Interrupted setup",
    });
    assert.equal(created.status, 200);
    const oldCookie = created.headers
      .getSetCookie()
      .map((c) => c.split(";")[0])
      .join("; ");
    // Simulate closing the page before setting the first password.
    await call("/api/auth/email-otp/send-verification-otp", {
      email,
      type: "sign-in",
    });
    assert.equal(
      (
        await call("/api/auth/sign-in/email-otp", {
          email,
          otp: lab.outbox.at(-1).otp,
        })
      ).status,
      403,
    );
    assert.equal(
      (
        await call("/api/auth/request-password-reset", {
          email,
          redirectTo: base + "/?account=reset",
        })
      ).status,
      200,
    );
    const mail = lab.outbox.at(-1);
    assert.equal(mail.kind, "reset");
    const redirect = await lab.handle(
      new Request(mail.url, { headers: { origin: base } }),
    );
    const token = new URL(redirect.headers.get("location")).searchParams.get(
      "token",
    );
    assert.ok(token);
    assert.equal(
      (await call("/api/auth/reset-password", { token, newPassword: password }))
        .status,
      200,
    );
    assert.equal(
      await (await call("/api/auth/get-session", null, oldCookie)).json(),
      null,
    );
    assert.equal(
      (await call("/api/auth/sign-in/email", { email, password })).status,
      200,
    );
  } finally {
    lab.close();
  }
});

test("email-first sends are rate-limited and cross-origin requests are blocked", async () => {
  const lab = await createAccountLab();
  try {
    const request = (i, origin = base) =>
      new Request(base + "/api/auth/email-otp/send-verification-otp", {
        method: "POST",
        headers: { origin, "content-type": "application/json" },
        body: JSON.stringify({
          email: `abuse-${i}@example.test`,
          type: "sign-in",
        }),
      });
    assert.equal(
      (await lab.handle(request(0, "https://evil.test"))).status,
      403,
    );
    for (let i = 0; i < 20; i++)
      assert.equal((await lab.handle(request(i))).status, 200);
    assert.equal((await lab.handle(request(4))).status, 429);
    assert.equal(lab.outbox.length, 20);
  } finally {
    lab.close();
  }
});
