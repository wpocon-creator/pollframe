import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { StudioEditorControls } from "./studio-editor-controls.jsx";
import { ContextToolbar } from "./studio-canvas-editor.jsx";
import { elementStyles } from "./studio-elements.js";
export default function SelectionDialog(props) {
  const { selection, l, onClose, state, update } = props,
    ref = useRef(null);
  const contextual = !["element", "none"].includes(selection.target);
  useEffect(() => {
    const before = document.activeElement;
    ref.current.showModal();
    return () => before?.focus?.();
  }, []);
  return createPortal(
    <dialog
      ref={ref}
      className="studio-selection-dialog"
      aria-label={l("Auswahl bearbeiten", "Edit selection", "Editar selección")}
      onCancel={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }}
    >
      <header>
        <h2>{l("Auswahl bearbeiten", "Edit selection", "Editar selección")}</h2>
        <button
          type="button"
          className="icon-button"
          aria-label={l("Schließen", "Close", "Cerrar")}
          onClick={onClose}
        >
          ×
        </button>
      </header>
      {!contextual && <ContextToolbar {...props} />}
      {contextual ? (
        <StudioEditorControls {...props} contextual />
      ) : selection.editable ? (
        <>
          <p>
            {l(
              "Schriftgröße und Position verändern nur die Darstellung; der Messwert bleibt unverändert. Ziehe die Auswahl in der Vorschau, um ihre Position zu ändern.",
              "Size and position affect presentation only, never the measured value. Drag the selection in the preview to reposition it.",
              "El tamaño y posición solo afectan a la presentación, no al dato. Arrastra la selección en la vista previa para moverla.",
            )}
          </p>
        </>
      ) : (
        <p>
          {l(
            "Dieses Element ist geschützt. Quellen, Messwerte und datenabhängige Formen können nicht frei verändert werden.",
            "This element is protected. Sources, values and data-dependent shapes cannot be freely altered.",
            "Elemento protegido: fuentes, valores y formas basadas en datos no se pueden modificar libremente.",
          )}
        </p>
      )}
    </dialog>,
    document.body,
  );
}
