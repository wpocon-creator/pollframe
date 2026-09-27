import { useCallback, useEffect, useRef, useState } from "react";
import { trackAggregateEvent, trackAggregateEventOnce } from "./aggregateAnalytics.js";

const UPDATE_CHECK_INTERVAL = 60 * 60 * 1000;
const DATA_REFRESH_AFTER = 5 * 60 * 1000;
let serviceWorkerPolicy;

function trustedServiceWorkerUrl(path) {
  if (!window.trustedTypes) return path;
  serviceWorkerPolicy ??= window.trustedTypes.createPolicy("pollframe-sw", {
    createScriptURL: (value) => value,
  });
  return serviceWorkerPolicy.createScriptURL(path);
}

function standaloneDisplay() {
  return window.matchMedia?.("(display-mode: standalone)").matches
    || window.navigator.standalone === true;
}

function iosBrowser() {
  return /iPad|iPhone|iPod/.test(window.navigator.userAgent)
    || (window.navigator.platform === "MacIntel" && window.navigator.maxTouchPoints > 1);
}

export function usePwaLifecycle({ disabled = false } = {}) {
  const [installPrompt, setInstallPrompt] = useState(null);
  const [installed, setInstalled] = useState(() => standaloneDisplay());
  const [online, setOnline] = useState(() => window.navigator.onLine);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [showIosInstructions, setShowIosInstructions] = useState(false);
  const [usedCachedData, setUsedCachedData] = useState(false);
  const [dataRefreshVersion, setDataRefreshVersion] = useState(0);
  const registrationRef = useRef(null);
  const reloadForUpdateRef = useRef(false);
  const controlledAtMountRef = useRef(Boolean(window.navigator.serviceWorker?.controller));
  const reloadStartedRef = useRef(false);
  const hiddenAtRef = useRef(null);
  const completedInstallTrackedRef = useRef(false);
  const isIos = iosBrowser();

  useEffect(() => {
    if (disabled) return undefined;
    const displayMode = window.matchMedia?.("(display-mode: standalone)");
    const updateInstalled = () => setInstalled(standaloneDisplay());
    const capturePrompt = (event) => {
      event.preventDefault();
      setInstallPrompt(event);
    };
    const markInstalled = () => {
      setInstalled(true);
      setInstallPrompt(null);
      setShowIosInstructions(false);
      if (!completedInstallTrackedRef.current) {
        completedInstallTrackedRef.current = true;
        trackAggregateEvent("install_completed");
      }
    };
    window.addEventListener("beforeinstallprompt", capturePrompt);
    window.addEventListener("appinstalled", markInstalled);
    displayMode?.addEventListener?.("change", updateInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", capturePrompt);
      window.removeEventListener("appinstalled", markInstalled);
      displayMode?.removeEventListener?.("change", updateInstalled);
    };
  }, [disabled]);

  useEffect(() => {
    if (disabled) return undefined;
    const wentOnline = () => {
      setOnline(true);
      setUsedCachedData(false);
      registrationRef.current?.update().catch(() => {});
    };
    const wentOffline = () => setOnline(false);
    window.addEventListener("online", wentOnline);
    window.addEventListener("offline", wentOffline);
    return () => {
      window.removeEventListener("online", wentOnline);
      window.removeEventListener("offline", wentOffline);
    };
  }, [disabled]);

  useEffect(() => {
    if (disabled || !import.meta.env.PROD || !("serviceWorker" in window.navigator)) return undefined;
    // Studio previews are repeatedly rebuilt with new chunk hashes. An offline
    // worker here can retain an incompatible shell and trigger update reloads.
    if (["localhost", "127.0.0.1", "[::1]"].includes(location.hostname) && new URLSearchParams(location.search).get("view") === "studio") {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        for (const registration of registrations) {
          const script = registration.active?.scriptURL || registration.waiting?.scriptURL || registration.installing?.scriptURL;
          if (script === `${location.origin}/sw.js`) registration.unregister();
        }
      }).catch(() => {});
      return undefined;
    }
    let disposed = false;
    let updateTimer;

    const activateWaitingUpdate = (registration) => {
      if (!registration?.waiting || !window.navigator.serviceWorker.controller) return;
      setUpdateAvailable(true);
      reloadForUpdateRef.current = true;
      registration.waiting.postMessage({ type: "SKIP_WAITING" });
    };

    const inspectRegistration = (registration) => {
      if (!registration) return;
      activateWaitingUpdate(registration);
      registration.addEventListener("updatefound", () => {
        const worker = registration.installing;
        worker?.addEventListener("statechange", () => {
          if (worker.state === "installed") activateWaitingUpdate(registration);
        });
      });
    };

    window.navigator.serviceWorker.register(trustedServiceWorkerUrl("/sw.js"), { scope: "/", updateViaCache: "none" })
      .then((registration) => {
        // Browsers or managed environments may expose the API while blocking
        // registration. Treat that as an unavailable optional feature.
        if (disposed || !registration) return;
        registrationRef.current = registration;
        inspectRegistration(registration);
        registration.update().catch(() => {});
        // Normal website visits cache viewed data on demand. The installed app
        // prepares its complete offline dataset in the separate effect below;
        // do not also download all state files twice during page startup.
        updateTimer = window.setInterval(() => registration.update().catch(() => {}), UPDATE_CHECK_INTERVAL);
      })
      .catch((error) => console.error("Pollframe app registration failed", error));

    const handleMessage = (event) => {
      if (event.data?.type === "POLLFRAME_CACHED_DATA") setUsedCachedData(true);
    };
    const handleControllerChange = () => {
      if (!controlledAtMountRef.current) {
        controlledAtMountRef.current = true;
        return;
      }
      if (!reloadStartedRef.current) {
        reloadStartedRef.current = true;
        window.location.reload();
      }
    };
    const checkWhenVisible = () => {
      if (document.visibilityState === "hidden") {
        hiddenAtRef.current = Date.now();
        return;
      }
      registrationRef.current?.update().catch(() => {});
      if (window.navigator.onLine && hiddenAtRef.current && Date.now() - hiddenAtRef.current >= DATA_REFRESH_AFTER) {
        setDataRefreshVersion((version) => version + 1);
      }
      hiddenAtRef.current = null;
    };
    window.navigator.serviceWorker.addEventListener("message", handleMessage);
    window.navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange);
    document.addEventListener("visibilitychange", checkWhenVisible);
    return () => {
      disposed = true;
      if (updateTimer) window.clearInterval(updateTimer);
      window.navigator.serviceWorker.removeEventListener("message", handleMessage);
      window.navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange);
      document.removeEventListener("visibilitychange", checkWhenVisible);
    };
  }, [disabled]);

  useEffect(() => {
    if (disabled || !installed || !import.meta.env.PROD || !("serviceWorker" in window.navigator)) return undefined;
    let disposed = false;
    window.navigator.serviceWorker.ready.then((registration) => {
      if (!disposed) registration.active?.postMessage({ type: "PREFETCH_OFFLINE_APP" });
    }).catch(() => {});
    return () => { disposed = true; };
  }, [disabled, installed]);

  useEffect(() => {
    document.documentElement.dataset.standalone = installed ? "true" : "false";
    if (installed) trackAggregateEventOnce("app_opened_standalone");
    return () => { delete document.documentElement.dataset.standalone; };
  }, [installed]);

  const requestInstall = useCallback(async () => {
    if (installed) return "installed";
    if (installPrompt) {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice.catch(() => ({ outcome: "dismissed" }));
      if (choice.outcome === "accepted") {
        setInstallPrompt(null);
        trackAggregateEvent("install_prompt_accepted");
      }
      return choice.outcome;
    }
    if (isIos) {
      setShowIosInstructions(true);
      trackAggregateEvent("ios_install_instructions_opened");
      return "instructions";
    }
    return "unavailable";
  }, [installPrompt, installed, isIos]);

  const applyUpdate = useCallback(() => {
    const waiting = registrationRef.current?.waiting;
    if (!waiting) return;
    reloadForUpdateRef.current = true;
    waiting.postMessage({ type: "SKIP_WAITING" });
  }, []);

  return {
    installed,
    online,
    updateAvailable,
    usedCachedData,
    isIos,
    canInstall: !installed && Boolean(installPrompt || isIos),
    showIosInstructions,
    setShowIosInstructions,
    requestInstall,
    applyUpdate,
    dataRefreshVersion,
  };
}
