import { useEffect, useLayoutEffect, useRef, useState } from "react";

// Deliberately slower than a tap: the tile has time to visibly compress before
// it detaches from the grid, matching the familiar iOS home-screen gesture.
const HOLD_DELAY_MS = 420;
const SCROLL_CANCEL_DISTANCE = 9;
const DRAG_START_DISTANCE = 6;
const REORDER_COOLDOWN_MS = 72;
const DROP_ANIMATION_MS = 190;
const EDGE_SCROLL_VIEWPORT_RATIO = .17;
const EDGE_SCROLL_MIN_ZONE_PX = 76;
const EDGE_SCROLL_MAX_ZONE_PX = 118;
const EDGE_SCROLL_MAX_PX_PER_SECOND = 1100;
const EDGE_SCROLL_ACCELERATION_MS = 72;
const HAPTIC_PULSE_MS = 14;
const INTERACTIVE_SELECTOR = "button,a,input,select,textarea,[contenteditable='true'],[data-watch-drag-ignore]";

export function verticalEdgeScrollSpeed(clientY, viewportHeight, viewportTop = 0) {
  if (!Number.isFinite(clientY) || !Number.isFinite(viewportHeight) || !Number.isFinite(viewportTop) || viewportHeight <= 0) return 0;
  const pointerY = clientY - viewportTop;
  const edgeZone = Math.min(EDGE_SCROLL_MAX_ZONE_PX, Math.max(EDGE_SCROLL_MIN_ZONE_PX, viewportHeight * EDGE_SCROLL_VIEWPORT_RATIO));
  if (pointerY < edgeZone) {
    const depth = Math.min(1, Math.max(0, (edgeZone - pointerY) / edgeZone));
    const easedDepth = depth * depth * (3 - 2 * depth);
    return -EDGE_SCROLL_MAX_PX_PER_SECOND * easedDepth;
  }
  const edgeStart = viewportHeight - edgeZone;
  if (pointerY <= edgeStart) return 0;
  const depth = Math.min(1, Math.max(0, (pointerY - edgeStart) / edgeZone));
  // Smoothstep keeps the first part of the edge calm while still reaching a
  // useful speed when the finger is held directly at the bottom of the screen.
  const easedDepth = depth * depth * (3 - 2 * depth);
  return EDGE_SCROLL_MAX_PX_PER_SECOND * easedDepth;
}

export function documentScrollMetrics({
  windowY = 0,
  pageYOffset = 0,
  rootTop = 0,
  documentTop = 0,
  bodyTop = 0,
  rootHeight = 0,
  documentHeight = 0,
  bodyHeight = 0,
  viewportHeight = 0,
} = {}) {
  const position = Math.max(0, windowY, pageYOffset, rootTop, documentTop, bodyTop);
  const maximum = Math.max(0, Math.max(rootHeight, documentHeight, bodyHeight) - viewportHeight);
  return { position, maximum };
}

function currentDocumentScrollMetrics(rootScroller) {
  return documentScrollMetrics({
    windowY: window.scrollY,
    pageYOffset: window.pageYOffset,
    rootTop: rootScroller.scrollTop,
    documentTop: document.documentElement.scrollTop,
    bodyTop: document.body?.scrollTop,
    rootHeight: rootScroller.scrollHeight,
    documentHeight: document.documentElement.scrollHeight,
    bodyHeight: document.body?.scrollHeight,
    viewportHeight: window.visualViewport?.height ?? window.innerHeight,
  });
}

function canElementScroll(element, direction) {
  if (!element || direction === 0) return false;
  const rootScroller = document.scrollingElement ?? document.documentElement;
  if (element === rootScroller) {
    const { position, maximum } = currentDocumentScrollMetrics(rootScroller);
    return direction < 0 ? position > 1 : position < maximum - 1;
  }
  const maximum = Math.max(0, element.scrollHeight - element.clientHeight);
  if (maximum <= 1) return false;
  return direction < 0 ? element.scrollTop > 1 : element.scrollTop < maximum - 1;
}

function scrollableElementAtPointer(clientX, clientY, direction) {
  const rootScroller = document.scrollingElement ?? document.documentElement;
  const viewportWidth = Math.max(1, document.documentElement.clientWidth || window.innerWidth);
  const viewportHeight = Math.max(1, window.innerHeight);
  const x = Math.min(viewportWidth - 1, Math.max(0, clientX));
  const y = Math.min(viewportHeight - 1, Math.max(0, clientY));
  const visited = new Set();
  for (const hit of document.elementsFromPoint?.(x, y) ?? []) {
    let element = hit;
    while (element instanceof HTMLElement && element !== document.body && element !== document.documentElement) {
      if (visited.has(element)) break;
      visited.add(element);
      const overflowY = getComputedStyle(element).overflowY;
      if (/^(auto|scroll|overlay)$/.test(overflowY) && canElementScroll(element, direction)) return element;
      element = element.parentElement;
    }
  }
  return canElementScroll(rootScroller, direction) ? rootScroller : null;
}

function scrollElementImmediately(element, distance) {
  if (!element || distance === 0) return false;
  const rootScroller = document.scrollingElement ?? document.documentElement;
  if (element === rootScroller) {
    // Installed iOS web apps can report a useful window.scrollY while the root
    // element's scrollTop remains zero. Read the largest browser-provided value
    // and calculate the viewport boundary independently of clientHeight.
    const { position: before, maximum } = currentDocumentScrollMetrics(rootScroller);
    const destination = Math.min(maximum, Math.max(0, before + distance));
    window.scrollTo(window.scrollX, destination);
    // Safari may expose the new position only on the next animation frame.
    // Returning the requested movement keeps the frame loop and ghost update
    // alive without depending on a synchronous scrollTop reflection.
    return Math.abs(destination - before) > .1;
  }
  const maximum = Math.max(0, element.scrollHeight - element.clientHeight);
  const before = element.scrollTop;
  const destination = Math.min(maximum, Math.max(0, before + distance));
  element.scrollTop = destination;
  return Math.abs(element.scrollTop - before) > .1;
}

function latestPointerSample(event) {
  const samples = event.getCoalescedEvents?.();
  return samples?.length ? samples[samples.length - 1] : event;
}

function nearestTouch(touches, clientX, clientY) {
  return Array.from(touches ?? []).reduce((nearest, touch) => {
    const distance = (touch.clientX - clientX) ** 2 + (touch.clientY - clientY) ** 2;
    return !nearest || distance < nearest.distance ? { touch, distance } : nearest;
  }, null)?.touch;
}

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
  ghost.classList.remove("is-dragging", "is-drag-pressing");
  ghost.classList.add("watch-card-drag-ghost", "is-lifting");
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
    if (session.pressFrame) cancelAnimationFrame(session.pressFrame);
    if (session.frame) cancelAnimationFrame(session.frame);
    if (session.liftFrame) cancelAnimationFrame(session.liftFrame);
    session.card?.classList.remove("is-drag-pressing");
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

  function runFrame(timestamp) {
    const session = sessionRef.current;
    if (!session?.active) return;
    session.frame = 0;
    if (session.positionDirty) {
      session.positionDirty = false;
      updatePreview(session);
    }
    const frameTime = Number.isFinite(timestamp) ? timestamp : performance.now();
    const elapsed = session.lastFrameTime
      ? Math.min(40, Math.max(8, frameTime - session.lastFrameTime))
      : 1000 / 60;
    session.lastFrameTime = frameTime;
    const visualViewport = window.visualViewport;
    const viewportTop = visualViewport?.offsetTop ?? 0;
    const viewportHeight = visualViewport?.height ?? window.innerHeight;
    // Edge intent comes only from the live pointer/finger coordinate. The
    // dragged card's dimensions and offset never influence scrolling.
    const targetVelocity = verticalEdgeScrollSpeed(session.clientY, viewportHeight, viewportTop);
    if (targetVelocity !== 0) {
      if (session.scrollVelocity !== 0 && Math.sign(session.scrollVelocity) !== Math.sign(targetVelocity)) session.scrollVelocity = 0;
      const acceleration = 1 - Math.exp(-elapsed / EDGE_SCROLL_ACCELERATION_MS);
      session.scrollVelocity += (targetVelocity - session.scrollVelocity) * acceleration;
    } else {
      // Leaving both edge zones is an explicit stop gesture. Avoid inertia here
      // so the page never keeps moving underneath a stationary dragged card.
      session.scrollVelocity = 0;
    }
    if (targetVelocity !== 0) {
      const scrollingElement = scrollableElementAtPointer(session.clientX, session.clientY, Math.sign(targetVelocity));
      if (scrollElementImmediately(scrollingElement, session.scrollVelocity * elapsed / 1000)) {
        updatePreview(session);
      }
      // Keep sampling while the finger is at an edge. This also recovers when
      // a nested scroller reaches its end and the page becomes the next target.
      session.frame = requestAnimationFrame(runFrame);
    } else if (session.positionDirty) {
      updatePreview(session);
    }
  }

  function handlePointerMove(event) {
    const session = sessionRef.current;
    if (!session || event.pointerId !== session.pointerId) return;
    const sample = latestPointerSample(event);
    session.clientX = sample.clientX;
    session.clientY = sample.clientY;
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
    const compressedRect = session.card.getBoundingClientRect();
    // getBoundingClientRect includes the press animation's scale. Using that
    // width for the floating tile made its "lift" smaller than the original.
    const width = session.card.offsetWidth;
    const height = session.card.offsetHeight;
    const rect = new DOMRect(
      compressedRect.left - (width - compressedRect.width) / 2,
      compressedRect.top - (height - compressedRect.height) / 2,
      width, height,
    );
    const ghost = createDragGhost(session.card);
    const shell = document.createElement("div");
    shell.className = "watch-card-drag-shell";
    shell.style.width = `${rect.width}px`;
    shell.style.height = `${rect.height}px`;
    shell.append(ghost);
    document.body.append(shell);
    session.card.classList.remove("is-drag-pressing");
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
      lastFrameTime: 0,
      scrollVelocity: 0,
      positionDirty: true,
      liftFrame: 0,
    });
    session.candidates = watchCards(session.grid).filter((candidate) => candidate.dataset.watchId !== session.id);
    setDraggingId(session.id);
    document.documentElement.classList.add("watch-reordering");
    if (session.pointerType !== "mouse") {
      try { navigator.vibrate?.(HAPTIC_PULSE_MS); } catch { /* haptics are optional */ }
    }
    try { session.captureElement.setPointerCapture?.(session.pointerId); } catch { /* already captured or unsupported */ }
    // Two frames guarantee that Safari paints the compressed floating copy
    // before applying the lift. A single rAF can be coalesced in an installed
    // iOS app, making the whole compress-and-pop transition invisible.
    session.liftFrame = requestAnimationFrame(() => {
      if (sessionRef.current !== session || !session.active) return;
      session.liftFrame = requestAnimationFrame(() => {
        if (sessionRef.current !== session || !session.active) return;
        session.liftFrame = 0;
        session.ghost.classList.remove("is-lifting");
        session.ghost.classList.add("is-lifted");
      });
    });
    session.frame = requestAnimationFrame(runFrame);
  }

  function beginDrag(event, itemId, touchIdentifier = null) {
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
      touchIdentifier,
      frame: 0,
      holdTimer: 0,
      pressFrame: 0,
    };
    card.classList.add("is-drag-pressing");
    const finishFromPointer = (releaseEvent) => { if (releaseEvent.pointerId === session.pointerId) finishDrag(true); };
    const cancelFromPointer = (cancelEvent) => {
      if (cancelEvent.pointerId !== session.pointerId) return;
      // Safari can cancel its PointerEvent stream while continuing to deliver
      // the same physical contact through TouchEvents. Keep that live touch as
      // the source of truth; touchcancel/touchend still terminate it safely.
      if (session.pointerType === "touch" && session.touchIdentifier != null) return;
      finishDrag(false);
    };
    const trackedTouchEnded = (touchEvent) => session.pointerType === "touch"
      && session.touchIdentifier != null
      && !Array.from(touchEvent.touches ?? []).some((touch) => touch.identifier === session.touchIdentifier);
    const finishFromTouch = (touchEvent) => { if (touchEvent.touches.length === 0 || trackedTouchEnded(touchEvent)) finishDrag(true); };
    const cancelFromTouch = (touchEvent) => { if (touchEvent.touches.length === 0 || trackedTouchEnded(touchEvent)) finishDrag(false); };
    const trackTouchStart = (touchEvent) => {
      if (touchEvent.touches.length > 1) { finishDrag(false); return; }
      if (session.pointerType !== "touch" || session.touchIdentifier != null) return;
      session.touchIdentifier = nearestTouch(touchEvent.touches, session.clientX, session.clientY)?.identifier;
    };
    const blockTouchMove = (moveEvent) => {
      if (sessionRef.current !== session) return;
      // Safari can thin out pointermove delivery during a captured touch. Its
      // TouchEvent still contains the real finger position, so use that as a
      // fallback rather than letting the ghost position drive edge scrolling.
      const touch = session.touchIdentifier == null
        ? nearestTouch(moveEvent.touches, session.clientX, session.clientY)
        : Array.from(moveEvent.touches ?? []).find((candidate) => candidate.identifier === session.touchIdentifier);
      if (touch) {
        session.clientX = touch.clientX;
        session.clientY = touch.clientY;
        if (session.pending) {
          if (Math.hypot(touch.clientX - session.pressX, touch.clientY - session.pressY) > SCROLL_CANCEL_DISTANCE) finishDrag(false);
          return;
        }
        if (!session.active) return;
        session.positionDirty = true;
        if (!session.frame) session.frame = requestAnimationFrame(runFrame);
      }
      if (session.active && moveEvent.cancelable) moveEvent.preventDefault();
    };
    const cancelFromWindow = () => finishDrag(false);
    const cancelWhenHidden = () => { if (document.visibilityState === "hidden") finishDrag(false); };
    const cancelFromKeyboard = (keyEvent) => { if (keyEvent.key === "Escape") { keyEvent.preventDefault(); finishDrag(false); } };
    session.detachListeners = () => {
      window.removeEventListener("pointermove", handlePointerMove, true);
      window.removeEventListener("pointerup", finishFromPointer, true);
      window.removeEventListener("pointercancel", cancelFromPointer, true);
      window.removeEventListener("touchend", finishFromTouch, true);
      window.removeEventListener("touchcancel", cancelFromTouch, true);
      window.removeEventListener("touchstart", trackTouchStart, true);
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
    window.addEventListener("touchstart", trackTouchStart, { capture: true, passive: true });
    window.addEventListener("touchmove", blockTouchMove, { capture: true, passive: false });
    window.addEventListener("blur", cancelFromWindow);
    window.addEventListener("keydown", cancelFromKeyboard, true);
    document.addEventListener("visibilitychange", cancelWhenHidden, true);
    sessionRef.current = session;
    try { session.captureElement.setPointerCapture?.(event.pointerId); } catch { /* synthetic or unsupported pointer */ }
    // Begin the hold clock only after two painted frames. On a busy first load
    // Safari could otherwise run an already-due timer before ever presenting
    // the compressed state, which made the gesture look as if it did nothing.
    session.pressFrame = requestAnimationFrame(() => {
      if (sessionRef.current !== session || !session.pending) return;
      session.pressFrame = requestAnimationFrame(() => {
        session.pressFrame = 0;
        if (sessionRef.current !== session || !session.pending) return;
        session.holdTimer = window.setTimeout(() => activateDrag(session), HOLD_DELAY_MS);
      });
    });
  }

  function beginTouchDrag(event, itemId) {
    if (sessionRef.current || event.touches.length > 1) return;
    const touch = Array.from(event.changedTouches ?? event.touches ?? [])[0];
    if (!touch) return;
    // Pointer Events are normally the primary path. Installed Safari PWAs can
    // occasionally omit pointerdown after resuming, so start the identical
    // session from the native TouchEvent as a narrow fallback.
    beginDrag({
      target: event.target,
      currentTarget: event.currentTarget,
      pointerType: "touch",
      pointerId: -(touch.identifier + 1),
      clientX: touch.clientX,
      clientY: touch.clientY,
    }, itemId, touch.identifier);
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

  return { announcement, beginDrag, beginTouchDrag, draggingId, finishDrag, keyboardReorder };
}
