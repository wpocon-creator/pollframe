import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  captureAccountRecovery,
  pendingAccountRecovery,
  clearAccountRecovery,
} from "../src/account-recovery.js";
test("recovery survives URL normalization until the lazy entry captures it and then clears", () => {
  clearAccountRecovery();
  captureAccountRecovery("?view=studio&account=reset&token=example-only-token");
  assert.deepEqual(pendingAccountRecovery(), { token: "example-only-token" });
  captureAccountRecovery("?view=studio&template=poll-classic");
  assert.deepEqual(pendingAccountRecovery(), { token: "example-only-token" });
  clearAccountRecovery();
  assert.equal(pendingAccountRecovery(), null);
  captureAccountRecovery("?account=reset");
  assert.deepEqual(pendingAccountRecovery(), { token: "", invalid: true });
  captureAccountRecovery("?account=reset&token=" + "a".repeat(2049));
  assert.deepEqual(pendingAccountRecovery(), { token: "", invalid: true });
});
test("reset credentials leave the address bar before lazy UI or analytics", () => {
  let replaced;
  const browser = {
    location: {
      href: "https://pollframe.com/?view=studio&account=reset&token=secret-for-test&lang=es",
    },
    history: {
      state: { test: true },
      replaceState(state, _title, url) {
        replaced = { state, url: String(url) };
      },
    },
  };
  captureAccountRecovery(new URL(browser.location.href).search, browser);
  assert.deepEqual(pendingAccountRecovery(), { token: "secret-for-test" });
  assert.equal(new URL(replaced.url).searchParams.has("token"), false);
  assert.equal(new URL(replaced.url).searchParams.has("account"), false);
  assert.equal(new URL(replaced.url).searchParams.get("lang"), "es");
  captureAccountRecovery("?account=reset&error=INVALID_TOKEN", {
    ...browser,
    location: {
      href: "https://pollframe.com/?account=reset&error=INVALID_TOKEN",
    },
  });
  assert.deepEqual(pendingAccountRecovery(), { token: "", invalid: true });
  assert.equal(new URL(replaced.url).searchParams.has("error"), false);
  clearAccountRecovery();
});
test("legacy-site sign-in handoff survives Studio URL cleanup without transferring credentials", () => {
  captureAccountRecovery("?view=studio&account=sign-in&token=not-transferred");
  assert.deepEqual(pendingAccountRecovery(), { action: "sign-in" });
  captureAccountRecovery("?view=studio&lang=de");
  assert.deepEqual(pendingAccountRecovery(), { action: "sign-in" });
  clearAccountRecovery();
});
test("responsive header remount cannot discard a pending reset before its dialog opens", async () => {
  const entry = await readFile(
    new URL("../src/account-entry.jsx", import.meta.url),
    "utf8",
  );
  assert.ok(!/useEffect\(\(\)\s*=>\s*clearAccountRecovery\(\)/.test(entry));
  assert.ok(/onClose=\{\(\) => \{\s*clearAccountRecovery\(\)/.test(entry));
});
