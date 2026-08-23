const defaultSleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

export async function fetchTextWithRetry(url, {
  attempts = 4,
  fallbackUrl = null,
  fetchImpl = fetch,
  headers = {},
  fallbackHeaders = headers,
  sleep = defaultSleep,
  timeoutMs = 20_000,
} = {}) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetchImpl(url, {
        headers,
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (response.ok) return response.text();
      const error = new Error(`HTTP ${response.status}`);
      if (response.status !== 429 && response.status < 500) throw error;
      lastError = error;
    } catch (error) {
      lastError = error;
    }
    if (attempt < attempts) await sleep(attempt * 1_000);
  }

  if (fallbackUrl) {
    try {
      const fallback = await fetchImpl(fallbackUrl, {
        headers: fallbackHeaders,
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (fallback.ok) return fallback.text();
      lastError = new Error(`Fallback HTTP ${fallback.status}`);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError ?? new Error("Source unavailable");
}

export async function settleWithConcurrency(items, worker, concurrency = 3) {
  const results = new Array(items.length);
  let nextIndex = 0;
  async function runWorker() {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      try {
        results[index] = { status: "fulfilled", value: await worker(items[index], index) };
      } catch (reason) {
        results[index] = { status: "rejected", reason };
      }
    }
  }
  const workerCount = Math.min(Math.max(1, concurrency), items.length);
  await Promise.all(Array.from({ length: workerCount }, () => runWorker()));
  return results;
}
