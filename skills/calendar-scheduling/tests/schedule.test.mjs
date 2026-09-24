import assert from "node:assert/strict";
import { test } from "node:test";

import { checkSlot, findSlots } from "../scripts/schedule.mjs";

const MONDAY = { start: "2026-09-28T00:00:00Z", end: "2026-09-28T22:00:00Z" };
const NOW = "2026-09-27T12:00:00Z";
const base = { timeZone: "Europe/Berlin", now: NOW, window: MONDAY };
const starts = (result) => result.slots.map((s) => s.start);
const event = (id, start, end, extra = {}) => ({ id, summary: id, start: { dateTime: start }, end: { dateTime: end }, ...extra });

test("skips a busy hour and aligns slots to local half hours", () => {
  const result = findSlots({
    ...base,
    limit: 3,
    policy: { durationMinutes: 60 },
    events: [event("standup", "2026-09-28T10:00:00+02:00", "2026-09-28T11:00:00+02:00")],
  });
  assert.deepEqual(starts(result), ["2026-09-28T07:00:00.000Z", "2026-09-28T09:00:00.000Z", "2026-09-28T09:30:00.000Z"]);
  assert.equal(result.slots[0].local, "Mon 2026-09-28 09:00-10:00 Europe/Berlin");
});

test("cancelled, free and declined events do not block, tentative does", () => {
  const result = findSlots({
    ...base,
    limit: 1,
    selfEmails: ["me@example.com"],
    events: {
      data: {
        items: [
          event("cancelled", "2026-09-28T09:00:00+02:00", "2026-09-28T12:00:00+02:00", { status: "cancelled" }),
          event("free", "2026-09-28T09:00:00+02:00", "2026-09-28T12:00:00+02:00", { transparency: "transparent" }),
          event("declined", "2026-09-28T09:00:00+02:00", "2026-09-28T12:00:00+02:00", {
            attendees: [{ email: "Me@Example.com", responseStatus: "declined" }],
          }),
          event("maybe", "2026-09-28T09:00:00+02:00", "2026-09-28T10:00:00+02:00", { status: "tentative" }),
        ],
      },
    },
  });
  assert.deepEqual(
    result.ignoredEvents.map((e) => e.reason),
    ["cancelled", "marked_free", "declined_by_you"],
  );
  assert.deepEqual(starts(result), ["2026-09-28T08:00:00.000Z"]);
});

test("an all-day event blocks the whole local day", () => {
  const result = findSlots({
    ...base,
    window: { start: "2026-09-28T00:00:00Z", end: "2026-09-30T00:00:00Z" },
    limit: 1,
    events: [{ id: "offsite", summary: "Offsite", start: { date: "2026-09-28" }, end: { date: "2026-09-29" } }],
  });
  assert.deepEqual(starts(result), ["2026-09-29T07:00:00.000Z"]);
});

test("a required attendee's working hours narrow the slots", () => {
  const result = findSlots({
    ...base,
    limit: 1,
    attendees: [
      { email: "ny@example.com", timeZone: "America/New_York", workingHours: [{ days: [1, 2, 3, 4, 5], start: "09:00", end: "17:00" }] },
    ],
  });
  assert.deepEqual(starts(result), ["2026-09-28T13:00:00.000Z"]);
});

test("an optional attendee's busy time warns instead of blocking", () => {
  const result = findSlots({
    ...base,
    limit: 1,
    attendees: [{ email: "opt@example.com", optional: true, busy: [{ start: "2026-09-28T07:00:00Z", end: "2026-09-28T08:00:00Z" }] }],
  });
  assert.deepEqual(starts(result), ["2026-09-28T07:00:00.000Z"]);
  assert.deepEqual(
    result.slots[0].warnings.map((w) => [w.attendee, w.kind]),
    [["opt@example.com", "optional_attendee_busy"]],
  );
});

test("buffer before keeps a gap after the previous meeting, buffer after before the next", () => {
  const result = findSlots({
    ...base,
    window: { start: "2026-09-28T07:00:00Z", end: "2026-09-28T10:00:00Z" },
    policy: { durationMinutes: 30, stepMinutes: 15, bufferBeforeMinutes: 15, bufferAfterMinutes: 0 },
    events: [event("review", "2026-09-28T10:00:00+02:00", "2026-09-28T11:00:00+02:00")],
  });
  assert.deepEqual(starts(result), [
    "2026-09-28T07:00:00.000Z",
    "2026-09-28T07:15:00.000Z",
    "2026-09-28T07:30:00.000Z",
    "2026-09-28T09:15:00.000Z",
    "2026-09-28T09:30:00.000Z",
  ]);
});

test("minimum notice pushes the first slot past now", () => {
  const result = findSlots({
    ...base,
    now: "2026-09-28T06:30:00Z",
    limit: 1,
    policy: { minimumNoticeMinutes: 60 },
  });
  assert.deepEqual(starts(result), ["2026-09-28T07:30:00.000Z"]);
});

test("working hours follow the clock across the October DST change", () => {
  const result = findSlots({
    timeZone: "Europe/Berlin",
    now: NOW,
    window: { start: "2026-10-25T00:00:00Z", end: "2026-10-26T00:00:00Z" },
    limit: 1,
    policy: { workingHours: [{ days: [0], start: "09:00", end: "17:00" }] },
  });
  assert.deepEqual(starts(result), ["2026-10-25T08:00:00.000Z"]);
});

test("a series master without expanded instances is reported", () => {
  const result = findSlots({
    ...base,
    events: [event("weekly", "2026-09-28T09:00:00+02:00", "2026-09-28T09:30:00+02:00", { recurrence: ["RRULE:FREQ=WEEKLY"] })],
  });
  assert.deepEqual(result.unexpandedSeries, [{ id: "weekly", label: "weekly" }]);
});

test("check reports a live conflict inside the buffer and passes a clear slot", () => {
  const request = {
    ...base,
    policy: { bufferAfterMinutes: 10 },
    events: [event("1:1", "2026-09-28T11:00:00+02:00", "2026-09-28T11:30:00+02:00")],
  };
  const blocked = checkSlot({ ...request, slot: { start: "2026-09-28T10:30:00+02:00", end: "2026-09-28T10:55:00+02:00" } });
  assert.equal(blocked.ok, false);
  assert.deepEqual(
    blocked.conflicts.map((c) => [c.label, c.start]),
    [["1:1", "2026-09-28T09:00:00.000Z"]],
  );

  const clear = checkSlot({ ...request, slot: { start: "2026-09-28T10:00:00+02:00", end: "2026-09-28T10:30:00+02:00" } });
  assert.equal(clear.ok, true);
  assert.deepEqual(clear.warnings, []);
});

test("check refuses a slot inside the minimum notice and warns outside working hours", () => {
  const result = checkSlot({
    ...base,
    now: "2026-09-28T17:00:00Z",
    policy: { minimumNoticeMinutes: 120 },
    slot: { start: "2026-09-28T20:00:00+02:00", end: "2026-09-28T20:30:00+02:00" },
  });
  assert.equal(result.ok, false);
  assert.deepEqual(result.conflicts.map((c) => c.reason), ["inside_minimum_notice"]);
  assert.deepEqual(result.warnings.map((w) => w.kind), ["outside_your_working_hours"]);
});

test("an unknown time zone is rejected with a readable message", () => {
  assert.throws(() => findSlots({ ...base, timeZone: "Mars/Olympus" }), /not a valid IANA time zone/);
});
