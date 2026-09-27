import React, { useEffect, useRef, useState } from "react";
import Dialog from "./studio-resource-dialog.jsx";
import film from "./studio-guide-content.json";

export default function StudioGuidePlayer({ l, lang, onClose }) {
  const video = useRef(null);
  const [error, setError] = useState(false);
  const [paused, setPaused] = useState(true);
  const [transportVisible, setTransportVisible] = useState(false);
  const transportTimer = useRef(0);
  const pendingSeek = useRef(null);
  useEffect(() => () => clearTimeout(transportTimer.current), []);
  const revealTransport = () => {
    setTransportVisible(true);
    clearTimeout(transportTimer.current);
    transportTimer.current = setTimeout(() => setTransportVisible(false), 2400);
  };
  const [chapter, setChapter] = useState(0);
  const locale = lang === "de" ? "de" : lang === "es" ? "es" : "en";
  // Subtitles are available in the native player, but off until requested.
  const audioLanguage = "en";
  const videoSource = "/media/studio-guide/pollframe-studio.mp4?v=film4";
  useEffect(() => {
    const element = video.current;
    pendingSeek.current = null;
    setPaused(true);
    setChapter(0);
    return () => element?.pause();
  }, [audioLanguage]);
  const label = (item) => (locale === "de" ? item.title : item[locale]);
  function seek(time) {
    const element = video.current;
    if (!element) return;
    const target = Math.max(
      0,
      Math.min(
        Number.isFinite(element.duration) ? element.duration : film.duration,
        time,
      ),
    );
    if (element.readyState >= 1) element.currentTime = target;
    else {
      pendingSeek.current = target;
      if (element.networkState !== HTMLMediaElement.NETWORK_LOADING)
        element.load();
    }
  }
  return (
    <Dialog
      title={l("Studio kennenlernen", "Meet Studio", "Descubre Studio")}
      l={l}
      onClose={onClose}
      wide
      className="studio-guide-dialog"
    >
      <div
        className={`studio-guide-screen${paused ? " is-paused" : ""}${transportVisible ? " has-transport" : ""}`}
        onPointerMove={revealTransport}
        onPointerLeave={() => setTransportVisible(false)}
      >
        <video
          key={audioLanguage}
          ref={video}
          className="studio-guide-video"
          controls
          playsInline
          preload="none"
          onPlay={() => setPaused(false)}
          onPause={() => setPaused(true)}
          onLoadedMetadata={(event) => {
            setError(false);
            if (pendingSeek.current !== null) {
              event.currentTarget.currentTime = Math.min(
                event.currentTarget.duration,
                pendingSeek.current,
              );
              pendingSeek.current = null;
            }
          }}
          poster="/media/studio-guide/poster.jpg?v=film4"
          src={videoSource}
          onError={() => setError(true)}
          onTimeUpdate={(event) => {
            setChapter(
              Math.max(
                0,
                film.scenes.findLastIndex(
                  (item) => item.start <= event.currentTarget.currentTime,
                ),
              ),
            );
          }}
          aria-label={l(
            "Studio: von der Vorlage zur Veröffentlichung",
            "Studio: from template to publication",
            "Studio: de la plantilla a la publicación",
          )}
        >
          {[
            ["de", "Deutsch"],
            ["en", "English"],
            ["es", "Español"],
          ].map(([code, name]) => (
            <track
              key={code}
              kind="subtitles"
              src={`/media/studio-guide/${code}-on-${audioLanguage}.vtt?v=film4`}
              srcLang={code}
              label={name}
            />
          ))}
          {l(
            "Dein Browser unterstützt dieses Video nicht.",
            "Your browser does not support this video.",
            "Tu navegador no admite este vídeo.",
          )}
        </video>
        <div className="studio-guide-transport">
          <button
            type="button"
            onClick={() => seek((video.current?.currentTime || 0) - 15)}
            aria-label={l(
              "15 Sekunden zurück",
              "Back 15 seconds",
              "Retroceder 15 segundos",
            )}
          >
            <svg viewBox="0 0 36 36" aria-hidden="true">
              <path d="M8 10a13 13 0 1 1-2 16M8 4v7H1" />
              <text x="18" y="24">
                15
              </text>
            </svg>
          </button>
          <button
            type="button"
            className="studio-guide-play"
            aria-label={
              paused
                ? l("Video abspielen", "Play video", "Reproducir vídeo")
                : l("Video pausieren", "Pause video", "Pausar vídeo")
            }
            onClick={() => {
              if (video.current?.paused)
                video.current.play().catch(() => setError(true));
              else video.current?.pause();
            }}
          >
            <svg viewBox="0 0 36 36" aria-hidden="true">
              {paused ? (
                <path
                  d="M12 7 29 18 12 29Z"
                  fill="currentColor"
                  stroke="none"
                />
              ) : (
                <path d="M12 9v18M24 9v18" strokeWidth="6" />
              )}
            </svg>
          </button>
          <button
            type="button"
            onClick={() => seek((video.current?.currentTime || 0) + 15)}
            aria-label={l(
              "15 Sekunden vor",
              "Forward 15 seconds",
              "Avanzar 15 segundos",
            )}
          >
            <svg viewBox="0 0 36 36" aria-hidden="true">
              <path d="M28 10a13 13 0 1 0 2 16M28 4v7h7" />
              <text x="18" y="24">
                15
              </text>
            </svg>
          </button>
        </div>
      </div>
      {error && (
        <p role="alert">
          {l(
            "Das Video konnte nicht geladen werden. Versuche den direkten Videolink oder lies das Transkript unten.",
            "The video could not load. Try the direct video link or read the transcript below.",
            "No se pudo cargar el vídeo. Prueba el enlace directo o lee la transcripción de abajo.",
          )}
        </p>
      )}
      <p className="studio-guide-credit">
        {l(
          "Mit Unterstützung von KI erstellt.",
          "Created with AI assistance.",
          "Creado con ayuda de IA.",
        )}
      </p>
      <p className="studio-guide-context">
        {l(
          "Englischer Desktop-Ablauf · Untertitel: DE / EN / ES. Aufnahme vom 26. September 2026, gekürzt; die Umfragedaten sind kein Live-Stand.",
          "English desktop workflow · DE / EN / ES subtitles. Recorded 26 September 2026; edited for clarity. Poll values are not live data.",
          "Editor de escritorio en inglés · Subtítulos: DE / EN / ES. Grabado el 26 de septiembre de 2026 y editado. Las encuestas no son datos en directo.",
        )}
      </p>
      <nav
        className="studio-guide-chapters"
        aria-label={l("Kapitel", "Chapters", "Capítulos")}
      >
        {film.scenes.map((item, index) => (
          <button
            type="button"
            key={item.id}
            aria-current={index === chapter ? "step" : undefined}
            onClick={() => seek(item.start)}
          >
            <time>
              {Math.floor(item.start / 60)}:
              {String(Math.floor(item.start % 60)).padStart(2, "0")}
            </time>{" "}
            {label(item)}
          </button>
        ))}
      </nav>
      <details>
        <summary>
          {l(
            "Transkript & Produktion",
            "Transcript & production",
            "Transcripción y producción",
          )}
        </summary>
        <p>
          <a href={videoSource} download>
            {l("Video herunterladen", "Download video", "Descargar vídeo")}
          </a>
        </p>
        {film.scenes.map((item) => (
          <section key={item.id}>
            <h3>{label(item)}</h3>
            <p>{item.transcript[locale]}</p>
          </section>
        ))}
        <p>
          {l(
            "Echte lokale Studio-Aufnahmen, eigene Animation und Intro-/Outro-Musik. Synthetische Erzählstimme: Pocket TTS von Kyutai (Software: MIT; Modell und Alba-Stimmvorlage: CC BY 4.0). Alba MacKenna; die lizenzierte Stimmvorlage wurde für synthetische Sprache verwendet und der Ton bearbeitet. Keine Unterstützung oder Empfehlung durch die Sprecherin wird behauptet. Lokal produziert, ohne externen Videoplayer oder Video-Tracking.",
            "Real local Studio recordings, original animation and intro/outro music. Synthetic narration: Kyutai Pocket TTS (software: MIT; model and Alba voice preset: CC BY 4.0). Alba MacKenna; the licensed preset was used to synthesise speech and the audio was edited. No endorsement by the voice artist is implied. Produced locally, without an external player or video tracking.",
            "Grabaciones reales de Studio local, animación y música de inicio y cierre originales. Narración sintética: Pocket TTS de Kyutai (software: MIT; modelo y voz Alba: CC BY 4.0). Alba MacKenna; se utilizó la voz autorizada para sintetizar el habla y se editó el audio. No se implica respaldo de la artista. Producción local, sin reproductor externo ni seguimiento del vídeo.",
          )}{" "}
          <a
            href="https://github.com/kyutai-labs/pocket-tts"
            target="_blank"
            rel="noreferrer"
          >
            Pocket TTS ↗
          </a>
          {" · "}
          <a
            href="https://huggingface.co/kyutai/tts-voices"
            target="_blank"
            rel="noreferrer"
          >
            Alba · Kyutai ↗
          </a>
          {" · "}<a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">CC BY 4.0 ↗</a>
        </p>
      </details>
    </Dialog>
  );
}
