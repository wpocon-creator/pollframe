import { useEffect, useRef, useState } from "react";
import { editRecipe } from "./studio-edit-model.js";

export function useEditorSession(
  state,
  apply,
  backgroundImage,
  setBackground,
  enabled,
) {
  const past = useRef([]),
    future = useRef([]),
    last = useRef(null),
    latest = useRef(null),
    gesture = useRef(null);
  const [, refresh] = useState(0);
  latest.current = { state, apply, backgroundImage, setBackground };
  const snapshot = () => ({
    ...editRecipe(latest.current.state),
    backgroundImage: latest.current.backgroundImage,
  });
  const restore = (recipe) => {
    const { backgroundImage, ...patch } = recipe;
    latest.current.setBackground(backgroundImage || "");
    latest.current.apply(patch);
  };
  const change = (patch, finish = false) => {
    const current = snapshot();
    if (Object.entries(patch).every(([k, v]) => current[k] === v)) return;
    const key = Object.keys(patch).sort().join(","),
      now = Date.now();
    if (
      gesture.current
        ? !gesture.current.changed
        : !last.current ||
          last.current.key !== key ||
          now - last.current.time > 650
    ) {
      past.current.push(current);
      if (past.current.length > 60) past.current.shift();
    }
    if (gesture.current) gesture.current.changed = true;
    last.current = finish ? null : { key, time: now };
    future.current = [];
    restore({ ...current, ...patch });
    refresh((n) => n + 1);
  };
  const undo = () => {
    if (!past.current.length) return;
    future.current.push(snapshot());
    restore(past.current.pop());
    last.current = null;
    refresh((n) => n + 1);
  };
  const redo = () => {
    if (!future.current.length) return;
    past.current.push(snapshot());
    restore(future.current.pop());
    last.current = null;
    refresh((n) => n + 1);
  };
  const commands = useRef(null);
  commands.current = { undo, redo };
  useEffect(() => {
    if (!enabled) return;
    const onKey = (event) => {
      const editable = event.target.closest?.(
        "textarea,input:not([type=range]):not([type=color]),[contenteditable=true]",
      );
      if (editable) return; // Preserve native text undo, deletion and selection.
      const key = event.key.toLowerCase();
      if (
        (key === "backspace" || key === "delete") &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey
      )
        event.preventDefault();
      if (
        (event.ctrlKey || event.metaKey) &&
        !event.altKey &&
        ["z", "y"].includes(key)
      ) {
        event.preventDefault();
        commands.current[key === "y" || event.shiftKey ? "redo" : "undo"]();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [enabled]);
  return {
    change,
    undo,
    redo,
    begin: () => {
      gesture.current = { changed: false };
      last.current = null;
    },
    end: () => {
      gesture.current = null;
      last.current = null;
    },
    canUndo: past.current.length > 0,
    canRedo: future.current.length > 0,
  };
}

export function useStudioEditorDevice() {
  const permitted = () =>
    innerWidth >= 768 && Math.min(screen.width, screen.height) >= 600;
  const [allowed, setAllowed] = useState(permitted);
  useEffect(() => {
    const update = () => setAllowed(permitted());
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  return allowed;
}
