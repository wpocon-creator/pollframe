import { useEffect, useLayoutEffect, useRef, useState } from "react";

const HOLD_DELAY_MS = 185;
const SCROLL_CANCEL_DISTANCE = 9;
const DRAG_START_DISTANCE = 6;
const REORDER_COOLDOWN_MS = 72;
const DROP_ANIMATION_MS = 190;
const INTERACTIVE_SELECTOR = "button,a,input,select,textarea,[contenteditable='true'],[data-watch-drag-ignore]";

function watchCards(grid) {
  return grid ? [...grid.querySelectorAll(":scope > [data-watch-id]")] : [];
}

function captureRects(grid) {
  return new Map(watchCards(grid).map((card) => [card.dataset.watchId, card.getBoundingClientRect()]));
}

function reorderItems(items, sourceId, targetId, afterTarget) {
  if (!sourceId || !targetId || sourceId === targetId) return null;
  const next = [...items];
  const sourceIndex = next.findIndex((item) => item.id === sourceId);
  const targetIndex = next.findIndex((item) => item.id === targetId);
  if (sourceIndex < 0 || targetIndex < 0) return null;
  const [moved] = next.splice(sourceIndex, 1);
  const shiftedTargetIndex = targetIndex - (sourceIndex < targetIndex ? 1 : 0);
  const insertionIndex = Math.max(0, Math.min(next.length, shiftedTargetIndex + (afterTarget ? 1 : 0)));
  next.splice(insertionIndex, 0, moved);
  return next.every((item, index) => item.id === items[index]?.id) ? null : next;
}

function replaceGhostReferences(ghost) {
  const prefix = `watch-ghost-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-`;
  const elements = [ghost, ...ghost.querySelectorAll("*")];
  const idMap = new Map();
  elements.forEach((element) => {
    if (!element.id) return;
    const replacement = `${prefix}${element.id}`;
    idMap.set(element.id, replacement);
    element.id = replacement;
  });
  if (!idMap.size) return;
  const tokenAttributes = new Set(["aria-controls", "aria-describedby", "aria-labelledby", "aria-owns"]);
  elements.forEach((element) => {
    element.getAttributeNames().forEach((name) => {
      const value = element.getAttribute(name);
      if (!value) return;
      let replacement = value;
      if (tokenAttributes.has(name)) replacement = value.split(/\s+/).map((token) => idMap.get(token) ?? token).join(" ");
      else if (["for", "href", "xlink:href"].includes(name) && value.startsWith("#")) replacement = `#${idMap.get(value.slice(1)) ?? value.slice(1)}`;
      replacement = replacement.replace(/url\(#([^)]+)\)/g, (match, id) => idMap.has(id) ? `url(#${idMap.get(id)})` : match);
      if (replacement !== value) element.setAttribute(name, replacement);
    });
  });
}

function createDragGhost(card) {
  const ghost = card.cloneNode(true);
  ghost.removeAttribute("data-watch-id");
  ghost.removeAttribute("role");
  ghost.removeAttribute("tabindex");
  ghost.setAttribute("aria-hidden", "true");
  ghost.inert = true;
  ghost.classList.remove("is-dragging");
  ghost.classList.add("watch-card-drag-ghost");
  ghost.querySelectorAll("button,a,input,select,textarea").forEach((control) => control.setAttribute("tabindex", "-1"));
  replaceGhostReferences(ghost);
  return ghost;
}

function nearestCard(candidates, clientX, clientY) {
  return candidates.reduce((nearest, card) => {
    if (!card.isConnected) return nearest;
    const rect = card.getBoundingClientRect();
    const distance = ((rect.left + rect.width / 2) - clientX) ** 2 + ((rect.top + rect.height / 2) - clientY) ** 2;
    return !nearest || distance < nearest.distance ? { card, distance } : nearest;
  }, null)?.card;
}

function dropPlacement(target, grid, clientX, clientY) {
  const rect = target.getBoundingClientRect();
  const gridRect = grid.getBoundingClientRect();
  const nearVerticalEdge = clientY < rect.top + rect.height * .28 || clientY > rect.bottom - rect.height * .28;
  const useHorizontalAxis = !nearVerticalEdge && rect.width < gridRect.width * .72 && clientY >= rect.top && clientY <= rect.bottom;
  const position = useHorizontalAxis ? clientX : clientY;
  const middle = useHorizontalAxis ? rect.left + rect.width / 2 : rect.top + rect.height / 2;
  const size = useHorizontalAxis ? rect.width : rect.height;
  const calmZone = Math.min(useHorizontalAxis ? 17 : 22, size * .13);
  if (Math.abs(position - middle) < calmZone) return null;
  return { afterTarget: position > middle, slot: `${target.dataset.watchId}:${position > middle ? "after" : "before"}` };
}

function canStartDrag(event) {
  if (event.pointerType === "mouse" && event.button !== 0) return false;
  const interactive = event.target.closest?.(INTERACTIVE_SELECTOR);
  return !interactive || interactive.classList.contains("watch-drag-handle");
}

export function useWatchlistReorder({ cards, enabled, items, persistItems, setItems, translate }) {
  const itemsRef = useRef(items);
  const sessionRef = useRef(null);
  const beforeRectsRef = useRef(null);
  const landingRef = useRef(null);
  const [draggingId, setDraggingId] = useState(null);
  const [announcement, setAnnouncement] = useState("");
  itemsRef.current = items;

  function clearLanding(updateState = true) {
    const landing = landingRef.current;
    if (!landing) return;
    if (landing.frame) cancelAnimationFrame(landing.frame);
    window.clearTimeout(landing.timer);
    landing.shell.remove();
    landingRef.current = null;
    if (updateState) setDraggingId(null);
  }

  function detachSession(session) {
    if (!session) return;
    if (session.holdTimer) window.clearTimeout(session.holdTimer);
    if (session.frame) cancelAnimationFrame(session.frame);
    session.detachListeners?.();
    try { session.captureElement?.releasePointerCapture?.(session.pointerId); } catch { /* already released */ }
  }

  function finishDrag(commit = true) {
    const session = sessionRef.current;
    if (!session) return;
    if (session.active && commit && session.positionDirty) {
      session.positionDirty = false;
      updatePreview(session);
    }
    detachSession(session);
    beforeRectsRef.current = null;
    if (!session.active) {
      sessionRef.current = null;
      return;
    }

    session.active = false;
    const finalItems = commit ? [...itemsRef.current] : [...session.originalItems];
    itemsRef.current = finalItems;
    if (commit) persistItems(finalItems);
    else setItems(finalItems);

    document.documentElement.classList.remove("watch-reordering");
    sessionRef.current = null;
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const landing = { shell: session.shell, frame: 0, timer: 0 };
      landingRef.current = landing;
      landing.frame = requestAnimationFrame(() => {
        if (landingRef.current !== landing) return;
        landing.frame = 0;
        const fallback = { left: session.originalRect.left, top: session.originalRect.top - (window.scrollY - session.originalScrollY) };
        const destination = session.card.isConnected ? session.card.getBoundingClientRect() : fallback;
        session.shell.style.transition = `transform ${DROP_ANIMATION_MS}ms cubic-bezier(.2,.8,.2,1), opacity ${DROP_ANIMATION_MS}ms ease`;
        session.shell.style.transform = `translate3d(${destination.left}px, ${destination.top}px, 0)`;
        session.shell.style.opacity = ".28";
        session.ghost.classList.add("is-dropping");
        landing.timer = window.setTimeout(() => {
          if (landingRef.current !== landing) return;
          landing.shell.remove();
          landingRef.current = null;
          setDraggingId(null);
        }, DROP_ANIMATION_MS + 10);
      });
    } else {
      session.shell.remove();
      setDraggingId(null);
    }
    const position = finalItems.findIndex((item) => item.id === session.id) + 1;
    setAnnouncement(commit
      ? translate(`Widget an Position ${position} abgelegt`, `Widget placed at position ${position}`, `Widget colocado en la posición ${position}`)
      : translate("Verschieben abgebrochen", "Move cancelled", "Movimiento cancelado"));
  }

  function previewReorder(session, targetId, afterTarget) {
    const next = reorderItems(itemsRef.current, session.id, targetId, afterTarget);
    if (!next) return false;
    beforeRectsRef.current = captureRects(session.grid);
    itemsRef.current = next;
    setItems(next);
    return true;
  }

  function updatePreview(session) {
    if (!session.active) return;
    const { clientX, clientY } = session;
    session.shell.style.transform = `translate3d(${clientX - session.offsetX}px, ${clientY - session.offsetY}px, 0)`;
    if (!session.moved) {
      if (Math.hypot(clientX - session.startX, clientY - session.startY) < DRAG_START_DISTANCE) return;
      session.moved = true;
    }
    let target = document.elementFromPoint(clientX, clientY)?.closest?.("[data-watch-id]");
    if (target?.closest(".watchlist-grid") !== session.grid || target.dataset.watchId === session.id) target = null;
    target ??= nearestCard(session.candidates, clientX, clientY);
    if (!target) return;
    const placement = dropPlacement(target, session.grid, clientX, clientY);
    if (!placement) return;
    const now = performance.now();
    const movementSinceReorder = session.lastReorderPointer
      ? Math.hypot(clientX - session.lastReorderPointer.x, clientY - session.lastReorderPointer.y)
      : Number.POSITIVE_INFINITY;
    const requiredTravel = session.pointerType === "touch" ? 14 : 10;
    if (placement.slot === session.lastSlot || now - session.lastReorder < REORDER_COOLDOWN_MS || movementSinceReorder < requiredTravel) return;
    if (previewReorder(session, target.dataset.watchId, placement.afterTarget)) {
      session.lastSlot = placement.slot;
      session.lastReorder = now;
      session.lastReorderPointer = { x: clientX, y: clientY };
    }
  }

  function runFrame() {
    const session = sessionRef.current;
    if (!session?.active) return;
    session.frame = 0;
    if (session.positionDirty) {
      session.positionDirty = false;
      updatePreview(session);
    }
    const edge = Math.min(96, window.innerHeight * .17);
    let velocity = 0;
    if (session.clientY < edge) velocity = -Math.min(15, ((edge - session.clientY) / edge) * 15);
    else if (session.clientY > window.innerHeight - edge) velocity = Math.min(15, ((session.clientY - (window.innerHeight - edge)) / edge) * 15);
    const scrollingElement = document.scrollingElement ?? document.documentElement;
    const maximumScroll = Math.max(0, scrollingElement.scrollHeight - window.innerHeight);
    const canScroll = velocity < 0 ? window.scrollY > 0 : velocity > 0 && window.scrollY < maximumScroll - 1;
    if (canScroll) {
      window.scrollBy(0, velocity);
      updatePreview(session);
      session.frame = requestAnimationFrame(runFrame);
    }
  }

  function handlePointerMove(event) {
    const session = sessionRef.current;
    if (!session || event.pointerId !== session.pointerId) return;
    session.clientX = event.clientX;
    session.clientY = event.clientY;
    if (session.pending) {
      const distance = Math.hypot(event.clientX - session.pressX, event.clientY - session.pressY);
      if (distance > SCROLL_CANCEL_DISTANCE) finishDrag(false);
      return;
    }
    if (!session.active) return;
    if (event.cancelable) event.preventDefault();
    session.positionDirty = true;
    if (!session.frame) session.frame = requestAnimationFrame(runFrame);
  }

  function activateDrag(session) {
    if (sessionRef.current !== session || !session.pending || !session.card.isConnected) return;
    session.pending = false;
    session.active = true;
    session.holdTimer = 0;
    const rect = session.card.getBoundingClientRect();
    const ghost = createDragGhost(session.card);
    const shell = document.createElement("div");
    shell.className = "watch-card-drag-shell";
    shell.style.width = `${rect.width}px`;
    shell.style.height = `${rect.height}px`;
    shell.append(ghost);
    document.body.append(shell);
    Object.assign(session, {
      originalRect: rect,
      originalScrollY: window.scrollY,
      shell,
      ghost,
      grid: session.card.closest(".watchlist-grid"),
      offsetX: session.clientX - rect.left,
      offsetY: session.clientY - rect.top,
      startX: session.clientX,
      startY: session.clientY,
      moved: false,
      lastSlot: null,
      lastReorder: 0,
      lastReorderPointer: null,
      positionDirty: true,
    });
    session.candidates = watchCards(session.grid).filter((candidate) => candidate.dataset.watchId !== session.id);
    setDraggingId(session.id);
    document.documentElement.classList.add("watch-reordering");
    try { session.captureElement.setPointerCapture?.(session.pointerId); } catch { /* already captured or unsupported */ }
    session.frame = requestAnimationFrame(runFrame);
  }

  function beginDrag(event, itemId) {
    if (!canStartDrag(event) || sessionRef.current) return;
    clearLanding();
    const card = event.currentTarget.closest("[data-watch-id]");
    if (!card) return;
    const session = {
      active: false,
      pending: true,
      id: itemId,
      pointerId: event.pointerId,
      pointerType: event.pointerType,
      card,
      captureElement: event.currentTarget,
      originalItems: [...itemsRef.current],
      clientX: event.clientX,
      clientY: event.clientY,
      pressX: event.clientX,
      pressY: event.clientY,
      frame: 0,
      holdTimer: 0,
    };
    const finishFromPointer = (releaseEvent) => { if (releaseEvent.pointerId === session.pointerId) finishDrag(true); };
    const cancelFromPointer = (cancelEvent) => { if (cancelEvent.pointerId === session.pointerId) finishDrag(false); };
    const finishFromTouch = (touchEvent) => { if (touchEvent.touches.length === 0) finishDrag(true); };
    const cancelFromTouch = (touchEvent) => { if (touchEvent.touches.length === 0) finishDrag(false); };
    const blockTouchMove = (moveEvent) => { if (sessionRef.current === session && session.active && moveEvent.cancelable) moveEvent.preventDefault(); };
    const cancelFromWindow = () => finishDrag(false);
    const cancelWhenHidden = () => { if (document.visibilityState === "hidden") finishDrag(false); };
    const cancelFromKeyboard = (keyEvent) => { if (keyEvent.key === "Escape") { keyEvent.preventDefault(); finishDrag(false); } };
    session.detachListeners = () => {
      window.removeEventListener("pointermove", handlePointerMove, true);
      window.removeEventListener("pointerup", finishFromPointer, true);
      window.removeEventListener("pointercancel", cancelFromPointer, true);
      window.removeEventListener("touchend", finishFromTouch, true);
      window.removeEventListener("touchcancel", cancelFromTouch, true);
      window.removeEventListener("touchmove", blockTouchMove, true);
      window.removeEventListener("blur", cancelFromWindow);
      window.removeEventListener("keydown", cancelFromKeyboard, true);
      document.removeEventListener("visibilitychange", cancelWhenHidden, true);
    };
    window.addEventListener("pointermove", handlePointerMove, true);
    window.addEventListener("pointerup", finishFromPointer, true);
    window.addEventListener("pointercancel", cancelFromPointer, true);
    window.addEventListener("touchend", finishFromTouch, { capture: true, passive: true });
    window.addEventListener("touchcancel", cancelFromTouch, { capture: true, passive: true });
    window.addEventListener("touchmove", blockTouchMove, { capture: true, passive: false });
    window.addEventListener("blur", cancelFromWindow);
    window.addEventListener("keydown", cancelFromKeyboard, true);
    document.addEventListener("visibilitychange", cancelWhenHidden, true);
    sessionRef.current = session;
    try { session.captureElement.setPointerCapture?.(event.pointerId); } catch { /* synthetic or unsupported pointer */ }
    session.holdTimer = window.setTimeout(() => activateDrag(session), HOLD_DELAY_MS);
  }

  function keyboardReorder(itemId, direction) {
    const sourceIndex = itemsRef.current.findIndex((item) => item.id === itemId);
    const targetIndex = Math.max(0, Math.min(itemsRef.current.length - 1, sourceIndex + direction));
    if (sourceIndex < 0 || sourceIndex === targetIndex) return;
    const next = [...itemsRef.current];
    const [moved] = next.splice(sourceIndex, 1);
    next.splice(targetIndex, 0, moved);
    itemsRef.current = next;
    persistItems(next);
    setAnnouncement(translate(`Widget an Position ${targetIndex + 1} verschoben`, `Widget moved to position ${targetIndex + 1}`, `Widget movido a la posición ${targetIndex + 1}`));
  }

  useLayoutEffect(() => {
    const before = beforeRectsRef.current;
    if (!before) return;
    beforeRectsRef.current = null;
    const session = sessionRef.current;
    if (!session?.active) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    watchCards(session.grid).forEach((card) => {
      if (card.dataset.watchId === session.id) return;
      const previous = before.get(card.dataset.watchId);
      if (!previous) return;
      const current = card.getBoundingClientRect();
      const deltaX = previous.left - current.left;
      const deltaY = previous.top - current.top;
      if (Math.abs(deltaX) < 1 && Math.abs(deltaY) < 1) return;
      card.getAnimations?.().filter((animation) => animation.id === "watchlist-reorder").forEach((animation) => animation.cancel());
      if (!reduceMotion && typeof card.animate === "function") {
        const animation = card.animate([
          { transform: `translate3d(${deltaX}px, ${deltaY}px, 0)` },
          { transform: "translate3d(0, 0, 0)" },
        ], { duration: 235, easing: "cubic-bezier(.2,.78,.2,1)" });
        animation.id = "watchlist-reorder";
      }
    });
  }, [cards]);

  useEffect(() => {
    if (!enabled) {
      finishDrag(false);
      clearLanding();
    }
  }, [enabled]);

  useEffect(() => () => {
    const session = sessionRef.current;
    detachSession(session);
    session?.shell?.remove();
    const landing = landingRef.current;
    if (landing) {
      if (landing.frame) cancelAnimationFrame(landing.frame);
      window.clearTimeout(landing.timer);
      landing.shell.remove();
    }
    document.documentElement.classList.remove("watch-reordering");
  }, []);

  return { announcement, beginDrag, draggingId, finishDrag, keyboardReorder };
}
