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
