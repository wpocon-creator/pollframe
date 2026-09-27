# Bug-finding experiment — 26 September 2026

## Repair status — 27 September 2026

Both confirmed defects below are now fixed locally, not published. The historical
footer measures and wraps text with its final source font, weight, italic setting
and size; it grows vertically and preserves all institute/licence text. These
blocks now consistently use the source text role, not the party-label role.
Public static-data responses now advertise only encoding variation and strip
upstream cookies; the service worker's private-data restrictions are unchanged.

Verification: the new real Worker/service-worker unit regression failed before
the proxy fix and passes afterwards. All six required core responses now pass
the live local cache contract. Desktop offline reload and the installed-phone
Watchlist test pass (two tests, two intentional cross-project skips); the latter
verifies exact values/change text and a genuinely blocked network. The emulator's
incorrect onLine signal is controlled explicitly, as in the desktop test.

Eight Chromium/Firefox source-layout cases passed; two extended publication
workflows passed SVG, downloaded PNG and actual generated embed checks. Exported
PNG and dark-tablet screenshots were also inspected. All three original clipping
examples now show zero layout warnings. The original B1 bounding-box warnings
remain classified as spacing review, not visible collisions. Build checks, 17
worker/privacy regressions and five footer/history/editor unit tests passed.

New regression files: `tests/live-data-offline.test.mjs`,
`tests/studio-history-footer.test.mjs`, `tests/studio-source-overflow.spec.mjs`.
The sections below preserve the initial investigation and its measured results.

## Conclusion

The best discovery yield in this sample came from boundary settings with visual
inspection, and from testing real components together. Fast unit/property checks
remain excellent cheap regression guards, but cannot replace these methods.
Two distinct application defects were confirmed; one additional header-layout
warning was downgraded after inspecting the downloaded SVG. Application code was not
changed or published during this experiment; test tooling and two stale browser
tests were improved. Counts below deliberately exclude synthetic faults and
mistaken test assumptions.

## Findings and classification

### B1 — Header crowding / overlapping text bounds: visual warning, not confirmed ink collision

Priority: review, not a confirmed publication defect.
In seats-ring and map-original, a long title at size 64 has a bounding rectangle
that intersects POLLFRAME and the chart context label. In the editor its selection
outline crowds the header. However, inspection of the exported SVG screenshot
shows a gap between the actual letter shapes. Font bounding boxes include space
without visible ink. Six geometry warnings across five cases are not six bugs.

Reproduction: Studio editor, German, dark, title size 64, headline
“Bundestagswahl: Wie sich die politische Stimmung in Deutschland verändert”.
See `stress-3.png`, `stress-6.png`, and `seats-ring-boundary.svg` in the artifact
directory. Overlapping bounds also exist in the downloaded seats SVG, but must
not be described as visibly overlapping letters. `src/studio-statistic.jsx` uses
fixed top baselines despite variable title size. Additional breathing room may
improve the editor; keep this separate from the confirmed clipping defect below.

### B2 — Historical institute/source typography escapes the chart

Priority: medium; clipped provenance is particularly bad for publication.
Historical and single-party graphics overflow their right boundary with enlarged
serif source text. Reproduction: history-original/party-original, five-year
range, source role `{scale:1.3,font:'serif'}` and enlarged typography.
See `stress-4.png`, `stress-5.png`, `stress-7.png`. This is confirmed in the editor
render; export behavior is measured separately rather than assumed identical.
The historical renderer wraps institute names by character count (104), then
the generic SVG styling layer changes font metrics. Width must be calculated
using the final font and the actual available space.

### B3 — Local privacy changes break offline service-worker installation

Priority: high; must resolve before publishing the affected changes.
The public-data proxy retains upstream `Vary: Authorization,Accept-Encoding`.
The local service worker correctly refuses to cache potentially personalized
responses. Four of six mandatory offline resources consequently fail cache
eligibility, `installAppShell` rejects, and registration disappears. Browser
cache names existing is NOT proof of successful offline installation.

Reproduced in a built local Worker with real responses; the new
`offline-contract.mjs` detects it in 1.70 seconds. Do not fix this by broadly
allowing authenticated data into offline caches. The narrowly public proxy and
its response metadata must agree, while account/admin protections remain intact.

Live comparison used only two public read requests: `/regions.json` and `/sw.js`.
The live data response has the header, but the deployed service worker still uses
older rules (`response.ok` rather than the new eligibility predicate). Therefore
this is a confirmed LOCAL release regression, not a demonstrated live outage.

## Measured runs

Times exclude one-off script development, research and manual investigation.
This is a small, non-blinded sample; don't extrapolate a universal bugs/minute rate.

| Method | Run cost | Outcome | Reuse value |
|---|---:|---|---|
| 58 existing unit checks + static security/performance | 2.49 s | Pass, no new defect | Very high, every change |
| Seeded logic/data properties, 6,635 scenario groups | 1.76 s | Pass, no new defect | Very high, rotate seeds later |
| Pairwise layouts, 24 cases / 144 factor pairs | 82.02 s | No detected geometry/runtime failures | High, browser/language/layout guard |
| Eight extreme but supported layout combinations | 37.42 s | One confirmed clipping defect; one header warning | Highest visual discovery yield here |
| Downloaded SVG boundary review | 8.19 s | Header warning downgraded after visual review | Important false-positive filter |
| Stateful event/export/source workflows | 90.56 s | 5 passed; 1 stale test | High, catches sequence/output failures |
| Corrected source review + withdrawn-data checks | About 66 s | Six passed, including previously blocked map check | High; independent tests avoid hidden gaps |
| 19 worker/account/privacy security checks | 13.78 s | Pass; misses B3 in isolation | High, must combine with integration |
| Delivered-video checks | 38.46 s | Pass, no new defect | High for each new render |
| Five sampled external source/license URLs | 4.87 s | Reachable; other URLs explicitly unprobed | Moderate; 200 alone is not verification |
| Built-worker offline browser tests | 126.80 s | Registration regression; stale Watchlist selector | High consequence, expensive diagnosis |
| New real-response/cache-policy contract | 1.70 s | Four rejected core resources, one root cause B3 | Very high targeted regression value |
| Cold/warm loading, 18 navigations | 27.37 s summed readiness | Cache works in corrected benchmark | Good trend baseline, not field performance |
| Detector calibration, five injected faults + control | 0.79 s | Smoke 0/5; geometry 4/5; semantic check adds fifth | Essential harness self-check |

Property coverage includes event placement/determinism/anchors, style isolation,
settings round trips, edge-scroll math and 2,635 poll records. These are scenario
groups, not thousands of independent user journeys. The matrix covers six routes,
Chromium/Firefox, phone/tablet/desktop, four locales, two themes and two text sizes.
It covers every pair of factors, not all 576 complete combinations. Boundary
cases deliberately cover higher-order interactions that pairwise coverage misses.

### Performance baseline

Median readiness, including a deliberate 400 ms settling period:

| Local built page | Cold | Warm |
|---|---:|---:|
| Overview | 1.624 s | 0.997 s |
| Historical polling | 1.713 s | 1.187 s |
| Studio | 1.956 s | 1.629 s |

Three repetitions per route, service workers blocked, real HTTP cache enabled.
This does not measure live users, mobile hardware, LCP/INP or improvement from an
application change. The first run was discarded because request interception
silently disabled caching. Preserve that mistake in the audit, not in the claims.

## Time, tokens and maintenance

Exact model tokens per method cannot be measured from this session. Runner JSON
records log characters and a clearly labelled `/4` output-token approximation,
not billed usage or internal reasoning. The deterministic reruns call no LLM
and incur no API charge. Reading screenshots and interpreting new failures still
requires human/agent effort. The initial setup and investigations cost much more
than a rerun; no precise setup-time allocation was recorded.

Example raw logs: 12,658 characters for unit checks, 18,492 for workflows, 20,408
for offline failures. Save those to files and inspect only failing cases; pass a
small summary to the agent. Dumping every trace into context spends tokens without
improving confidence. Use full logs on demand and one representative screenshot
per deduplicated root cause.

False alarms and test debt found:

- Withdrawn approval data was still required by a combined transparency test,
  preventing its map audit. Removed obsolete approval assertions; independent
  withdrawal tests and the map audit now pass.
- Watchlist offline tests queried a removed `span` instead of current value/change
  elements. Updated to verify numbers persist unchanged across offline reload.
  Full offline success remains blocked by B3; do not call that test passed.
- Initial property test used internal iframe parameters as if they were the public
  Studio serializer; corrected to the real state round trip.
- Initial matrix omitted `editor=1`; corrected routes and reran all 24 cases.
- Initial Worker host selection produced a local proxy redirect loop. Explicit
  `--host localhost` fixed test setup, not the application.
- Standalone SVG screenshot documents needed explicit dimensions. The exported
  asset must be tested in a deterministic viewer, not confused with browser chrome.

## Remaining limits

No real iPhone/iPad, Safari engine, OS notification delivery, assistive-technology
audit, production account lifecycle or Cloudflare configuration audit was covered.
No brute-force attempts against live systems or third-party infrastructure.
Security checks passing is not a security guarantee. Media integrity tests do not
prove engaging narration, good pacing or subjective visual quality; review those
by watching/listening. Source checks sampled links and independently recalculated
German receipts, not every published figure or licensing permission.

Local freshness warnings were recorded separately. Local bundled data predates
live GitHub-fed data, and some archives/withdrawn series are intentionally old or
unavailable. Age is an investigation signal, not automatically an updater bug.

## Recommended order from here

1. Resolve B3 before release; retain strict protection for genuinely private data.
2. Fix B2 using final text metrics, retaining readable source information; review
   B1 separately as a spacing warning rather than claiming an export collision.
3. Rerun the focused regressions, offline browser workflows and downloaded output.
4. Use quick checks on each change; boundary + pairwise checks for UI changes;
   stateful publication workflows before release. Verify representative real
   phones/Safari before claiming mobile completion.
5. Expand cases based on observed failures, not arbitrary test-count targets.

Research and rerun commands are in `README.md`; all raw local evidence is under
`test-results/qa-lab/`. The findings are also summarized to the user in chat.
