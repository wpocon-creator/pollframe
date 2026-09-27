import React, {lazy, Suspense, useState} from "react";
const Account = lazy(() => import("./studio-account-lab.jsx"));

export default function AccountEntry({locale = "de"}) {
  // Capture before Studio normalizes the URL, not after the lazy dialog loads.
  const [recoveryToken,setRecoveryToken] = useState(() => new URLSearchParams(location.search).get("account") === "reset" ? new URLSearchParams(location.search).get("token") || "" : "");
  const [opened, setOpened] = useState(() => new URLSearchParams(location.search).get("account") === "reset");
  const l = (de,en,es) => locale === "de" ? de : locale === "es" ? es : en;
  const open = item => {
    const params = new URLSearchParams({view:"studio",editor:"1"});
    // The destination normalizes its recipe. Do not pull Studio's entire
    // validation graph into the shared country-page header.
    for(const [key,value] of Object.entries(item.state || {})) if(value != null && ['string','number','boolean'].includes(typeof value)) params.set(key,String(value));
    params.set('view','studio');params.set('editor','1');params.set('workspace','preview');
    location.assign(`/?${params}`);
  };
  return <>
    <button className="header-button account-entry" aria-label={l("Konto", "Account", "Cuenta")} onClick={() => setOpened(true)}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="12" cy="8" r="3.3"/><path d="M5 21v-2a7 7 0 0 1 14 0v2"/></svg>
      <span>{l("Anmelden", "Sign in", "Acceder")}</span>
    </button>
    {opened && <Suspense fallback={null}><Account l={l} open={open} initialResetToken={recoveryToken} onClose={() => {setRecoveryToken("");setOpened(false);}}/></Suspense>}
  </>;
}
