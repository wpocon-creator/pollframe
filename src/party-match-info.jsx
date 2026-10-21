import React from "react";
import { InfoPopover } from "./pollframe-ui.jsx";
import { MATCH_PARTIES, localText } from "./party-match-data.js";
import { validAnswer } from "./party-match-model.js";
import { matchEvidenceReceipt } from "./party-match-receipt.js";

export function MatchInfo({ c, label, children }) {
  return (
    <div className="pm-inline-info">
      <InfoPopover
        label={label || c("method")}
        closeLabel={c("close")}
        cardClassName="pm-method"
      >
        <div className="pm-info-content">{children}</div>
      </InfoPopover>
    </div>
  );
}

export function QuestionInfo({ question, locale, c, renderText }) {
  const missing = MATCH_PARTIES.filter(
    (p) => !validAnswer(question.positions[p.slug].value),
  );
  return (
    <MatchInfo
      c={c}
      label={`${c("questionInfo")}: ${localText(question.category, locale)}`}
    >
      <p>
        <strong>
          {renderText
            ? renderText(question.title, question)
            : localText(question.title, locale)}
        </strong>
      </p>
      <p>
        {renderText
          ? renderText(question.context, question)
          : localText(question.context, locale)}
      </p>
      <p>
        {MATCH_PARTIES.length - missing.length} / {MATCH_PARTIES.length}{" "}
        {c("coverage")}
        {missing.length
          ? ` · ${c("unknown")}: ${missing.map((p) => p.name).join(", ")}`
          : ""}
        .
      </p>
      {missing.length > 0 && <p>{c("coverageNote")}</p>}
      <p>{c("questionHelp")}</p>
      <p>
        {c("argumentsIntro")} {c("edition")}
      </p>
    </MatchInfo>
  );
}

export function EvidenceDownload({ locale, c, questions, scope }) {
  return (
    <button
      className="pm-text-button"
      type="button"
      onClick={() => {
        const url = URL.createObjectURL(
          new Blob(
            [
              JSON.stringify(
                matchEvidenceReceipt(locale, questions, scope),
                null,
                2,
              ),
            ],
            {
              type: "application/json",
            },
          ),
        );
        const link = document.createElement("a");
        link.href = url;
        link.download = `pollframe-positionen-quellen-${locale}.json`;
        document.body.append(link);
        link.click();
        link.remove();
        // Allow the browser to hand the download off before releasing the local blob.
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
      }}
    >
      {c("downloadEvidence")} ↓
    </button>
  );
}
