# Pollframe bug-finding experiment

Local-only experiment, 26 September 2026. Do not deploy or probe third-party infrastructure.

## Question and scoring, set before running

Compare reusable checks by **confirmed unique defects**, severity, false alarms,
runtime, investigation effort and maintenance cost. A failing assertion is not
automatically an application bug. Classify every finding as application defect,
test defect, environment limitation, intentional product restriction, or unresolved.
Do not count the same defect twice across browsers or methods. Artificial faults
measure detector sensitivity, not bugs found in Pollframe. This is a small,
non-blinded experiment, not a statistically conclusive ranking.

Methods: existing unit/static checks; stateful user journeys; pairwise browser /
viewport / language / theme / text-size coverage; chart-aware geometry plus visual
inspection; seeded property/metamorphic tests; temporary fault injection; source
and link checks; cold/warm loading; local worker security and offline app behavior;
delivered-media verification. Record missing real-device coverage explicitly.

Use deterministic random seeds and separate browser contexts. Check actual output,
not just the visibility of a container or the state variable used to draw it.
Screenshots are evidence, not an automatic aesthetic verdict. HTTP 200 is not
proof that a source supports a number. A development server's headers and service
worker behavior are not production security/offline behavior.

## Cost accounting

The runner records elapsed time, exit status and full log byte/character counts.
`logCharacters / 4` is only a rough *text-output token proxy*, not billed tokens.
Exact model reasoning/input/output usage per method is unavailable here; do not
invent it. Plain scripts make no model/API calls. Record setup/review effort
separately from rerun cost. Only concise result summaries should enter chat.

## Research informing this experiment

- Anthropic's engineering experience: agents missed end-to-end failures when they
  relied on unit tests or HTTP responses. Explicit browser workflows improved it:
  https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents
- Mixed deterministic, model and human evaluation; inspect outcomes and trajectories:
  https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents
- Generated regression tests can discriminate proposed fixes; this is not a claim
  that passing tests establishes correctness: https://arxiv.org/abs/2406.12952
- Efficient interaction coverage, with higher-order blind spots acknowledged:
  https://csrc.nist.gov/projects/automated-combinatorial-testing-for-software
- Isolated tests of user-visible behavior and retrying observable conditions:
  https://playwright.dev/docs/best-practices
- Property-based testing and counterexamples:
  https://fast-check.dev/docs/introduction/why-property-based/
- Security categories beyond headers:
  https://owasp.org/projects/web-security-testing-guide

Run from the repository root with Node 22.12+. Results are stored under
`test-results/qa-lab/`; no private user browser profile, production account or
external write is used. Final findings are also reported in chat.

## Repeatable runs

Use the existing Node 22+ and Playwright installations. No new paid service,
model, dependency, or private browser profile is needed. Chromium and Firefox
are exercised; phone profiles are emulation, not real iPhone testing.

```sh
npm run qa:quick
npm run qa:calibrate
# With the existing local Vite server on port 4173:
npm run qa:matrix
npm run qa:boundary
node scripts/qa-lab/export-boundaries.mjs
node scripts/qa-lab/run.mjs workflow
node scripts/qa-lab/run.mjs security
node scripts/qa-lab/run.mjs media
node scripts/qa-lab/links.mjs
```

Offline/headers/speed require a fresh build and a Worker, not Vite:

```sh
npm run build
WRANGLER_SEND_METRICS=false npx wrangler dev --local --host localhost --ip 127.0.0.1 --port 4177 --persist-to /tmp/pollframe-qa-lab-worker
# In a second terminal:
npm run qa:offline-contract
POLLFRAME_TEST_BASE_URL=http://127.0.0.1:4177 node scripts/qa-lab/run.mjs offline
POLLFRAME_TEST_BASE_URL=http://127.0.0.1:4177 node scripts/qa-lab/browser.mjs performance
```

Run timing checks alone. Request interception disables the HTTP cache: the
performance lane deliberately installs no routes and blocks service workers for
a controlled cold/warm comparison. It includes a 400 ms settling delay and is
not a Core Web Vitals or real-world internet benchmark. The Worker may read the
public upstream data; offline tests toggle only their own browser networking.
`--host localhost` prevents production-host redirects in Wrangler's local proxy.
Media validation uses the existing video-lab Python environment and its exact
production artifacts; it is not portable without those prerequisites.

The confirmed clipping and offline-contract defects were repaired locally on
27 September; their focused regression tests must stay green. The broad boundary
collector still flags the documented header bounding-box/spacing warnings, which
need visual interpretation rather than being counted as text-ink collisions.
Do not weaken regression assertions to make failures green.
First-pass mistaken assumptions are retained as separate artifacts,
not counted as product bugs. The matrix records all 144 covered factor pairs;
24 cases cover those pairs, not every combination or every interaction sequence.

## Suggested cadence

1. Every change: quick unit/property checks; selected outcome checks for the
   changed feature. Preserve each confirmed failure as a focused regression.
2. UI change: boundary cases plus matrix; inspect the failing and a few passing
   screenshots. Check downloaded output, not just preview.
3. Events/styles: generate → edit/pin → undo → save/reopen → export/embed; verify
   actual labels, coordinates and data rather than just React settings.
4. Before release: built Worker, offline reload, accounts/security, source receipt,
   generated-media integrity, keyboard usability, and real iPhone/Safari checks.
5. Periodic: expand random seeds, catalogue/sample coverage and real-world source
   verification. Treat old data as a signal to investigate, not proof of failure.

`FINDINGS.md` distinguishes current results, limits, costs and next priorities.
