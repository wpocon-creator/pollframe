import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { Miniflare, convertV4MiniflareOptions } from "miniflare";
import { createAccountService } from "../worker/accounts.js";
import {
  createPrivateResultStore,
  privateResultsReady,
  RESULT_CONSENT_VERSION,
} from "../server/private-result-store.mjs";
import { MATCH_QUESTIONS } from "../src/party-match-data.js";
import { calculateMatches } from "../src/party-match-model.js";
import { resultDocument } from "../src/party-match-design.js";
import { matchEvidenceReceipt } from "../src/party-match-receipt.js";

function payload() {
  const answers = Object.fromEntries(
    MATCH_QUESTIONS.map((q, i) => [q.id, { value: (i % 3) - 1 }]),
  );
  return {
    document: resultDocument(calculateMatches(answers), 30, "de", {
      answers,
      questions: MATCH_QUESTIONS,
    }),
    design: { style: "editorial", title: "My private result" },
  };
}
test("private storage defaults closed and hidden research is absent from downloadable receipts", () => {
  assert.equal(privateResultsReady({}), false);
  assert.equal(
    privateResultsReady({
      PRIVATE_RESULTS_ENABLED: "true",
      PRIVATE_RESULTS_KEY: "too short",
    }),
    false,
  );
  assert.equal(
    privateResultsReady({
      PRIVATE_RESULTS_ENABLED: "false",
      PRIVATE_RESULTS_KEY: randomBytes(32).toString("base64"),
    }),
    false,
  );
  for (const lang of ["de", "en-GB", "en-US", "es"]) {
    const receipt = matchEvidenceReceipt(lang);
    assert.equal(receipt.questions.length, 30);
    for (const q of receipt.questions) {
      assert.equal(Object.hasOwn(q, "research"), false);
      assert.equal(q.parties.length, 7);
      for (const p of q.parties) {
        assert.equal(Object.hasOwn(p, "argument"), false);
        assert.match(p.source, /^https:\/\//);
      }
    }
  }
});

test("D1: verified owners, encrypted personal results, explicit consent, withdrawal, quotas and deletion", async () => {
  const mf = new Miniflare(
    convertV4MiniflareOptions({
      modules: true,
      script: 'export default {fetch(){return new Response("test")}}',
      d1Databases: ["ACCOUNTS_DB"],
      compatibilityDate: "2026-07-30",
    }),
  );
  try {
    const db = await mf.getD1Database("ACCOUNTS_DB");
    for (const file of [
      "0001_accounts.sql",
      "0002_private_results.sql",
      "0003_account_security.sql",
    ]) {
      const sql = await readFile(
        new URL(`../migrations/accounts/${file}`, import.meta.url),
        "utf8",
      );
      await db.batch(
        sql
          .replace(/^--.*$/gm, "")
          .split(";")
          .map((s) => s.trim())
          .filter(Boolean)
          .map((s) => db.prepare(s)),
      );
    }
    const env = {
      ACCOUNTS_ENABLED: "true",
      ACCOUNTS_DB: db,
      AUTH_SECRET: "private-storage-test-secret-only-000000000000000",
      RESEND_API_KEY: "fake",
      AUTH_FROM: "konto@pollframe.com",
      PRIVATE_RESULTS_ENABLED: "true",
      PRIVATE_RESULTS_KEY: randomBytes(32).toString("base64"),
    };
    const mails = [];
    const handle = createAccountService(env, {
      fetchMail: async (_url, options) => {
        mails.push(JSON.parse(options.body));
        return Response.json({ id: "fake" });
      },
    });
    const password = "An account test passphrase, not a real credential";
    let cookie = "";
    const call = (path, body, method = body ? "POST" : "GET", extra = {}) =>
      handle(
        new Request(`https://pollframe.com${path}`, {
          method,
          headers: {
            origin: "https://pollframe.com",
            "content-type": "application/json",
            "cf-connecting-ip": "192.0.2.33",
            cookie,
            ...extra,
          },
          ...(body ? { body: JSON.stringify(body) } : {}),
        }),
      );
    async function user(email) {
      let r = await call("/api/auth/sign-up/email", {
        email,
        password,
        name: "Test",
        callbackURL: "https://pollframe.com/?view=studio",
      });
      assert.equal(r.status, 200);
      assert.equal((await call("/api/account/private-results")).status, 401);
      const link = new URL(mails.at(-1).text.match(/https:\/\/\S+/)[0]);
      r = await call(link.pathname + link.search);
      assert.ok([200, 302].includes(r.status));
      r = await call("/api/auth/sign-in/email", { email, password });
      assert.equal(r.status, 200);
      cookie = r.headers
        .getSetCookie()
        .map((c) => c.split(";")[0])
        .join("; ");
      return cookie;
    }
    const data = {
      name: "Sensitive name",
      payload: payload(),
      consent: {
        accepted: true,
        age16Confirmed: true,
        version: RESULT_CONSENT_VERSION,
      },
    };
    assert.equal(
      (await call("/api/account/private-results/id", data, "PUT")).status,
      401,
    );
    const alice = await user("private-a@example.test");
    for (const consent of [
      undefined,
      { accepted: false, version: RESULT_CONSENT_VERSION },
      { accepted: true, version: RESULT_CONSENT_VERSION },
      {
        accepted: true,
        age16Confirmed: false,
        version: RESULT_CONSENT_VERSION,
      },
      { accepted: true, version: "old" },
    ])
      assert.equal(
        (
          await call(
            "/api/account/private-results/id",
            { ...data, consent },
            "PUT",
          )
        ).status,
        400,
      );
    assert.equal(
      (await db.prepare("SELECT COUNT(*) AS n FROM private_result").first()).n,
      0,
    );
    assert.equal(
      (
        await call("/api/account/private-results/id", data, "PUT", {
          origin: "https://evil.test",
        })
      ).status,
      403,
    );
    assert.equal(
      (
        await call(
          "/api/account/private-results/id",
          { ...data, payload: { ...data.payload, answers: { secret: 1 } } },
          "PUT",
        )
      ).status,
      400,
    );
    assert.equal(
      (
        await call(
          "/api/account/private-results/id",
          {
            ...data,
            payload: {
              ...data.payload,
              document: { ...data.payload.document, answers: { secret: 1 } },
            },
          },
          "PUT",
        )
      ).status,
      400,
    );
    assert.equal(
      (
        await call(
          "/api/account/documents/private",
          {
            kind: "design",
            name: "Not an ordinary design",
            payload: data.payload,
          },
          "PUT",
        )
      ).status,
      400,
    );
    let r = await call("/api/account/private-results/id", data, "PUT");
    assert.equal(r.status, 200, await r.clone().text());
    assert.match(r.headers.get("cache-control"), /private.*|no-store/);
    assert.match(
      r.headers.get("content-security-policy"),
      /default-src 'none'/,
    );
    const saved = await r.json();
    assert.equal(saved.consent.version, RESULT_CONSENT_VERSION);
    assert.equal(saved.consent.age16Confirmed, true);
    assert.equal(saved.payload.document.rows.length, 7);
    assert.equal(saved.payload.document.answers, undefined);
    let row = await db
      .prepare("SELECT * FROM private_result WHERE id='id'")
      .first();
    assert.deepEqual(Object.keys(row).sort(), [
      "ciphertext",
      "id",
      "nonce",
      "owner",
      "updated_at",
    ]);
    assert.equal(row.ciphertext.includes("Sensitive"), false);
    assert.equal(
      Buffer.from(row.ciphertext, "base64").includes(
        Buffer.from("private-result"),
      ),
      false,
    );
    const initialNonce = row.nonce;
    await call("/api/account/private-results/id", data, "PUT");
    row = await db
      .prepare("SELECT * FROM private_result WHERE id='id'")
      .first();
    assert.notEqual(row.nonce, initialNonce);
    assert.equal(
      (await (await call("/api/account/documents")).json()).items.length,
      0,
    );
    cookie = "";
    const bob = await user("private-b@example.test");
    assert.equal(
      (await (await call("/api/account/private-results")).json()).items.length,
      0,
    );
    assert.equal((await call("/api/account/private-results/id")).status, 404);
    assert.equal(
      (await call("/api/account/private-results/id", null, "DELETE")).status,
      404,
    );
    await call(
      "/api/account/private-results/id",
      { ...data, name: "Bob's independent result", owner: row.owner },
      "PUT",
    );
    cookie = alice;
    assert.equal(
      (await (await call("/api/account/private-results/id")).json()).name,
      "Sensitive name",
    );
    // Ciphertext cannot be moved between accounts or record IDs, even by a DB operator.
    const other = await db
      .prepare("SELECT * FROM private_result WHERE owner<>?")
      .bind(row.owner)
      .first();
    await db
      .prepare(
        "UPDATE private_result SET ciphertext=?,nonce=? WHERE owner=? AND id=?",
      )
      .bind(other.ciphertext, other.nonce, row.owner, "id")
      .run();
    await assert.rejects(() => call("/api/account/private-results/id"));
    await db
      .prepare(
        "UPDATE private_result SET ciphertext=?,nonce=? WHERE owner=? AND id=?",
      )
      .bind(row.ciphertext, row.nonce, row.owner, "id")
      .run();
    const brokenKey = createPrivateResultStore(db, {
      ...env,
      PRIVATE_RESULTS_KEY: randomBytes(32).toString("base64"),
    });
    await assert.rejects(() =>
      brokenKey(
        new Request("https://pollframe.com/api/account/private-results/id"),
        row.owner,
      ),
    );
    // Exactly 30 records maximum, including racing new writes; updates still work.
    const writes = await Promise.all(
      Array.from({ length: 31 }, (_, i) =>
        call(`/api/account/private-results/extra-${i}`, data, "PUT"),
      ),
    );
    assert.equal(writes.filter((r) => r.status === 200).length, 29);
    assert.equal(writes.filter((r) => r.status === 409).length, 2);
    assert.equal(
      (await call("/api/account/private-results/id", data, "PUT")).status,
      200,
    );
    // Withdrawal must work even when saving and its key have been disabled.
    const stopped = createAccountService({
      ...env,
      PRIVATE_RESULTS_ENABLED: "false",
      PRIVATE_RESULTS_KEY: "",
    });
    r = await stopped(
      new Request("https://pollframe.com/api/account/private-results", {
        method: "DELETE",
        headers: { origin: "https://pollframe.com", cookie: alice },
      }),
    );
    assert.equal(r.status, 200);
    assert.equal(
      (
        await db
          .prepare("SELECT COUNT(*) AS n FROM private_result WHERE owner=?")
          .bind(row.owner)
          .first()
      ).n,
      0,
    );
    assert.equal(
      (await (await call("/api/account/private-results")).json()).items.length,
      0,
    );
    cookie = bob;
    assert.equal(
      (await (await call("/api/account/private-results")).json()).items.length,
      1,
    );
    await call(
      "/api/account/documents/style",
      { kind: "style", name: "A style", payload: { theme: "dark" } },
      "PUT",
    );
    r = await call("/api/auth/delete-user", { password });
    assert.equal(r.status, 200, await r.clone().text());
    assert.equal(
      (await db.prepare("SELECT COUNT(*) AS n FROM private_result").first()).n,
      0,
    );
    assert.equal(
      (await db.prepare("SELECT COUNT(*) AS n FROM studio_document").first()).n,
      0,
    );
    assert.equal((await call("/api/account/private-results")).status, 401);
  } finally {
    await mf.dispose();
  }
});
