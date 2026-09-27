import React, { useEffect, useRef, useState } from "react";
import ResourceDialog from "./studio-resource-dialog.jsx";
import { eventIds } from "./studio-event-ids.js";
import {
  eventLayout,
  parseEventLanes,
  parseEventNumbers,
} from "./studio-event-layout.js";

// Dates are immutable: only a banner's lane and preferred centre can move.
export default function EventCanvas({
  svgRef,
  state,
  update,
  select,
  session,
  l,
  selection,
  menu,
  onEdit,
}) {
  const latest = useRef();
  latest.current = { state, update, select, session };
  const [slot, setSlot] = useState(null),
    [adding, setAdding] = useState(false);
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    let drag = null;
    const point = (e) =>
      new DOMPoint(e.clientX, e.clientY).matrixTransform(
        svg.getScreenCTM().inverse(),
      );
    const down = (e) => {
      const marker = e.target.closest("[data-event-id]");
      if (e.button !== 0 || !marker) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      setSlot(null);
      const id = marker.dataset.eventId;
      latest.current.select({
        target: "events",
        ids: [`event-${id}`],
        eventId: id,
        kind: "events",
        editable: false,
        count: 1,
      });
      const p = point(e);
      drag = {
        id,
        origin: p,
        center: Number(marker.dataset.eventCenter) || p.x,
        point: p,
        moved: false,
      };
      latest.current.session.begin();
    };
    const move = (e) => {
      if (!drag) return;
      const p = point(e);
      if (
        Math.hypot(p.x - drag.origin.x, p.y - drag.origin.y) < 4 &&
        !drag.moved
      )
        return;
      e.preventDefault();
      drag.moved = true;
      drag.point = p;
      // Fast visual feedback without regenerating the entire editor on movement.
      for (const rect of svg.querySelectorAll("[data-event-layer]")) {
        const y = Number(rect.getAttribute("y")),
          h = Number(rect.getAttribute("height"));
        rect.style.fill = p.y >= y && p.y < y + h ? "#2854ce14" : "transparent";
      }
      const marker = [...svg.querySelectorAll("[data-event-id]")].find(
        (n) => n.dataset.eventId === drag.id,
      );
      if (marker) {
        const label = marker.querySelector(".event-label-bg"),
          text = marker.querySelector(".event-label-text");
        const left = Number(svg.dataset.eventLeft),
          right = Number(svg.dataset.eventRight),
          width = Number(label?.getAttribute("width")) || 160;
        const anchor =
          Number(
            marker.querySelector(".event-context-line")?.getAttribute("x1"),
          ) || drag.center;
        const centre = Math.max(
          left + width / 2,
          anchor - width / 2 + 8,
          Math.min(
            right - width / 2,
            anchor + width / 2 - 8,
            drag.center + p.x - drag.origin.x,
          ),
        );
        const dx = centre - drag.center,
          dy = p.y - drag.origin.y;
        for (const node of [label, text])
          node?.setAttribute("transform", `translate(${dx} ${dy})`);
      }
    };
    const finish = (cancel = false) => {
      if (!drag) return;
      const d = drag;
      drag = null;
      svg
        .querySelectorAll("[data-event-layer]")
        .forEach((n) => (n.style.fill = "transparent"));
      svg
        .querySelectorAll(".event-label-bg,.event-label-text")
        .forEach((n) => n.removeAttribute("transform"));
      const { state: s, update: change, session: undo } = latest.current;
      if (d.moved && !cancel && s.historyLayers) {
        const layer = svg.querySelector("[data-event-layer]"),
          top = Number(layer?.dataset.layerTop),
          step = Number(layer?.dataset.layerStep) || 1;
        const lane = Math.max(
          0,
          Math.min(s.historyLayers - 1, Math.floor((d.point.y - top) / step)),
        );
        const left = Number(svg.dataset.eventLeft),
          right = Number(svg.dataset.eventRight);
        const positions = parseEventNumbers(s.historyEventPositions);
        positions[d.id] = Math.max(
          0,
          Math.min(
            1,
            (d.center + d.point.x - d.origin.x - left) / (right - left),
          ),
        );
        change({
          historyEventLanes: JSON.stringify({
            ...parseEventLanes(s.historyEventLanes),
            [d.id]: lane,
          }),
          historyEventPositions: JSON.stringify(positions),
          historyEventPinned: [
            ...new Set([...eventIds(s.historyEventPinned), d.id]),
          ].join(","),
        });
      }
      requestAnimationFrame(() => undo.end());
    };
    const up = () => finish(),
      cancel = () => finish(true);
    const context = (e) => {
      const layer = e.target.closest("[data-event-layer]");
      if (!layer) return;
      e.preventDefault();
      e.stopPropagation();
      const p = point(e),
        holder = svg
          .closest(".studio-current-preview-image")
          .getBoundingClientRect();
      setSlot({
        lane: Number(layer.dataset.eventLayer),
        x: p.x,
        left: e.clientX - holder.left,
        top: e.clientY - holder.top,
      });
    };
    const pin = (e) => {
      const { state: s, update: change } = latest.current,
        id = e.detail.id,
        pins = eventIds(s.historyEventPinned),
        lanes = parseEventLanes(s.historyEventLanes),
        positions = parseEventNumbers(s.historyEventPositions);
      if (pins.has(id)) {
        pins.delete(id);
        delete lanes[id];
        delete positions[id];
      } else {
        pins.add(id);
        const marker = [...svg.querySelectorAll("[data-event-id]")].find(
          (n) => n.dataset.eventId === id,
        );
        if (marker?.hasAttribute("data-event-lane")) {
          lanes[id] = Number(marker.dataset.eventLane);
          positions[id] = Math.max(
            0,
            Math.min(
              1,
              (Number(marker.dataset.eventCenter) -
                Number(svg.dataset.eventLeft)) /
                (Number(svg.dataset.eventRight) -
                  Number(svg.dataset.eventLeft)),
            ),
          );
        }
      }
      change({
        historyEventPinned: [...pins].join(","),
        historyEventLanes: JSON.stringify(lanes),
        historyEventPositions: JSON.stringify(positions),
      });
    };
    svg.addEventListener("studio-event-pin", pin);
    svg.dataset.eventEditReady = "true";
    svg.addEventListener("pointerdown", down, true);
    svg.addEventListener("contextmenu", context);
    window.addEventListener("pointermove", move, { passive: false });
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", cancel);
    window.addEventListener("blur", cancel);
    return () => {
      cancel();
      delete svg.dataset.eventEditReady;
      svg.removeEventListener("studio-event-pin", pin);
      svg.removeEventListener("pointerdown", down, true);
      svg.removeEventListener("contextmenu", context);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", cancel);
      window.removeEventListener("blur", cancel);
    };
  }, [svgRef.current]);
  const svg = svgRef.current;
  let candidates = [];
  try {
    candidates = JSON.parse(svg?.dataset.eventCandidates || "[]");
  } catch {}
  const left = Number(svg?.dataset.eventLeft),
    right = Number(svg?.dataset.eventRight);
  const x = (date) =>
    left +
    ((Date.parse(date) - Date.parse(svg?.dataset.eventStart)) /
      (Date.parse(svg?.dataset.eventEnd) -
        Date.parse(svg?.dataset.eventStart))) *
      (right - left);
  const pinned = eventIds(state.historyEventPinned),
    shown = eventIds(svg?.dataset.labelledEvents);
  const fits = slot
    ? candidates
        .filter((e) => !shown.has(e.id))
        .filter((e) => {
          // The connector must still meet this banner, not a different date.
          if (Math.abs(x(e.date) - slot.x) > (e.labelWidth || 176) / 2 - 8)
            return false;
          const packed = eventLayout(
            [
              ...candidates.filter((c) => pinned.has(c.id)),
              { ...e, forced: true },
            ],
            {
              x,
              left,
              right,
              layers: state.historyLayers,
              lanes: {
                ...parseEventLanes(state.historyEventLanes),
                [e.id]: slot.lane,
              },
              positions: {
                ...parseEventNumbers(state.historyEventPositions),
                [e.id]: (slot.x - left) / (right - left),
              },
            },
          );
          return packed.visible.some(
            (c) => c.id === e.id && c.lane === slot.lane,
          );
        })
        .sort(
          (a, b) => Math.abs(x(a.date) - slot.x) - Math.abs(x(b.date) - slot.x),
        )
    : [];
  return (
    <>
      {menu && selection.eventId && (
        <div
          className="studio-selection-bubble"
          style={menu}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <button type="button" onClick={onEdit}>
            {l("Bearbeiten", "Edit", "Editar")}
          </button>
          <button
            type="button"
            onClick={() =>
              svg?.dispatchEvent(
                new CustomEvent("studio-event-pin", {
                  detail: { id: selection.eventId },
                }),
              )
            }
          >
            {pinned.has(selection.eventId)
              ? l("Lösen", "Unpin", "Desfijar")
              : l("Anheften", "Pin", "Fijar")}
          </button>
          <button
            type="button"
            onClick={() => {
              update({
                historySeedRemoved: [
                  ...new Set([
                    ...eventIds(state.historySeedRemoved),
                    selection.eventId,
                  ]),
                ].join(","),
              });
              select({ target: "none", ids: [] });
            }}
          >
            {l(
              "Aus Anordnung entfernen",
              "Remove from layout",
              "Quitar de la disposición",
            )}
          </button>
        </div>
      )}
      {slot && !adding && (
        <button
          type="button"
          className="studio-selection-bubble"
          style={{
            left: Math.max(
              0,
              Math.min(slot.left, (svg?.clientWidth || 300) - 170),
            ),
            top: slot.top,
          }}
          onClick={() => setAdding(true)}
        >
          {l("+ Ereignis hinzufügen", "+ Add event", "+ Añadir acontecimiento")}
        </button>
      )}
      {adding && (
        <ResourceDialog
          title={l(
            "Ereignis hier hinzufügen",
            "Add an event here",
            "Añadir un acontecimiento aquí",
          )}
          l={l}
          onClose={() => {
            setAdding(false);
            setSlot(null);
          }}
        >
          <p>
            {l(
              "Diese Ereignisse passen an diese Stelle. Angeheftete Ereignisse behalten ihren Platz.",
              "These events fit here without displacing pinned events.",
              "Estos acontecimientos caben aquí sin desplazar los fijados.",
            )}
          </p>
          {!fits.length && (
            <p role="status">
              {l(
                "Hier passt kein weiteres Ereignis. Wähle eine andere Stelle oder Ebene.",
                "No additional event fits here. Try another position or layer.",
                "No cabe otro acontecimiento aquí. Prueba otra posición o capa.",
              )}
            </p>
          )}
          <div className="studio-style-list">
            {fits.map((e) => (
              <button
                type="button"
                className="studio-style-card"
                key={e.id}
                onClick={() => {
                  update({
                    historySeedRemoved: [...eventIds(state.historySeedRemoved)]
                      .filter((id) => id !== e.id)
                      .join(","),
                    historyEventPinned: [...new Set([...pinned, e.id])].join(
                      ",",
                    ),
                    historyEventLanes: JSON.stringify({
                      ...parseEventLanes(state.historyEventLanes),
                      [e.id]: slot.lane,
                    }),
                    historyEventPositions: JSON.stringify({
                      ...parseEventNumbers(state.historyEventPositions),
                      [e.id]: (slot.x - left) / (right - left),
                    }),
                  });
                  setAdding(false);
                  setSlot(null);
                }}
              >
                {e.label} · {e.date}
              </button>
            ))}
          </div>
        </ResourceDialog>
      )}
    </>
  );
}
