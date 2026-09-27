import InlineText from "./studio-inline-text.jsx";
import React, { lazy, Suspense, useEffect, useLayoutEffect, useRef, useState } from "react";
const EventCanvas = lazy(()=>import("./studio-event-canvas.jsx"));
import { createPortal } from "react-dom";
import {
  describeElements,
  elementStyles,
  elementDefault,
} from "./studio-elements.js";
const textKeys = { text: "headline", subtitle: "subtitle", note: "editorNote" };
const sizeKeys = {
  text: "titleSize",
  subtitle: "subtitleSize",
  note: "noteSize",
};
const maxSize = { text: 64, subtitle: 30, note: 24 },
  minSize = { text: 24, subtitle: 18, note: 16 };
function bounds(items, origin) {
  const rects = items
    .map((i) =>
      (i.kind === "events"
        ? i.node.querySelector(".event-label-bg") || i.node
        : i.node
      ).getBoundingClientRect(),
    )
    .filter((r) => r.width && r.height);
  if (!rects.length) return null;
  const left = Math.min(...rects.map((r) => r.left)),
    top = Math.min(...rects.map((r) => r.top)),
    right = Math.max(...rects.map((r) => r.right)),
    bottom = Math.max(...rects.map((r) => r.bottom));
  return {
    left: left - origin.left,
    top: top - origin.top,
    width: right - left,
    height: bottom - top,
  };
}
export default function CanvasSelection({
  topic,
  session,
  svgRef,
  state,
  selection,
  select,
  update,
  l,
  onEdit,
}) {
  const [boxes, setBoxes] = useState([]),
    [marquee, setMarquee] = useState(null),
    [editing, setEditing] = useState(null),
    [draft, setDraft] = useState(""),
    [pending, setPending] = useState(null);
  const [dontAsk,setDontAsk]=useState(false);
  const repeatPreference=useRef(null);
  useEffect(()=>{try{const p=localStorage.getItem('pollframe-studio-repeat-choice');if(p==='all'||p==='single')repeatPreference.current=p;}catch{}},[]);
  const latest = useRef();
  latest.current = { state, selection, select, update, session };
  const drag = useRef(null),
    frame = useRef(0),
    outlineFrame = useRef(0),
    dialogRef = useRef(null),
    originalText = useRef(""),
    changed = useRef(false),
    startStyles = useRef(null);
  const ids = selection.ids?.length
    ? selection.ids
    : ["text", "subtitle", "note", "output", "events"].includes(
          selection.target,
        )
      ? [selection.target]
      : [];
  const getItems = () =>
    svgRef.current ? describeElements(svgRef.current) : [];
  const selected = () => {
    const s = latest.current.selection,
      ids = s.ids?.length ? s.ids : [s.target];
    return getItems().filter((i) => ids.includes(i.id));
  };
  const setSelection = (items) => {
    const unique = [...new Map(items.map((i) => [i.id, i])).values()];
    const one = unique.length === 1 ? unique[0] : null;
    latest.current.select({
      target:
        one && textKeys[one.id]
          ? one.id
          : one?.kind === "events"
            ? "events"
            : one?.kind === "output"
              ? "output"
            : one?.kind === "series"
              ? "chart"
            : unique.length
              ? "element"
              : "none",
      ids: unique.map((i) => i.id),
      kind: one?.kind,
      eventId: one?.eventId,
      editable: unique.length > 0 && unique.every((i) => i.editable),
      label: one?.label?.slice(0, 100),
      count: unique.length,
    });
  };
  const refresh = () => {
    const svg = svgRef.current;
    if (!svg) return;
    const holder = svg.closest(".studio-current-preview-image"),
      rect = holder.getBoundingClientRect(),
      items = selected();
    const unique = [...new Set(items.map((i) => i.id))];
    setBoxes(
      unique
        .map((id) => ({
          id,
          editable: items.filter((i) => i.id === id).every((i) => i.editable),
          ...bounds(
            items.filter((i) => i.id === id),
            rect,
          ),
        }))
        .filter((b) => Number.isFinite(b.left)),
    );
  };
  useLayoutEffect(() => {
    refresh();
    const svg = svgRef.current;
    if (!svg) return;
    const schedule = () => {
      cancelAnimationFrame(outlineFrame.current);
      outlineFrame.current = requestAnimationFrame(refresh);
    };
    const ro = new ResizeObserver(schedule);
    ro.observe(svg);
    svg.addEventListener("studio-elements-ready", schedule);
    window.addEventListener("studio-font-ready", schedule);
    return () => {
      ro.disconnect();
      svg.removeEventListener("studio-elements-ready", schedule);
      window.removeEventListener("studio-font-ready", schedule);
      cancelAnimationFrame(outlineFrame.current);
    };
  }, [state, selection]);
  const complete = () => {
    const items = selected(),
      unique = [...new Map(items.map((i) => [i.id, i])).values()];
    const item = unique.length === 1 ? unique[0] : null;
    const peers =
      item && ["value", "label", "axis"].includes(item.kind)
        ? getItems().filter(
            (i) => i.editable && i.family === item.family && i.id !== item.id,
          )
        : [];
    if (changed.current && peers.length && repeatPreference.current!=='single')
      setPending({
        id: item.id,
        peers: [...new Set(peers.map((i) => i.id))],
        base: startStyles.current || {},
      });
    else latest.current.session.end();
    changed.current = false;
  };
  const begin = () => {
    latest.current.session.begin();
    startStyles.current = elementStyles(latest.current.state.elementStyles);
    changed.current = false;
  };
  const adjust = (changes) => {
    const list = selected();
    if (!list.length || list.some((i) => !i.editable)) return;
    const styles = elementStyles(latest.current.state.elementStyles);
    for (const id of new Set(list.map((i) => i.id)))
      styles[id] = { ...elementDefault, ...styles[id], ...changes };
    latest.current.update({ elementStyles: JSON.stringify(styles) });
    changed.current = true;
  };
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const point = (e) =>
      new DOMPoint(e.clientX, e.clientY).matrixTransform(
        svg.getScreenCTM().inverse(),
      );
    const down = (e) => {
      if (!e.isPrimary) return;
      if (e.button !== 0 || pending) return;
      const items = getItems(),
        hit = e.target.closest('[data-editor-target="image"]')
          ? null
          : items.find(
              (i) => i.node === e.target.closest("[data-studio-item]"),
            );
      const origin = point(e),
        holder = svg
          .closest(".studio-current-preview-image")
          .getBoundingClientRect();
      if (!hit || hit.kind === "mark" || (e.shiftKey && !hit.editable)) {
        if (hit && !e.shiftKey) {
          setSelection([hit]);
          return;
        }
        drag.current = {
          mode: "marquee",
          start: { x: e.clientX - holder.left, y: e.clientY - holder.top },
          holder,
          add: e.shiftKey ? selected() : [],
        };
      } else {
        let selection = selected();
        if (e.shiftKey) {
          selection = selection.some((i) => i.id === hit.id)
            ? selection.filter((i) => i.id !== hit.id)
            : [...selection, hit];
          setSelection(selection);
          return;
        }
        if (!selection.some((i) => i.id === hit.id)) {
          selection = [hit];
          setSelection(selection);
        }
        if (selection.some((i) => !i.editable)) return;
        begin();
        drag.current = {
          mode: "move",
          origin,
          items: selection,
          center:
            selection[0].node.getBBox().x +
            selection[0].node.getBBox().width / 2,
          alignment:
            latest.current.state[
              {
                text: "titleAlign",
                subtitle: "subtitleAlign",
                note: "noteAlign",
              }[selection[0].id]
            ],
          styles: elementStyles(latest.current.state.elementStyles),
        };
      }
      e.preventDefault();
    };
    const move = (e) => {
      if (!e.isPrimary) return;
      const d = drag.current;
      if (!d) return;
      if (d.mode === "marquee") {
        const x = e.clientX - d.holder.left,
          y = e.clientY - d.holder.top;
        d.rect = {
          left: Math.min(x, d.start.x),
          top: Math.min(y, d.start.y),
          width: Math.abs(x - d.start.x),
          height: Math.abs(y - d.start.y),
        };
        setMarquee(d.rect);
        return;
      }
      const p = point(e),
        dx = p.x - d.origin.x,
        dy = p.y - d.origin.y;
      if (Math.hypot(dx, dy) < 4 && !changed.current) return;
      if (d.mode === "move" && !d.axis)
        d.axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
      e.preventDefault();
      cancelAnimationFrame(frame.current);
      frame.current = requestAnimationFrame(() => {
        if (!drag.current) return;
        const styles = { ...d.styles };
        if (
          d.mode === "move" &&
          d.axis === "x" &&
          d.items.length === 1 &&
          textKeys[d.items[0].id]
        ) {
          const id = d.items[0].id,
            center = d.center + dx;
          latest.current.update({
            [{
              text: "titleAlign",
              subtitle: "subtitleAlign",
              note: "noteAlign",
            }[id]]: center < 320 ? "left" : center > 640 ? "right" : "center",
          });
          changed.current = true;
          return;
        }
        if (
          d.mode === "resize" &&
          d.items.length === 1 &&
          sizeKeys[d.items[0].id]
        ) {
          const id = d.items[0].id,
            key = sizeKeys[id];
          latest.current.update({
            [key]: Math.round(
              Math.max(
                minSize[id],
                Math.min(
                  maxSize[id],
                  d.size * (1 + (dx * d.direction + dy * d.vertical) / 160),
                ),
              ),
            ),
          });
        } else {
          for (const id of new Set(d.items.map((i) => i.id))) {
            const base = { ...elementDefault, ...d.styles[id] };
            styles[id] =
              d.mode === "resize"
                ? {
                    ...base,
                    scale: Math.max(
                      0.7,
                      Math.min(
                        1.6,
                        base.scale *
                          (1 + (dx * d.direction + dy * d.vertical) / 180),
                      ),
                    ),
                  }
                : {
                    ...base,
                    x:
                      d.axis === "x"
                        ? dx < -12
                          ? -36
                          : dx > 12
                            ? 36
                            : 0
                        : base.x,
                    y:
                      d.axis === "y"
                        ? Math.max(-24, Math.min(24, base.y + dy))
                        : base.y,
                  };
          }
          latest.current.update({ elementStyles: JSON.stringify(styles) });
        }
        changed.current = true;
      });
    };
    const up = (e) => {
      if (!e.isPrimary) return;
      const d = drag.current;
      if (!d) return;
      if (d.mode === "marquee") {
        if (d.rect && d.rect.width + d.rect.height > 8) {
          const r = d.rect;
          setSelection([
            ...d.add,
            ...getItems().filter((i) => {
              if (["mark","series"].includes(i.kind)) return false;
              const b = bounds([i], d.holder);
              return (
                b &&
                b.left >= r.left &&
                b.top >= r.top &&
                b.left + b.width <= r.left + r.width &&
                b.top + b.height <= r.top + r.height
              );
            }),
          ]);
        } else setSelection([]);
        drag.current = null;
        setMarquee(null);
        return;
      }
      // Let the final queued animation frame commit before ending the undo group.
      requestAnimationFrame(() => {
        drag.current = null;
        complete();
      });
    };
    const cancel = () => {
      if (!drag.current) return;
      cancelAnimationFrame(frame.current);
      if (drag.current.mode !== "marquee") {
        const d = drag.current,
          key = sizeKeys[d.items?.[0]?.id];
        latest.current.update({
          elementStyles: JSON.stringify(d.styles || {}),
          ...(d.mode === "resize" && key ? { [key]: d.size } : {}),
          ...(d.mode === "move" && d.axis === "x" && d.alignment
            ? {
                [{
                  text: "titleAlign",
                  subtitle: "subtitleAlign",
                  note: "noteAlign",
                }[d.items[0].id]]: d.alignment,
              }
            : {}),
        });
      }
      drag.current = null;
      setMarquee(null);
      latest.current.session.end();
    };
    const dbl = (e) => {
      const item = getItems().find(
        (i) => i.node === e.target.closest("[data-studio-item]"),
      );
      if (!item?.content) return;
      e.preventDefault();
      setSelection([item]);
      originalText.current = latest.current.state[textKeys[item.id]] || "";
      setEditing(item.id);
      setDraft(latest.current.state[textKeys[item.id]] || item.label);
    };
    const click = (e) => {
      if (e.target.closest("a")) e.preventDefault();
    };
    const command = (e) => {
      if (e.detail.start) begin();
      if (e.detail.changes) adjust(e.detail.changes);
      if (e.detail.end) complete();
    };
    svg.addEventListener("pointerdown", down);
    svg.addEventListener("dblclick", dbl);
    svg.addEventListener("click", click);
    svg.addEventListener("studio-selection-command", command);
    window.addEventListener("pointermove", move, { passive: false });
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", cancel);
    window.addEventListener("blur", cancel);
    svg.dataset.directEditReady = "true";
    return () => {
      delete svg.dataset.directEditReady;
      svg.removeEventListener("pointerdown", down);
      svg.removeEventListener("dblclick", dbl);
      svg.removeEventListener("click", click);
      svg.removeEventListener("studio-selection-command", command);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", cancel);
      window.removeEventListener("blur", cancel);
      cancelAnimationFrame(frame.current);
    };
  }, [svgRef.current, Boolean(pending)]);
  const resize = (e, box, direction, vertical) => {
    e.preventDefault();
    e.stopPropagation();
    const items = selected();
    if (items.some((i) => !i.editable)) return;
    begin();
    const origin = new DOMPoint(e.clientX, e.clientY).matrixTransform(
      svgRef.current.getScreenCTM().inverse(),
    );
    drag.current = {
      mode: "resize",
      origin,
      items,
      direction,
      vertical,
      styles: elementStyles(state.elementStyles),
      size: state[sizeKeys[items[0]?.id]],
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const finish = (all) => {
    if(dontAsk){repeatPreference.current=all?'all':'single';try{localStorage.setItem('pollframe-studio-repeat-choice',repeatPreference.current);}catch{}}
    if (all && pending) {
      const styles = elementStyles(latest.current.state.elementStyles),
        current = styles[pending.id] || elementDefault,
        base = pending.base[pending.id] || elementDefault;
      for (const id of pending.peers) {
        const old = pending.base[id] || elementDefault;
        styles[id] = {
          scale: Math.max(
            0.7,
            Math.min(1.6, (old.scale * current.scale) / base.scale),
          ),
          x: Math.max(-36, Math.min(36, old.x + current.x - base.x)),
          y: Math.max(-24, Math.min(24, old.y + current.y - base.y)),
        };
      }
      update({ elementStyles: JSON.stringify(styles) });
    }
    session.end();
    setPending(null);
  };
  useEffect(() => {
    if(pending&&repeatPreference.current==='all'){finish(true);return;}
    if (pending && dialogRef.current && !dialogRef.current.open)
      dialogRef.current.showModal();
  }, [pending]);
  const union = boxes.length
    ? {
        left: Math.min(...boxes.map((b) => b.left)),
        top: Math.min(...boxes.map((b) => b.top)),
        right: Math.max(...boxes.map((b) => b.left + b.width)),
        bottom: Math.max(...boxes.map((b) => b.top + b.height)),
      }
    : null;
  return (
    <>
      {["history","party","approval"].includes(topic) && <Suspense fallback={null}><EventCanvas svgRef={svgRef} state={state} update={update} select={select} session={session} l={l} selection={selection} onEdit={onEdit} menu={union && !editing ? {left:Math.max(4,Math.min(union.left,(svgRef.current?.closest(".studio-current-preview-image")?.clientWidth||400)-330)),top:Math.max(4,union.top-42)} : null}/></Suspense>}
      {!editing &&
        boxes.map((box) => (
          <div
            key={box.id}
            className={`studio-selection-outline ${box.editable ? "" : "is-locked"}`}
            style={{
              left: box.left - 3,
              top: box.top - 3,
              width: box.width + 6,
              height: box.height + 6,
            }}
          />
        ))}
      {union &&
        boxes.every((b) => b.editable) &&
        !editing &&
        [
          ["nw", -1],
          ["ne", 1],
          ["sw", -1],
          ["se", 1],
        ].map(([corner, direction]) => (
          <button
            key={corner}
            type="button"
            className={`studio-resize-handle ${corner}`}
            aria-label={l(
              "Auswahl skalieren",
              "Resize selection",
              "Cambiar tamaño de selección",
            )}
            style={{
              left: (corner.endsWith("w") ? union.left : union.right) - 5,
              top: (corner.startsWith("n") ? union.top : union.bottom) - 5,
            }}
            onPointerDown={(e) =>
              resize(e, union, direction, corner.startsWith("n") ? -1 : 1)
            }
            onKeyDown={(e) => {
              if (!["ArrowUp", "ArrowDown"].includes(e.key)) return;
              e.preventDefault();
              begin();
              adjust({
                scale: Math.max(
                  0.7,
                  Math.min(
                    1.6,
                    (elementStyles(state.elementStyles)[ids[0]]?.scale || 1) +
                      (e.key === "ArrowUp" ? 0.05 : -0.05),
                  ),
                ),
              });
              requestAnimationFrame(complete);
            }}
          />
        ))}
      {marquee && <div className="studio-marquee" style={marquee} />}
      {union && !editing && !selection.eventId && (
        <div
          className="studio-selection-bubble"
          style={{
            left: Math.max(
              4,
              Math.min(
                union.left,
                svgRef.current?.closest(".studio-current-preview-image")
                  ?.clientWidth - 120,
              ),
            ),
            top: Math.max(4, union.top - 42),
          }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <button type="button" onClick={onEdit}>{l("Bearbeiten", "Edit", "Editar")}</button>
        </div>
      )}
      {editing && union && (
        <InlineText
          key={editing}
          items={selected()}
          value={draft}
          width={
            topic === "current"
              ? 870
              : ["history", "approval", "party"].includes(topic)
                ? editing === "text"
                  ? 820
                  : 850
                : 840
          }
          leading={
            editing === "text"
              ? state.titleLeading || 1.2
              : topic === "current"
                ? 1.45
                : 1.5
          }
          onBegin={() => session.begin()}
          onLive={(text) => update({ [textKeys[editing]]: text })}
          maxLength={
            editing === "text" ? 100 : editing === "subtitle" ? 160 : 180
          }
          label={l(
            "Text direkt bearbeiten",
            "Edit text directly",
            "Editar texto directamente",
          )}
          onCommit={(text) => {
            update({ [textKeys[editing]]: text }, true);
            session.end();
            setEditing(null);
          }}
          onCancel={() => {
            update({ [textKeys[editing]]: originalText.current });
            session.end();
            setEditing(null);
          }}
        />
      )}
      {pending &&
        createPortal(
          <dialog
            ref={dialogRef}
            aria-labelledby="repeat-title"
            className="studio-repeat-dialog"
            onCancel={(e) => {
              e.preventDefault();
              finish(false);
            }}
          >
            <h2 id="repeat-title">
              {l(
                "Auf ähnliche Elemente anwenden?",
                "Apply to similar elements?",
                "¿Aplicar a elementos similares?",
              )}
            </h2>
            <p>
              {l(
                `Diese Änderung auch auf ${pending.peers.length} weitere gleichartige Beschriftungen übertragen?`,
                `Apply this change to ${pending.peers.length} other labels of the same kind?`,
                `¿Aplicar este cambio a otras ${pending.peers.length} etiquetas del mismo tipo?`,
              )}
            </p>
            <label className="studio-repeat-preference"><input type="checkbox" checked={dontAsk} onChange={e=>setDontAsk(e.target.checked)}/>{l('Diese Entscheidung merken; nicht erneut fragen','Remember this choice; do not ask again','Recordar esta decisión; no volver a preguntar')}</label>
            <div>
              <button
                autoFocus
                className="secondary-button"
                onClick={() => finish(false)}
              >
                {l(
                  "Nur diese Auswahl",
                  "Only this selection",
                  "Solo esta selección",
                )}
              </button>
              <button className="primary-button" onClick={() => finish(true)}>
                {l("Ja, auf alle", "Yes, apply to all", "Sí, aplicar a todas")}
              </button>
            </div>
          </dialog>,
          document.body,
        )}
    </>
  );
}
