// A menu portalled inside a native dialog must remain in that dialog's top
// layer. A transformed dialog also becomes its fixed-position containing
// block: viewport coordinates must then be converted to dialog coordinates.
export function studioSelectPosition(anchor, viewport, count, host = null) {
  const topEdge = Math.max(viewport.top + 12, host ? host.top + 12 : -Infinity);
  const bottomEdge = Math.min(viewport.top + viewport.height - 12, host ? host.bottom - 12 : Infinity);
  const leftEdge = Math.max(12, host ? host.left + 12 : 0);
  const rightEdge = Math.min(viewport.width - 12, host ? host.right - 12 : Infinity);
  const width = Math.min(Math.max(anchor.width, 176), Math.max(0, rightEdge - leftEdge));
  const below = Math.max(0, bottomEdge - anchor.bottom - 6);
  const above = Math.max(0, anchor.top - topEdge - 6);
  const desired = Math.min(288, count * 44 + 12);
  const down = below >= Math.min(desired, 160) || below >= above;
  const maxHeight = Math.min(desired, down ? below : above);
  return {
    left: Math.max(leftEdge, Math.min(anchor.left, rightEdge - width)) - (host?.originLeft || 0),
    top: (down ? anchor.bottom + 6 : Math.max(topEdge, anchor.top - maxHeight - 6)) - (host?.originTop || 0),
    width,
    maxHeight,
  };
}
