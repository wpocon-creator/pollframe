import test from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { readFile } from "node:fs/promises";
import { Miniflare, convertV4MiniflareOptions } from "miniflare";
import { MATCH_QUESTIONS } from "../src/party-match-data.js";
import { calculateMatches } from "../src/party-match-model.js";
import { resultDocument } from "../src/party-match-design.js";
import { RESULT_CONSENT_VERSION } from "../src/account-storage-policy.js";
import { createHmac } from "node:crypto";
import { base32 } from "@better-auth/utils/base32";

test("production authentication executes in workerd, not just Node", async () => {
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
        AUTH_SECRET: "workerd-test-secret-0000000000000000000000000000",
        RESEND_API_KEY: "local-only",
        AUTH_FROM: "konto@pollframe.com",
        PRIVATE_RESULTS_ENABLED: "true",
        PRIVATE_RESULTS_KEY: Buffer.alloc(32, 7).toString("base64"),
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
    const privateSchema = await readFile(
      new URL(
        "../migrations/accounts/0002_private_results.sql",
        import.meta.url,
      ),
      "utf8",
    );
    await db.batch(
      privateSchema
        .replace(/^--.*$/gm, "")
        .split(";")
        .map((s) => s.trim())
        .filter(Boolean)
        .map((s) => db.prepare(s)),
    );
    await db.prepare("CREATE TABLE test_mail(payload TEXT)").run();
    const request = (path, body) =>
      mf.dispatchFetch("https://pollframe.com" + path, {
        method: body ? "POST" : "GET",
        headers: {
          origin: "https://pollframe.com",
          "content-type": "application/json",
          "cf-connecting-ip": "192.0.2.10",
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
    const password = "Worker runtime test passphrase 2026";
    let r = await request("/api/auth/sign-up/email", {
      name: "Runtime",
      email: "worker@example.test",
      password,
      callbackURL: "https://pollframe.com/?view=studio",
    });
    assert.equal(r.status, 200, await r.clone().text());
    const mail = JSON.parse(
      (await db.prepare("SELECT payload FROM test_mail").first()).payload,
    );
    const link = new URL(mail.text.match(/https:\/\/\S+/)[0]);
    r = await mf.dispatchFetch(link, {
      redirect: "manual",
      headers: {
        "sec-fetch-site": "cross-site",
        "sec-fetch-mode": "navigate",
        "cf-connecting-ip": "192.0.2.10",
      },
    });
    assert.equal(r.status, 302, await r.clone().text());
    r = await request("/api/auth/sign-in/email", {
      email: "worker@example.test",
      password,
    });
    assert.equal(r.status, 200, await r.clone().text());
    assert.ok(r.headers.get("set-cookie")?.includes("HttpOnly"));
    const cookie = r.headers
      .getSetCookie()
      .map((c) => c.split(";")[0])
      .join("; ");
    const sessionResponse = await mf.dispatchFetch("https://pollframe.com/api/auth/get-session", {
      headers: { origin: "https://pollframe.com", cookie },
    });
    assert.equal(sessionResponse.status, 200);
    const liveSession = await sessionResponse.json();
    assert.equal(liveSession.user.email, "worker@example.test", "a genuine signed session must never hit the anonymous fastpath");
    assert.equal(liveSession.session.token, undefined);
    const answers = Object.fromEntries(
      MATCH_QUESTIONS.map((q, i) => [q.id, { value: (i % 3) - 1 }]),
    );
    const document = resultDocument(calculateMatches(answers), 30, "de", {
      answers,
      questions: MATCH_QUESTIONS,
    });
    r = await mf.dispatchFetch(
      "https://pollframe.com/api/account/private-results/runtime",
      {
        method: "PUT",
        headers: {
          origin: "https://pollframe.com",
          "content-type": "application/json",
          cookie,
        },
        body: JSON.stringify({
          name: "Worker-encrypted result",
          payload: { document, design: {} },
          consent: {
            accepted: true,
            age16Confirmed: true,
            version: RESULT_CONSENT_VERSION,
          },
        }),
      },
    );
    assert.equal(r.status, 200, await r.clone().text());
    r = await mf.dispatchFetch(
      "https://pollframe.com/api/account/private-results/runtime",
      { headers: { cookie } },
    );
    assert.equal(r.status, 200, await r.clone().text());
    assert.deepEqual((await r.json()).payload.document, document);
    // Exercise the production 2FA plugin inside workerd/D1, not just SQLite
    // under Node. All credentials belong to this ephemeral local test Worker.
    const jar = new Map(
      cookie.split("; ").map((c) => {
        const i = c.indexOf("=");
        return [c.slice(0, i), c.slice(i + 1)];
      }),
    );
    const authCall = async (path, body) => {
      const response = await mf.dispatchFetch("https://pollframe.com" + path, {
        method: body ? "POST" : "GET",
        headers: {
          origin: "https://pollframe.com",
          "content-type": "application/json",
          "cf-connecting-ip": "192.0.2.10",
          cookie: [...jar].map(([k, v]) => `${k}=${v}`).join("; "),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      for (const c of response.headers.getSetCookie()) {
        const p = c.split(";")[0],
          i = p.indexOf("=");
        jar.set(p.slice(0, i), p.slice(i + 1));
      }
      return response;
    };
    r = await authCall("/api/auth/two-factor/enable", { password });
    assert.equal(r.status, 200, await r.clone().text());
    const setup = await r.json(),
      secret = new URL(setup.totpURI).searchParams.get("secret");
    const counter = Buffer.alloc(8);
    counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30000)));
    const digest = createHmac("sha1", base32.decode(secret))
        .update(counter)
        .digest(),
      offset = digest[19] & 15;
    const code = String(
      (digest.readUInt32BE(offset) & 0x7fffffff) % 1000000,
    ).padStart(6, "0");
    r = await authCall("/api/auth/two-factor/verify-totp", {
      code,
      trustDevice: false,
    });
    assert.equal(r.status, 200, await r.clone().text());
    const factor = await db
      .prepare("SELECT secret,backupCodes FROM twoFactor")
      .first();
    assert.ok(factor && !factor.backupCodes.includes(setup.backupCodes[0]));
    assert.notEqual(
      factor.secret,
      new TextDecoder().decode(base32.decode(secret)),
    );
    r = await authCall("/api/auth/get-session");
    const current = await r.json();
    assert.equal(current.user.twoFactorEnabled, true);
    assert.equal(current.session.token, undefined);
    assert.equal(
      (await authCall("/api/auth/two-factor/disable", { password })).status,
      403,
    );
    await authCall("/api/auth/sign-out", {});
    r = await authCall("/api/auth/sign-in/email", {
      email: "worker@example.test",
      password,
    });
    assert.equal((await r.json()).twoFactorRedirect, true);
    assert.equal(
      (await authCall("/api/account/private-results/runtime")).status,
      401,
    );
    r = await authCall("/api/auth/two-factor/verify-backup-code", {
      code: setup.backupCodes[0],
      trustDevice: false,
    });
    assert.equal(r.status, 200, await r.clone().text());
    assert.equal(
      (await authCall("/api/account/private-results/runtime")).status,
      200,
    );
  } finally {
    await mf.dispose();
  }
});
