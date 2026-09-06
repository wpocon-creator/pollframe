import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { PARTY_PROFILE_KEYS } from "./party-profile-index.js";

export function PartyInfoModalHost({ locale }) {
  const [selected, setSelected] = useState(null);
  const [Content, setContent] = useState(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const trigger = useRef(null);
  const close = () => {
    setSelected(null);
    requestAnimationFrame(() => trigger.current?.focus?.());
  };
  useEffect(() => {
    const open = (event) => { trigger.current = document.activeElement; setError(false); setSelected(event.detail); };
    window.addEventListener("pollframe:party-profile", open);
    return () => window.removeEventListener("pollframe:party-profile", open);
  }, []);
  useEffect(() => {
    if (!selected || Content) return undefined;
    let active = true;
    setError(false);
    import("./party-profile-content.jsx").then((module) => {
      if (active) setContent(() => module.default);
    }).catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, [selected, Content, attempt]);
  useEffect(() => {
    if (!selected || Content) return undefined;
    const keyDown = (event) => { if (event.key === "Escape") close(); };
    document.addEventListener("keydown", keyDown);
    return () => document.removeEventListener("keydown", keyDown);
  }, [selected, Content]);
  if (!selected) return null;
  if (Content) return <Content selected={selected} locale={locale} onClose={close} />;
  const label = (de, en, es) => locale === "de" ? de : locale === "es" ? es : en;
  return createPortal(<div className="overlay modal-overlay party-profile-overlay">
    <section className="party-profile-modal" role="dialog" aria-modal="true" aria-label={selected.party.name}>
      <p role="status">{error ? label("Das Porträt konnte nicht geladen werden.", "The portrait could not be loaded.", "No se pudo cargar el perfil.") : label("Parteiporträt wird geladen …", "Loading party portrait …", "Cargando el perfil …")}</p>
      {error && <button type="button" className="secondary-button" onClick={() => setAttempt((value) => value + 1)}>{label("Erneut versuchen", "Try again", "Reintentar")}</button>}
      <button type="button" className="secondary-button" autoFocus onClick={close}>{label("Schließen", "Close", "Cerrar")}</button>
    </section>
  </div>, document.body);
}

function inferredCountry(party) {
  const id = Number(party?.id);
  if (id >= 400) return "es";
  if (id >= 200) return "uk";
  return "de";
}

export function regionalSpainPartyProfile(party, electionSource) {
  if (!party || !electionSource) return null;
  return { fullName: party.name, founded: null, scope: "regionalSpain", policies: [], programmeYear: null, sources: [{ type: "election", url: electionSource }], relation: null, status: "regional" };
}

export function PartyInfoButton({ party, country = inferredCountry(party), children, className = "", includeDot = false, as = "button", fallbackProfile = null }) {
  const profile = PARTY_PROFILE_KEYS[country]?.includes(party?.slug) || fallbackProfile;
  if (!party || !profile) return children ?? party?.name ?? null;
  const open = (event) => {
    event.preventDefault();
    event.stopPropagation();
    window.dispatchEvent(new CustomEvent("pollframe:party-profile", { detail: { party, country, fallbackProfile } }));
  };
  const keyDown = (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    open(event);
  };
  const Tag = as;
  return <Tag type={as === "button" ? "button" : undefined} className={`party-info-trigger ${className}`.trim()} role={as === "button" ? undefined : "button"} tabIndex={as === "button" ? undefined : 0} onClick={open} onKeyDown={as === "button" ? undefined : keyDown} data-party-profile={`${country}:${party.slug ?? party.id}`}>{includeDot && <i aria-hidden="true" style={{ background: party.color }} />}{children ?? party.name}</Tag>;
}
