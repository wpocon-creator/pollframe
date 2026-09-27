import React, { useEffect, useRef } from "react";
import { PngExportModal } from "./png-export.jsx";
import StudioSelect from "./studio-select.jsx";
function StudioPngPreview({ state, update, svgRef, l }) {
  const preview = useRef(null);
  useEffect(() => {
    let frame;
    const refresh = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (svgRef.current && preview.current) {
          const clone=svgRef.current.cloneNode(true);
          clone.querySelectorAll("[data-preview-only]").forEach(node=>node.remove());
          preview.current.replaceChildren(clone);
        }
      });
    };
    refresh();
    const observer = new MutationObserver(refresh);
    if (svgRef.current)
      observer.observe(svgRef.current, {
        attributes: true,
        subtree: true,
        childList: true,
        characterData: true,
      });
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [state]);
  return (
    <div className="png-live-preview">
      <div className="studio-png-exact-preview" ref={preview} />
      <label>
        {l("Auflösung", "Resolution", "Resolución")}
        <StudioSelect
          value={state.exportWidth}
          onChange={(e) => update({ exportWidth: Number(e.target.value) })}
        >
          {[960, 1920, 2880, 3840].map((width) => (
            <option value={width} key={width}>
              {width} px
            </option>
          ))}
        </StudioSelect>
      </label>
    </div>
  );
}
// Reuse the site dialogs; only the Studio raster/recipe adapter differs.
export default function StudioPublishDialog({
  kind,
  onClose,
  onPublished,
  setKind,
  state,
  update,
  download,
  embedCode,
  embedUrl,
  ratio,
  svgRef,
  l,
  snapshot,
  template,
  ShareModal,
  translations,
}) {
  const title = state.headline || snapshot.title || template.name[0];
  const custom = state.font.startsWith("custom-");
  if (kind === "png" || custom)
    return (
      <PngExportModal
        open
        onClose={onClose}
        elementRef={svgRef}
        title={title}
        subtitle={
          custom && kind !== "png"
            ? l(
                "Eigene Schrift: nur PNG · für Embed eine Bibliotheksschrift wählen",
                "Custom font: PNG only · choose a library font for embed",
                "Fuente propia: solo PNG · elige una fuente de la biblioteca para insertar",
              )
            : "Pollframe Studio"
        }
        locale={state.lang}
        studio={{
          onPublished,
          render: () => download({ renderOnly: true }),
          preview: (
            <StudioPngPreview
              state={state}
              update={update}
              svgRef={svgRef}
              l={l}
            />
          ),
        }}
      />
    );
  return (
    <ShareModal
      open
      onClose={onClose}
      widget="studio"
      title={title}
      subtitle="Pollframe Studio"
      locale={state.lang}
      t={translations[state.lang] || translations["en-GB"]}
      region={{ slug: state.region, type: "federal" }}
      elementRef={svgRef}
      shareHref={location.href}
      credit={[snapshot.source || "DAWUM", snapshot.license || "", "Pollframe"]
        .filter(Boolean)
        .join(" · ")}
      height={Math.ceil(
        (Number(ratio.split("/")[1]) / Number(ratio.split("/")[0])) * 800,
      )}
      studio={{
        onPublished,
        url: embedUrl,
        code: embedCode,
        theme: state.theme,
        setTheme: (theme) => update({ theme }),
        openPng: () => setKind("png"),
      }}
    />
  );
}
