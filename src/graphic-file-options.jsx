import React from "react";
import StudioSelect from "./studio-select.jsx";
export default function GraphicFileOptions({
  value,
  onChange,
  locale,
  vector = false,
  disabled = false,
  compact = false,
}) {
  const l = (de, en, es) => (locale === "de" ? de : locale === "es" ? es : en);
  if (compact)
    return (
      <label className="graphic-file-compact">
        <span className="sr-only">
          {l("Dateityp", "File type", "Tipo de archivo")}
        </span>
        <StudioSelect
          aria-label={l("Dateityp", "File type", "Tipo de archivo")}
          disabled={disabled}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          {["png", "svg", "pdf"].map((type) => (
            <option key={type} value={type}>
              {type === "svg" && !vector
                ? l("SVG (Bild)", "SVG (image)", "SVG (imagen)")
                : type.toUpperCase()}
            </option>
          ))}
        </StudioSelect>
      </label>
    );
  return (
    <fieldset className="graphic-file-options">
      <legend>{l("Dateityp", "File type", "Tipo de archivo")}</legend>
      <div>
        {["png", "svg", "pdf"].map((type) => (
          <button
            type="button"
            key={type}
            disabled={disabled}
            aria-pressed={value === type}
            onClick={() => onChange(type)}
          >
            {type.toUpperCase()}
          </button>
        ))}
      </div>
      <small>
        {value === "pdf"
          ? l(
              "Eine Seite, passend zur Grafik · hochauflösendes Bild",
              "One page fitted to the graphic · high-resolution image",
              "Una página ajustada a la gráfica · imagen de alta resolución",
            )
          : value === "svg" && !vector
            ? l(
                "Bildbasiertes SVG, keine editierbaren Vektorlinien",
                "Image-based SVG, not editable vector paths",
                "SVG basado en imagen, sin trazados vectoriales editables",
              )
            : value === "svg"
              ? l(
                  "Vektorgrafik mit eingebetteten Schriften",
                  "Vector graphic with embedded typefaces",
                  "Gráfica vectorial con fuentes incrustadas",
                )
              : l(
                  "Hochauflösendes Bild",
                  "High-resolution image",
                  "Imagen de alta resolución",
                )}
      </small>
    </fieldset>
  );
}
