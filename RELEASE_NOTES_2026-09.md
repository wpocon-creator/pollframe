# 6 September: loading performance follow-up

- Initial JavaScript reduced from 259.9 to 211.9 KiB gzip (18.5%). Spanish
  views and full party portraits are separate on-demand chunks; the four
  supported languages remain available. Removed unused legacy translations.
- Closed poll tables do not construct invisible desktop and mobile rows.
- Preload the primary font and, on the Worker, the exact page's public data
  while JavaScript loads. Cache freshness and updater schedules are unchanged.
- Spanish insight snapshots seek the relevant 45-day window directly.
  Comparison tests verify identical values against the previous algorithm.
- Fixed offline precaching of Vite's root-relative dependency-map CSS, including
  approval styles. App cache version v40 includes the new chunks.
- PNG source dates distinguish publication, fieldwork end and data-through
  dates; fieldwork dates must not be presented as publication dates.
- Added lazy-load/cancel/focus tests, dependency-index parity checks, offline
  asset-walk checks, and a repeatable throttled browser benchmark.
- Updated stale integration expectations for the .com canonical, native dialog
  semantics, reserved icon row, disabled phone chart hover and mobile back link.
- Final live benchmark results are recorded in PERFORMANCE_2026-09-06.md.

# 6 September: publishing compositions

- Current-poll PNG columns use the available canvas width rather than a fixed
  five-party cap. Narrow compositions split rankings into two balanced rows.
- Current-poll embeds offer bars or columns; columns reflow when an article's
  width changes, without changing values, ranking order or the common scale.
- The same balanced-row layout covers portrait issue charts. Separate geometry
  checks protect against legacy minimum heights overflowing the second row.
- Current-poll and seat-model PNGs retain an absolute publication date. The
  separate image creation date is explicitly labelled as the export date.
  Current-poll comparison notes state percentage points and their baseline date.
- Larger standalone labels, less decorative chrome, clearer approval net scores,
  and compact source footers. The approval PNG omits the renormalised two-answer
  bar; original answer percentages are unchanged.
- Seat segments now show seat counts matching their widths, rather than vote
  percentages. The seat-model title no longer incorrectly claims a poll average.
- Rasterised party labels occupy their full grid slots, preventing rounded
  shrink-to-fit widths from wrapping short names in the actual downloaded PNG.
- Publishing-only layout code/styles are loaded on demand. Service-worker v39.

Validation: production data/security/performance/SEO checks; pure layout boundary
and balancing tests; Chromium desktop and mobile-size regressions, Firefox
embed/preview checks; actual PNG downloads and manual visual inspection of
current polls, party history, seats, approvals and issue columns. Local WebKit
could not launch because libavif16/GStreamer system dependencies are missing;
no physical-iPhone or Safari verification is claimed.

The proposed searchable gallery/editor and AI assistant are not implemented.
