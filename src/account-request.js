// A save click can beat the lazy-loaded header. Retain only the UI purpose,
// never political answers, an email address or the document being saved.
let pending = null;
export function requestAccount(purpose = "save") {
  pending = { purpose };
  window.dispatchEvent(
    new CustomEvent("pollframe:request-account", { detail: pending }),
  );
}
export function takeAccountRequest() {
  const value = pending;
  pending = null;
  return value;
}
