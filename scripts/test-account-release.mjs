// A separately opted-in local build, never a deployment. Requests/mail in the
// browser fixture are routed to an isolated workerd/D1 instance.
import { mkdtemp, rm } from "node:fs/promises";
import { spawn } from "node:child_process";
import { build } from "vite";
const directory = await mkdtemp("/tmp/pollframe-account-release-");
const oldFlag = process.env.VITE_PUBLIC_ACCOUNTS,
  oldWahlframe = process.env.VITE_PUBLIC_WAHLFRAME,
  oldData = process.env.POLLFRAME_PREVIEW_DATA;
try {
  process.env.VITE_PUBLIC_ACCOUNTS = "true";
  process.env.VITE_PUBLIC_WAHLFRAME = "true";
  process.env.POLLFRAME_PREVIEW_DATA = "local";
  await build({ logLevel: "error", build: { outDir: directory } });
  const projects = (
    process.env.POLLFRAME_ACCOUNT_TEST_PROJECTS ||
    "chromium-desktop,firefox-desktop,iphone-se"
  ).split(",");
  if (
    projects.some(
      (x) =>
        ![
          "chromium-desktop",
          "firefox-desktop",
          "webkit-desktop",
          "iphone-se",
          "iphone-13",
          "ipad-mini",
        ].includes(x),
    )
  )
    throw Error("Unexpected account QA browser project");
  const args = [
    "node_modules/@playwright/test/cli.js",
    "test",
    "tests/account-release-flow.spec.mjs",
    "tests/wahlframe-release-flow.spec.mjs",
    ...projects.map((x) => "--project=" + x),
    "--workers=2",
  ];
  const code = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, {
      stdio: "inherit",
      env: {
        ...process.env,
        POLLFRAME_ACCOUNT_BUILD_DIR: directory,
        POLLFRAME_TEST_BASE_URL: "https://pollframe.com",
      },
    });
    child.on("error", reject);
    child.on("exit", (value) => resolve(value ?? 1));
  });
  process.exitCode = code;
} finally {
  if (oldFlag === undefined) delete process.env.VITE_PUBLIC_ACCOUNTS;
  else process.env.VITE_PUBLIC_ACCOUNTS = oldFlag;
  if (oldWahlframe === undefined) delete process.env.VITE_PUBLIC_WAHLFRAME;
  else process.env.VITE_PUBLIC_WAHLFRAME = oldWahlframe;
  if (oldData === undefined) delete process.env.POLLFRAME_PREVIEW_DATA;
  else process.env.POLLFRAME_PREVIEW_DATA = oldData;
  // Only this mkdtemp result is removed, not a caller-supplied directory.
  await rm(directory, { recursive: true });
}
