// Fixed lanes never collide: an event that cannot fit stays in the editor list
// with a warning rather than silently covering another label.
export function eventLayout(
  events,
  {
    x,
    left,
    right,
    layers = 2,
    limit = 8,
    limits = {},
    lanes = {},
    positions = {},
    width = 176,
  },
) {
  const occupied = Array.from({ length: layers }, () => []),
    visible = [],
    hidden = [];
  const automaticCount = Array(layers).fill(0);
  // Reserve explicitly assigned lanes before flexible pins. Otherwise an
  // automatic-lane pin can occupy the only lane a later pin is allowed to use,
  // leaving a perfectly usable neighbouring lane empty.
  const fixedLane = (event) =>
    Number.isInteger(lanes[event.id]) &&
    lanes[event.id] >= 0 &&
    lanes[event.id] < layers;
  for (const event of [...events].sort(
    (a, b) =>
      Number(Boolean(b.forced)) - Number(Boolean(a.forced)) ||
      Number(fixedLane(b)) - Number(fixedLane(a)),
  )) {
    const labelWidth = Math.min(right - left, event.labelWidth || width);
    const anchor = x(event.date);
    const preferred = Number.isFinite(positions[event.id])
      ? left + positions[event.id] * (right - left)
      : anchor;
    let center = Math.max(
      left + labelWidth / 2,
      Math.min(right - labelWidth / 2, preferred),
    );
    const requested = lanes[event.id];
    // Removing an upper layer returns its events to automatic placement.
    const available = occupied
      .map((_, i) => i)
      .filter(
        (i) =>
          requested === undefined ||
          requested >= layers ||
          Number(requested) === i,
      );
    // Keep the date line inside the banner, allowing it near an edge. Try gap
    // boundaries as well as the centre; a centred-only test wastes usable space.
    const minCenter = Math.max(left + labelWidth / 2, anchor - labelWidth / 2);
    const maxCenter = Math.min(right - labelWidth / 2, anchor + labelWidth / 2);
    center = Math.max(minCenter, Math.min(maxCenter, center));
    const placements = available
      .flatMap((i) => {
        if (!event.forced && automaticCount[i] >= (limits[i] ?? limit))
          return [];
        const candidates =
          event.forced && Number.isFinite(positions[event.id])
            ? [center]
            : [
                center,
                ...occupied[i].flatMap(([a, b]) => [
                  a - labelWidth / 2 - 2,
                  b + labelWidth / 2 + 2,
                ]),
              ];
        return candidates
          .filter((c) => c >= minCenter && c <= maxCenter)
          .filter((c) =>
            occupied[i].every(
              ([a, b]) =>
                c + labelWidth / 2 + 2 <= a || c - labelWidth / 2 - 2 >= b,
            ),
          )
          .map((c) => ({
            lane: i,
            center: c,
            cost: Math.abs(c - center) + i * 0.01,
          }));
      })
      .sort((a, b) => a.cost - b.cost);
    const placement = placements[0];
    if (!placement) {
      hidden.push({
        ...event,
        reason: available.every(
          (i) => !event.forced && automaticCount[i] >= (limits[i] ?? limit),
        )
          ? "density"
          : "space",
      });
      continue;
    }
    const lane = placement.lane;
    occupied[lane].push([
      placement.center - labelWidth / 2 - 2,
      placement.center + labelWidth / 2 + 2,
    ]);
    if (!event.forced) automaticCount[lane]++;
    visible.push({
      ...event,
      center: placement.center,
      labelCenter: placement.center,
      markerX: x(event.date),
      labelWidth,
      lane,
    });
  }
  return { visible, hidden };
}
export function parseEventNumbers(value, min = 0, max = 1) {
  try {
    const raw = typeof value === "string" ? JSON.parse(value) : value;
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
    return Object.fromEntries(
      Object.entries(raw)
        .slice(0, 80)
        .filter(
          ([k, v]) =>
            /^[\w-]{1,100}$/.test(k) &&
            Number.isFinite(v) &&
            v >= min &&
            v <= max,
        ),
    );
  } catch {
    return {};
  }
}
export function parseEventLanes(value) {
  try {
    const raw = JSON.parse(value || "{}");
    return Object.fromEntries(
      Object.entries(raw)
        .slice(0, 80)
        .filter(
          ([k, v]) =>
            /^[\w-]{1,100}$/.test(k) && Number.isInteger(v) && v >= 0 && v < 4,
        ),
    );
  } catch {
    return {};
  }
}
