import { build } from "vite";
import { releaseManifest } from "./release-provenance.mjs";
import { writeFile } from "node:fs/promises";
// Public release defaults. Keep explicit false overrides for rollback/QA;
// account APIs still require independent server flags, mail, secrets and D1.
process.env.VITE_PUBLIC_ACCOUNTS ??= "true";
process.env.VITE_PUBLIC_WAHLFRAME ??= "true";
if (process.env.VITE_TEST_DEPLOYMENT === "true")
  throw Error("Use the separate preview build; never deploy a test build as production");
await build();
await writeFile("dist/release.json", JSON.stringify(await releaseManifest()) + "\n");
