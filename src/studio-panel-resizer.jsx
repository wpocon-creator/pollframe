import React, { useEffect, useRef, useState } from "react";
export default function PanelResizer({ side, value, onChange, l }) {
  const drag = useRef(null),
    ref = useRef(null),
    [limit, setLimit] = useState(600),
    min = 260;
  const finish = () => {
    if (!drag.current) return;
    const next = drag.current.next;
    drag.current = null;
    if (next !== undefined) onChange(next);
  };
  const getMax = (node) => {
    if (side === "left") return 400;
    const workspace = node.closest(".studio-workspace"),
      svg = workspace?.querySelector(".studio-current-preview-image svg");
    if (!svg?.getScreenCTM()) return 600;
    const right = new DOMPoint(svg.viewBox.baseVal.width, 0).matrixTransform(
      svg.getScreenCTM(),
    ).x;
    return Math.max(
      min,
      Math.floor(workspace.getBoundingClientRect().right - right),
    );
  };
  const clamp = (n, max) => Math.max(min, Math.min(max, n));
  useEffect(() => {
    const node = ref.current,
      workspace = node?.closest(".studio-workspace");
    if (!workspace) return;
    const observer = new ResizeObserver(() => {
      const max = getMax(node);
      setLimit(max);
      if (value > max) onChange(max);
    });
    observer.observe(workspace);
    return () => observer.disconnect();
  }, [value, onChange]);
  return (
    <button
      ref={ref}
      type="button"
      className="studio-panel-resizer"
      role="separator"
      aria-orientation="vertical"
      aria-label={
        side === "left"
          ? l(
              "Breite des Assistenten",
              "Assistant width",
              "Ancho del asistente",
            )
          : l("Breite der Werkzeuge", "Tools width", "Ancho de herramientas")
      }
      aria-valuemin={min}
      aria-valuemax={limit}
      aria-valuenow={value}
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        const max = getMax(e.currentTarget);
        setLimit(max);
        drag.current = {
          x: e.clientX,
          value,
          max,
          workspace: e.currentTarget.closest(".studio-workspace"),
        };
        e.currentTarget.setPointerCapture(e.pointerId);
        e.preventDefault();
      }}
      onPointerMove={(e) => {
        if (drag.current) {
          const next = clamp(
            drag.current.value +
              (e.clientX - drag.current.x) * (side === "left" ? 1 : -1),
            drag.current.max,
          );
          drag.current.next = next;
          // Resizing the inspector does not change the graphic. Avoid rebuilding
          // every SVG and source receipt for every pixel of pointer movement.
          drag.current.workspace?.style.setProperty(
            side === "left"
              ? "--studio-chat-width"
              : "--studio-inspector-width",
            `${next}px`,
          );
        }
      }}
      onPointerUp={finish}
      onPointerCancel={finish}
      onLostPointerCapture={finish}
      onKeyDown={(e) => {
        if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;
        e.preventDefault();
        const max = getMax(e.currentTarget);
        setLimit(max);
        onChange(
          e.key === "Home"
            ? min
            : e.key === "End"
              ? max
              : clamp(
                  value +
                    (e.key === "ArrowRight" ? 10 : -10) *
                      (side === "left" ? 1 : -1),
                  max,
                ),
        );
      }}
    />
  );
}
