export const ELECTION_SOURCE =
  "https://wahlergebnisse.sachsen-anhalt.de/wahlen/lt26/erg_land.html";
export const SEATS_SOURCE =
  "https://wahlergebnisse.sachsen-anhalt.de/wahlen/lt26/sitze.html";
export const FIVE_DAYS = 5 * 24 * 60 * 60 * 1000;
const START = Date.parse("2026-09-06T16:00:00Z");
const STOP = Date.parse("2026-09-21T00:00:00Z");
const INTERVAL = 5 * 60 * 1000;
const clean = (value) =>
  String(value)
    .replace(/&shy;|\u00ad/g, "")
    .replace(/<[^>]*>/g, "")
    .trim();

// Read only the official state-level table. Never infer results from the
// turnout graphic, a previous election, or first-vote columns.
export function parseElectionResults(html, now = Date.now()) {
  if (!html.includes("Landtagswahl Sachsen-Anhalt 2026"))
    throw new Error("Wrong election");
  const stamp = Number(
    html.match(/id="zeitstempel"[^>]*data-value="(\d+)"/)?.[1],
  );
  const progress = html.match(
    /id="statusXY"[^>]*>\s*(\d+)\s+von\s+(\d+)\s+Wahlbezirken/,
  );
  if (!stamp || stamp < START || stamp > now + 300000 || !progress) return null;
  const counted = Number(progress[1]),
    total = Number(progress[2]);
  if (!counted) return null;
  if (counted > total || total < 1000)
    throw new Error("Invalid count coverage");
  const script = html.match(
    /<script[^>]*data-for="ergtable"[^>]*>([\s\S]*?)<\/script>/,
  )?.[1];
  if (!script) throw new Error("Official table absent");
  const table = JSON.parse(script).x?.tag?.attribs;
  if (
    !table?.columnGroups?.some(
      (group) =>
        group.name === "Zweitstimmen" &&
        group.columns.includes("anzahl.wj.x") &&
        group.columns.includes("prozent.wj.x"),
    )
  )
    throw new Error("Vote columns changed");
  const data = table.data;
  if (
    !Array.isArray(data?.merkmal) ||
    data.merkmal.length > 60 ||
    !data.id?.every((id) => id === "15")
  )
    throw new Error("Wrong geography");
  const validIndex = data.merkmal.findIndex((name) => clean(name) === "Gültig");
  const validVotes = data["anzahl.wj.x"]?.[validIndex];
  if (!Number.isSafeInteger(validVotes) || validVotes <= 0) return null;
  const rows = [];
  data.merkmal.forEach((name, i) => {
    if (!(data.partei_pos?.[i] > 0)) return;
    const votes = data["anzahl.wj.x"]?.[i],
      share = data["prozent.wj.x"]?.[i];
    if (votes === "NA" && share === "NA") return;
    if (
      !Number.isSafeInteger(votes) ||
      votes < 0 ||
      !Number.isFinite(share) ||
      share < 0 ||
      share > 100 ||
      Math.abs((votes / validVotes) * 100 - share) > 0.051
    )
      throw new Error("Invalid vote share");
    const previous = data["prozent.vj.x"]?.[i];
    rows.push({
      name: clean(name).slice(0, 80),
      votes,
      share,
      previousShare:
        Number.isFinite(previous) && previous >= 0 && previous <= 100
          ? previous
          : null,
    });
  });
  if (
    rows.length < 5 ||
    rows.reduce((sum, row) => sum + row.votes, 0) !== validVotes
  )
    throw new Error("Incomplete totals");
  rows.sort((a, b) => b.votes - a.votes);
  const statusText = clean(
    html.match(/id="status"[^>]*>([\s\S]*?)<\/div>/)?.[1] || "",
  );
  const status =
    counted < total
      ? "partial"
      : /endgültig/i.test(statusText)
        ? "final"
        : "provisional";
  const metric = (pattern, column) => {
    const index = data.merkmal.findIndex((name) => pattern.test(clean(name)));
    const value = data[column]?.[index];
    return Number.isFinite(value) && value >= 0 ? value : null;
  };
  const eligible = metric(/^Wahlberechtigte/, "anzahl.wj.x"),
    voters = metric(/^Wähler\/innen/, "anzahl.wj.x");
  const turnout =
    eligible > 0 && voters !== null && voters <= eligible
      ? (voters / eligible) * 100
      : null;
  const previousTurnout = metric(/^Wähler\/innen/, "prozent.vj.x");
  return {
    election: "sachsen-anhalt-2026",
    source: ELECTION_SOURCE,
    publishedAt: new Date(stamp).toISOString(),
    counted,
    total,
    validVotes,
    status,
    rows,
    eligible,
    voters,
    turnout,
    previousTurnout: previousTurnout <= 100 ? previousTurnout : null,
    invalidVotes: metric(/^Ungültig$/, "anzahl.wj.x"),
    postalVoters: metric(/^Briefwähler/, "anzahl.wj.x"),
  };
}

export function parseElectionSeats(html, now = Date.now()) {
  if (!html.includes("Landtagswahl Sachsen-Anhalt 2026"))
    throw new Error("Wrong seat election");
  const stamp = Number(
    html.match(/id="zeitstempel"[^>]*data-value="(\d+)"/)?.[1],
  );
  if (!stamp || stamp < START || stamp > now + 300000)
    throw new Error("Invalid seat timestamp");
  for (const match of html.matchAll(
    /<script[^>]*data-for="[^"]+"[^>]*>([\s\S]*?)<\/script>/g,
  )) {
    const table = JSON.parse(match[1]).x?.tag?.attribs;
    if (
      !table?.columnGroups?.some(
        (group) =>
          group.name === "Anzahl Sitze 2026" &&
          group.columns.includes("anzahl_sitze_wj"),
      )
    )
      continue;
    const data = table.data;
    if (
      !Array.isArray(data.partei_kurzname) ||
      data.partei_kurzname.length > 40
    )
      throw new Error("Invalid seat rows");
    const totalIndex = data.partei_kurzname.indexOf("Insgesamt"),
      total = data.anzahl_sitze_wj?.[totalIndex];
    const rows = data.partei_kurzname.flatMap((name, i) =>
      i === totalIndex
        ? []
        : [
            {
              name: clean(name),
              seats: data.anzahl_sitze_wj?.[i],
              previousSeats: data.anzahl_sitze_vj?.[i],
            },
          ],
    );
    if (
      !Number.isSafeInteger(total) ||
      total < 83 ||
      total > 300 ||
      rows.some(
        (row) =>
          !Number.isSafeInteger(row.seats) ||
          row.seats < 0 ||
          !Number.isSafeInteger(row.previousSeats) ||
          row.previousSeats < 0,
      ) ||
      rows.reduce((sum, row) => sum + row.seats, 0) !== total
    )
      throw new Error("Invalid seat totals");
    return {
      source: SEATS_SOURCE,
      publishedAt: new Date(stamp).toISOString(),
      total,
      rows,
    };
  }
  throw new Error("Official seat table absent");
}

async function sourceHtml(url) {
  const response = await fetch(url, {
    redirect: "manual",
    signal: AbortSignal.timeout(15000),
    headers: { accept: "text/html" },
  });
  if (!response.ok) throw new Error("Source unavailable");
  const reader = response.body.getReader(),
    decoder = new TextDecoder();
  let body = "",
    bytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes += value.length;
    if (bytes > 2000000) {
      await reader.cancel();
      throw new Error("Source too large");
    }
    body += decoder.decode(value, { stream: true });
  }
  return body + decoder.decode();
}

export function publicElection(state, now = Date.now()) {
  if (
    !state?.result ||
    !state.firstSeenAt ||
    now >= state.firstSeenAt + FIVE_DAYS
  )
    return null;
  return {
    ...state.result,
    firstSeenAt: new Date(state.firstSeenAt).toISOString(),
    expiresAt: new Date(state.firstSeenAt + FIVE_DAYS).toISOString(),
    checkedAt: new Date(state.checkedAt).toISOString(),
    stale: Boolean(state.failed),
  };
}

// A single persisted clock for every visitor; corrections/redeploys never
// restart the five-day feature. No visitor identifiers or personal data.
export class ElectionResultsStore {
  constructor(ctx) {
    this.ctx = ctx;
    this.pending = null;
  }
  async refresh() {
    if (this.pending) return this.pending;
    this.pending = this.update().finally(() => {
      this.pending = null;
    });
    return this.pending;
  }
  async update() {
    const now = Date.now();
    const state = (await this.ctx.storage.get("result")) || {};
    if (
      now < START ||
      now > STOP ||
      (state.firstSeenAt && now >= state.firstSeenAt + FIVE_DAYS)
    )
      return state;
    if (state.checkedAt && now - state.checkedAt < INTERVAL) return state;
    state.checkedAt = now;
    try {
      const body = await sourceHtml(ELECTION_SOURCE);
      const result = parseElectionResults(body, now);
      if (
        result &&
        (!state.result || result.publishedAt >= state.result.publishedAt)
      ) {
        state.result = result;
        state.firstSeenAt ||= now;
        state.failed = false;
        state.error = null;
        if (result.status !== "partial") {
          try {
            const allocation = parseElectionSeats(
              await sourceHtml(SEATS_SOURCE),
              now,
            );
            if (allocation.publishedAt !== result.publishedAt)
              throw new Error("Seat and vote snapshots differ");
            state.result.seatAllocation = allocation;
          } catch {
            state.result.seatAllocation = null;
            state.result.seatsUnavailable = true;
          }
        }
      } else if (state.result) state.failed = true;
    } catch (error) {
      state.failed = true;
      state.error = error.message;
      console.warn("Election source validation/update failed:", error.message);
    }
    await this.ctx.storage.put("result", state);
    await this.ctx.storage.setAlarm(
      Math.min(
        now + INTERVAL,
        state.firstSeenAt ? state.firstSeenAt + FIVE_DAYS : STOP,
      ),
    );
    return state;
  }
  async alarm() {
    await this.refresh();
  }
  async fetch(request) {
    const state = await this.refresh();
    const archive =
      new URL(request?.url || "https://election-results/").searchParams.get(
        "archive",
      ) === "1";
    const archived =
      archive && state.result
        ? {
            ...state.result,
            archived: true,
            stale: Boolean(state.failed),
            checkedAt: new Date(state.checkedAt).toISOString(),
          }
        : null;
    return Response.json(
      {
        result: publicElection(state) || archived,
        checkedAt: state.checkedAt
          ? new Date(state.checkedAt).toISOString()
          : null,
        serverTime: new Date().toISOString(),
      },
      {
        headers: {
          "cache-control": "no-store",
          "x-robots-tag": "noindex",
          "x-content-type-options": "nosniff",
          ...(state.error
            ? {
                "x-pollframe-source-error": state.error
                  .replace(/[^\x20-\x7e]/g, "")
                  .slice(0, 180),
              }
            : {}),
        },
      },
    );
  }
}
