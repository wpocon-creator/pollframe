import React from "react";
import { localText } from "./party-match-text.js";
import { policyTextParts, glossaryCopy } from "./party-match-glossary.js";

// Explicit text nodes only: never walk/replace the DOM or nest buttons inside
// links, answer controls or details summaries. Original wording is preserved.
export function PolicyText({
  value,
  locale,
  questionId,
  onExplain,
  excludeTerm,
}) {
  return policyTextParts(value, locale, questionId).map((part, index) =>
    part.term && part.term !== excludeTerm ? (
      <button
        key={`${index}-${part.term}`}
        type="button"
        className="pm-term"
        data-term={part.term}
        aria-haspopup="dialog"
        aria-label={`${localText(glossaryCopy.explain, locale)}: ${part.text}`}
        onClick={(event) => {
          // Touch/Safari do not always focus a clicked button. Retain the actual
          // trigger so closing the explanation restores keyboard position too.
          onExplain(part.term, event.currentTarget);
        }}
      >
        {part.text}
      </button>
    ) : (
      <React.Fragment key={index}>{part.text}</React.Fragment>
    ),
  );
}
