import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { Miniflare, convertV4MiniflareOptions } from "miniflare";
import {
  accountRestoreBoundary,
  reconcileAccountRestore,
} from "../server/account-restore.mjs";
test("backup recovery cannot resurrect deleted accounts/files, sessions or old passwords", async () => {
  const mf = new Miniflare(
    convertV4MiniflareOptions({
      modules: true,
      script: 'export default {fetch(){return new Response("test")}}',
      d1Databases: ["DB"],
      compatibilityDate: "2026-07-30",
    }),
  );
  try {
    const db = await mf.getD1Database("DB"),
      now = Date.now();
    for (const file of ["0001_accounts.sql", "0002_private_results.sql", "0003_account_security.sql"]) {
      const sql = await readFile(
        new URL("../migrations/accounts/" + file, import.meta.url),
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
    const addUser = async (id) =>
      db
        .prepare(
          "INSERT INTO user(id,name,email,emailVerified,createdAt,updatedAt) VALUES(?,?,?,1,?,?)",
        )
        .bind(id, id, id + "@example.test", now, now)
        .run();
    await addUser("keep");
    await db
      .prepare(
        "INSERT INTO studio_document VALUES('keep-file','keep','style','Test','{}',?)",
      )
      .bind(new Date(now).toISOString())
      .run();
    await db.prepare("INSERT INTO mail_budget VALUES('2026-10',7)").run();
    await assert.rejects(() => accountRestoreBoundary(db), /Pause/);
    const boundary = await accountRestoreBoundary(db, {
      accountsPaused: true,
      now,
    });
    // Simulate the old backup reintroducing a deleted user and deleted file.
    await addUser("deleted");
    await db
      .prepare(
        "INSERT INTO studio_document VALUES('deleted-file','keep','style','Removed','{}',?)",
      )
      .bind(new Date(now).toISOString())
      .run();
    await db
      .prepare(
        "INSERT INTO studio_document VALUES('private-file','deleted','style','Removed','{}',?)",
      )
      .bind(new Date(now).toISOString())
      .run();
    await db
      .prepare(
        "INSERT INTO session(id,token,userId,expiresAt,createdAt,updatedAt) VALUES('s','test-only','keep',?,?,?)",
      )
      .bind(now + 60000, now, now)
      .run();
    await db
      .prepare(
        "INSERT INTO account(id,accountId,providerId,userId,password,createdAt,updatedAt) VALUES('c','keep','credential','keep','old-test-only-hash',?,?)",
      )
      .bind(now, now)
      .run();
    await db
      .prepare(
        "INSERT INTO verification VALUES('v','reset-password:test-only','keep',?,?,?)",
      )
      .bind(now + 60000, now, now)
      .run();
    await db.prepare("UPDATE mail_budget SET n=1").run();
    await assert.rejects(() => reconcileAccountRestore(db, boundary), /paused/);
    await assert.rejects(
      () =>
        reconcileAccountRestore(db, boundary, {
          accountsPaused: true,
          now: now + 31 * 60000,
        }),
      /fresh/,
    );
    await reconcileAccountRestore(db, boundary, {
      accountsPaused: true,
      now: now + 1000,
    });
    assert.deepEqual(
      (await db.prepare("SELECT id FROM user").all()).results.map((x) => x.id),
      ["keep"],
    );
    assert.deepEqual(
      (await db.prepare("SELECT id FROM studio_document").all()).results.map(
        (x) => x.id,
      ),
      ["keep-file"],
    );
    for (const table of ["session", "account", "verification"])
      assert.equal(
        (await db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).first()).n,
        0,
      );
    assert.equal((await db.prepare("SELECT n FROM mail_budget").first()).n, 7);
    assert.equal(
      (await db.prepare("PRAGMA foreign_key_check").all()).results.length,
      0,
    );
  } finally {
    await mf.dispose();
  }
});
