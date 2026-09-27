import { useEffect, useState } from "react";

let dictionary;
let uiDictionary;
let pending;
export function loadSpanishLocale() {
  if (dictionary) return Promise.resolve(dictionary);
  if (!pending) pending = Promise.all(["spanish-events", "spanish-ui"].map((file) => fetch(`/data/${file}.json`)
    .then((response) => {
      if (!response.ok) throw new Error("Spanish translations unavailable");
      return response.json();
    })))
    .then(([events, ui]) => { dictionary = events; uiDictionary = ui; return events; })
    .catch((error) => { pending = null; throw error; });
  return pending;
}

export function useSpanishLocale(locale) {
  const [status, setStatus] = useState(dictionary ? "ready" : "loading");
  useEffect(() => {
    if (locale !== "es") return;
    let active = true;
    setStatus(dictionary ? "ready" : "loading");
    loadSpanishLocale().then(
      () => { if (active) setStatus("ready"); },
      () => { if (active) setStatus("error"); },
    );
    return () => { active = false; };
  }, [locale]);
  return locale === "es" ? status : "ready";
}

export function spanishEvent(event) {
  if (event.es && event.detailEs) return event;
  const entry = dictionary?.[event.id];
  if (entry) return { ...event, es: entry[0], shortEs: entry[0], detailEs: entry[1] };
  if (event.id.startsWith("uk-election-")) return {
    ...event, es: `Elecciones generales de ${event.date.slice(0, 4)}`,
    shortEs: `Elecciones de ${event.date.slice(0, 4)}`,
    detailEs: "Elecciones a la Cámara de los Comunes. El resultado también se muestra en el gráfico con un rombo.",
  };
  return event;
}

export function spanishSection(key) { return dictionary?.[key]; }
export function spanishText(locale, text) { return locale === "es" ? uiDictionary?.[text] ?? text : text; }
