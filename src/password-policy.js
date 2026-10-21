// Shared, deterministic estimate: local in the browser, checked again by the
// server. Passwords are never sent to a scoring service or stored by the meter.
import { zxcvbn, zxcvbnOptions } from "@zxcvbn-ts/core";
import graphs from "@zxcvbn-ts/language-common/dist/adjacencyGraphs.json.mjs";
import translations from "@zxcvbn-ts/language-en/dist/translations.mjs";
import dictionary from "./password-dictionaries.json" with { type: "json" };
let configured = false;
export function passwordStrength(password, email = "") {
  if (typeof password !== "string" || password.length > 128)
    return { score: 0, accepted: false, reason: "length" };
  const length = [...password].length;
  if (!length) return { score: 0, accepted: false, reason: "empty" };
  if (length < 15) return { score: 0, accepted: false, reason: "length" };
  if (!configured) {
    zxcvbnOptions.setOptions({
      dictionary,
      graphs,
      translations,
      maxLength: 128,
      l33tMaxSubstitutions: 8,
    });
    configured = true;
  }
  const context = ["pollframe", "wahlframe", ...(typeof email === "string" ? email : "").split(/[@._+\-]/)].filter(
    (word) => word.length >= 3,
  );
  const { score } = zxcvbn(password, context);
  return {
    score,
    accepted: length >= 15 && score >= 3,
    reason: length < 15 ? "length" : score < 3 ? "guessable" : "accepted",
  };
}
