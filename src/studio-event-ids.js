export const eventIds = (value) =>
  new Set(
    String(value || "")
      .split(",")
      .filter(Boolean),
  );
export const cleanEventIds = (value) =>
  [...eventIds(value)]
    .filter((id) => /^[\w-]{1,100}$/.test(id))
    .slice(0, 80)
    .join(",");
