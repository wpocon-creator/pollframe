import React from "react";
import "./product-sections.css";

export default function ProductSections({
  inStudio,
  locale,
  pollframeHref,
  studioHref,
  navigate,
  prefetch,
}) {
  const select = (event, href, active) => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    )
      return;
    event.preventDefault();
    if (!active) navigate(href);
  };
  return (
    <nav
      className="product-sections-bar"
      data-active={inStudio ? "studio" : "pollframe"}
      aria-label={
        locale === "de"
          ? "Pollframe-Bereiche"
          : locale === "es"
            ? "Secciones de Pollframe"
            : "Pollframe sections"
      }
    >
      <a
        href={pollframeHref}
        onClick={(e) => select(e, pollframeHref, !inStudio)}
        aria-current={!inStudio ? "page" : undefined}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M4 4v16h16M7 15l4-5 4 2 5-7" />
        </svg>
        <span>Pollframe</span>
      </a>
      <a
        href={studioHref}
        onPointerEnter={prefetch}
        onFocus={prefetch}
        onPointerDown={prefetch}
        onClick={(e) => select(e, studioHref, inStudio)}
        aria-current={inStudio ? "page" : undefined}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect x="4" y="4" width="7" height="7" rx="1.5" />
          <path d="M15 4h5v7h-5M4 15h7v5H4zM15 15h5v5h-5z" />
        </svg>
        <span className="product-studio-label">Studio</span>
      </a>
    </nav>
  );
}
