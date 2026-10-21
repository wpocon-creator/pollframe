// Release opt-in, independent of accounts. Keeping the default closed prevents
// an unrelated polling-data deployment from publishing an unapproved draft.
export const WAHLFRAME_UI_ENABLED =
  import.meta.env?.DEV || import.meta.env?.VITE_PUBLIC_WAHLFRAME === "true";
