import test from "node:test";
import assert from "node:assert/strict";
import { accountMessage } from "../server/account-message.mjs";

test("transactional account mail supports the four interface locales without tracking markup", () => {
  for (const language of ["de", "en-GB", "en-US", "es"]) {
    const payload = {
      otp: "123456",
      url: "https://pollframe.com/api/auth/verify-email?token=fixture-only",
      newEmail: "new@example.test",
    };
    for (const kind of ["code", "verify", "reset", "email-change"]) {
      const mail = accountMessage(kind, payload, language);
      assert.deepEqual(Object.keys(mail), ["subject", "text", "html"]);
      assert.ok(mail.subject.length > 10);
      assert.ok(mail.text.length < 1500);
      assert.ok(!/<(?:img|script|iframe)\b/.test(mail.text));
      assert.ok(!/<(?:img|script|iframe|link)\b/i.test(mail.html));
      assert.ok(!/\bon\w+=|javascript:|@import/i.test(mail.html));
      assert.ok(
        mail.html.includes(kind === "code" ? payload.otp : payload.url),
      );
      assert.ok(
        mail.text.includes(kind === "code" ? payload.otp : payload.url),
      );
      if (kind === "email-change")
        assert.ok(mail.text.includes(payload.newEmail));
    }
  }
  assert.match(
    accountMessage("code", { otp: "123456" }, "es").subject,
    /^123456 es tu código/,
  );
  assert.match(
    accountMessage("code", { otp: "123456" }, "de").subject,
    /^123456 ist dein/,
  );
  assert.deepEqual(
    accountMessage("code", { otp: "123456" }, "unknown"),
    accountMessage("code", { otp: "123456" }, "en-GB"),
  );
});
test("verification emails put the contiguous numeric code before the brand in every locale", () => {
  for (const locale of ["de", "en-GB", "en-US", "es"]) {
    // Leading zeroes must survive too. This tests message structure, not Apple's
    // proprietary Mail extraction, which requires testing on an actual device.
    const mail = accountMessage("code", { otp: "012345" }, locale);
    assert.match(mail.subject, /^012345\b/);
    assert.ok(!/pollframe/i.test(mail.subject));
    assert.match(mail.text, /^[^\n]*: 012345\n/);
    const visible = mail.html.replace(/<[^>]*>/g, " ");
    assert.ok(visible.indexOf("012345") < visible.search(/pollframe/i));
    assert.equal((visible.match(/\b\d{6}\b/g) || []).length, 1);
    assert.ok(!visible.includes("POLLFRAME"));
  }
});
test("email markup escapes untrusted addresses and refuses unsafe action URLs", () => {
  const mail = accountMessage("email-change", {
    url: "https://pollframe.com/api/auth/verify-email?token=a&x=b",
    newEmail: '<img src=x onerror="alert(1)">',
  });
  assert.ok(!mail.html.includes("<img"));
  assert.ok(mail.html.includes("&lt;img"));
  assert.ok(mail.html.includes("&amp;x=b"));
  assert.throws(() => accountMessage("reset", { url: "javascript:alert(1)" }));
  assert.throws(() => accountMessage("code", { otp: "<script>" }));
});
