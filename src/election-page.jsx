import React, { useEffect, useState } from "react";
import ElectionCard from "./election-card.jsx";
import { electionAge, electionTimestamp } from "./election-time.js";
import { InfoPopover } from "./pollframe-ui.jsx";
import {
  useElectionResult,
  electionText,
  electionStatus,
} from "./election-result.jsx";
import {
  ELECTION_PARTIES,
  lastPreElectionPolls,
  comparisonRows,
  electionMajorities,
  coalitionRestriction,
} from "./election-comparison.js";

const SOURCE =
  "https://wahlergebnisse.sachsen-anhalt.de/wahlen/lt26/erg_land.html";
const COALITION_SOURCE =
  "https://www.deutschlandfunk.de/cdu-linkspartei-unvereinbarkeitsbeschluss-kolumbien-100.html";
export default function ElectionPage({ Header, ShareTools, embed = false }) {
  const query = new URLSearchParams(location.search);
  const embedWidget = ["comparison", "turnout", "votes", "seats"].includes(query.get("electionWidget")) ? query.get("electionWidget") : "comparison";
  const [locale, setLocale] = useState(() => {
    const lang = new URLSearchParams(location.search).get("lang");
    return ["de", "en-GB", "en-US", "es"].includes(lang) ? lang : "de";
  });
  const { result, loading, error } = useElectionResult(true);
  const [data, setData] = useState(null),
    [pollError, setPollError] = useState(false),
    [baseline, setBaseline] = useState(query.get("baseline") === "poll" ? "poll" : "election"),
    [pollIndex, setPollIndex] = useState(0),
    [all, setAll] = useState(query.get("all") === "1"),
    [selected, setSelected] = useState((query.get("coalition") || "").split(",").filter(name => Object.hasOwn(ELECTION_PARTIES, name)));
  const l = (...text) => electionText(locale, ...text);
  const format = (n, digits = 1) =>
    Number.isFinite(n)
      ? n.toLocaleString(locale, {
          minimumFractionDigits: digits,
          maximumFractionDigits: digits,
        })
      : "—";
  const delta = (n) =>
    Number.isFinite(n)
      ? `${n > 0 ? "+" : ""}${format(n)} ${l("Pp.", "pp", "pp")}`
      : "—";
  const date = (value) =>
    new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(
      new Date(value),
    );
  useEffect(() => {
    if (!embed) return;
    document.documentElement.dataset.embed = "true";
    const theme = query.get("theme");
    const media = matchMedia("(prefers-color-scheme: dark)");
    const apply = () => { document.documentElement.dataset.theme = theme === "dark" || (theme === "system" && media.matches) ? "dark" : "light"; };
    apply(); media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [embed]);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/data/sachsen-anhalt.json", { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error();
        return response.json();
      })
      .then(setData)
      .catch(() => {
        if (!controller.signal.aborted) setPollError(true);
      });
    return () => controller.abort();
  }, []);
  useEffect(() => {
    document.title =
      l(
        "Landtagswahl Sachsen-Anhalt 2026 · Ergebnis und Vergleich",
        "Saxony-Anhalt election 2026 · Results and comparison",
        "Elecciones de Sajonia-Anhalt 2026 · Resultados y comparación",
      ) + " · Pollframe";
    document.documentElement.lang = locale;
    const url = new URL(location.href);
    url.searchParams.set("lang", locale);
    history.replaceState(history.state, "", url.pathname + url.search);
  }, [locale]);
  const polls = lastPreElectionPolls(data),
    poll = polls.find(entry => String(entry.pollster) === query.get("electionPollster")) || polls[pollIndex] || polls[0];
  const rows = comparisonRows(result, poll, baseline),
    visible = all ? rows : rows.slice(0, 7);
  const allocation =
    result?.status !== "partial" ? result?.seatAllocation : null;
  const seated = (allocation?.rows || [])
    .filter((row) => row.seats > 0)
    .sort((a, b) => b.seats - a.seats);
  const threshold = allocation ? Math.floor(allocation.total / 2) + 1 : 0;
  const chosen = seated.filter((row) => selected.includes(row.name)),
    chosenSeats = chosen.reduce((sum, row) => sum + row.seats, 0);
  const majorities = allocation
    ? electionMajorities(seated, allocation.total)
    : [];
  const restricted = coalitionRestriction(chosen);
  const info = (children) => (
    <InfoPopover label="Info" closeLabel={l("Schließen", "Close", "Cerrar")}>
      <p>{children}{result && <> {l("Amtlicher Datenstand", "Official source updated", "Datos oficiales actualizados")}: {electionTimestamp(result.publishedAt, locale)} ({l("Berliner Zeit", "Berlin time", "hora de Berlín")}), {electionAge(result.publishedAt, locale)}. {l("Das ist der Zeitstempel der Quelle, nicht der Zeitpunkt unseres Abrufs. Wir prüfen während der Sonderanzeige alle fünf Minuten auf neue amtliche Daten; die Quelle kann seltener aktualisiert werden.", "This is the source timestamp, not our retrieval time. During this special coverage we check every five minutes; the source may update less often.", "Es la fecha de la fuente, no de nuestra consulta. Durante esta cobertura comprobamos cada cinco minutos; la fuente puede actualizarse con menor frecuencia.")}</>}</p>
    </InfoPopover>
  );
  const cardProps = { locale, result, ShareTools, embed, options: {baseline, all: all ? "1" : "0", electionPollster: poll?.pollster, coalition: selected.join(","), rows: visible.length} };
  return (
    <>
      {Header && <Header locale={locale} setLocale={setLocale} />}
      <main className={`election-page${embed ? " election-embed" : ""}`} data-election-focus={embed ? embedWidget : undefined}>
        <a className="breadcrumb" href={`/?lang=${locale}`}>
          ← {l("Deutschland", "Germany", "Alemania")}
        </a>
        <header className="election-page-heading">
          <p className="section-label">
            {l(
              "Landtagswahl · 6. September 2026",
              "State election · 6 September 2026",
              "Elecciones regionales · 6 de septiembre de 2026",
            )}
          </p>
          <h1>{l("Sachsen-Anhalt", "Saxony-Anhalt", "Sajonia-Anhalt")}</h1>
          {result && (
            <p>
              {electionStatus(result, locale)} · {l("Datenstand", "Source updated", "Datos actualizados")} {electionAge(result.publishedAt, locale)}
              {result.stale &&
                ` · ${l("Aktualisierung ausstehend", "Update pending", "Actualización pendiente")}`}
            </p>
          )}
        </header>
        {!result ? (
          <p role="status">
            {loading
              ? l(
                  "Amtliche Ergebnisse werden geladen…",
                  "Loading official results…",
                  "Cargando resultados oficiales…",
                )
              : error
                ? l(
                    "Ergebnisse derzeit nicht erreichbar. Bitte später erneut versuchen.",
                    "Results currently unavailable. Please try again later.",
                    "Resultados no disponibles. Inténtalo más tarde.",
                  )
                : l(
                    "Noch kein geprüftes Ergebnis verfügbar.",
                    "No verified result available yet.",
                    "Todavía no hay resultados verificados.",
                  )}
          </p>
        ) : (
          <>
            {result.archived && (
              <p className="election-archive-note">
                {l(
                  "Archivierter Stand: Die automatische Wahlabend-Aktualisierung ist beendet.",
                  "Archived count: automatic election-night updates have ended.",
                  "Recuento archivado: han finalizado las actualizaciones automáticas de la noche electoral.",
                )}
              </p>
            )}
            {result.status === "partial" && (
              <p className="election-archive-note">
                {l(
                  "Zwischenstand, keine Hochrechnung. Vergleiche sind noch nicht repräsentativ für das ganze Land.",
                  "Partial count, not a projection. Comparisons are not yet representative of the whole state.",
                  "Recuento parcial, no proyección. Las comparaciones aún no representan a todo el estado.",
                )}{" "}
                {result.counted}/{result.total}
              </p>
            )}
            <ElectionCard {...cardProps} kind="comparison" title={l("Wahlergebnis im Vergleich", "Election results compared", "Comparación de resultados")}>
              {info(
                <>
                  {l(
                    "Verglichen werden gültige Zweitstimmen. Wahl 2021 stammt aus der amtlichen Vergleichstabelle. Bei Umfragen verwenden wir die zuletzt vor dem Wahltag veröffentlichte Erhebung in unserem zugelassenen Datenbestand, nicht einen Durchschnitt. Bei mehreren Erhebungen am letzten Veröffentlichungstag kannst du das Institut wählen. Fehlende Einzelwerte werden als Strich dargestellt, nicht als null. Differenzen sind Prozentpunkte; Rundung und Feldzeit können Abweichungen erklären. Ein Unterschied zum Wahlergebnis beweist keinen Umfragefehler.",
                    "Comparisons use valid second votes. The 2021 result comes from the official comparison table. Poll mode uses the last pre-election survey in our licensed dataset, not an average. If several surveys share the latest publication date, select the institute. Missing individual values are shown as a dash, not zero. Differences are percentage points; rounding and fieldwork timing can contribute to differences. A gap from the election result does not by itself demonstrate a polling error.",
                    "Las comparaciones usan segundos votos válidos. El resultado de 2021 procede de la tabla oficial. Se usa la última encuesta preelectoral de nuestro conjunto de datos autorizado, no una media. Si varias se publicaron el mismo día, puedes elegir el instituto. Los valores ausentes se muestran con una raya, no como cero. Las diferencias son puntos porcentuales; el redondeo y las fechas de campo influyen. Una diferencia respecto al resultado no demuestra por sí sola un error de la encuesta.",
                  )}
                </>,
              )}
              <div className="election-section-heading">
                <h2>
                  {l(
                    "Ergebnis im Vergleich",
                    "Compare results",
                    "Comparar resultados",
                  )}
                </h2>
                <label data-export-ignore="true">
                  {l("Vergleich mit", "Compare with", "Comparar con")}
                  <select
                    aria-label={l(
                      "Vergleich mit",
                      "Compare with",
                      "Comparar con",
                    )}
                    value={baseline}
                    onChange={(event) => setBaseline(event.target.value)}
                  >
                    <option value="election">
                      {l("Wahl 2021", "2021 election", "Elecciones de 2021")}
                    </option>
                    <option value="poll">
                      {l(
                        "Letzte Umfrage vor der Wahl",
                        "Last pre-election poll",
                        "Última encuesta preelectoral",
                      )}
                    </option>
                  </select>
                </label>
              </div>
              {baseline === "poll" && (
                <p className="election-poll-note">
                  {poll ? (
                    <>
                      {data.pollsters[poll.pollster]} ·{" "}
                      {l("Veröffentlicht", "Published", "Publicada")}:{" "}
                      {date(poll.date)} · n={format(poll.sample, 0)}
                      {poll.fieldwork?.length === 2 && (
                        <>
                          {" "}
                          · {l(
                            "Befragt",
                            "Fieldwork",
                            "Trabajo de campo",
                          )}: {date(poll.fieldwork[0])}–
                          {date(poll.fieldwork[1])}
                        </>
                      )}
                    </>
                  ) : pollError ? (
                    l(
                      "Umfragedaten nicht erreichbar.",
                      "Poll data unavailable.",
                      "Encuestas no disponibles.",
                    )
                  ) : (
                    l(
                      "Keine passende Umfrage geladen.",
                      "No matching poll loaded.",
                      "No se ha cargado ninguna encuesta adecuada.",
                    )
                  )}
                </p>
              )}
              {baseline === "poll" && polls.length > 1 && (
                <label data-export-ignore="true">
                  {l("Institut", "Pollster", "Instituto")}
                  <select
                    value={pollIndex}
                    onChange={(event) =>
                      { const url = new URL(location.href); url.searchParams.delete("electionPollster"); history.replaceState(history.state, "", url); setPollIndex(Number(event.target.value)); }
                    }
                  >
                    {polls.map((entry, i) => (
                      <option key={i} value={i}>
                        {data.pollsters[entry.pollster]} · {entry.sample}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <div
                className="election-comparison-table"
                role="table"
                aria-label={l(
                  "Zweitstimmenvergleich",
                  "Second-vote comparison",
                  "Comparación de segundos votos",
                )}
              >
                <div role="row" className="election-comparison-head">
                  <span role="columnheader">
                    {l("Partei", "Party", "Partido")}
                  </span>
                  <span role="columnheader">2026</span>
                  <span role="columnheader">
                    {baseline === "poll"
                      ? l("Umfrage", "Poll", "Encuesta")
                      : "2021"}
                  </span>
                  <span role="columnheader">Δ {l("Pp.", "pp", "pp")}</span>
                </div>
                {visible.map((row) => (
                  <div
                    role="row"
                    key={row.name}
                    className="election-comparison-row"
                  >
                    <span role="cell">
                      <i
                        style={{
                          background:
                            ELECTION_PARTIES[row.name]?.color || "#87939d",
                        }}
                      />
                      {row.name}
                    </span>
                    <strong role="cell">{format(row.share)}%</strong>
                    <span role="cell">
                      {row.previous === null ? "—" : format(row.previous) + "%"}
                    </span>
                    <strong
                      role="cell"
                      className={
                        row.delta > 0
                          ? "election-up"
                          : row.delta < 0
                            ? "election-down"
                            : ""
                      }
                    >
                      {row.delta === null
                        ? "—"
                        : `${row.delta > 0 ? "+" : ""}${format(row.delta)}`}
                    </strong>
                  </div>
                ))}
              </div>
              {rows.length > 7 && (
                <button
                  data-export-ignore="true"
                  className="secondary-button"
                  onClick={() => setAll((value) => !value)}
                >
                  {all
                    ? l("Weniger Parteien", "Fewer parties", "Menos partidos")
                    : l("Alle Parteien", "All parties", "Todos los partidos")}
                </button>
              )}
            </ElectionCard>
            <div className="election-stats-grid">
              <ElectionCard {...cardProps} kind="turnout" title={l("Wahlbeteiligung", "Turnout", "Participación")}>
                {info(
                  l(
                    "Wahlbeteiligung: Wählende geteilt durch Wahlberechtigte. Bei laufender Auszählung gilt sie nur für gemeldete Bezirke. Der Vergleichswert stammt aus der amtlichen Tabelle von 2021.",
                    "Turnout is voters divided by eligible voters. While counting is ongoing it covers reporting districts only. The comparison is the official 2021 figure.",
                    "La participación es el número de votantes dividido por el electorado. Durante el escrutinio solo incluye distritos comunicados. Se compara con la cifra oficial de 2021.",
                  ),
                )}
                <h2>{l("Wahlbeteiligung", "Turnout", "Participación")}</h2>
                <strong className="election-stat-value">
                  {format(result.turnout)}
                  {Number.isFinite(result.turnout) ? "%" : ""}
                </strong>
                <p>
                  {Number.isFinite(result.turnout) &&
                  Number.isFinite(result.previousTurnout)
                    ? `${delta(result.turnout - result.previousTurnout)} ${l("zu 2021", "vs 2021", "frente a 2021")}`
                    : "—"}
                </p>
                <small>
                  {format(result.voters, 0)} / {format(result.eligible, 0)}{" "}
                  {l(
                    "Wahlberechtigte",
                    "eligible voters",
                    "personas con derecho a voto",
                  )}
                </small>
              </ElectionCard>
              <ElectionCard {...cardProps} kind="votes" title={l("Stimmen und Briefwahl", "Votes and postal voting", "Votos y voto por correo")}>
                {info(
                  l(
                    "Ungültige Zweitstimmen werden bei den Partei-Prozentwerten nicht mitgezählt. Der Briefwahlanteil bezieht sich auf alle Wählenden, nicht auf alle Wahlberechtigten.",
                    "Invalid second votes are excluded from party percentages. The postal-vote share is a share of all voters, not all eligible voters.",
                    "Los segundos votos inválidos no cuentan en los porcentajes por partido. El voto por correo es una proporción de votantes, no del electorado total.",
                  ),
                )}
                <h2>
                  {l(
                    "Stimmen und Briefwahl",
                    "Votes and postal voting",
                    "Votos y voto por correo",
                  )}
                </h2>
                <dl className="election-stat-list">
                  <div>
                    <dt>
                      {l(
                        "Gültige Zweitstimmen",
                        "Valid second votes",
                        "Segundos votos válidos",
                      )}
                    </dt>
                    <dd>{format(result.validVotes, 0)}</dd>
                  </div>
                  <div>
                    <dt>
                      {l(
                        "Ungültige Zweitstimmen",
                        "Invalid second votes",
                        "Segundos votos inválidos",
                      )}
                    </dt>
                    <dd>{format(result.invalidVotes, 0)}</dd>
                  </div>
                  <div>
                    <dt>
                      {l(
                        "Briefwahlanteil",
                        "Postal-vote share",
                        "Proporción de voto por correo",
                      )}
                    </dt>
                    <dd>
                      {Number.isFinite(result.postalVoters) && result.voters > 0
                        ? format((result.postalVoters / result.voters) * 100) +
                          "%"
                        : "—"}
                    </dd>
                  </div>
                </dl>
              </ElectionCard>
            </div>
            <ElectionCard {...cardProps} kind="seats" title={l("Sitze und Koalitionen", "Seats and coalitions", "Escaños y coaliciones")}>
              {info(
                <>
                  {l(
                    "Es werden ausschließlich amtlich veröffentlichte Sitze verwendet. Mehrheit bedeutet mehr als die Hälfte aller Sitze. Die Vorschläge enthalten nur Mehrheiten, bei denen keine Partei weggelassen werden kann, ohne die Mehrheit zu verlieren. Die Reihenfolge orientiert sich wie im Hauptrechner an parlamentarischer Nähe. Kombinationen mit AfD und anderen Parteien außer BSW sowie CDU/Linke folgen später. Die Ausnahme für AfD/BSW ist nur eine redaktionelle Sortierregel, kein Hinweis auf eine vereinbarte Zusammenarbeit; für CDU/Linke und CDU/AfD gilt der dokumentierte Unvereinbarkeitsbeschluss (geprüft am 7. September 2026). Alle Kombinationen bleiben manuell prüfbar. Die Reihenfolge ist keine Wahrscheinlichkeitsprognose, und eine rechnerische Mehrheit ist keine Regierungsvereinbarung.",
                    "Only officially published seats are used. A majority is more than half of all seats. Suggestions are minimal winning combinations: removing any member loses the majority. Like the main calculator, ordering uses parliamentary proximity. Combinations involving AfD and parties other than BSW, and CDU/Left, follow later. The AfD/BSW exception is an editorial ordering rule, not evidence of an agreement; CDU/Left and CDU/AfD are covered by the documented CDU exclusion policy (checked 7 September 2026). Every combination remains selectable. Ordering is not a probability forecast, and a numerical majority is not a government agreement.",
                    "Se usan únicamente escaños oficiales. La mayoría exige más de la mitad. Las sugerencias son combinaciones mínimas: al retirar un partido se pierde la mayoría. El orden utiliza proximidad parlamentaria. Las combinaciones de AfD con partidos distintos de BSW, y CDU/La Izquierda, aparecen después. La excepción AfD/BSW es una regla editorial, no prueba de un acuerdo; la CDU excluye oficialmente coaliciones con AfD y La Izquierda (comprobado el 7 de septiembre de 2026). Todas siguen disponibles manualmente. El orden no es una predicción de probabilidad ni una mayoría implica un acuerdo de gobierno.",
                  )}{" "}
                  <a href={COALITION_SOURCE} target="_blank" rel="noreferrer">
                    Deutschlandfunk ↗
                  </a>
                </>,
              )}
              <h2>
                {l(
                  "Sitze und Koalitionen",
                  "Seats and coalitions",
                  "Escaños y coaliciones",
                )}
              </h2>
              {!allocation ? (
                <p>
                  {l(
                    "Noch keine geprüfte amtliche Sitzverteilung verfügbar. Wir berechnen daraus keine vermeintlich amtlichen Sitze.",
                    "No verified official seat allocation yet. We do not substitute modelled seats.",
                    "Todavía no hay un reparto oficial verificado. No lo sustituimos por una estimación.",
                  )}
                </p>
              ) : (
                <>
                  <p>
                    {allocation.total} {l("Sitze", "seats", "escaños")} ·{" "}
                    {l("Mehrheit ab", "Majority from", "Mayoría a partir de")}{" "}
                    {threshold}
                  </p>
                  <div className="election-seat-strip" aria-hidden="true">
                    {seated.map((row) => (
                      <span
                        key={row.name}
                        style={{
                          flex: row.seats,
                          background:
                            ELECTION_PARTIES[row.name]?.color || "#87939d",
                        }}
                      />
                    ))}
                  </div>
                  <div className="election-party-picker">
                    {seated.map((row) => (
                      <button
                        key={row.name}
                        className="secondary-button"
                        aria-pressed={selected.includes(row.name)}
                        onClick={() =>
                          setSelected((current) =>
                            current.includes(row.name)
                              ? current.filter((name) => name !== row.name)
                              : [...current, row.name],
                          )
                        }
                      >
                        <i
                          style={{
                            background:
                              ELECTION_PARTIES[row.name]?.color || "#87939d",
                          }}
                        />
                        {row.name}
                        <strong>{row.seats}</strong>
                      </button>
                    ))}
                  </div>
                  <p className="election-selected-parties">{chosen.length ? chosen.map(row => row.name).join(" + ") : l("Parteien für eine Koalition auswählen", "Select coalition parties", "Selecciona los partidos de la coalición")}</p>
                  <div className="election-majority-track" role="img" aria-label={`${chosenSeats} / ${allocation.total} · ${l("Mehrheit ab", "Majority from", "Mayoría a partir de")} ${threshold}`}>
                    <div className="election-majority-fill" style={{width: `${100 * chosenSeats / allocation.total}%`}}>
                      {chosen.map(row => <span key={row.name} style={{flex:row.seats, background:ELECTION_PARTIES[row.name]?.color || "#87939d"}}/>)}
                    </div>
                    <span className="election-majority-marker" style={{left:`${100 * threshold / allocation.total}%`}}>
                      <span>{l("Mehrheit", "Majority", "Mayoría")} {threshold}</span>
                    </span>
                  </div>
                  <p className="election-majority-value" aria-live="polite">
                    <strong>{chosenSeats}</strong> / {allocation.total}{" "}
                    <span
                      className={
                        chosenSeats >= threshold
                          ? "election-up"
                          : "election-down"
                      }
                    >
                      {chosenSeats === threshold
                        ? l(
                            "Mehrheit genau erreicht",
                            "Majority exactly reached",
                            "Mayoría exacta",
                          )
                        : chosenSeats > threshold
                          ? l(
                              `${chosenSeats - threshold} Sitze über der Mehrheit`,
                              `${chosenSeats - threshold} seats above majority`,
                              `${chosenSeats - threshold} escaños sobre la mayoría`,
                            )
                          : l(
                              `${threshold - chosenSeats} Sitze fehlen`,
                              `${threshold - chosenSeats} seats short`,
                              `Faltan ${threshold - chosenSeats} escaños`,
                            )}
                    </span>
                  </p>
                  {restricted && (
                    <p className="election-poll-note">
                      {restricted === "cdu"
                        ? l(
                            "Diese Auswahl widerspricht dem dokumentierten CDU-Koalitionsausschluss.",
                            "This selection conflicts with the documented CDU coalition exclusion.",
                            "Esta selección contradice la exclusión de coaliciones de la CDU.",
                          )
                        : l(
                            "Rechnerische Kombination mit AfD; keine Aussage über eine politische Einigung.",
                            "Numerical combination including AfD; no claim of political agreement.",
                            "Combinación numérica con AfD; no implica acuerdo político.",
                          )}
                    </p>
                  )}
                  <div className="election-suggestions" data-export-ignore="true"><h3>
                    {l(
                      "Rechnerische Mehrheiten",
                      "Numerical majorities",
                      "Mayorías numéricas",
                    )}
                  </h3>
                  {majorities.every((item) => item.restriction) && (
                    <p className="election-poll-note">
                      {l(
                        "Nach den berücksichtigten Ausschlüssen und Sortierregeln gibt es keine bevorzugte Mehrheit. Alle Kombinationen bleiben prüfbar.",
                        "The recorded exclusions and ordering rules leave no preferred majority. All combinations remain available.",
                        "Las exclusiones y reglas de ordenación no dejan ninguna mayoría preferente. Todas las combinaciones siguen disponibles.",
                      )}
                    </p>
                  )}
                  {[false, true].map((delayed) => {
                    const items = majorities.filter(
                      (item) => Boolean(item.restriction) === delayed,
                    );
                    if (!items.length) return null;
                    const list = (
                      <div className="election-coalitions">
                        {items.map((item) => (
                          <button
                            className="secondary-button"
                            key={item.parties.map((row) => row.name).join("+")}
                            onClick={() =>
                              setSelected(item.parties.map((row) => row.name))
                            }
                          >
                            <span>
                              {item.parties.map((row) => row.name).join(" + ")}
                              {item.restriction === "cdu" && (
                                <small>
                                  {l(
                                        "Koalitionsausschluss",
                                        "Coalition exclusion",
                                        "Coalición excluida",
                                      )}
                                </small>
                              )}
                            </span>
                            <strong>{item.seats}</strong>
                          </button>
                        ))}
                      </div>
                    );
                    return delayed ? (
                      <details
                        className="election-other-majorities"
                        key="other"
                      >
                        <summary>
                          {l(
                            "Weitere rechnerische Kombinationen",
                            "Other numerical combinations",
                            "Otras combinaciones numéricas",
                          )}{" "}
                          ({items.length})
                        </summary>
                        {list}
                      </details>
                    ) : (
                      <React.Fragment key="preferred">{list}</React.Fragment>
                    );
                  })}</div>
                </>
              )}
            </ElectionCard>
            {embed ? <footer className="election-sources election-embed-sources"><a href={SOURCE} target="_blank" rel="noreferrer">Statistisches Landesamt Sachsen-Anhalt · 2026</a>{" · "}<a href="https://www.govdata.de/dl-de/by-2-0" target="_blank" rel="noreferrer">dl-de/by-2-0</a>{embedWidget === "comparison" && baseline === "poll" && <> · <a href="https://dawum.de/API/" target="_blank" rel="noreferrer">DAWUM · ODbL 1.0</a></>}{" · "}<a href={`/?view=election-st2026&lang=${locale}`} target="_blank" rel="noreferrer">Pollframe ↗</a></footer> : <footer className="election-sources">
              <h2>
                {l("Daten und Quellen", "Data and sources", "Datos y fuentes")}
              </h2>
              <p>
                <a href={SOURCE} target="_blank" rel="noreferrer">
                  Statistisches Landesamt Sachsen-Anhalt, Halle (Saale) 2026 ↗
                </a>{" "}
                ·{" "}
                <a
                  href="https://wahlergebnisse.sachsen-anhalt.de/wahlen/lt26/sitze.html"
                  target="_blank"
                  rel="noreferrer"
                >
                  {l("Amtliche Sitze", "Official seats", "Escaños oficiales")}{" "}
                  ↗
                </a>
              </p>
              <p>
                {l(
                  "Eigene Darstellung und berechnete Differenzen",
                  "Own presentation and calculated differences",
                  "Presentación propia y diferencias calculadas",
                )}{" "}
                ·{" "}
                <a
                  href="https://www.govdata.de/dl-de/by-2-0"
                  target="_blank"
                  rel="noreferrer"
                >
                  dl-de/by-2-0
                </a>
              </p>
              <p>
                {l("Umfragedaten", "Poll data", "Datos de encuestas")}:{" "}
                <a
                  href="https://dawum.de/API/"
                  target="_blank"
                  rel="noreferrer"
                >
                  DAWUM
                </a>{" "}
                ·{" "}
                <a
                  href="https://opendatacommons.org/licenses/odbl/1-0/"
                  target="_blank"
                  rel="noreferrer"
                >
                  ODbL 1.0
                </a>{" "}
                ·{" "}
                <a href="/data/sachsen-anhalt.json">
                  {l(
                    "Verwendeter Datenbestand",
                    "Dataset used",
                    "Conjunto de datos utilizado",
                  )}
                </a>
              </p>
              <p>
                {l(
                  "Quellenstand",
                  "Source updated",
                  "Actualización de la fuente",
                )}
                :{" "}
                {new Intl.DateTimeFormat(locale, {
                  dateStyle: "medium",
                  timeStyle: "short",
                  timeZone: "Europe/Berlin",
                }).format(new Date(result.publishedAt))}{" "}
                ({l("Berliner Zeit", "Berlin time", "hora de Berlín")})
              </p>
            </footer>}
          </>
        )}
      </main>
    </>
  );
}
