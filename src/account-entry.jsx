import React, { lazy, Suspense, useEffect, useRef, useState } from "react";
import "./account-entry.css";
import "./account-session-events.js";
import { takeAccountRequest } from "./account-request.js";
import { SITE_ORIGIN, TEST_SITE_ORIGIN } from "./site-origin.js";
import {
  pendingAccountRecovery,
  clearAccountRecovery,
} from "./account-recovery.js";
const Account = lazy(() => import("./studio-account-lab.jsx"));

export default function AccountEntry({ locale = "de" }) {
  const needsCanonical =
    location.origin !== SITE_ORIGIN &&
    !(
      import.meta.env.VITE_TEST_DEPLOYMENT === "true" &&
      location.origin === TEST_SITE_ORIGIN
    ) &&
    !["localhost", "127.0.0.1", "[::1]"].includes(location.hostname);
  const query = new URLSearchParams(location.search);
  const recovery =
    pendingAccountRecovery() ||
    (query.get("account") === "reset"
      ? { token: query.get("token") || "" }
      : null);
  const [recoveryToken, setRecoveryToken] = useState(recovery?.token || "");
  const [recoveryError, setRecoveryError] = useState(
    Boolean(recovery?.invalid),
  );
  const [opened, setOpened] = useState(Boolean(recovery));
  const wasOpened = useRef(false);
  useEffect(() => {
    if (wasOpened.current && !opened)
      window.dispatchEvent(new Event("pollframe-account-dialog-closed"));
    wasOpened.current = opened;
  }, [opened]);
  const [purpose, setPurpose] = useState(null);
  useEffect(() => {
    const requested = (event) => {
      takeAccountRequest();
      setPurpose(event.detail?.purpose || null);
      setOpened(true);
    };
    window.addEventListener("pollframe:request-account", requested);
    const pending = takeAccountRequest();
    if (pending) requested({ detail: pending });
    return () =>
      window.removeEventListener("pollframe:request-account", requested);
  }, []);
  // Keep the memory-only handoff until the dialog is actually closed. A header
  // can remount during responsive/Studio hydration before its lazy dialog is
  // ready; clearing on mount silently lost valid reset links in mobile WebKit.
  const [signedIn, setSignedIn] = useState(false);
  const sessionOwner = useRef(undefined);
  useEffect(() => {
    if (needsCanonical) return;
    let active = true,
      changedSinceStart = false;
    const changed = (event) => {
      changedSinceStart = true;
      if (active && !event.detail?.remote) {
        setSignedIn(event.detail?.signedIn === true);
        sessionOwner.current = event.detail?.userId || null;
      }
      if (event.detail?.remote) {
        fetch("/api/auth/get-session", {
          credentials: "same-origin",
          cache: "no-store",
          signal: controller.signal,
        })
          .then((r) => (r.ok ? r.json() : null))
          .then((session) => {
            if (active) {
              const owner = session?.user?.emailVerified
                ? session.user.id
                : null;
              // Merely opening an account elsewhere is not a sign-out. In
              // particular, a late message from Safari's previous document
              // must not dismiss an unrelated password-recovery dialog.
              if (
                sessionOwner.current !== undefined &&
                sessionOwner.current !== owner &&
                !recoveryToken
              )
                setOpened(false);
              sessionOwner.current = owner;
              setSignedIn(Boolean(owner));
            }
          })
          .catch(() => {});
      }
    };
    window.addEventListener("pollframe-account-changed", changed);
    const controller = new AbortController();
    fetch("/api/auth/get-session", {
      credentials: "same-origin",
      cache: "no-store",
      signal: controller.signal,
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((session) => {
        if (active && !changedSinceStart) {
          setSignedIn(session?.user?.emailVerified === true);
          sessionOwner.current = session?.user?.emailVerified
            ? session.user.id
            : null;
        }
      })
      .catch(() => {});
    return () => {
      active = false;
      controller.abort();
      window.removeEventListener("pollframe-account-changed", changed);
    };
  }, []);
  const l = (de, en, es) => (locale === "de" ? de : locale === "es" ? es : en);
  const open = (item) => {
    const params = new URLSearchParams({ view: "studio", editor: "1" });
    // The destination normalizes its recipe. Do not pull Studio's entire
    // validation graph into the shared country-page header.
    for (const [key, value] of Object.entries(item.state || {}))
      if (
        value != null &&
        ["string", "number", "boolean"].includes(typeof value)
      )
        params.set(key, String(value));
    params.set("view", "studio");
    params.set("editor", "1");
    params.set("workspace", "preview");
    location.assign(`/?${params}`);
  };
  return (
    <>
      <span className="account-entry-group">
        <button
          className="header-button account-entry"
          title={l("Konto", "Account", "Cuenta")}
          aria-haspopup="dialog"
          onClick={() => {
            if (needsCanonical) {
              location.assign(
                `${SITE_ORIGIN}/?view=studio&account=sign-in&lang=${encodeURIComponent(locale)}`,
              );
              return;
            }
            setOpened(true);
          }}
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            aria-hidden="true"
          >
            <circle cx="12" cy="8" r="3.3" />
            <path d="M5 21v-2a7 7 0 0 1 14 0v2" />
          </svg>
          <span>
            {signedIn
              ? l("Mein Konto", "My account", "Mi cuenta")
              : l("Anmelden", "Sign in", "Acceder")}
          </span>
        </button>
      </span>
      {opened && (
        <Suspense fallback={null}>
          <Account
            locale={locale}
            purpose={purpose}
            l={l}
            open={open}
            initialResetToken={recoveryToken}
            initialRecoveryError={recoveryError}
            onClose={() => {
              clearAccountRecovery();
              setRecoveryToken("");
              setRecoveryError(false);
              setOpened(false);
            }}
          />
        </Suspense>
      )}
    </>
  );
}
