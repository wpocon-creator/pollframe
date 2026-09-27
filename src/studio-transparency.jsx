import React, { useState } from "react";
import StudioResourceDialog from "./studio-resource-dialog.jsx";
import { transparencyText, safeSourceUrl } from "./studio-transparency.js";
import { saveFile } from "./studio-editor-files.js";
import { publicationCaption } from "./studio-caption.js";
import { pollMethodLabel } from "./poll-method-label.js";
import { openStudioGuide } from "./studio-guide.jsx";
import { publicationSources } from "./studio-publication-policy.js";
export default function StudioTransparency({
  snapshot,
  state,
  template,
  l,
  onClose,
  render,
}) {
  const [status, setStatus] = useState(""),
    [busy, setBusy] = useState(false);
  const paragraphs = transparencyText(snapshot, state, template, l);
  const caption = publicationCaption(snapshot, state, template, l);
  const sources = [
    ...publicationSources(snapshot,state).map(item=>({href:item.url,label:item.label})),
    ...(snapshot.reuse?.termsUrl ? [{href:safeSourceUrl(snapshot.reuse.termsUrl),label:l("Nutzungsbedingungen des Datenanbieters", "Data provider’s reuse terms", "Condiciones de uso del proveedor")}]:[]),
    {
      href: safeSourceUrl(snapshot.sourceLink?.href),
      label: l(
        "Nachweis dieser Messung",
        "Record for this reading",
        "Referencia de esta medición",
      ),
    },
    {
      href: safeSourceUrl(snapshot.sourceUrl),
      label:
        snapshot.source || l("Datenquelle", "Data source", "Fuente de datos"),
    },
  ].filter((s, i, a) => s.href && a.findIndex((x) => x.href === s.href) === i);
  const note = [
    `${l("Beleg erstellt", "Source note created", "Nota creada")}: ${new Date().toISOString()}`,
    ...paragraphs,
    ...sources.map((s) => `${s.label}: ${s.href}`),
    `Pollframe: ${location.href}`,
  ].join("\n\n");
  return (
    <StudioResourceDialog title="Info" l={l} onClose={onClose}>
      <p><button type="button" className="secondary-button" onClick={() => { onClose(); requestAnimationFrame(openStudioGuide); }}>{l("Studio im Video kennenlernen", "Learn Studio in the video", "Descubre Studio en vídeo")} →</button></p>
      <p>{paragraphs[0]}</p>
      <p>
        {sources.map((s) => (
          <React.Fragment key={s.href}>
            <a href={s.href} target="_blank" rel="noreferrer">
              {s.label} ↗
            </a>
            {" · "}
          </React.Fragment>
        ))}
        <a
          href={snapshot.kind === "map" ? `/?view=map&country=de&lang=${state.lang}` : template.topic.startsWith("approval") ? `/?view=approval&country=de&lang=${state.lang}` : `/?region=${encodeURIComponent(state.region || "bundestag")}&lang=${state.lang}`}
          target="_blank"
          rel="noreferrer"
        >
          {l(
            "Umfragen und Methodik auf Pollframe",
            "Polls and methodology on Pollframe",
            "Encuestas y metodología en Pollframe",
          )}{" "}
          ↗
        </a>
      </p>
      {snapshot.kind === "map" && (
        <details>
          <summary>{l("Umfragen je Bundesland", "Polling by state", "Encuestas por estado")}</summary>
          {snapshot.rows.map(row => <p key={row.id}>
            {row.region ? <a href={`/?region=${encodeURIComponent(row.region)}&lang=${state.lang}`} target="_blank" rel="noreferrer">{row.name} ↗</a> : row.name}
            {" · "}{row.date}
          </p>)}
        </details>
      )}
      <p className="studio-publication-caption">{caption}</p>
      <details>
        <summary>{l("Quellen, Methode und Vergleichsgrenzen", "Sources, method and comparison limits", "Fuentes, método y límites de comparación")}</summary>
        {paragraphs.slice(1).map((p, i) => <p key={i}>{p}</p>)}
      </details>
      {snapshot.latestCalculation && (
        <details>
          <summary>
            {!snapshot.calculationInputs ? l('Institutsdurchschnitt nachrechnen','Verify the institute average','Verificar la media por instituto') : l(
              "Institutsdurchschnitt nachrechnen (vor Glättung)",
              "Verify the institute average (before smoothing)",
              "Verificar la media por instituto (antes del suavizado)",
            )}
          </summary>
          <p>
            {snapshot.latestCalculation.date} ·{" "}
            {l(
              "Letzte Umfrage je ausgewähltem Institut innerhalb von 45 Tagen; jedes Institut zählt gleich. Fehlende Parteiwerte werden für die jeweilige Partei nicht eingemittelt.",
              "Latest poll per selected institute within 45 days, with equal institute weight. Missing party values are excluded for that party.",
              "Última encuesta de cada instituto seleccionado en 45 días, con el mismo peso por instituto. Los valores ausentes se excluyen para ese partido.",
            )}
          </p>
          {snapshot.latestCalculation.polls.map((poll) => (
            <p key={poll.pollster}>
              {poll.institute} · {poll.date} · n = {poll.sample || "–"}
              {poll.fieldwork?.length > 0 && <> · {l("Befragung", "Fieldwork", "Trabajo de campo")}: {poll.fieldwork.join(" – ")}</>}
              {poll.method && <> · {pollMethodLabel(poll.method, state.lang)}</>}
            </p>
          ))}
          <p>{l("Die Datei unten enthält die veröffentlichten Parteiwerte, den berechneten Durchschnitt und die tatsächlichen Gewichte je Partei. Bei fehlenden Parteiwerten kann die Zahl der beitragenden Institute abweichen.", "The file below contains published party values, the calculated average and actual weights for each party. Missing party values can change the number of contributing institutes.", "El archivo incluye valores publicados, la media calculada y los pesos por partido. Los valores ausentes pueden cambiar el número de institutos que contribuyen.")}</p>
          <button
            className="secondary-button"
            onClick={() =>
              saveFile(
                JSON.stringify(snapshot.latestCalculation, null, 2),
                "application/json",
                "pollframe-calculation.json",
              )
            }
          >
            {l(
              "Umfragen und Gewichte herunterladen",
              "Download polls and weights",
              "Descargar encuestas y pesos",
            )}
          </button>
        </details>
      )}
      <div className="studio-style-actions">
        <button
          className="secondary-button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(caption);
              setStatus(
                l(
                  "Bildunterschrift kopiert.",
                  "Caption copied.",
                  "Pie de gráfico copiado.",
                ),
              );
            } catch {
              saveFile(
                caption,
                "text/plain;charset=utf-8",
                "pollframe-caption.txt",
              );
            }
          }}
        >
          {l(
            "Bildunterschrift kopieren",
            "Copy caption",
            "Copiar pie de gráfico",
          )}
        </button>
        {render && (
          <button
            className="secondary-button"
            disabled={busy}
            onClick={async () => {
              if (busy) return;
              setBusy(true);
              setStatus(
                l(
                  "Publikationspaket wird erstellt…",
                  "Preparing publication package…",
                  "Preparando el paquete…",
                ),
              );
              try {
                const { publicationPackage } = await import(
                  "./studio-publication-package.js"
                );
                const blob = await publicationPackage({
                  snapshot,
                  state,
                  note,
                  caption,
                  render,
                });
                const url = URL.createObjectURL(blob),
                  a = document.createElement("a");
                a.href = url;
                a.download = "pollframe-publication.zip";
                a.click();
                setTimeout(() => URL.revokeObjectURL(url), 60000);
                setStatus(
                  l(
                    "Paket heruntergeladen: PNG, Daten, Einstellungen und Quellenbeleg.",
                    "Downloaded PNG, data, settings and source receipt.",
                    "PNG, datos, ajustes y fuentes descargados.",
                  ),
                );
              } catch {
                setStatus(
                  l(
                    "Das Paket konnte nicht erstellt werden. Bitte erneut versuchen.",
                    "Could not create the package. Please retry.",
                    "No se pudo crear el paquete. Inténtalo de nuevo.",
                  ),
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            {l(
              "Publikationspaket herunterladen",
              "Download publication package",
              "Descargar paquete de publicación",
            )}
          </button>
        )}
        <button
          className="secondary-button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(note);
              setStatus(
                l(
                  "Quellen und Methodik kopiert.",
                  "Sources and methodology copied.",
                  "Fuentes y metodología copiadas.",
                ),
              );
            } catch {
              setStatus(
                l(
                  "Kopieren nicht möglich. Lade stattdessen den Beleg herunter.",
                  "Could not copy. Download the source note instead.",
                  "No se pudo copiar. Descarga la nota de fuentes.",
                ),
              );
            }
          }}
        >
          {l(
            "Quellenbeleg kopieren",
            "Copy source note",
            "Copiar nota de fuentes",
          )}
        </button>
        <button
          className="secondary-button"
          onClick={() =>
            saveFile(
              note,
              "text/plain;charset=utf-8",
              `pollframe-sources-${snapshot.date || "undated"}.txt`,
            )
          }
        >
          {l(
            "Beleg herunterladen",
            "Download source note",
            "Descargar nota de fuentes",
          )}
        </button>
      </div>
      <p role="status">{status}</p>
    </StudioResourceDialog>
  );
}
