import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { describeElements, elementStyles } from "./studio-elements.js";
import { normalizeTextStyles } from "./studio-text-style.js";
import { loadStudioFont } from "./studio-font-loader.js";
import { studioFont } from "./studio-fonts.js";
import { readableSourceColour } from "./studio-publication-policy.js";
// Shared by thumbnails, editor, SVG/PNG capture and live embeds so individual
// adjustments cannot silently disappear when published.
export default function StudioSvg({ state, forwardedRef, children, ...props }) {
  const ref = useRef(null),
    bases = useRef(new WeakMap()),
    appliedTransforms = useRef(new WeakMap()),
    typographyBases = useRef(new WeakMap());
  const [, setFontVersion] = useState(0);
  const textStyles = normalizeTextStyles(state?.textStyles);
  const fontKeys = [
    ...new Set(
      Object.values(textStyles)
        .map((s) => s.font)
        .filter((f) => f && f !== "auto"),
    ),
  ].join(",");
  useEffect(() => {
    if (!fontKeys) return;
    let active = true;
    Promise.all(
      fontKeys
        .split(",")
        .filter(Boolean)
        .map((key) => loadStudioFont(key)),
    )
      .then(() => {
        if (active) setFontVersion((n) => n + 1);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [fontKeys]);
  const attach = useCallback(
    (node) => {
      ref.current = node;
      if (typeof forwardedRef === "function") forwardedRef(node);
      else if (forwardedRef) forwardedRef.current = node;
    },
    [forwardedRef],
  );
  useLayoutEffect(() => {
    const svg = ref.current;
    if (!svg) return;
    svg.dataset.studioFonts = fontKeys;
    const typography = [];
    const background = svg.querySelector('rect[data-editor-target="image"]')?.getAttribute('fill');
    for (const node of svg.querySelectorAll("text")) {
      const target = node.closest("[data-editor-target]")?.dataset.editorTarget;
      const properties = [
        "font-family",
        "font-size",
        "font-style",
        "font-weight",
        "fill",
      ];
      const original = typographyBases.current.get(node);
      if (original)
        for (const property of properties) {
          if (original[property])
            node.style.setProperty(property, original[property]);
          else node.style.removeProperty(property);
        }
      if (target === "events") continue;
      const content = node.textContent?.trim() || "";
      const role =
        {
          text: "headline",
          subtitle: "subtitle",
          note: "editorNote",
          output: "sources",
          legend: "labels",
        }[target] ||
        (node.closest("a") ||
        /dawum|odbl|source|quelle|fuente|pollframe|published|veröffentlicht|publicad/i.test(
          content,
        )
          ? "sources"
          : /^[−+\-]?\d[\d.,\s]*\s*(%|pp|Pp\.|Sitze)?$/.test(content)
            ? Number(node.getAttribute("font-size")) <= 20
              ? "axes"
              : "values"
            : "labels");
      node.dataset.textRole = role;
      // CSS presentation overrides are reset independently of React's data attributes.
      const style = textStyles[role];
      if (!style) continue;
      if (!original)
        typographyBases.current.set(
          node,
          Object.fromEntries(
            properties.map((p) => [p, node.style.getPropertyValue(p)]),
          ),
        );
      typography.push({ node, style, role });
    }
    // Batch reads and writes. Measuring each label immediately after styling it
    // forced an SVG layout for every individual label during slider movement.
    for (const item of typography) {
      const { node, role, style } = item;
      item.room = Number(node.dataset.textWidth) || Math.max(1, node.getBBox().width * 1.15);
      const size = Number(node.getAttribute("font-size")) || parseFloat(getComputedStyle(node).fontSize) || 18;
      item.size = size * (["headline", "subtitle", "editorNote"].includes(role) ? 1 : style.scale);
    }
    for (const { node, style, role, size } of typography) {
      if (style.font !== "auto") node.style.fontFamily = studioFont(style.font);
      node.style.fontStyle = style.italic ? "italic" : "normal";
      if (style.weight) node.style.fontWeight = String(style.weight);
      if (style.color) {
        node.style.fill = role === 'sources' ? readableSourceColour(style.color,background) || node.getAttribute('fill') || '#172130' : style.color;
      }
      node.style.fontSize = `${size}px`;
    }
    for (const item of typography) item.grown = item.node.getBBox().width;
    for (const { node, size, room, grown } of typography) {
      if (grown > room + 1)
        node.style.fontSize = `${(size * room) / grown}px`;
    }
    if (
      !forwardedRef &&
      !Object.keys(elementStyles(state?.elementStyles)).length &&
      !(Object.keys(textStyles).length && svg.querySelector('[data-layout-width]'))
    )
      return;
    for (const node of svg.querySelectorAll("[data-studio-item]")) {
      // React may have moved a legend after title wrapping or changing the range.
      // Respect that new renderer position rather than restoring a stale one.
      if(appliedTransforms.current.has(node) && node.getAttribute('transform') !== appliedTransforms.current.get(node))
        bases.current.set(node,node.getAttribute('transform'));
      const base = bases.current.get(node);
      if (base !== undefined) {
        if (base === null) node.removeAttribute("transform");
        else node.setAttribute("transform", base);
      }
    }
    const styles = elementStyles(state?.elementStyles),
      items = describeElements(svg);
    for (const { node, id, editable } of items) {
      if (!bases.current.has(node))
        bases.current.set(node, node.getAttribute("transform"));
      const style = styles[id] || (node.dataset.layoutWidth ? {scale:1,x:0,y:0} : null);
      if (!style || !editable) {appliedTransforms.current.delete(node);continue;}
      const b = node.getBBox(),
        // Resize text about its declared alignment/baseline, not a font- and
        // viewport-dependent bounding-box centre. Right-aligned values stay so.
        textAnchor =
          node.tagName === "text" &&
          node.hasAttribute("x") &&
          node.hasAttribute("y"),
        cx = textAnchor ? Number(node.getAttribute("x")) : b.x + b.width / 2,
        cy = textAnchor ? Number(node.getAttribute("y")) : b.y + b.height / 2;
      // Protect against clipping at the canvas border; data marks never transform.
      const width = svg.viewBox.baseVal.width,
        height = svg.viewBox.baseVal.height;
      const scale = Math.min(
        style.scale,
        Number(node.dataset.layoutWidth || Infinity) / Math.max(1, b.width),
        Number(node.dataset.layoutHeight || Infinity) / Math.max(1, b.height),
        (width - 12) / Math.max(1, b.width),
        (height - 12) / Math.max(1, b.height),
      );
      const x = node.dataset.layoutWidth
        ? 0
        : Math.max(
            6 - (cx + (b.x - cx) * scale),
            Math.min(width - 6 - (cx + (b.x + b.width - cx) * scale), style.x),
          );
      const y = node.dataset.layoutHeight
        ? 0
        : Math.max(
            6 - (cy + (b.y - cy) * scale),
            Math.min(
              height - 6 - (cy + (b.y + b.height - cy) * scale),
              style.y,
            ),
          );
      node.setAttribute(
        "transform",
        `${bases.current.get(node) || ""} translate(${x} ${y}) translate(${cx} ${cy}) scale(${scale}) translate(${-cx} ${-cy})`,
      );
      appliedTransforms.current.set(node,node.getAttribute('transform'));
    }
    svg.dispatchEvent(new Event("studio-elements-ready"));
  });
  return (
    <svg {...props} style={{...props.style,fontSynthesis:"weight style"}} ref={attach}>
      {children}
    </svg>
  );
}
