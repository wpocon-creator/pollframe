import React, { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "./pollframe-ui.jsx";
import {
  MATCH_EDITION,
  MATCH_PARTIES,
  MATCH_LENGTHS,
  localText,
  text,
} from "./party-match-data.js";
import {
  calculateMatches,
  validAnswer,
  isComparable,
  scoreLabel,
  rankLabel,
} from "./party-match-model.js";
import { MATCH_COPY } from "./party-match-copy.js";
import { MatchExport, MatchDialog } from "./party-match-export.jsx";
import ResultSave from "./party-match-save.jsx";
import { PartyArguments, PartyEvidence } from "./party-match-arguments.jsx";
import {
  MatchInfo,
  QuestionInfo,
  EvidenceDownload,
} from "./party-match-info.jsx";
import { PolicyText } from "./party-match-terms.jsx";
import { MatchResultInsights } from "./party-match-insights.jsx";
import { resultDocument, matchThemeDark } from "./party-match-design.js";
import {
  openResultStudio,
  keepQuestionnaire,
  takeQuestionnaire,
  clearResultDraft,
  getResultDraft,
} from "./party-match-storage.js";
import {
  POLICY_TERM_BY_ID,
  termTitle,
  glossaryCopy,
} from "./party-match-glossary.js";
import "./party-match.css";
import {
  TOPIC_ROUNDS,
  topicRound,
  questionsForRound,
  roundScope,
} from "./party-match-rounds.js";

const OPTIONS = [
  { value: 1, key: "yes" },
  { value: 0, key: "neutral" },
  { value: -1, key: "no" },
];
const normalize = (value) =>
  value
    .toLocaleLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
function AnswerChoices({ question, answer, onChange, c, compact = false }) {
  return (
    <fieldset className={`pm-choices ${compact ? "pm-choices-compact" : ""}`}>
      <legend className="pm-sr-only">{c("yourAnswer")}</legend>
      {OPTIONS.map(({ value, key }) => (
        <label
          key={value}
          className={answer?.value === value ? "is-selected" : ""}
        >
          <input
            type="radio"
            name={`answer-${question.id}`}
            value={value}
            checked={answer?.value === value}
            onChange={() => onChange(question.id, value)}
          />
          <span>{c(key)}</span>
          <Icon name="check" size={17} />
        </label>
      ))}
    </fieldset>
  );
}

export default function PartyMatch({ Header }) {
  const [restoredSession, setRestoredSession] = useState(takeQuestionnaire);
  const [locale, setLocale] = useState(() => {
    let saved = "de";
    try {
      saved = localStorage.getItem("opinion-poll-locale") || "de";
    } catch {
      /* Only the non-sensitive language preference is read. */
    }
    const q = new URLSearchParams(location.search).get("lang") || saved;
    return ["de", "es", "en-GB", "en-US"].includes(q) ? q : "de";
  });
  const [stage, setStage] = useState(restoredSession?.stage || "intro");
  const [roundId, setRoundId] = useState(
    topicRound(restoredSession?.round)?.id || "general",
  );
  const [generalLength, setLength] = useState(
    MATCH_LENGTHS.includes(restoredSession?.length)
      ? restoredSession.length
      : 16,
  );
  const round = topicRound(roundId),
    length = round ? 15 : generalLength;
  const [index, setIndex] = useState(0);
  // Political answers never leave React memory: no telemetry, URL, persistence or account sync.
  const [answers, setAnswers] = useState(restoredSession?.answers || {});
  const [expandedParty, setExpandedParty] = useState(null);
  const [expandedEvidence, setExpandedEvidence] = useState(() => new Set());
  const toggleEvidence = (key, open) =>
    setExpandedEvidence((previous) => {
      if (previous.has(key) === open) return previous;
      const next = new Set(previous);
      if (open) next.add(key);
      else next.delete(key);
      return next;
    });
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(null);
  const [editTarget, setEditTarget] = useState(null);
  const [explanation, setExplanation] = useState(null);
  const [termHistory, setTermHistory] = useState([]);
  const [argumentQuestion, setArgumentQuestion] = useState(null);
  const argumentTrigger = useRef(null);
  const termTrigger = useRef(null);
  const focusRef = useRef(null);
  const l = (value) => localText(value, locale);
  const c = (key) =>
    round && key === "resultsTitle"
      ? l(round.resultTitle)
      : round && key === "scope"
        ? roundScope(roundId, locale)
        : round && key === "topicsTitle"
          ? l(
              text(
                "Übereinstimmung nach Teilbereich",
                "Agreement by subtopic",
                "Coincidencia por subtema",
              ),
            )
          : l(MATCH_COPY[key]);
  const explain = (id, trigger, questionId) => {
    if (!explanation) {
      termTrigger.current = trigger;
      setTermHistory([]);
    } else setTermHistory((history) => [...history, explanation]);
    setExplanation({ ...POLICY_TERM_BY_ID.get(id), questionId });
  };
  const policyText = (value, q) => (
    <PolicyText
      value={l(value)}
      locale={locale}
      questionId={q.replaces || q.id}
      onExplain={(id, trigger) => explain(id, trigger, q.replaces || q.id)}
    />
  );
  const questions = useMemo(
    () => questionsForRound(roundId, length),
    [roundId, length],
  );
  const result = useMemo(
    () => calculateMatches(answers, questions),
    [answers, questions],
  );
  const designResult = (
    graphic = "ranking",
    party = "none",
    other = "spd",
    options = {},
  ) => {
    keepQuestionnaire({ answers, stage: "results", length, round: roundId });
    const previous = getResultDraft()?.design;
    openResultStudio(
      resultDocument(result, length, locale, {
        answers,
        questions,
        round: roundId,
      }),
      {
        ...(previous || { dark: matchThemeDark() }),
        graphic,
        ...(previous?.graphic === graphic
          ? {}
          : { style: undefined, title: "", subtitle: "" }),
        party,
        other,
        ...options,
      },
    );
  };
  const question = questions[index];
  const comparable = questions.filter((q) => isComparable(q)).length;
  const date = new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(`${MATCH_EDITION.reviewed}T12:00:00Z`));
  const changeAnswer = (id, value) =>
    setAnswers((old) => ({ ...old, [id]: { ...old[id], value } }));
  const toggleWeight = (id) =>
    setAnswers((old) => ({
      ...old,
      [id]: { ...old[id], important: !old[id]?.important },
    }));
  const labelAnswer = (value) =>
    c(
      value === 1
        ? "yes"
        : value === -1
          ? "no"
          : value === 0
            ? "neutral"
            : "unknown",
    );
  const go = (next) => {
    setStage(next);
    setSearch("");
  };
  const startRound = (id) => {
    setRoundId(id);
    setIndex(0);
    setExpandedParty(null);
    setExpandedEvidence(new Set());
    go("questions");
  };
  const edit = (id) => {
    setEditTarget(id || null);
    go("review");
  };
  const advance = () =>
    index < length - 1 ? setIndex(index + 1) : go("results");
  const extend = () => {
    setIndex(length);
    setLength(length === 8 ? 16 : 30);
    go("questions");
  };

  useEffect(() => {
    const originalTitle = document.title;
    const existing = document.querySelector('meta[name="robots"]');
    const robots = existing || document.createElement("meta");
    const oldContent = robots.content;
    robots.name = "robots";
    robots.content = "noindex, nofollow";
    if (!existing) document.head.append(robots);
    document.title = `${c("name")} · Pollframe`;
    document.documentElement.lang = locale;
    return () => {
      document.title = originalTitle;
      if (existing) robots.content = oldContent;
      else robots.remove();
    };
  }, [locale]);
  useEffect(() => {
    // Clear on page departure as well as reload; do not retain sensitive answers in bfcache.
    const clear = () => {
      clearResultDraft();
      setRestoredSession(null);
      setAnswers({});
      setExpandedParty(null);
      setExpandedEvidence(new Set());
      setStage("intro");
      setRoundId("general");
      setIndex(0);
      setModal(null);
      setExplanation(null);
      setArgumentQuestion(null);
    };
    const restored = (event) => {
      if (event.persisted) clear();
    };
    window.addEventListener("pagehide", clear);
    window.addEventListener("pageshow", restored);
    return () => {
      window.removeEventListener("pagehide", clear);
      window.removeEventListener("pageshow", restored);
    };
  }, []);
  useEffect(() => {
    if (editTarget && stage === "review") {
      const target = document.getElementById(`pm-edit-${editTarget}`);
      target?.scrollIntoView({ block: "center", behavior: "instant" });
      target?.focus({ preventScroll: true });
      setEditTarget(null);
      return;
    }
    focusRef.current?.focus({ preventScroll: true });
    if (stage !== "intro")
      focusRef.current
        ?.closest("section")
        ?.scrollIntoView({ block: "start", behavior: "instant" });
  }, [stage, index]);

  const method = (
    <MatchInfo c={c}>
      <p>
        {c("edition")} {c("notAdvice")}
      </p>
      <p>{c("argumentsIntro")}</p>
      <p>{c("coverageNote")}</p>
      <details className="pm-info-section">
        <summary>{c("sourceDetails")}</summary>
        <p>{c("methodology")}</p>
        <p>
          {c("coverageIntro")} {comparable} / {length}.
        </p>
        <p>
          {MATCH_PARTIES.map((p, i) => (
            <React.Fragment key={p.slug}>
              {i > 0 ? " · " : ""}
              <a href={p.source} target="_blank" rel="noreferrer">
                {p.name}
              </a>
            </React.Fragment>
          ))}
        </p>
        <EvidenceDownload
          locale={locale}
          c={c}
          questions={questions}
          scope={c("scope")}
        />
        <p className="pm-small">{c("evidencePrivacy")}</p>
      </details>
      <details className="pm-info-section">
        <summary>{c("calculationDetails")}</summary>
        <p>{c("formula")}</p>
      </details>
      <details className="pm-info-section">
        <summary>{c("privacyDetails")}</summary>
        <p>{c("privacy")}</p>
        <p>
          {c("checkDate")}: {date}. {c("ai")}
        </p>
      </details>
      <p>
        <a href={`/?page=kontakt&lang=${locale}`}>{c("correction")}</a>.{" "}
        {c("correctionNote")}
      </p>
    </MatchInfo>
  );
  const weightControl = (q) => (
    <label className="pm-weight">
      <input
        type="checkbox"
        checked={answers[q.id]?.important === true}
        disabled={!validAnswer(answers[q.id]?.value)}
        onChange={() => toggleWeight(q.id)}
      />
      <Icon name="star" size={17} />
      {c("important")}
    </label>
  );
  const argumentButton = (q) => (
    <button
      type="button"
      className="pm-text-button pm-arguments-trigger"
      aria-haspopup="dialog"
      onClick={(event) => {
        argumentTrigger.current = event.currentTarget;
        setArgumentQuestion(q);
      }}
    >
      {c("arguments")} <span aria-hidden="true">↗</span>
    </button>
  );
  const coverage = (
    <details className="pm-coverage">
      <summary>
        {c("omitted")}{" "}
        <span>
          {result.counted} / {result.answered}
        </span>
      </summary>
      <p>{c("coverageNote")}</p>
      <ul>
        {questions
          .filter((q) => validAnswer(answers[q.id]?.value))
          .map((q) => (
            <li key={q.id}>
              <strong>{l(q.category)}</strong>
              <span>{isComparable(q) ? c("counted") : c("excluded")}</span>
            </li>
          ))}
      </ul>
    </details>
  );

  const ranking = (compact) => (
    <ol
      className={`pm-ranking ${compact ? "pm-ranking-compact" : ""}`}
      aria-label={c("ranking")}
    >
      {result.results.map((p) => (
        <li key={p.slug}>
          {compact ? (
            <div className="pm-rank-summary">
              <span
                className="pm-rank-number"
                aria-label={`${c("place")}: ${rankLabel(p)}`}
              >
                {rankLabel(p)}
              </span>
              <strong>{p.name}</strong>
              <b>{scoreLabel(p)}</b>
            </div>
          ) : (
            <details
              className="pm-party"
              name="pm-parties"
              open={expandedParty === p.slug}
              onToggle={(event) => {
                if (event.target !== event.currentTarget) return;
                const open = event.currentTarget.open;
                setExpandedParty((previous) =>
                  open ? p.slug : previous === p.slug ? null : previous,
                );
              }}
            >
              <summary>
                <span
                  className="pm-rank-number"
                  aria-label={`${c("place")}: ${rankLabel(p)}`}
                >
                  {rankLabel(p)}
                </span>
                <span className="pm-party-title">
                  <strong>{p.name}</strong>
                  <span className="pm-score-track" aria-hidden="true">
                    <span
                      style={{
                        width: `${p.score || 0}%`,
                        background: p.color,
                      }}
                    />
                  </span>
                  <small className="pm-party-coverage">
                    {p.known} / {result.answered} {c("coverage")}
                  </small>
                </span>
                <span className="pm-score">{scoreLabel(p)}</span>
                <Icon name="chevron" size={19} />
              </summary>
              {expandedParty === p.slug && (
                <div className="pm-party-body">
                  {p.comparisons.map(
                    ({ question: q, answer, position, agreement, counted }) => (
                      <details
                        className="pm-evidence"
                        key={q.id}
                        data-question={q.id}
                        open={expandedEvidence.has(`${p.slug}:${q.id}`)}
                        onToggle={(event) => {
                          if (event.target === event.currentTarget)
                            toggleEvidence(
                              `${p.slug}:${q.id}`,
                              event.currentTarget.open,
                            );
                        }}
                      >
                        <summary>
                          <span>{l(q.category)}</span>
                          <span
                            className={`pm-match-tag pm-match-${agreement === 1 ? "same" : agreement === 0 ? "different" : "other"}`}
                          >
                            {!validAnswer(position?.value)
                              ? c("unknown")
                              : !validAnswer(answer?.value)
                                ? c("skipped")
                                : agreement === 1
                                  ? c("matched")
                                  : agreement === 0
                                    ? c("differ")
                                    : c("mixed")}
                          </span>
                          <Icon name="chevron" size={16} />
                        </summary>
                        {expandedEvidence.has(`${p.slug}:${q.id}`) && (
                          <div>
                            <h3>{policyText(q.title, q)}</h3>
                            <p>{policyText(q.context, q)}</p>
                            <dl className="pm-answer-pair">
                              <div>
                                <dt>{c("yourAnswer")}</dt>
                                <dd>
                                  {validAnswer(answer?.value)
                                    ? labelAnswer(answer.value)
                                    : c("skipped")}
                                </dd>
                              </div>
                              <div>
                                <dt>{c("partyAnswer")}</dt>
                                <dd>{labelAnswer(position?.value)}</dd>
                              </div>
                            </dl>
                            <PartyEvidence
                              renderText={(value) => policyText(value, q)}
                              position={position}
                              party={p}
                              locale={locale}
                              c={c}
                            />
                            {!counted && (
                              <p className="pm-small">
                                {!validAnswer(answer?.value)
                                  ? c("skipped")
                                  : c("missingPosition")}
                              </p>
                            )}
                            <button
                              type="button"
                              className="pm-text-button"
                              onClick={() => edit(q.id)}
                            >
                              {c("edit")} <span aria-hidden="true">→</span>
                            </button>
                            {argumentButton(q)}
                          </div>
                        )}
                      </details>
                    ),
                  )}
                </div>
              )}
            </details>
          )}
        </li>
      ))}
    </ol>
  );

  return (
    <>
      <Header locale={locale} setLocale={setLocale} />
      <main className="party-match">
        <nav className="pm-breadcrumb">
          <a href={`/?lang=${locale}`}>← {c("back")}</a>
          <span>{c("scope")}</span>
        </nav>
        <div className="pm-toolbar">
          {method}
          <span>{c("name")}</span>
          {stage !== "intro" && (
            <button
              className="pm-text-button"
              type="button"
              onClick={() => setModal("clear")}
            >
              {c("reset")}
            </button>
          )}
        </div>
        {stage === "intro" ? (
          <section className="pm-intro">
            <div className="pm-intro-heading">
              <span className="pm-eyebrow">{c("name")}</span>
              <h1 ref={focusRef} tabIndex={-1}>
                {c("title")}
              </h1>
              <p className="pm-edition-context">
                {l(
                  text(
                    "Positionen zur Bundestagswahl 2025",
                    "Positions for the 2025 German federal election",
                    "Posturas para las elecciones federales alemanas de 2025",
                  ),
                )}
              </p>
              <p className="pm-lead">{c("intro")}</p>
            </div>
            <div className="pm-start-card">
              <fieldset className="pm-lengths">
                <legend>{c("questions")}</legend>
                {MATCH_LENGTHS.map((n, i) => (
                  <label
                    key={n}
                    className={generalLength === n ? "is-selected" : ""}
                  >
                    <input
                      type="radio"
                      name="question-length"
                      value={n}
                      checked={generalLength === n}
                      onChange={() => setLength(n)}
                    />
                    <strong>{n}</strong>
                    <span>{c(["quick", "standard", "detailed"][i])}</span>
                    <small>
                      ≈ {[3, 6, 12][i]} {c("minutes")}
                    </small>
                  </label>
                ))}
              </fieldset>
              <button
                className="pm-primary"
                type="button"
                onClick={() => startRound("general")}
              >
                {c("start")} →
              </button>
              <p className="pm-small">{c("privacyShort")}</p>
            </div>
            <section
              className="pm-topic-entry"
              aria-labelledby="pm-topic-entry-title"
            >
              <h2 id="pm-topic-entry-title">
                {l(
                  text(
                    "Oder vergleiche gezielt ein Thema",
                    "Or focus on one topic",
                    "O compara un tema en concreto",
                  ),
                )}
              </h2>
              <div className="pm-topic-entry-grid">
                {TOPIC_ROUNDS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className="pm-topic-entry-card"
                    data-round={item.id}
                    style={{ "--round-color": item.color }}
                    onClick={() => startRound(item.id)}
                  >
                    <strong>
                      {locale === "de"
                        ? l(item.name)
                            .replace("Sozialpolitik", "Sozial\u00adpolitik")
                            .replace("Wirtschaft", "Wirt\u00adschaft")
                        : l(item.name)}
                    </strong>
                    <span className="pm-topic-entry-description">
                      {l(item.description)}
                    </span>
                    <span className="pm-topic-entry-footer">
                      <small>
                        <span>15 {c("questions")}</span>
                        <span
                          className="pm-topic-meta-divider"
                          aria-hidden="true"
                        >
                          {" "}
                          ·{" "}
                        </span>
                        <span>≈ 6 min</span>
                      </small>
                      <span aria-hidden="true">→</span>
                    </span>
                  </button>
                ))}
              </div>
            </section>
          </section>
        ) : stage === "questions" ? (
          <section className="pm-question-layout">
            <nav className="pm-topic-nav" aria-label={c("topics")}>
              {questions.map((q, i) => (
                <button
                  type="button"
                  key={q.id}
                  onClick={() => setIndex(i)}
                  aria-current={i === index ? "step" : undefined}
                >
                  <span>{i + 1}</span>
                  <span className="pm-topic-label">{l(q.category)}</span>
                  <span aria-hidden="true">
                    {validAnswer(answers[q.id]?.value) ? "✓" : ""}
                  </span>
                </button>
              ))}
            </nav>
            <div className="pm-question-card">
              <div className="pm-progress-label">
                <span>
                  {c("question")} {index + 1} {c("of")} {length}
                </span>
                <span>
                  {result.answered} {c("answered")}
                </span>
              </div>
              <progress
                max={length}
                value={result.answered}
                aria-label={c("answered")}
              />
              <div className="pm-context-heading">
                <QuestionInfo
                  key={question.id}
                  question={question}
                  locale={locale}
                  c={c}
                  renderText={policyText}
                />
                <span className="pm-eyebrow">{l(question.category)}</span>
              </div>
              <h1 ref={focusRef} tabIndex={-1}>
                {policyText(question.title, question)}
              </h1>
              <div className="pm-answer-dock">
                <AnswerChoices
                  question={question}
                  answer={answers[question.id]}
                  onChange={changeAnswer}
                  c={c}
                />
                {weightControl(question)}
                {argumentButton(question)}
                <div className="pm-question-actions">
                  <button
                    className="pm-secondary"
                    type="button"
                    disabled={index === 0}
                    onClick={() => setIndex(index - 1)}
                  >
                    ← {c("previous")}
                  </button>
                  <button
                    className="pm-skip"
                    type="button"
                    onClick={() => {
                      changeAnswer(question.id, null);
                      advance();
                    }}
                  >
                    {c("skip")}
                  </button>
                  <button
                    className="pm-primary"
                    type="button"
                    disabled={!validAnswer(answers[question.id]?.value)}
                    onClick={advance}
                  >
                    {c(index === length - 1 ? "results" : "next")} →
                  </button>
                </div>
                {result.ready && (
                  <button
                    className="pm-text-button pm-early-result"
                    type="button"
                    onClick={() => go("results")}
                  >
                    {c("results")}
                  </button>
                )}
              </div>
            </div>
          </section>
        ) : stage === "review" ? (
          <section className="pm-review">
            <header className="pm-view-heading">
              <div>
                <span className="pm-eyebrow">{c("questions")}</span>
                <h1 ref={focusRef} tabIndex={-1}>
                  {c("editAnswers")}
                </h1>
              </div>
              <button
                className="pm-primary"
                type="button"
                onClick={() => go("results")}
              >
                {c("returnResults")} →
              </button>
            </header>
            <div className="pm-review-grid">
              <div>
                <label className="pm-search">
                  <Icon name="search" />
                  <input
                    type="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={c("search")}
                    aria-label={c("search")}
                  />
                </label>
                {questions
                  .filter((q) =>
                    normalize(`${l(q.title)} ${l(q.category)}`).includes(
                      normalize(search),
                    ),
                  )
                  .map((q) => (
                    <article
                      className="pm-edit-card"
                      id={`pm-edit-${q.id}`}
                      key={q.id}
                      tabIndex={-1}
                    >
                      <div className="pm-context-heading">
                        <QuestionInfo
                          question={q}
                          locale={locale}
                          c={c}
                          renderText={policyText}
                        />
                        <h2>{policyText(q.title, q)}</h2>
                      </div>
                      <AnswerChoices
                        question={q}
                        answer={answers[q.id]}
                        onChange={changeAnswer}
                        c={c}
                        compact
                      />
                      <div className="pm-edit-actions">
                        {weightControl(q)}
                        {argumentButton(q)}
                        <button
                          className="pm-text-button"
                          type="button"
                          onClick={() => changeAnswer(q.id, null)}
                        >
                          {c("skip")}
                        </button>
                      </div>
                    </article>
                  ))}
                {!questions.some((q) =>
                  normalize(`${l(q.title)} ${l(q.category)}`).includes(
                    normalize(search),
                  ),
                ) && <p>{c("noSearch")}</p>}
              </div>
              <aside className="pm-live-ranking">
                <div className="pm-context-heading">
                  <MatchInfo c={c} label={c("ranking")}>
                    <p>{c("refine")}</p>
                    <p>{c("coverageNote")}</p>
                    <p>{c("rankingNote")}</p>
                    <details className="pm-info-section">
                      <summary>{c("calculationDetails")}</summary>
                      <p>{c("formula")}</p>
                    </details>
                  </MatchInfo>
                  <h2>{c("ranking")}</h2>
                </div>
                <p role="status" className="pm-small">
                  {result.answered} / {length} · {c("basisShort")}
                </p>
                {ranking(true)}
                {result.results.some((p) => p.missing) && (
                  <p className="pm-small">{c("rangeShort")}</p>
                )}
              </aside>
            </div>
          </section>
        ) : (
          <section className="pm-results">
            <header className="pm-view-heading">
              <div>
                <span className="pm-eyebrow">
                  {c("agree")} · {MATCH_EDITION.programmeYear}
                </span>
                <h1 ref={focusRef} tabIndex={-1}>
                  {c("resultsTitle")}
                </h1>
                {result.results.some((p) => p.missing) && (
                  <p className="pm-small">{c("rangeShort")}</p>
                )}
                <p className="pm-mobile-basis">
                  <strong>
                    {result.answered} / {length}
                  </strong>{" "}
                  · {c("basisShort")}
                </p>
              </div>
              <div className="pm-actions">
                <button
                  className="pm-secondary"
                  type="button"
                  disabled={!result.ready}
                  onClick={() => designResult()}
                  data-wahlframe-studio-entry="true"
                >
                  {c("openStudio")}
                </button>
                <button
                  className="pm-secondary"
                  type="button"
                  onClick={() => edit()}
                >
                  {c("editAnswers")}
                </button>
                {result.ready && (
                  <ResultSave
                    documentRecord={resultDocument(result, length, locale, {
                      answers,
                      questions,
                      round: roundId,
                    })}
                    locale={locale}
                  />
                )}
                <button
                  className="pm-primary"
                  type="button"
                  disabled={!result.ready}
                  onClick={() => setModal("export")}
                >
                  <Icon name="download" />
                  {c("export")}
                </button>
              </div>
            </header>
            <div className="pm-result-layout">
              <div>
                {!result.ready && (
                  <p role="status" className="pm-notice">
                    {c("insufficient")}
                  </p>
                )}
                {ranking(false)}
              </div>
              <aside className="pm-result-context">
                <div className="pm-context-heading">
                  <MatchInfo c={c} label={c("omitted")}>
                    <p>{c("narrow")}</p>
                    <p>{c("rankingNote")}</p>
                    {coverage}
                    <details className="pm-info-section">
                      <summary>{c("calculationDetails")}</summary>
                      <p>{c("formula")}</p>
                    </details>
                  </MatchInfo>
                  <h2>
                    {result.answered} / {length}
                  </h2>
                </div>
                <p>{c("basisShort")}</p>
                {!round && length < 30 && (
                  <div className="pm-extension">
                    <button
                      className="pm-secondary"
                      type="button"
                      onClick={extend}
                    >
                      {c("extend")} → {length === 8 ? 16 : 30}
                    </button>
                    <p className="pm-small">{c("retained")}</p>
                  </div>
                )}
              </aside>
            </div>
            {result.ready && (
              <MatchResultInsights
                round={round}
                result={result}
                answers={answers}
                questions={questions}
                locale={locale}
                c={c}
                onDesign={designResult}
                onEdit={edit}
                onArguments={(q, trigger) => {
                  argumentTrigger.current = trigger;
                  setArgumentQuestion(q);
                }}
              />
            )}
          </section>
        )}
        <footer className="pm-footer">
          <span>{c("localDraft")}</span>
          <span>
            {c("checkDate")}: {date} · v{MATCH_EDITION.version}
          </span>
          <a href={`/?page=datenschutz&lang=${locale}`}>
            {l(text("Datenschutz", "Privacy", "Privacidad"))}
          </a>
          <a href={`/?page=impressum&lang=${locale}`}>
            {l(text("Impressum", "Legal notice", "Aviso legal"))}
          </a>
        </footer>
      </main>
      {explanation && (
        <MatchDialog
          title={termTitle(explanation, locale)}
          closeLabel={c("close")}
          onClose={() => {
            setExplanation(null);
            setTermHistory([]);
          }}
          returnFocus={termTrigger.current}
        >
          <div className="pm-term-explanation">
            {termHistory.length > 0 && (
              <button
                type="button"
                className="pm-text-button"
                onClick={() => {
                  setExplanation(termHistory.at(-1));
                  setTermHistory(termHistory.slice(0, -1));
                }}
              >
                {locale === "de"
                  ? "← Zum vorherigen Begriff"
                  : locale === "es"
                    ? "← Volver al término anterior"
                    : "← Previous term"}
              </button>
            )}
            <p>
              <PolicyText
                value={l(explanation.body)}
                locale={locale}
                questionId={explanation.questionId}
                excludeTerm={explanation.id}
                onExplain={(id) =>
                  explain(id, termTrigger.current, explanation.questionId)
                }
              />
            </p>
            {explanation.source && (
              <p className="pm-term-source">
                <a
                  href={explanation.source[1]}
                  target="_blank"
                  rel="noreferrer"
                >
                  {l(glossaryCopy.source)} · {explanation.source[0]} ↗
                </a>
              </p>
            )}
          </div>
        </MatchDialog>
      )}
      {argumentQuestion && (
        <PartyArguments
          question={argumentQuestion}
          locale={locale}
          c={c}
          onClose={() => setArgumentQuestion(null)}
          returnFocus={argumentTrigger.current}
        />
      )}
      {modal === "export" && (
        <MatchExport
          document={
            result.ready
              ? resultDocument(result, length, locale, {
                  answers,
                  questions,
                  round: roundId,
                })
              : undefined
          }
          result={result}
          length={length}
          locale={locale}
          c={c}
          onClose={() => setModal(null)}
        />
      )}
      {modal === "clear" && (
        <MatchDialog
          title={c("reset")}
          closeLabel={c("close")}
          onClose={() => setModal(null)}
        >
          <p>{c("resetConfirm")}</p>
          <div className="pm-actions">
            <button className="pm-secondary" onClick={() => setModal(null)}>
              {c("cancel")}
            </button>
            <button
              className="pm-primary"
              onClick={() => {
                setAnswers({});
                setRoundId("general");
                setExpandedParty(null);
                setExpandedEvidence(new Set());
                clearResultDraft();
                setRestoredSession(null);
                setIndex(0);
                go("intro");
                setModal(null);
              }}
            >
              {c("reset")}
            </button>
          </div>
        </MatchDialog>
      )}
    </>
  );
}
