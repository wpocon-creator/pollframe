// Fontsource assets are self-hosted; selecting a font never contacts a CDN.
export const STUDIO_FONTS = [
  ["auto", "Design-Schrift", ""],
  ["sans", "Arial", "Arial, Helvetica, sans-serif"],
  ["serif", "Georgia", "Georgia, serif"],
  ["mono", "Courier", "Courier New, monospace"],
  ["dm-sans", "DM Sans", "PF DM Sans"],
  ["manrope", "Manrope", "PF Manrope"],
  ["outfit", "Outfit", "PF Outfit"],
  ["archivo", "Archivo", "PF Archivo"],
  ["space-grotesk", "Space Grotesk", "PF Space Grotesk"],
  ["newsreader", "Newsreader", "PF Newsreader"],
  ["source-serif-4", "Source Serif 4", "PF Source Serif 4"],
  ["lora", "Lora", "PF Lora"],
  ["roboto-slab", "Roboto Slab", "PF Roboto Slab"],
  ["jetbrains-mono", "JetBrains Mono", "PF JetBrains Mono"],
  ["inter","Inter","PF Inter"],
  ["roboto","Roboto","PF Roboto"],
  ["open-sans","Open Sans","PF Open Sans"],
  ["montserrat","Montserrat","PF Montserrat"],
  ["oswald","Oswald","PF Oswald"],
  ["merriweather","Merriweather","PF Merriweather"],
  ["work-sans","Work Sans","PF Work Sans"],
  ["public-sans","Public Sans","PF Public Sans"],
  ["nunito-sans","Nunito Sans","PF Nunito Sans"],
  ["raleway","Raleway","PF Raleway"],
  ["urbanist","Urbanist","PF Urbanist"],
  ["playfair-display","Playfair Display","PF Playfair Display"],
  ["libre-franklin","Libre Franklin","PF Libre Franklin"],
  ["cormorant-garamond","Cormorant Garamond","PF Cormorant Garamond"],
  ["bitter","Bitter","PF Bitter"],
  ["figtree","Figtree","PF Figtree"],
  ["geist","Geist","PF Geist"],
  ["ibm-plex-sans","IBM Plex Sans","PF IBM Plex Sans"],
];
export const studioFont = (key, fallback = "Arial, sans-serif") =>
  /^custom-[a-f0-9-]{36}$/.test(key) ? `PF ${key}` : STUDIO_FONTS.find((f) => f[0] === key)?.[2] || fallback;
export const textX = (align, margin = 48) =>
  align === "right" ? 960 - margin : align === "center" ? 480 : margin;
export const textAnchor = (align) =>
  align === "right" ? "end" : align === "center" ? "middle" : "start";
