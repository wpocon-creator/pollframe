import React, { useState } from "react";
import StudioSelect from "./studio-select.jsx";
import { MatchInfo } from "./party-match-info.jsx";
import {
  MATCH_AXES,
  SPECTRUM_COPY,
  politicalProfile,
} from "./party-match-spectrum.js";
import { localText, text as t } from "./party-match-text.js";

// Small multiples: one concept per horizontal scale. Separate marker rows avoid
// overlap even when the user and party are at precisely the same endpoint.
export default function PolicyProfile({
  answers,
  questions,
  parties,
  locale,
  c,
  onDesign,
}) {
  const [compare, setCompare] = useState("none");
  const [dimensions, setDimensions] = useState(["economy", "society"]);
  const l = (v) => localText(v, locale),
    profile = politicalProfile(
      answers,
      questions,
      compare === "none" ? null : compare,
    );
  const party = parties.find((p) => p.slug === compare);
  const named = (id) => MATCH_AXES.find((a) => a.id === id);
  const change = (slot, value) =>
    setDimensions((old) =>
      old.map((id, i) => (i === slot ? value : id === value ? old[slot] : id)),
    );
  return (
    <section className="pm-policy-profile pm-result-section">
      <header className="pm-view-heading">
        <div className="pm-context-heading">
          <h2>
            {l(
              t(
                "Dein politisches Profil",
                "Your policy profile",
                "Tu perfil político",
              ),
            )}
          </h2>
          <MatchInfo c={c}>
            <p>
              {l(
                t(
                  "Jede Skala zeigt nur eine Dimension. Du kannst beide getrennt auswählen. Die Markierungen fassen deine Antworten auf die unten genannten Fragen zusammen; sie sind keine Übereinstimmungs-Prozente und kein wissenschaftlich validierter Persönlichkeitstest. Eine Skala erscheint erst ab drei beantworteten Fragen. Beim Vergleich werden für beide dieselben mindestens drei Fragen mit belegten Parteipositionen verwendet. Deshalb kann deine Markierung beim Wechsel der Partei mitwandern.",
                  "Each scale shows one dimension, and you can choose both independently. Markers summarise answers to the questions listed below: they are not agreement percentages or a scientifically validated personality test. A scale appears only after three answered questions. Comparisons use the same three or more questions with documented party positions for both of you, so your marker may change when you switch parties.",
                  "Cada escala muestra una dimensión y puedes elegir ambas por separado. Las marcas resumen las respuestas a las preguntas indicadas: no son porcentajes de coincidencia ni un test de personalidad validado. Se requieren al menos tres respuestas. Para comparar se usan las mismas tres o más preguntas con posturas documentadas para ambos; por eso tu marca puede cambiar al elegir otro partido.",
                ),
              )}
            </p>
            <p>{l(SPECTRUM_COPY.info)}</p>
          </MatchInfo>
        </div>
        <div className="pm-select-field">
          <span>{c("selectedParty")}</span>
          <StudioSelect
            aria-label={c("selectedParty")}
            value={compare}
            onChange={(e) => setCompare(e.target.value)}
          >
            <option value="none">{l(SPECTRUM_COPY.onlyMe)}</option>
            {parties.map((p) => (
              <option key={p.slug} value={p.slug}>
                {p.name}
              </option>
            ))}
          </StudioSelect>
        </div>
      </header>
      <div className="pm-profile-cards">
        {dimensions.map((id, slot) => {
          const axis = profile.axes.find((a) => a.id === id),
            meta = named(id);
          return (
            <article className="pm-profile-card" key={slot} data-dimension={id}>
              <div className="pm-profile-card-heading">
                <span className="pm-sr-only">
                  {l(t("Dimension", "Dimension", "Dimensión"))} {slot + 1}
                </span>
                <StudioSelect
                  aria-label={`${l(t("Dimension", "Dimension", "Dimensión"))} ${slot + 1}`}
                  value={id}
                  onChange={(e) => change(slot, e.target.value)}
                >
                  {MATCH_AXES.map((a) => (
                    <option key={a.id} value={a.id}>
                      {l(a.name)}
                    </option>
                  ))}
                </StudioSelect>
              </div>
              {axis.user === null ? (
                <p className="pm-profile-insufficient">
                  {l(SPECTRUM_COPY.tooFew)}
                </p>
              ) : (
                <>
                  <div className="pm-profile-endpoints">
                    <strong>{l(meta.low)}</strong>
                    <strong>{l(meta.high)}</strong>
                  </div>
                  {[
                    {
                      name: l(SPECTRUM_COPY.you),
                      value: axis.user,
                      person: true,
                    },
                    ...(party
                      ? [
                          {
                            name: party.name,
                            value: axis.partyScore,
                            person: false,
                          },
                        ]
                      : []),
                  ].map((row) => (
                    <div className="pm-profile-person" key={row.name}>
                      <span>{row.name}</span>
                      <div
                        className="pm-profile-rail"
                        role="img"
                        aria-label={`${row.name}: ${l(meta.low)} — ${l(meta.high)}; ${Math.round(row.value)} / 100`}
                      >
                        <span className="pm-profile-mid" />
                        <i
                          className={row.person ? "is-user" : "is-party"}
                          style={{
                            left: `${row.value}%`,
                            background: row.person
                              ? "var(--accent)"
                              : party.slug === "union"
                                ? "var(--ink)"
                                : party.color,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                  <small className="pm-profile-count">
                    {axis.count} {c("questions")}
                  </small>
                  <MatchInfo c={c}>
                    <p>{l(SPECTRUM_COPY.info)}</p>
                    <ul>
                      {axis.questionIds.map((qid) => (
                        <li key={qid}>
                          {localText(
                            questions.find((q) => q.id === qid).title,
                            locale,
                          )}{" "}
                          → {l(meta.items[qid] === 1 ? meta.high : meta.low)}
                        </li>
                      ))}
                    </ul>
                  </MatchInfo>
                </>
              )}
            </article>
          );
        })}
      </div>
      <button
        className="pm-secondary pm-small-action"
        data-wahlframe-studio-entry="true"
        onClick={() =>
          onDesign("spectrum", compare, "spd", {
            style: "spectrum-profile",
            spectrumX: dimensions[0],
            spectrumY: dimensions[1],
          })
        }
      >
        {c("openStudio")}
      </button>
    </section>
  );
}
