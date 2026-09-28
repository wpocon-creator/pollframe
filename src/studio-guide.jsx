import React, { lazy, Suspense, useEffect, useState } from "react";
import StudioAnnouncement from "./studio-announcement.jsx";
import "./studio-guide.css";
const GuidePlayer = lazy(() => import("./studio-guide-player.jsx"));
const OPEN_GUIDE = "pollframe-open-studio-guide";
export function openStudioGuide() {
  window.dispatchEvent(new Event(OPEN_GUIDE));
}
export default function StudioGuide({ l, lang }) {
  const [open, setOpen] = useState(() => location.hash === "#studio-guide");
  useEffect(() => {
    const show = () => setOpen(true);
    const hash = () => {
      if (location.hash === "#studio-guide") show();
    };
    window.addEventListener(OPEN_GUIDE, show);
    window.addEventListener("hashchange", hash);
    return () => {
      window.removeEventListener(OPEN_GUIDE, show);
      window.removeEventListener("hashchange", hash);
    };
  }, []);
  return (
    <>
      <StudioAnnouncement
        id="studio-guide-v1"
        action={l("Video ansehen", "Watch the video", "Ver el vídeo")}
        onAction={() => setOpen(true)}
        closeLabel={l(
          "Einführung ausblenden",
          "Dismiss introduction",
          "Ocultar introducción",
        )}
      >
        {l(
          "Neu in Studio?",
          "New to Studio?",
          "¿Primera vez en Studio?",
        )}
      </StudioAnnouncement>
      {open && (
        <Suspense
          fallback={
            <p role="status">
              {l(
                "Video wird vorbereitet…",
                "Preparing video…",
                "Preparando el vídeo…",
              )}
            </p>
          }
        >
          <GuidePlayer
            l={l}
            lang={lang}
            onClose={() => {
              setOpen(false);
              if (location.hash === "#studio-guide")
                history.replaceState(
                  history.state,
                  "",
                  location.pathname + location.search,
                );
            }}
          />
        </Suspense>
      )}
    </>
  );
}
