import React, { useState } from "react";
import { topicMatches, validAnswer } from "./party-match-model.js";
import { localText, text as t } from "./party-match-data.js";
import { MatchInfo } from "./party-match-info.jsx";
import { PartyEvidence } from "./party-match-arguments.jsx";
import StudioSelect from "./studio-select.jsx";
import Spectrum from "./party-match-profile.jsx";

export function PartyChoice({ parties, value, onChange, excluded, label }) {
  return (
    <div className="pm-select-field">
      <span>{label}</span>
      <StudioSelect
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {parties
          .filter((p) => p.slug !== excluded)
          .map((p) => (
            <option key={p.slug} value={p.slug}>
              {p.name}
            </option>
          ))}
      </StudioSelect>
    </div>
  );
}
function AnswerComparison({ row, party, c, locale, onEdit, onArguments }) {
  const [expanded, setExpanded] = useState(false),
    q = row.question;
  const yours = row.answer?.value,
    theirs = row.position?.value;
  return (
    <article className="pm-comparison-question">
      <h3>{localText(q.title, locale)}</h3>
      <div
        className="pm-answer-matrix"
        aria-label={localText(q.category, locale)}
      >
        {[
          ["yes", 1],
          ["neutral", 0],
          ["no", -1],
        ].map(([key, value]) => (
          <div
            key={value}
            data-yours={yours === value}
            data-party={theirs === value}
          >
            <strong>{c(key)}</strong>
            <span>
              {yours === value && (
                <b className="pm-person-tag">
                  {locale === "de" ? "Du" : locale === "es" ? "Tú" : "You"}
                </b>
              )}
              {theirs === value && <b className="pm-party-tag">{party.name}</b>}
            </span>
          </div>
        ))}
      </div>
      {(!validAnswer(yours) || !validAnswer(theirs)) && (
        <p className="pm-missing-answer">
          {!validAnswer(yours) && (
            <span>
              {c("yourAnswer")}: {c("skipped")}
            </span>
          )}
          {!validAnswer(theirs) && (
            <span>
              {party.name}: {c("unknown")}
            </span>
          )}
        </p>
      )}
      <details
        className="pm-comparison-detail"
        onToggle={(e) => {
          if (e.target === e.currentTarget) setExpanded(e.currentTarget.open);
        }}
      >
        <summary>
          {locale === "de"
            ? "Position & Quellen"
            : locale === "es"
              ? "Postura y fuentes"
              : "Position & sources"}
        </summary>
        {expanded && (
          <div>
            <p>{localText(q.context, locale)}</p>
            <PartyEvidence
              question={q}
              party={party}
              position={row.position}
              locale={locale}
              c={c}
            />
            <div className="pm-inline-actions">
              <button className="pm-text-button" onClick={() => onEdit(q.id)}>
                {c("edit")}
              </button>
              <button
                className="pm-text-button"
                onClick={(e) => onArguments(q, e.currentTarget)}
              >
                {c("arguments")}
              </button>
            </div>
          </div>
        )}
      </details>
    </article>
  );
}
export function MatchResultInsights({
  result,
  answers,
  questions,
  locale,
  c,
  onEdit,
  onArguments,
  onDesign,
  round,
}) {
  const [chosen, setChosen] = useState(null);
  const party =
    result.results.find((p) => p.slug === chosen) ||
    result.results.find((p) => p.score !== null) ||
    result.results[0];
  const l = (v) => localText(v, locale);
  return (
    <div className="pm-result-insights">
      {!round && (
        <Spectrum
          answers={answers}
          questions={questions}
          parties={result.results}
          locale={locale}
          c={c}
          onDesign={onDesign}
        />
      )}
      {round && (
        <section className="pm-topic-context pm-result-section">
          <div className="pm-context-heading">
            <h2>{localText(round.name, locale)}</h2>
            <MatchInfo c={c}>
              <p>
                {locale === "de"
                  ? "Diese Auswertung gilt nur für die 15 Fragen dieses Themendurchgangs. Sie ist kein allgemeines Parteienranking. Unbekannte Positionen werden nicht als Zustimmung, Ablehnung oder Mitte gewertet."
                  : locale === "es"
                    ? "Esta comparación cubre solo las 15 preguntas de este tema, no una clasificación general de partidos. Las posturas desconocidas no cuentan como acuerdo, rechazo ni centro."
                    : "This comparison covers only this topic’s 15 questions, not overall party fit. Unknown positions never count as agreement, disagreement or the centre."}
              </p>
            </MatchInfo>
          </div>
          <p>{localText(round.description, locale)}</p>
        </section>
      )}
      <section className="pm-topics pm-result-section">
        <header className="pm-view-heading">
          <div className="pm-context-heading">
            <h2>{c("topicsTitle")}</h2>
            <MatchInfo c={c}>
              <p>{c("topicsInfo")}</p>
            </MatchInfo>
          </div>
          <PartyChoice
            parties={result.results}
            value={party.slug}
            onChange={setChosen}
            label={c("selectedParty")}
          />
        </header>
        {topicMatches(party, round?.groups).map((topic) => (
          <div className="pm-topic-result" key={topic.id}>
            <span>
              {l(topic.label)}
              <small>
                {topic.known} {c("coverage")}
              </small>
            </span>
            <div className="pm-score-track" aria-hidden="true">
              <span
                style={{
                  width: `${topic.score}%`,
                  background:
                    party.slug === "union" ? "var(--ink)" : party.color,
                }}
              />
            </div>
            <strong>{Math.round(topic.score)}%</strong>
          </div>
        ))}
        {!topicMatches(party, round?.groups).length && (
          <p className="pm-small">
            {localText(
              t(
                "Balken erscheinen erst ab drei beantworteten und für die Partei belegten Fragen je Teilbereich.",
                "Bars appear only after three answered questions with documented party positions in a subtopic.",
                "Las barras aparecen a partir de tres preguntas respondidas con posturas documentadas del partido en cada subtema.",
              ),
              locale,
            )}
          </p>
        )}
        <button
          className="pm-secondary pm-small-action pm-studio-entry"
          onClick={() => onDesign("topics", party.slug)}
        >
          {c("openStudio")}
        </button>
      </section>
      <section className="pm-self-compare pm-result-section">
        <header className="pm-view-heading">
          <div>
            <p className="pm-eyebrow">
              {l(t("Deine Antworten", "Your answers", "Tus respuestas"))}
            </p>
            <h2>
              {l(t("Du & eine Partei", "You & one party", "Tú y un partido"))}
            </h2>
          </div>
          <PartyChoice
            parties={result.results}
            value={party.slug}
            onChange={setChosen}
            label={c("selectedParty")}
          />
        </header>
        <p className="pm-small">
          {l(
            t(
              "Auf einen Blick: Wo ihr übereinstimmt – und wo nicht.",
              "At a glance: where you agree, and where you differ.",
              "De un vistazo: coincidencias y diferencias.",
            ),
          )}
        </p>
        <div className="pm-question-comparisons">
          {party.comparisons.map((row) => (
            <AnswerComparison
              key={`${party.slug}-${row.question.id}`}
              row={row}
              party={party}
              c={c}
              locale={locale}
              onEdit={onEdit}
              onArguments={onArguments}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
