import { expect, test } from "@playwright/test";
import { calculateMovementScores, isElectionEvent, isPrimaryElectionEvent, rankHistoricalEvents } from "../src/event-selection.js";

const time = (date) => Date.parse(`${date}T12:00:00Z`);

test("event ranking keeps editorial importance ahead of spacing and category quotas", () => {
  const events = Array.from({ length: 18 }, (_, index) => ({
    id: `event-${index}`,
    date: `${2010 + Math.floor(index / 2)}-${index % 2 ? "08" : "02"}-01`,
    category: ["politics", "economy", "global"][index % 3],
    priority: index === 5 ? 0 : 2,
  }));
  const selected = rankHistoricalEvents(events, {
    limit: 5,
    startTime: time("2010-01-01"),
    endTime: time("2019-01-01"),
    profile: "balanced",
  }).slice(0, 5);
  expect(selected.map((event) => event.id)).toContain("event-5");
  expect(selected[0].id).toBe("event-5");
  expect(selected.every((event) => event.priority === 0 || event.priority === 2)).toBe(true);
});

test("movement is separate context and cannot override editorial priority or turn elections into ordinary events", () => {
  const events = [
    { id: "election", category: "national", date: "2021-09-26", labelEn: "2021 federal election" },
    { id: "before-jump", category: "politics", date: "2022-02-20", labelEn: "Major announcement", priority: 2 },
    { id: "quiet", category: "economy", date: "2023-04-01", labelEn: "Routine budget", priority: 0 },
  ];
  const scores = calculateMovementScores(events, [
    { date: "2022-02-01", values: [30] },
    { date: "2022-03-01", values: [42] },
    { date: "2023-03-01", values: [35] },
    { date: "2023-05-01", values: [35.5] },
  ], { horizonDays: 70 });
  expect(scores.get("before-jump")).toBeGreaterThan(scores.get("quiet"));
  expect(isElectionEvent(events[0])).toBe(true);
  expect(isPrimaryElectionEvent(events[0])).toBe(true);
  const ranked = rankHistoricalEvents(events, {
    limit: 2,
    startTime: time("2021-01-01"),
    endTime: time("2024-01-01"),
    movementScores: scores,
  }).map((event) => event.id);
  expect(ranked).not.toContain("election");
  expect(ranked[0]).toBe("quiet");
});

test("only the election relevant to the chart gets the dominant election treatment", () => {
  expect(isPrimaryElectionEvent({ id: "uk-election-2024-07-04", category: "uk-election", date: "2024-07-04" })).toBe(true);
  expect(isPrimaryElectionEvent({ id: "uk-local-elections-2025", category: "uk-election", date: "2025-05-01" })).toBe(false);
  expect(isPrimaryElectionEvent({ id: "eu-election-2024", category: "europe", date: "2024-06-09", labelEn: "European election" })).toBe(false);
});

test("equally important events are interleaved across the visible time span", () => {
  const events = [
    { id: "old", category: "politics", date: "1955-01-01", priority: 0 },
    { id: "middle", category: "politics", date: "1985-01-01", priority: 0 },
    { id: "later", category: "politics", date: "2005-01-01", priority: 0 },
    ...Array.from({ length: 12 }, (_, index) => ({ id: `recent-${index}`, category: "politics", date: `202${index % 6}-0${(index % 8) + 1}-01`, priority: 0 })),
  ];
  const firstRound = rankHistoricalEvents(events, { limit: 8, startTime: time("1950-01-01"), endTime: time("2030-01-01") }).slice(0, 4);
  expect(firstRound.some((event) => event.id === "old")).toBe(true);
  expect(firstRound.some((event) => event.id === "middle")).toBe(true);
  expect(firstRound.some((event) => event.id === "later")).toBe(true);
  expect(firstRound.filter((event) => event.id.startsWith("recent-")).length).toBe(1);
});

test("pandemics and invasions outrank routine government revisions", () => {
  const ranked = rankHistoricalEvents([
    { id: "pandemic", category: "global", date: "2020-03-11", labelEn: "Covid pandemic begins" },
    { id: "ukraine", category: "global", date: "2022-02-24", labelEn: "Russia launches invasion of Ukraine" },
    { id: "revision", category: "politics", date: "2025-06-30", labelEn: "Government revises welfare plans" },
  ], { limit: 3, startTime: time("2019-01-01"), endTime: time("2026-01-01") });
  expect(ranked.slice(0, 2).map((event) => event.id)).toEqual(["pandemic", "ukraine"]);
  expect(ranked.at(-1).id).toBe("revision");
});
