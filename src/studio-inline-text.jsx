import React, { useLayoutEffect, useRef } from "react";
// A styled editable overlay, not a detached text form. The SVG is retained for
// layout and hidden only until the edit is committed/cancelled.
export default function InlineText({
  items,
  value,
  maxLength,
  onCommit,
  onCancel,
  onLive,
  onBegin,
  width = 840,
  leading = 1.2,
  label,
}) {
  const ref = useRef(null),
    done = useRef(false),
    started = useRef(false);
  const first = items[0]?.node,
    holder = first?.closest(".studio-current-preview-image"),
    origin = holder?.getBoundingClientRect(),
    rects = items.map((i) => i.node.getBoundingClientRect());
  const textNode = first?.matches("text")
    ? first
    : first?.querySelector("text") || first;
  const style = textNode ? getComputedStyle(textNode) : null,
    matrix = textNode?.getScreenCTM(),
    scale = matrix ? Math.hypot(matrix.a, matrix.b) : 1;
  const left = Math.min(...rects.map((r) => r.left)),
    top = Math.min(...rects.map((r) => r.top)),
    right = Math.max(...rects.map((r) => r.right)),
    bottom = Math.max(...rects.map((r) => r.bottom));
  const anchor = textNode?.getAttribute("text-anchor") || style.textAnchor;
  const anchorPoint = new DOMPoint(
    Number(textNode?.getAttribute("x")) || 0,
    0,
  ).matrixTransform(matrix);
  const editWidth = width * scale;
  const editLeft =
    anchorPoint.x -
    origin.left -
    (anchor === "end" ? editWidth : anchor === "middle" ? editWidth / 2 : 0);
  useLayoutEffect(() => {
    const node = ref.current;
    node.textContent = value;
    node.focus();
    const range = document.createRange();
    range.selectNodeContents(node);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
  }, []);
  useLayoutEffect(() => {
    const previous = items.map((i) => i.node.style.visibility);
    items.forEach((i) => (i.node.style.visibility = "hidden"));
    return () =>
      items.forEach((i, n) => (i.node.style.visibility = previous[n]));
  });
  const live = (event) => {
    if (
      !event?.nativeEvent?.isComposing &&
      ref.current.innerText.length > maxLength
    ) {
      ref.current.textContent = ref.current.innerText.slice(0, maxLength);
      const range = document.createRange();
      range.selectNodeContents(ref.current);
      range.collapse(false);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
    }
    if (!started.current) {
      started.current = true;
      onBegin();
    }
    onLive(ref.current.innerText.replace(/\n/g, " ").slice(0, maxLength));
  };
  const finish = (cancel) => {
    if (done.current) return;
    done.current = true;
    if (cancel) onCancel();
    else
      onCommit(ref.current.innerText.replace(/\n/g, " ").slice(0, maxLength));
  };
  return (
    <div
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      role="textbox"
      aria-label={label}
      className="studio-direct-text"
      style={{
        left: editLeft,
        top: top - origin.top,
        width: editWidth,
        minHeight: bottom - top,
        fontFamily: style.fontFamily,
        fontSize: parseFloat(style.fontSize) * scale,
        fontWeight: style.fontWeight,
        color: style.fill,
        lineHeight: leading,
        textAlign:
          style.textAnchor === "end"
            ? "right"
            : style.textAnchor === "middle"
              ? "center"
              : "left",
      }}
      onInput={live}
      onBlur={() => finish(false)}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === "Escape") {
          e.preventDefault();
          finish(true);
        } else if (e.key === "Enter") {
          e.preventDefault();
          finish(false);
        }
      }}
      onPaste={(e) => {
        e.preventDefault();
        const text = e.clipboardData.getData("text/plain").slice(0, maxLength);
        const sel = window.getSelection();
        if (sel.rangeCount) {
          const range = sel.getRangeAt(0);
          range.deleteContents();
          const node = document.createTextNode(text);
          range.insertNode(node);
          range.setStartAfter(node);
          range.collapse(true);
          sel.removeAllRanges();
          sel.addRange(range);
          live();
        }
      }}
    />
  );
}
