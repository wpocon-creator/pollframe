import React from "react";
import { MATCH_PARTIES, localText } from "./party-match-data.js";
import { validAnswer } from "./party-match-model.js";
import { matchSourceHref, matchSourceDate } from "./party-match-sources.js";
import { MatchDialog } from "./party-match-export.jsx";
import { MatchInfo } from "./party-match-info.jsx";

export function PartyEvidence({ position, party, locale, c, renderText }) {
  const content = (value) =>
    renderText ? renderText(value) : localText(value, locale);
  return (
    <div className="pm-party-evidence">
      <h6>{c("proposal")}</h6>
      <p>{content(position.note)}</p>
      <PositionSource position={position} party={party} locale={locale} c={c} />
    </div>
  );
}

export function PositionSource({ position, party, locale, c }) {
  return (
    <div className="pm-source-citation">
      <p className="pm-small pm-source-context">
        {!validAnswer(position.value)
          ? c("reviewedSource")
          : position.source
            ? c(
                position.source.kind === "programme"
                  ? "programmeExtract"
                  : "supplementarySource",
              )
            : c("programmeYear")}
        {position.source?.date && (
          <> · {matchSourceDate(position.source, locale)}</>
        )}
      </p>
      <a
        href={matchSourceHref(position, party)}
        target="_blank"
        rel="noreferrer"
      >
        {position.source
          ? localText(position.source.title, locale)
          : `${party.name} · ${c("source")}`}
        {position.page ? ` · ${c("pdfPage")} ${position.page}` : ""} ↗
      </a>
    </div>
  );
}

export function PartyArguments({ question, locale, c, onClose, returnFocus }) {
  const groups = [
    [1, "forStatement"],
    [-1, "againstStatement"],
    [0, "mixedStatement"],
    [null, "unresolvedStatement"],
  ];
  return (
    <MatchDialog
      title={c("arguments")}
      closeLabel={c("close")}
      onClose={onClose}
      returnFocus={returnFocus}
    >
      <div className="pm-arguments">
        <div className="pm-context-heading">
          <MatchInfo c={c}>
            <p>{localText(question.context, locale)}</p>
            <p>{c("argumentsIntro")}</p>
            <p>{c("edition")}</p>
            <p>{c("coverageNote")}</p>
          </MatchInfo>
          <span className="pm-small">{c("interpretationShort")}</span>
        </div>
        <h3>{localText(question.title, locale)}</h3>
        {groups.map(([value, label]) => {
          const parties = MATCH_PARTIES.filter(
            (p) => question.positions[p.slug].value === value,
          ).sort((a, b) => a.name.localeCompare(b.name, "de"));
          return (
            <section
              key={label}
              className="pm-argument-group"
              data-position={value ?? "unknown"}
            >
              <h4>
                {c(label)} <span>{parties.length}</span>
              </h4>
              {parties.length === 0 ? (
                <p className="pm-small">{c("noGroup")}</p>
              ) : (
                parties.map((party) => {
                  const position = question.positions[party.slug];
                  return (
                    <article key={party.slug} data-party={party.slug}>
                      <h5>
                        <span
                          style={{ background: party.color }}
                          aria-hidden="true"
                        />
                        {party.name}
                      </h5>
                      <PartyEvidence
                        position={position}
                        party={party}
                        locale={locale}
                        c={c}
                      />
                    </article>
                  );
                })
              )}
            </section>
          );
        })}
      </div>
    </MatchDialog>
  );
}
