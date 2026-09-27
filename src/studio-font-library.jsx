import React, { useEffect, useRef, useState } from "react";
import { STUDIO_FONTS } from "./studio-fonts.js";
import { loadStudioFont } from "./studio-font-loader.js";
import { importCustomFont, listCustomFonts } from "./studio-custom-fonts.js";
function FontRow({ font, value, choose }) {
  const ref = useRef(null),
    [ready, setReady] = useState(!font[2]?.startsWith("PF "));
  useEffect(() => {
    let alive = true;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          observer.disconnect();
          loadStudioFont(font[0])
            .then(() => {
              if (alive) setReady(true);
            })
            .catch(() => {});
        }
      },
      { rootMargin: "80px" },
    );
    observer.observe(ref.current);
    return () => {
      alive = false;
      observer.disconnect();
    };
  }, [font[0]]);
  return (
    <button
      type="button"
      ref={ref}
      className="studio-font-row"
      aria-pressed={value === font[0]}
      onClick={() => choose(font[0])}
    >
      <span style={{ fontFamily: ready ? font[2] : undefined }}>{font[1]}</span>
      <small>{value === font[0] ? "✓" : ready ? "Aa" : "…"}</small>
    </button>
  );
}
export default function FontLibrary({ value, onChange, onClose, l }) {
  const ref = useRef(null),
    [query, setQuery] = useState(""),
    [custom, setCustom] = useState([]),
    [error, setError] = useState("");
  useEffect(() => {
    const before = document.activeElement;
    ref.current.showModal();
    listCustomFonts()
      .then(setCustom)
      .catch(() => {});
    return () => before?.focus?.();
  }, []);
  const all = [
    ...STUDIO_FONTS,
    ...custom.map((f) => [f.key, f.name, f.family]),
  ];
  const match = (f) =>
    f[1].toLocaleLowerCase().includes(query.toLocaleLowerCase().trim());
  const recommended = all.slice(0, 20).filter(match),
    others = all
      .slice(20)
      .filter(match)
      .sort((a, b) => a[1].localeCompare(b[1]));
  const choose = (font) => {
    onChange(font);
    onClose();
  };
  return (
    <dialog
      ref={ref}
      className="studio-font-library"
      onCancel={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onClose();
      }}
      onClick={(e) => {
        if (e.target !== e.currentTarget) return;
        const r=e.currentTarget.getBoundingClientRect();
        if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom) onClose();
      }}
      aria-labelledby="studio-font-title"
    >
      <header>
        <h2 id="studio-font-title">
          {l("Schriftbibliothek", "Typeface library", "Biblioteca tipográfica")}
        </h2>
        <button
          className="icon-button"
          aria-label={l("Schließen", "Close", "Cerrar")}
          onClick={onClose}
        >
          ×
        </button>
      </header>
      <input
        type="search"
        autoFocus
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={l(
          "Schriftart suchen…",
          "Search typefaces…",
          "Buscar tipografías…",
        )}
        aria-label={l(
          "Schriftart suchen",
          "Search typefaces",
          "Buscar tipografías",
        )}
      />
      <div className="studio-font-scroll">
        {[
          [
            l(
              "Unsere 20 Empfehlungen",
              "Our 20 recommendations",
              "Nuestras 20 recomendaciones",
            ),
            recommended,
          ],
          [
            l(
              "Weitere Schriften · A–Z",
              "More typefaces · A–Z",
              "Más tipografías · A–Z",
            ),
            others,
          ],
        ].map(
          ([title, fonts]) =>
            fonts.length > 0 && (
              <section key={title}>
                <h3>{title}</h3>
                {fonts.map((f) => (
                  <FontRow key={f[0]} font={f} value={value} choose={choose} />
                ))}
              </section>
            ),
        )}
        {!recommended.length && !others.length && (
          <p>
            {l(
              "Keine passende Schrift. Du kannst unten eine eigene importieren.",
              "No matching typeface. You can import your own below.",
              "No hay coincidencias. Puedes importar una tipografía abajo.",
            )}
          </p>
        )}
      </div>
      <footer>
        <small>
          {l(
            "Verwende eigene Schriften nur mit den nötigen Nutzungsrechten.",
            "Only import fonts you have the necessary rights to use.",
            "Importa solo fuentes para las que tengas los derechos necesarios.",
          )}
        </small>
        <label className="studio-import-zone">
          <strong>
            ＋{" "}
            {l(
              "Eigene Schrift importieren",
              "Import your typeface",
              "Importar tu tipografía",
            )}
          </strong>
          <span>WOFF2 · WOFF · TTF · OTF · max. 4 MB</span>
          <input
            type="file"
            accept=".woff2,.woff,.ttf,.otf"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              try {
                const font = await importCustomFont(file);
                choose(font.key);
              } catch {
                setError(
                  l(
                    "Diese Schrift konnte nicht geladen werden. Bitte Format, Größe und Datei prüfen.",
                    "Unable to load this font. Check its format, size and file.",
                    "No se pudo cargar. Comprueba el formato, tamaño y archivo.",
                  ),
                );
              }
            }}
          />
        </label>
        <small>
          {l(
            "Nur auf diesem Gerät gespeichert. Eigene Schriften sind nicht in Live-Embeds verfügbar.",
            "Stored on this device only. Custom fonts are unavailable in live embeds.",
            "Solo se guarda en este dispositivo. Las fuentes propias no están disponibles en inserciones en vivo.",
          )}
        </small>
        {error && <p role="alert">{error}</p>}
      </footer>
    </dialog>
  );
}
