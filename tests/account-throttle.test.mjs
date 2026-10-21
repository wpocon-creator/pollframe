import test from "node:test";
import assert from "node:assert/strict";
import { Miniflare, convertV4MiniflareOptions } from "miniflare";
import { reserveAccountAttempt } from "../server/account-throttle.mjs";
test("simultaneous password attempts cannot race past the limit; IPv6 /64 rotations share it", async () => {
  const mf = new Miniflare(
    convertV4MiniflareOptions({
      modules: true,
      script: 'export default {fetch(){return new Response("test")}}',
      d1Databases: ["DB"],
      compatibilityDate: "2026-07-30",
    }),
  );
  try {
    const db = await mf.getD1Database("DB");
    await db
      .prepare(
        "CREATE TABLE rateLimit(id TEXT PRIMARY KEY,key TEXT UNIQUE NOT NULL,count INTEGER NOT NULL,lastRequest BIGINT NOT NULL)",
      )
      .run();
    const request = (ip) =>
      new Request("https://pollframe.com/api/auth/sign-in/email", {
        method: "POST",
        headers: { "cf-connecting-ip": ip },
      });
    const secret = "test-only-secret-0000000000000000000000000000000",
      now = Date.now();
    const attempts = await Promise.all(
      Array.from({ length: 30 }, (_, i) =>
        reserveAccountAttempt(
          db,
          request(`2001:db8:1234:1::${i + 1}`),
          secret,
          now,
          null,
          "target@example.test",
        ),
      ),
    );
    assert.equal(attempts.filter((x) => x.allowed).length, 10);
    const rows = (await db.prepare("SELECT key,count FROM rateLimit").all())
      .results;
    assert.equal(rows.length, 2);
    assert.deepEqual(
      rows.map((r) => r.count).sort((a, b) => a - b),
      [10, 30],
    );
    for (const row of rows)
      assert.doesNotMatch(row.key, /2001|db8|::|target|example|@/);
    const blocked = await reserveAccountAttempt(
      db,
      request("192.0.2.50"),
      secret,
      now + 45000,
      null,
      " TARGET@example.test ",
    );
    assert.equal(
      blocked.allowed,
      false,
      "IP rotation cannot reset the per-email ceiling",
    );
    assert.equal(
      blocked.retryAfter,
      15,
      "show remaining wait, not another full window",
    );
    assert.equal(
      (
        await reserveAccountAttempt(
          db,
          request("2001:db8:1234:1::77"),
          secret,
          now + 45000,
          null,
          "brother@example.test",
        )
      ).allowed,
      true,
      "a second household member has a separate budget",
    );
    assert.equal(
      (
        await reserveAccountAttempt(
          db,
          request("2001:db8:1234:1::99"),
          secret,
          now + 60000,
          null,
          "target@example.test",
        )
      ).allowed,
      true,
    );
    assert.equal(
      (await reserveAccountAttempt(db, request("192.0.2.9"), secret, now))
        .allowed,
      true,
    );
    const factors = await Promise.all(
      Array.from({ length: 20 }, (_, i) =>
        reserveAccountAttempt(
          db,
          new Request(
            `https://pollframe.com/api/auth/${i % 2 ? "change-password" : "two-factor/verify-totp"}`,
            {
              method: "POST",
              headers: { "cf-connecting-ip": `192.0.2.${i + 20}` },
            },
          ),
          secret,
          now,
          "server-verified-user-id",
        ),
      ),
    );
    assert.equal(
      factors.filter((x) => x.allowed).length,
      5,
      "rotating IPs/endpoints must share one authenticated factor budget",
    );
  } finally {
    await mf.dispose();
  }
});
test("household members can request their own codes, but one inbox cannot be spammed", async () => {
  const mf = new Miniflare(
    convertV4MiniflareOptions({
      modules: true,
      script: 'export default {fetch(){return new Response("test")}}',
      d1Databases: ["DB"],
      compatibilityDate: "2026-07-30",
    }),
  );
  try {
    const db = await mf.getD1Database("DB");
    await db
      .prepare(
        "CREATE TABLE rateLimit(id TEXT PRIMARY KEY,key TEXT UNIQUE NOT NULL,count INTEGER NOT NULL,lastRequest BIGINT NOT NULL)",
      )
      .run();
    const request = (ip) =>
      new Request(
        "https://pollframe.com/api/auth/email-otp/send-verification-otp",
        { method: "POST", headers: { "cf-connecting-ip": ip } },
      );
    const secret = "fixture-secret-never-deploy-0000000000000000000000",
      now = Date.now();
    for (let person = 0; person < 5; person++)
      for (let attempt = 0; attempt < 3; attempt++)
        assert.equal(
          (
            await reserveAccountAttempt(
              db,
              request("192.0.2.70"),
              secret,
              now,
              null,
              `person${person}@example.test`,
            )
          ).allowed,
          true,
        );
    for (let i = 0; i < 2; i++)
      assert.equal(
        (
          await reserveAccountAttempt(
            db,
            request("192.0.2.71"),
            secret,
            now,
            null,
            "person0@example.test",
          )
        ).allowed,
        true,
      );
    assert.equal(
      (
        await reserveAccountAttempt(
          db,
          request("192.0.2.72"),
          secret,
          now,
          null,
          "person0@example.test",
        )
      ).allowed,
      false,
    );
    for (let i = 0; i < 5; i++)
      await reserveAccountAttempt(
        db,
        request("192.0.2.70"),
        secret,
        now,
        null,
        `new${i}@example.test`,
      );
    assert.equal(
      (
        await reserveAccountAttempt(
          db,
          request("192.0.2.70"),
          secret,
          now,
          null,
          "another@example.test",
        )
      ).allowed,
      false,
      "network-wide abuse ceiling still applies",
    );
  } finally {
    await mf.dispose();
  }
});
