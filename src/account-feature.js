// Explicit build-time opt-in. Preparing accounts must never enable a release.
// The independent server-side ACCOUNTS_ENABLED gate remains authoritative.
export const ACCOUNT_UI_ENABLED =
  import.meta.env?.DEV || import.meta.env?.VITE_PUBLIC_ACCOUNTS === "true";
