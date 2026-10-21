import React, { useState } from "react";

// Keep recovery independent of Studio data/thumbnail hydration. Closing the
// account dialog hands control back to the requested route in AppRouter.
export default function AccountLanding({ Header }) {
  const [locale, setLocale] = useState(() => {
    const value = new URLSearchParams(location.search).get("lang");
    return ["de", "en-GB", "en-US", "es"].includes(value) ? value : "de";
  });
  return <><Header locale={locale} setLocale={setLocale} /><main className="account-landing"><h1>{locale === "de" ? "Dein Pollframe-Konto" : locale === "es" ? "Tu cuenta de Pollframe" : "Your Pollframe account"}</h1></main></>;
}
