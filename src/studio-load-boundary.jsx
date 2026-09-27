import React from "react";

// Failed lazy imports (including a stale tab after a local rebuild) must not
// unmount the entire page. Reload is explicit: never create a reload loop.
export class StudioLoadBoundary extends React.Component {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (!this.state.failed) return this.props.children;
    const lang =
      this.props.lang || new URLSearchParams(location.search).get("lang");
    const l = (de, en, es) => (lang === "de" ? de : lang === "es" ? es : en);
    return (
      <section role="alert" style={{ padding: 24, minHeight: 160 }}>
        <h2>
          {l(
            "Dieser Teil konnte nicht geladen werden",
            "This part could not be loaded",
            "No se ha podido cargar esta sección",
          )}
        </h2>
        <p>
          {l(
            "Bitte neu laden. Die Einstellungen bleiben in der Adresse gespeichert; ein lokales Hintergrundbild musst du erneut auswählen.",
            "Please reload. Settings stay in the address; select any local background image again.",
            "Recarga la página. Los ajustes se conservan en la dirección; vuelve a seleccionar la imagen de fondo local.",
          )}
        </p>
        <button className="secondary-button" onClick={() => location.reload()}>
          {l("Neu laden", "Reload", "Recargar")}
        </button>
      </section>
    );
  }
}
