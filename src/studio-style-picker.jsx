import React, { useEffect, useState } from "react";
import Dialog from "./studio-resource-dialog.jsx";
import { listStyles } from "./studio-style-library.js";
import { stylePatch } from "./studio-style-model.js";
import { studioFont } from "./studio-fonts.js";
export default function StylePicker({ state, template, l, update, onClose }) {
  const [items, setItems] = useState(null),
    [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    listStyles()
      .then((rows) => {
        if (active) setItems(rows);
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => {
      active = false;
    };
  }, []);
  return (
    <Dialog
      title={l("Stil anwenden", "Apply a style", "Aplicar un estilo")}
      l={l}
      onClose={onClose}
    >
      <p>
        {l(
          "Deine Daten, Texte und Filter bleiben erhalten.",
          "Your data, wording and filters stay unchanged.",
          "Tus datos, textos y filtros no cambian.",
        )}
      </p>
      {items?.map((item) => (
        <button
          key={item.id}
          className="studio-style-card"
          onClick={() => {
            update(stylePatch(item.style, template), true);
            onClose();
          }}
        >
          <span style={{ fontFamily: studioFont(item.style.font) }}>Aa</span>
          {item.name}
        </button>
      ))}
      {items?.length === 0 && (
        <p>
          {l(
            "Noch keine Stile. Erstelle einen unter Meine Designs → Stile.",
            "No styles yet. Create one under My designs → Styles.",
            "Aún no hay estilos. Crea uno en Mis diseños → Estilos.",
          )}
        </p>
      )}
      {error && (
        <p role="alert">
          {l(
            "Speicher nicht verfügbar",
            "Storage unavailable",
            "Almacenamiento no disponible",
          )}
        </p>
      )}
    </Dialog>
  );
}
