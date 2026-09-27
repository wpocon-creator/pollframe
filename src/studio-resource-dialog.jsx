import React, { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import "./studio-resources.css";

export default function StudioResourceDialog({
  title,
  onClose,
  children,
  footer,
  l,
  wide = false,
  className = "",
}) {
  const ref = useRef(null),
    id = useId();
  useEffect(() => {
    const previous = document.activeElement;
    ref.current.showModal();
    return () => previous?.focus?.({ preventScroll: true });
  }, []);
  return createPortal(
    <dialog
      ref={ref}
      className={`studio-resource-dialog${wide ? " is-wide" : ""} ${className}`}
      aria-labelledby={id}
      onCancel={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }}
    >
      <header>
        <h2 id={id}>{title}</h2>
        <button
          className="icon-button"
          onClick={onClose}
          aria-label={l("Schließen", "Close", "Cerrar")}
        >
          ×
        </button>
      </header>
      <div className="studio-resource-body">{children}</div>
      {footer && <footer className="studio-resource-footer">{footer}</footer>}
    </dialog>,
    document.body,
  );
}
