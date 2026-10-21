import test from "node:test";
import assert from "node:assert/strict";
import { deliverAccountMail } from "../server/account-mail.mjs";
const payload = {
  from: "Pollframe <sender@example.test>",
  to: ["reader@example.test"],
  text: "Fixture message, no real code",
};
test("temporary rate limits retry the exact same message with one idempotency key", async () => {
  const calls = [],
    waits = [];
  await deliverAccountMail(
    async (url, options) => {
      calls.push({ url, ...options });
      return calls.length === 1
        ? Response.json(
            { error: "busy" },
            { status: 429, headers: { "retry-after": "1" } },
          )
        : Response.json({ id: "accepted" });
    },
    "fictional",
    payload,
    { sleep: async (ms) => waits.push(ms) },
  );
  assert.equal(calls.length, 2);
  assert.deepEqual(waits, [1000]);
  assert.equal(
    calls[0].headers["Idempotency-Key"],
    calls[1].headers["Idempotency-Key"],
  );
  assert.equal(calls[0].body, calls[1].body);
  assert.equal(calls[0].url, "https://api.resend.com/emails");
});
test("network failures retry safely, permanent rejection does not, and retries are bounded", async () => {
  let count = 0;
  await deliverAccountMail(
    async () => {
      if (++count === 1) throw Error("network");
      return Response.json({ id: "accepted" });
    },
    "fictional",
    payload,
    { sleep: async () => {} },
  );
  assert.equal(count, 2);
  for (const status of [400, 401, 403, 422, 429, 503]) {
    count = 0;
    await assert.rejects(
      deliverAccountMail(
        async () => {
          count++;
          return Response.json({ error: "fixture" }, { status });
        },
        "fictional",
        payload,
        { sleep: async () => {} },
      ),
      /Mail delivery unavailable/,
    );
    assert.equal(count, status === 429 || status === 503 ? 3 : 1);
  }
  count = 0;
  await assert.rejects(
    deliverAccountMail(
      async () => {
        count++;
        return new Response(null, {
          status: 429,
          headers: { "retry-after": "30" },
        });
      },
      "fictional",
      payload,
      { sleep: async () => {} },
    ),
  );
  assert.equal(count, 1, "never retry before the provider's long Retry-After");
  await assert.rejects(
    deliverAccountMail(async () => Response.json({}), "fictional", payload),
    /Mail delivery unavailable/,
  );
});
