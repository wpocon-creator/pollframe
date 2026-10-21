// Production bundle + real isolated workerd/D1; only mail delivery is replaced.
// This never sends requests to the live Pollframe Worker or to Resend.
import { build } from "esbuild";
import { Miniflare, convertV4MiniflareOptions } from "miniflare";
import { readFile } from "node:fs/promises";
import { accountBrowserServer } from "./account-browser-server.mjs";
let bundle;
export async function releaseAccountFixture(
  page,
  { privateResults = false } = {},
) {
  const assets = process.env.POLLFRAME_ACCOUNT_BUILD_DIR;
  if (!assets || !/^\/tmp\/pollframe-account-release-[\w-]+$/.test(assets))
    throw Error("Expected isolated account release build");
  bundle ||= (
    await build({
      entryPoints: ["tests/fixtures/account-worker.mjs"],
      bundle: true,
      write: false,
      format: "esm",
      platform: "node",
      external: ["node:*"],
      logLevel: "silent",
    })
  ).outputFiles[0].text;
  const mf = new Miniflare(
    convertV4MiniflareOptions({
      modules: true,
      script: bundle,
      compatibilityDate: "2026-07-30",
      compatibilityFlags: ["nodejs_compat"],
      d1Databases: ["ACCOUNTS_DB"],
      bindings: {
        ACCOUNTS_ENABLED: "true",
        PRIVATE_RESULTS_ENABLED: privateResults ? "true" : "false",
        PRIVATE_RESULTS_KEY: Buffer.alloc(32, 42).toString("base64"),
        AUTH_SECRET: "release-test-fictional-secret-000000000000000000000000",
        RESEND_API_KEY: "intercepted-locally",
        AUTH_FROM: "william@pollframe.com",
      },
    }),
  );
  try {
    const db = await mf.getD1Database("ACCOUNTS_DB");
    for (const name of [
      "0001_accounts",
      "0002_private_results",
      "0003_account_security",
    ]) {
      const sql = await readFile(
        new URL(`../../migrations/accounts/${name}.sql`, import.meta.url),
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
    await db.prepare("CREATE TABLE test_mail(payload TEXT)").run();
    const https = await accountBrowserServer(mf, assets);
    await page.route("**/*", (route) =>
      new URL(route.request().url()).origin === https.origin
        ? route.continue()
        : route.abort(),
    );
    return {
      db,
      origin: https.origin,
      mail: async () =>
        JSON.parse(
          (
            await db
              .prepare(
                "SELECT payload FROM test_mail ORDER BY rowid DESC LIMIT 1",
              )
              .first()
          ).payload,
        ),
      mf: {
        dispatchFetch: (...args) => mf.dispatchFetch(...args),
        async dispose() {
          await https.close();
          await mf.dispose();
        },
      },
    };
  } catch (error) {
    await mf.dispose();
    throw error;
  }
}
