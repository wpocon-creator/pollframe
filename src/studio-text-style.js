import { STUDIO_FONTS } from "./studio-fonts.js";
export const TEXT_ROLES = [
  "headline",
  "subtitle",
  "editorNote",
  "labels",
  "values",
  "axes",
  "sources",
];
export function normalizeTextStyles(value) {
  let raw;
  try {
    raw = typeof value === "string" ? JSON.parse(value) : value;
  } catch {
    return {};
  }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  return Object.fromEntries(
    TEXT_ROLES.filter((role) => raw[role] && typeof raw[role] === "object").map(
      (role) => {
        const s = raw[role];
        return [
          role,
          {
            font:
              STUDIO_FONTS.some((f) => f[0] === s.font) ||
              /^custom-[a-f0-9-]{36}$/.test(s.font)
                ? s.font
                : "auto",
            italic: s.italic === true,
            weight: [400, 500, 600, 700, 800].includes(Number(s.weight))
              ? Number(s.weight)
              : 0,
            color: /^#[a-f\d]{6}$/i.test(s.color) ? s.color : "",
            scale: Number.isFinite(Number(s.scale))
              ? Math.max(0.85, Math.min(1.35, Number(s.scale)))
              : 1,
          },
        ];
      },
    ),
  );
}
