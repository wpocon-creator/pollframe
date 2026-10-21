// Read-only preflight. Never creates secrets, modifies settings, sends mail,
// migrates a database, deploys code or activates accounts.
import { readFile } from "node:fs/promises";
const config = JSON.parse(
  await readFile(new URL("../wrangler.jsonc", import.meta.url), "utf8"),
);
const dbId = "24b888dc-f834-487d-b4d9-2fc9a61f9a48";
const accountFeature = await readFile(
  new URL("../src/account-feature.js", import.meta.url),
  "utf8",
);
const wahlframeFeature = await readFile(
  new URL("../src/wahlframe-feature.js", import.meta.url),
  "utf8",
);
const report = {
  local: {
    productionWorker: config.name === "de",
    accountGatesExplicit: ["true", "false"].includes(config.vars?.ACCOUNTS_ENABLED) && ["true", "false"].includes(config.vars?.PRIVATE_RESULTS_ENABLED),
    productionDatabasePrepared: config.d1_databases?.some(
      (x) => x.binding === "ACCOUNTS_DB" && x.database_id === dbId,
    ),
    dailyCleanupPrepared: config.triggers?.crons?.includes("17 3 * * *"),
    requestLogCaptureOff:
      config.observability?.enabled === false && config.logpush === false,
    publicFrontendRequiresExplicitBuildFlag:
      /VITE_PUBLIC_ACCOUNTS\s*===\s*"true"/.test(accountFeature),
    wahlframeRequiresExplicitBuildFlag:
      /VITE_PUBLIC_WAHLFRAME\s*===\s*"true"/.test(wahlframeFeature),
  },
};
if (Object.values(report.local).some((x) => x !== true))
  throw Error("Local account release safety check failed");
if (process.argv.includes("--remote")) {
  const text = await readFile(
    "/home/william/.config/.wrangler/config/default.toml",
    "utf8",
  );
  const token = text.match(/^oauth_token\s*=\s*"([^"]+)"/m)?.[1];
  if (!token) throw Error("Cloudflare login required");
  const root =
    "https://api.cloudflare.com/client/v4/accounts/01c29a77a387ffb473bd403bf08ed0f5";
  async function api(path, options = {}) {
    const r = await fetch(root + path, {
      ...options,
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      signal: AbortSignal.timeout(15000),
    });
    const b = await r.json();
    if (!r.ok || !b.success)
      throw Error(`Read-only account preflight failed (${r.status})`);
    return b.result;
  }
  const runtime = await api("/workers/scripts/de/settings");
  const db = await api(`/d1/database/${dbId}`);
  if (db.name !== "pollframe-accounts" || db.jurisdiction !== "eu")
    throw Error("Expected EU production account database missing");
  const schema = await api(`/d1/database/${dbId}/query`, {
    method: "POST",
    body: JSON.stringify({
      sql: "SELECT name FROM sqlite_master WHERE type='table';",
    }),
  });
  const tables = new Set(schema[0].results.map((x) => x.name));
  // A table-name-only probe can miss an unapplied security migration.
  const columnRequirements = {
    user: ["twoFactorEnabled"],
    twoFactor: [
      "secret",
      "backupCodes",
      "userId",
      "verified",
      "failedVerificationCount",
      "lockedUntil",
    ],
    account_notice: ["owner", "notice", "shown_at"],
  };
  const missingSecurityColumns = [];
  for (const [table, required] of Object.entries(columnRequirements)) {
    const result = await api(`/d1/database/${dbId}/query`, {
      method: "POST",
      body: JSON.stringify({ sql: `PRAGMA table_info("${table}");` }),
    });
    const present = new Set(result[0].results.map((row) => row.name));
    for (const name of required)
      if (!present.has(name)) missingSecurityColumns.push(`${table}.${name}`);
  }
  const counts = await api(`/d1/database/${dbId}/query`, {
    method: "POST",
    body: JSON.stringify({
      sql: "SELECT (SELECT COUNT(*) FROM user) AS users,(SELECT COUNT(*) FROM session) AS sessions,(SELECT COUNT(*) FROM studio_document) AS documents;",
    }),
  });
  const response = await fetch(
    "https://pollframe.com/api/account/capabilities",
    { signal: AbortSignal.timeout(10000) },
  );
  report.remote = {
    secrets: Object.fromEntries(
      ["AUTH_SECRET", "AUTH_FROM", "RESEND_API_KEY", "PRIVATE_RESULTS_KEY"].map((name) => [
        name,
        runtime.bindings.some(
          (x) => x.name === name && x.type === "secret_text",
        ),
      ]),
    ),
    publicAccountsEnabled:
      runtime.bindings.find((x) => x.name === "ACCOUNTS_ENABLED")?.text === "true",
    capabilitiesStatus: response.status,
    politicalResultsEnabled:
      runtime.bindings.find((x) => x.name === "PRIVATE_RESULTS_ENABLED")
        ?.text === "true",
    databaseEU: true,
    schemaReady:
      missingSecurityColumns.length === 0 &&
      [
        "user",
        "session",
        "account",
        "verification",
        "rateLimit",
        "studio_document",
        "mail_budget",
        "private_result",
        "twoFactor",
        "account_notice",
      ].every((x) => tables.has(x)),
    missingSecurityColumns,
    counts: counts[0].results[0],
    productionBindingPresent: runtime.bindings.some(
      (x) => x.name === "ACCOUNTS_DB" && x.id === dbId,
    ),
  };
  if (report.remote.publicAccountsEnabled && (!response.ok || !report.remote.schemaReady || !report.remote.productionBindingPresent || Object.values(report.remote.secrets).some(present => !present)))
    throw Error("Enabled production accounts are not ready");
  if (process.argv.includes("--ready") && (!report.remote.schemaReady || Object.values(report.remote.secrets).some(present => !present)))
    throw Error("Production account schema/secrets are not ready");
}
console.log(JSON.stringify(report, null, 2));
