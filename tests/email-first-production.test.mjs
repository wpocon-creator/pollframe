import test from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { readFile } from "node:fs/promises";
import { Miniflare, convertV4MiniflareOptions } from "miniflare";

test("email-first in workerd/D1: hashed codes, secure sessions, expiry, password setup and hard mail budget", async () => {
  const { outputFiles } = await build({
    entryPoints: ["tests/fixtures/account-worker.mjs"],
    bundle: true,
    write: false,
    format: "esm",
    platform: "node",
    external: ["node:*"],
    logLevel: "silent",
  });
  const mf = new Miniflare(
    convertV4MiniflareOptions({
      modules: true,
      script: outputFiles[0].text,
      compatibilityDate: "2026-07-30",
      compatibilityFlags: ["nodejs_compat"],
      d1Databases: ["ACCOUNTS_DB"],
      bindings: {
        ACCOUNTS_ENABLED: "true",
        AUTH_SECRET: "email-first-test-secret-only-0000000000000000000",
        RESEND_API_KEY: "intercepted-locally",
        AUTH_FROM: "konto@pollframe.com",
      },
    }),
  );
  try {
    const db = await mf.getD1Database("ACCOUNTS_DB");
    const schema = await readFile(
      new URL("../migrations/accounts/0001_accounts.sql", import.meta.url),
      "utf8",
    );
    const security = await readFile(
      new URL(
        "../migrations/accounts/0003_account_security.sql",
        import.meta.url,
      ),
      "utf8",
    );
    await db.batch(
      (schema + security)
        .split(";")
        .map((s) => s.trim())
        .filter(Boolean)
        .map((s) => db.prepare(s)),
    );
    await db.prepare("CREATE TABLE test_mail(payload TEXT)").run();
    const call = (path, body, cookie = "") =>
      mf.dispatchFetch("https://pollframe.com" + path, {
        method: body ? "POST" : "GET",
        headers: {
          origin: "https://pollframe.com",
          "content-type": "application/json",
          "cf-connecting-ip": "192.0.2.20",
          cookie,
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
    const email = "workerd-email@example.test",
      password = "A production-code test passphrase 2026";
    // Match a real cold-start browser sequence: runtime probe and rejected
    // requests finish before the first request that needs auth initialization.
    assert.equal((await call("/api/account/capabilities")).status, 200);
    assert.equal((await call("/api/account/test-outbox")).status, 404);
    assert.equal(
      (
        await mf.dispatchFetch(
          "https://pollframe.com/api/auth/email-otp/send-verification-otp",
          {
            method: "POST",
            headers: {
              origin: "https://evil.test",
              "content-type": "application/json",
            },
            body: JSON.stringify({ email, type: "sign-in" }),
          },
        )
      ).status,
      403,
    );
    const send = () =>
      call("/api/auth/email-otp/send-verification-otp", {
        email,
        type: "sign-in",
      });
    const latestCode = async () => {
      const mail = JSON.parse(
        (
          await db
            .prepare(
              "SELECT payload FROM test_mail ORDER BY rowid DESC LIMIT 1",
            )
            .first()
        ).payload,
      );
      assert.equal(mail.to[0], email);
      assert.ok(
        !/<(?:img|script|iframe)\b/i.test(mail.html),
        "No remote tracking pixels in our message",
      );
      return mail.text.match(/\b\d{6}\b/)[0];
    };
    let r = await send();
    assert.equal(r.status, 200, await r.clone().text());
    const code = await latestCode();
    assert.equal(
      (await db.prepare("SELECT count(*) AS n FROM user").first()).n,
      0,
      "sending a code does not create an account",
    );
    const verification = await db
      .prepare("SELECT value FROM verification")
      .first();
    assert.ok(!verification.value.includes(code), "raw code is not in D1");
    await db.prepare("UPDATE verification SET expiresAt=0").run();
    r = await call("/api/auth/email-otp/check-verification-otp", {
      email,
      otp: code,
      type: "sign-in",
    });
    assert.equal(r.status, 400);
    assert.equal((await r.json()).code, "OTP_EXPIRED");
    await send();
    const fresh = await latestCode();
    r = await call("/api/auth/email-otp/check-verification-otp", {
      email,
      otp: fresh,
      type: "sign-in",
    });
    assert.equal((await r.json()).code, "USER_NOT_FOUND");
    r = await call("/api/auth/sign-in/email-otp", {
      email,
      otp: fresh,
      name: "Newsroom",
    });
    assert.equal(r.status, 200, await r.clone().text());
    assert.equal((await r.json()).user.emailVerified, true);
    const cookies = r.headers.getSetCookie();
    assert.ok(
      cookies.some(
        (v) => /Secure/.test(v) && /HttpOnly/.test(v) && /SameSite=Lax/.test(v),
      ),
    );
    const cookie = cookies.map((v) => v.split(";")[0]).join("; ");
    r = await call("/api/account/initial-password", { password }, cookie);
    assert.equal(r.status, 200, await r.clone().text());
    assert.match(r.headers.get("cache-control"), /no-store/);
    assert.equal(
      (
        await call(
          "/api/account/initial-password",
          { password: password + " altered" },
          cookie,
        )
      ).status,
      409,
    );
    assert.equal(
      (await call("/api/auth/sign-in/email", { email, password })).status,
      200,
    );
    assert.equal(
      (await call("/api/auth/sign-in/email-otp", { email, otp: fresh })).status,
      400,
      "replay fails",
    );
    await send();
    const existingCode = await latestCode();
    r = await call("/api/auth/sign-in/email-otp", { email, otp: existingCode });
    assert.equal(r.status, 403, await r.clone().text());
    assert.equal((await r.json()).code, "PASSWORD_LOGIN_REQUIRED");
    assert.equal(r.headers.get("set-cookie"), null);
    assert.equal(await (await call("/api/auth/get-session")).json(), null);
    await db
      .prepare("UPDATE mail_budget SET n=95 WHERE length(period)=10")
      .run();
    const before = (
      await db.prepare("SELECT count(*) AS n FROM test_mail").first()
    ).n;
    r = await send();
    assert.ok(
      r.status >= 400,
      "budget exhaustion is not reported as delivery success",
    );
    assert.equal(
      (await db.prepare("SELECT count(*) AS n FROM test_mail").first()).n,
      before,
    );
  } finally {
    await mf.dispose();
  }
});
