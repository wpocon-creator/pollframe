// Deterministic generated data, not user passwords. Retain the complete common
// password list, plus the 5,000 most frequent words and 500 first names/locale.
// Smaller dictionaries are deliberately a heuristic, not a breach database.
import { writeFile, readFile, mkdir } from "node:fs/promises";
import * as common from "@zxcvbn-ts/language-common";
import * as en from "@zxcvbn-ts/language-en";
import * as de from "@zxcvbn-ts/language-de";
import * as es from "@zxcvbn-ts/language-es-es";
const dictionary = { passwords: common.dictionary["passwords-common"] };
for (const [language, pack] of [
  ["en", en],
  ["de", de],
  ["es", es],
]) {
  for (const [key, words] of Object.entries(pack.dictionary)) {
    if (key.startsWith("commonWords"))
      dictionary[`words-${language}`] = words.slice(0, 5000);
    if (key.startsWith("firstnames"))
      dictionary[`names-${language}`] = words.slice(0, 500);
  }
}
if (!dictionary.passwords?.length || Object.keys(dictionary).length !== 7)
  throw Error("Unexpected password dictionary format");
await writeFile(
  new URL("../src/password-dictionaries.json", import.meta.url),
  JSON.stringify(dictionary),
);
const notices = [
  "Pollframe password-strength estimation\n\nBased on zxcvbn-ts (MIT), inspired by Dan Wheeler/Dropbox zxcvbn. The score is a heuristic, not a guarantee. The complete common-password list is included; word lists are limited to the first 5,000 ranked words and 500 first names per language.\n\nCommon-word frequency data: OpenSubtitles 2024 via OPUS (Helsinki-NLP), Open Data Commons Attribution License (ODC-BY). Source: https://opus.nlpl.eu/ . Licence: https://opendatacommons.org/licenses/by/1-0/ . Adaptation: ranked subsets used for password estimation.\n",
];
for (const pkg of [
  "core",
  "language-common",
  "language-en",
  "language-de",
  "language-es-es",
]) {
  notices.push(
    `\n@zxcvbn-ts/${pkg}\n` +
      (await readFile(
        new URL(
          `../node_modules/@zxcvbn-ts/${pkg}/LICENSE.txt`,
          import.meta.url,
        ),
        "utf8",
      )),
  );
}
await mkdir(new URL("../public/licenses/", import.meta.url), {
  recursive: true,
});
await writeFile(
  new URL("../public/licenses/password-strength.txt", import.meta.url),
  notices.join("\n"),
);
console.log(
  "Password dictionary subsets and licence notices generated (no user data).",
);
