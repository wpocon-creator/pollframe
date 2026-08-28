// Abort errors are not reported consistently across engines. Chromium and
// Firefox normally use AbortError, while WebKit can reject an aborted fetch as
// TypeError: Load failed. The signal is the authoritative source.
export function requestWasAborted(error, signal) {
  return Boolean(signal?.aborted || error?.name === "AbortError");
}
