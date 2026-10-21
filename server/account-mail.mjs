// Retry brief provider congestion without sending the same mail twice. One
// logical message consumes our free-tier allowance once, not once per retry.
export async function deliverAccountMail(
  fetchMail,
  apiKey,
  payload,
  {
    sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    signal = AbortSignal.timeout(10000),
  } = {},
) {
  const idempotencyKey = `account/${crypto.randomUUID()}`;
  const body = JSON.stringify(payload);
  for (let attempt = 0; attempt < 3; attempt++) {
    let response;
    try {
      response = await fetchMail("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
        body,
        signal,
      });
    } catch {
      if (signal.aborted || attempt === 2)
        throw Error("Mail delivery unavailable");
      await sleep(500 * (attempt + 1));
      continue;
    }
    if (response.ok) {
      const receipt = await response.json().catch(() => null);
      if (!receipt?.id || typeof receipt.id !== "string")
        throw Error("Mail delivery unavailable");
      return;
    }
    const transient = response.status === 429 || response.status >= 500;
    const retry = response.headers.get("retry-after");
    const seconds =
      retry && /^\d+$/.test(retry)
        ? Number(retry)
        : retry
          ? (Date.parse(retry) - Date.now()) / 1000
          : 1;
    await response.body?.cancel();
    // Respect a long Retry-After by failing honestly rather than keeping the
    // browser waiting or retrying earlier than the provider permits.
    if (!transient || attempt === 2 || signal.aborted || seconds > 2)
      throw Error("Mail delivery unavailable");
    await sleep(Math.max(500, (Number.isFinite(seconds) ? seconds : 1) * 1000));
  }
}
