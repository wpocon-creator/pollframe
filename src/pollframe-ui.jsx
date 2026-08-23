import React, { useEffect, useRef, useState } from "react";

export function Icon({ name, size = 20 }) {
  const paths = {
    settings: <><circle cx="12" cy="12" r="3" /><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.09a2 2 0 0 1 1 1.74v.5a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.09a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2Z" /></>,
    sliders: <><path d="M4 7h10M18 7h2M4 17h2M10 17h10" /><circle cx="16" cy="7" r="2" /><circle cx="8" cy="17" r="2" /></>,
    share: <><circle cx="18" cy="5" r="2" /><circle cx="6" cy="12" r="2" /><circle cx="18" cy="19" r="2" /><path d="m8 11 8-5M8 13l8 5" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    chevron: <path d="m8 10 4 4 4-4" />,
    close: <path d="m6 6 12 12M18 6 6 18" />,
    info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></>,
    flag: <><path d="M5 21V4" /><path d="M5 5h11l-1.7 3L16 11H5" /></>,
    guide: <><path d="M4.5 18.5V6.5M4.5 18.5h15" /><path d="m8 14 3-3 2.5 2 3.5-5" /><circle cx="18.5" cy="5.5" r="2" fill="currentColor" stroke="none" /></>,
    download: <><path d="M12 4v11M8 11l4 4 4-4" /><path d="M5 20h14" /></>,
    code: <><path d="m9 7-5 5 5 5M15 7l5 5-5 5" /></>,
    external: <><path d="M14 5h5v5M19 5l-8 8" /><path d="M17 13v5H6V7h5" /></>,
    home: <><path d="m4 11 8-7 8 7" /><path d="M6.5 10v10h11V10M10 20v-6h4v6" /></>,
    chart: <><path d="M4 19V5M4 19h16" /><path d="m7 15 4-4 3 2 5-7" /></>,
    map: <><path d="m3.5 6 5-2 7 2 5-2v14l-5 2-7-2-5 2Z" /><path d="M8.5 4v14M15.5 6v14" /></>,
    globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></>,
    app: <><rect x="6" y="3" width="12" height="18" rx="2" /><path d="M10 6h4M11 18h2" /></>,
    refresh: <><path d="M20 7v5h-5" /><path d="M18.5 12a7 7 0 1 0-1.4 5.1" /></>,
    wifiOff: <><path d="m3 3 18 18" /><path d="M8.5 8.7A12 12 0 0 1 20 10M5 10a12 12 0 0 0-1 1M8.5 14.5a6 6 0 0 1 7 0M12 19h.01" /></>,
    star: <path d="m12 3 2.75 5.57 6.15.9-4.45 4.33 1.05 6.12L12 17.03l-5.5 2.89 1.05-6.12L3.1 9.47l6.15-.9Z" />,
    bell: <><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 8h18c0-1-3-1-3-8" /><path d="M10 21h4" /></>,
    search: <><circle cx="11" cy="11" r="7" /><path d="m16 16 5 5" /></>,
    plus: <path d="M12 5v14M5 12h14" />,
    trash: <><path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13" /></>,
    grip: <><circle cx="8" cy="7" r="1" fill="currentColor" stroke="none" /><circle cx="16" cy="7" r="1" fill="currentColor" stroke="none" /><circle cx="8" cy="12" r="1" fill="currentColor" stroke="none" /><circle cx="16" cy="12" r="1" fill="currentColor" stroke="none" /><circle cx="8" cy="17" r="1" fill="currentColor" stroke="none" /><circle cx="16" cy="17" r="1" fill="currentColor" stroke="none" /></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

// On touch screens an outside tap is a dismissal gesture, not a second action.
// Native <details> closes after the click has already reached the element below;
// intercepting the pointer in capture phase prevents accidental navigation or
// opening a neighbouring control. The user's next tap works normally.
export function useDismissOnlyDetails(detailsRef) {
  useEffect(() => {
    let clickCleanup = null;
    const swallowNextClick = () => {
      const swallowClick = (clickEvent) => {
        clickEvent.preventDefault();
        clickEvent.stopPropagation();
        clickEvent.stopImmediatePropagation?.();
        clickCleanup?.();
      };
      const timeout = window.setTimeout(() => clickCleanup?.(), 700);
      clickCleanup = () => {
        window.clearTimeout(timeout);
        document.removeEventListener("click", swallowClick, true);
        clickCleanup = null;
      };
      document.addEventListener("click", swallowClick, true);
    };
    const closeOutside = (event) => {
      const details = detailsRef.current;
      if (!details?.open || details.contains(event.target)) return;
      const dismissOnly = event.type === "touchend" || event.pointerType === "touch" || navigator.maxTouchPoints > 0 || window.matchMedia("(pointer: coarse)").matches;
      // On touch, keep the menu open while the finger is down. This avoids
      // the jarring close-on-drag behaviour and makes an outside tap a true
      // release-to-dismiss gesture.
      if (dismissOnly && event.type === "pointerdown") return;
      details.removeAttribute("open");
      if (!dismissOnly) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation?.();
      // Some browsers still emit click after pointerup. Consume exactly that
      // click, then immediately restore normal interaction.
      swallowNextClick();
    };
    const closeOnEscape = (event) => {
      const details = detailsRef.current;
      if (event.key !== "Escape" || !details?.open) return;
      details.removeAttribute("open");
      details.querySelector("summary")?.focus();
    };
    document.addEventListener("pointerdown", closeOutside, true);
    document.addEventListener("pointerup", closeOutside, true);
    // iOS may cancel or omit the PointerEvent sequence when a finger moves by
    // a few pixels. touchend is the reliable release signal in that case.
    document.addEventListener("touchend", closeOutside, { capture: true, passive: false });
    document.addEventListener("keydown", closeOnEscape, true);
    return () => {
      clickCleanup?.();
      document.removeEventListener("pointerdown", closeOutside, true);
      document.removeEventListener("pointerup", closeOutside, true);
      document.removeEventListener("touchend", closeOutside, true);
      document.removeEventListener("keydown", closeOnEscape, true);
    };
  }, [detailsRef]);
}

export function SelectControl({ label, value, onChange, options }) {
  const detailsRef = useRef(null);
  useDismissOnlyDetails(detailsRef);
  const selectedOption = options.find((option) => option.value === value) ?? options[0];
  const choose = (nextValue) => {
    onChange(nextValue);
    detailsRef.current?.removeAttribute("open");
  };
  return (
    <details className="select-control" name="pollframe-customize-control" ref={detailsRef}>
      <summary><span><small>{label}</small><strong>{selectedOption.label}</strong></span><Icon name="chevron" size={16} /></summary>
      <div className="select-menu">{options.map((option) => <button key={option.value} type="button" className={option.value === value ? "selected" : ""} onClick={() => choose(option.value)}><span>{option.label}</span>{option.value === value && <Icon name="check" size={15} />}</button>)}</div>
    </details>
  );
}

export function MultiSelect({ label, summary, items, selected, onToggle }) {
  const detailsRef = useRef(null);
  const menuRef = useRef(null);
  useDismissOnlyDetails(detailsRef);
  useEffect(() => {
    const menu = menuRef.current;
    if (!menu) return undefined;
    const containWheel = (event) => {
      event.preventDefault();
      event.stopPropagation();
      menu.scrollTop += event.deltaY;
    };
    menu.addEventListener("wheel", containWheel, { passive: false });
    return () => menu.removeEventListener("wheel", containWheel);
  }, []);
  return (
    <details className="multi-select" name="pollframe-customize-control" ref={detailsRef}>
      <summary><span><small>{label}</small><strong>{summary}</strong></span><Icon name="chevron" size={16} /></summary>
      <div className="multi-menu" ref={menuRef}>{items.map((item) => <label key={item.id}><input type="checkbox" checked={selected.includes(item.id)} onChange={() => onToggle(item.id)} /><span className="check-box"><Icon name="check" size={14} /></span><span className="multi-label"><strong>{item.label}</strong>{item.description && <small>{item.description}</small>}</span></label>)}</div>
    </details>
  );
}

export function StaticEmbedPreview({ src, title, height, previewWidth = "article", targetHeight = 420, className = "", scrollableDesktop = true }) {
  const containerRef = useRef(null);
  const [availableWidth, setAvailableWidth] = useState(760);
  const viewportWidth = previewWidth === "wide" ? 1200 : previewWidth === "phone" ? 390 : 760;
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;
    const measure = () => setAvailableWidth(Math.max(1, container.clientWidth));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    return () => observer.disconnect();
  }, [previewWidth]);
  const documentScroll = scrollableDesktop;
  const scale = Math.min(1, availableWidth / viewportWidth);
  const renderedWidth = Math.round(viewportWidth * scale);
  const stageHeight = Math.round(height * scale);
  const renderedHeight = documentScroll ? Math.min(targetHeight, stageHeight) : stageHeight;
  return (
    <div
      ref={containerRef}
      className={`embed-live-preview static-embed-preview preview-${previewWidth} ${documentScroll ? "is-document-scroll" : ""} ${className}`.trim()}
      style={{
        height: `${renderedHeight}px`,
        "--embed-source-width": `${viewportWidth}px`,
        "--embed-source-height": `${height}px`,
        "--embed-preview-scale": scale,
      }}
    >
      <div className="static-embed-stage" style={{ width: `${renderedWidth}px`, height: `${stageHeight}px` }}>
        <iframe src={src} title={title} width={viewportWidth} height={height} scrolling="no" tabIndex={-1} aria-hidden="true" style={{ width: `${viewportWidth}px`, height: `${height}px`, transform: `scale(${scale})` }} referrerPolicy="no-referrer" sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox" />
      </div>
    </div>
  );
}
