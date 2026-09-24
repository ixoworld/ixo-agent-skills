#!/usr/bin/env node
/**
 * Deterministic slot finding and write-time conflict checks for calendar scheduling.
 * Usage: node scripts/schedule.mjs <slots|check> <request.json|->
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const MINUTE = 60_000;
const DEFAULT_WORKING_HOURS = [{ days: [1, 2, 3, 4, 5], start: "09:00", end: "17:00" }];
const DEFAULT_DURATION = 30;
const DEFAULT_LIMIT = 20;

const formatters = new Map();

function formatter(timeZone) {
  if (!formatters.has(timeZone)) {
    formatters.set(
      timeZone,
      new Intl.DateTimeFormat("en-US", {
        timeZone,
        hourCycle: "h23",
        weekday: "short",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }),
    );
  }
  return formatters.get(timeZone);
}

function assertTimeZone(timeZone, field) {
  if (typeof timeZone !== "string" || !timeZone) throw new Error(`${field} must be an IANA time zone, e.g. Europe/Berlin`);
  try {
    formatter(timeZone);
  } catch {
    throw new Error(`${field} "${timeZone}" is not a valid IANA time zone`);
  }
  return timeZone;
}

function zonedParts(ms, timeZone) {
  const out = {};
  for (const { type, value } of formatter(timeZone).formatToParts(new Date(ms))) out[type] = value;
  return {
    year: Number(out.year),
    month: Number(out.month),
    day: Number(out.day),
    hour: Number(out.hour),
    minute: Number(out.minute),
    second: Number(out.second),
    weekday: out.weekday,
  };
}

function offsetMs(ms, timeZone) {
  const p = zonedParts(ms, timeZone);
  const whole = ms - (((ms % 1000) + 1000) % 1000);
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - whole;
}

function zonedTime(dateKey, clock, timeZone) {
  const [y, m, d] = dateKey.split("-").map(Number);
  const [h, mi] = clock.split(":").map(Number);
  const wall = Date.UTC(y, m - 1, d, h, mi);
  let ts = wall - offsetMs(wall, timeZone);
  const corrected = wall - offsetMs(ts, timeZone);
  if (corrected !== ts) ts = corrected;
  return ts;
}

const pad = (n) => String(n).padStart(2, "0");

function localDateKey(ms, timeZone) {
  const p = zonedParts(ms, timeZone);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

function addDays(dateKey, days) {
  const [y, m, d] = dateKey.split("-").map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + days));
  return `${next.getUTCFullYear()}-${pad(next.getUTCMonth() + 1)}-${pad(next.getUTCDate())}`;
}

function weekday(dateKey) {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

function describe(range, timeZone) {
  const s = zonedParts(range.start, timeZone);
  const e = zonedParts(range.end, timeZone);
  return {
    start: new Date(range.start).toISOString(),
    end: new Date(range.end).toISOString(),
    local: `${s.weekday} ${s.year}-${pad(s.month)}-${pad(s.day)} ${pad(s.hour)}:${pad(s.minute)}-${pad(e.hour)}:${pad(e.minute)} ${timeZone}`,
  };
}

function instant(value, field) {
  const ms = typeof value === "number" ? value : Date.parse(value);
  if (!Number.isFinite(ms)) throw new Error(`${field} must be an ISO 8601 date-time with an offset, got ${JSON.stringify(value)}`);
  return ms;
}

function range(start, end, field) {
  const r = { start: instant(start, `${field}.start`), end: instant(end, `${field}.end`) };
  if (r.end <= r.start) throw new Error(`${field}.end must be after ${field}.start`);
  return r;
}

const overlaps = (a, b) => a.start < b.end && b.start < a.end;
const contains = (outer, inner) => outer.start <= inner.start && outer.end >= inner.end;

function clamp(r, bounds) {
  const start = Math.max(r.start, bounds.start);
  const end = Math.min(r.end, bounds.end);
  return end > start ? { ...r, start, end } : null;
}

function merge(ranges) {
  const merged = [];
  for (const r of [...ranges].sort((a, b) => a.start - b.start)) {
    const last = merged[merged.length - 1];
    if (last && r.start <= last.end) last.end = Math.max(last.end, r.end);
    else merged.push({ start: r.start, end: r.end });
  }
  return merged;
}

function subtract(available, blockers) {
  let result = available;
  for (const b of blockers) {
    result = result.flatMap((r) => {
      if (!overlaps(r, b)) return [r];
      const pieces = [];
      if (b.start > r.start) pieces.push({ start: r.start, end: b.start });
      if (b.end < r.end) pieces.push({ start: b.end, end: r.end });
      return pieces;
    });
  }
  return result;
}

function intersect(left, right) {
  const out = [];
  for (const a of left) for (const b of right) {
    const r = clamp(a, b);
    if (r) out.push(r);
  }
  return merge(out);
}

function workingRanges(window, timeZone, workingHours) {
  const hours = Array.isArray(workingHours) && workingHours.length ? workingHours : DEFAULT_WORKING_HOURS;
  const last = addDays(localDateKey(window.end, timeZone), 1);
  const ranges = [];
  for (let day = addDays(localDateKey(window.start, timeZone), -1); day <= last; day = addDays(day, 1)) {
    for (const h of hours) {
      if (!h.days.includes(weekday(day))) continue;
      const r = clamp({ start: zonedTime(day, h.start, timeZone), end: zonedTime(day, h.end, timeZone) }, window);
      if (r) ranges.push(r);
    }
  }
  return merge(ranges);
}

function findArray(data, keys) {
  if (Array.isArray(data)) return data;
  if (!data || typeof data !== "object") return [];
  for (const key of keys) if (Array.isArray(data[key])) return data[key];
  const inner = data.response_data ?? data.responseData ?? data.data;
  return inner && inner !== data ? findArray(inner, keys) : [];
}

function selfResponse(event, selfEmails) {
  if (!Array.isArray(event.attendees)) return undefined;
  const me = event.attendees.find(
    (a) => a && (a.self === true || (typeof a.email === "string" && selfEmails.has(a.email.toLowerCase()))),
  );
  return me?.responseStatus;
}

function classifyEvent(event, timeZone, selfEmails) {
  const label = event.summary ?? "(no title)";
  if (event.status === "cancelled") return { ignored: "cancelled", label };
  if (event.transparency === "transparent") return { ignored: "marked_free", label };
  if (selfResponse(event, selfEmails) === "declined") return { ignored: "declined_by_you", label };

  const allDay = typeof event.start?.date === "string" && typeof event.start?.dateTime !== "string";
  const start = allDay ? zonedTime(event.start.date, "00:00", timeZone) : Date.parse(event.start?.dateTime);
  const end = allDay ? zonedTime(event.end?.date ?? addDays(event.start.date, 1), "00:00", timeZone) : Date.parse(event.end?.dateTime);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return { ignored: "unreadable_time", label };

  const reason = allDay ? "all_day" : event.status === "tentative" ? "tentative" : event.recurringEventId ? "recurring_instance" : "busy";
  return { busy: { start, end, source: "your_calendar", label, reason }, seriesMaster: Array.isArray(event.recurrence) && !event.recurringEventId };
}

function readPolicy(policy = {}) {
  const duration = policy.durationMinutes ?? DEFAULT_DURATION;
  return {
    durationMinutes: duration,
    stepMinutes: policy.stepMinutes ?? Math.min(duration, 30),
    minimumNoticeMinutes: policy.minimumNoticeMinutes ?? 0,
    bufferBeforeMinutes: policy.bufferBeforeMinutes ?? 0,
    bufferAfterMinutes: policy.bufferAfterMinutes ?? 0,
    workingHours: policy.workingHours?.length ? policy.workingHours : DEFAULT_WORKING_HOURS,
  };
}

function readRequest(request) {
  const timeZone = assertTimeZone(request.timeZone, "timeZone");
  const now = request.now === undefined ? Date.now() : instant(request.now, "now");
  const selfEmails = new Set((request.selfEmails ?? []).map((e) => String(e).toLowerCase()));
  const policy = readPolicy(request.policy);

  const ignored = [];
  const unexpandedSeries = [];
  const busy = [];
  for (const event of findArray(request.events ?? [], ["items", "events"])) {
    if (!event || typeof event !== "object") continue;
    const c = classifyEvent(event, timeZone, selfEmails);
    if (c.ignored) ignored.push({ id: event.id, label: c.label, reason: c.ignored });
    else {
      busy.push(c.busy);
      if (c.seriesMaster) unexpandedSeries.push({ id: event.id, label: c.busy.label });
    }
  }
  (request.busy ?? []).forEach((b, i) =>
    busy.push({ ...range(b.start, b.end, `busy[${i}]`), source: "provided", label: b.label ?? "busy", reason: "busy" }),
  );

  const optionalBusy = [];
  const attendees = (request.attendees ?? []).map((a, i) => {
    const optional = a.optional === true || a.role === "optional";
    const tz = a.timeZone ? assertTimeZone(a.timeZone, `attendees[${i}].timeZone`) : timeZone;
    (a.busy ?? []).forEach((b, j) => {
      const r = { ...range(b.start, b.end, `attendees[${i}].busy[${j}]`), source: a.email, label: b.label ?? `${a.email} busy`, reason: "attendee_busy" };
      (optional ? optionalBusy : busy).push(r);
    });
    return { email: a.email, optional, timeZone: tz, workingHours: a.workingHours };
  });

  return { timeZone, now, policy, busy, optionalBusy, attendees, ignored, unexpandedSeries };
}

function padded(busy, policy) {
  return busy.map((b) => ({ ...b, start: b.start - policy.bufferAfterMinutes * MINUTE, end: b.end + policy.bufferBeforeMinutes * MINUTE }));
}

function alignUp(ms, stepMs, timeZone) {
  const off = offsetMs(ms, timeZone);
  return Math.ceil((ms + off) / stepMs) * stepMs - off;
}

function slotWarnings(slot, ctx, window) {
  const warnings = [];
  for (const b of ctx.optionalBusy) {
    if (overlaps(slot, b)) warnings.push({ attendee: b.source, kind: "optional_attendee_busy", ...describe(b, ctx.timeZone) });
  }
  for (const a of ctx.attendees) {
    if (!a.optional || !a.workingHours?.length) continue;
    const hours = workingRanges(window, a.timeZone, a.workingHours);
    if (!hours.some((h) => contains(h, slot))) warnings.push({ attendee: a.email, kind: "outside_optional_attendee_hours", timeZone: a.timeZone });
  }
  return warnings;
}

export function findSlots(request) {
  const ctx = readRequest(request);
  const { policy, timeZone } = ctx;
  const requested = range(request.window?.start, request.window?.end, "window");
  const window = { ...requested, start: Math.max(requested.start, ctx.now + policy.minimumNoticeMinutes * MINUTE) };
  const limit = request.limit ?? DEFAULT_LIMIT;

  let open = [];
  if (window.end > window.start) {
    open = workingRanges(window, timeZone, policy.workingHours);
    for (const a of ctx.attendees) {
      if (!a.optional && a.workingHours?.length) open = intersect(open, workingRanges(window, a.timeZone, a.workingHours));
    }
    open = subtract(open, merge(padded(ctx.busy, policy)));
  }

  const durationMs = policy.durationMinutes * MINUTE;
  const stepMs = policy.stepMinutes * MINUTE;
  const slots = [];
  for (const r of open) {
    for (let t = alignUp(r.start, stepMs, timeZone); t + durationMs <= r.end && slots.length < limit; t += stepMs) {
      const slot = { start: t, end: t + durationMs };
      slots.push({ ...describe(slot, timeZone), warnings: slotWarnings(slot, ctx, requested) });
    }
  }

  return {
    timeZone,
    window: describe(requested, timeZone),
    policy,
    slots,
    count: slots.length,
    busy: merge(ctx.busy).map((b) => describe(b, timeZone)),
    ignoredEvents: ctx.ignored,
    unexpandedSeries: ctx.unexpandedSeries,
  };
}

export function checkSlot(request) {
  const ctx = readRequest(request);
  const { policy, timeZone } = ctx;
  const slot = range(request.slot?.start, request.slot?.end, "slot");
  const conflicts = [];
  const warnings = [];

  if (slot.start < ctx.now + policy.minimumNoticeMinutes * MINUTE) {
    conflicts.push({ reason: slot.start < ctx.now ? "in_the_past" : "inside_minimum_notice", minimumNoticeMinutes: policy.minimumNoticeMinutes });
  }
  for (const b of ctx.busy) {
    if (overlaps(slot, padded([b], policy)[0])) {
      conflicts.push({ reason: b.reason, source: b.source, label: b.label, ...describe(b, timeZone) });
    }
  }
  const day = { start: slot.start - 2 * 24 * 60 * MINUTE, end: slot.end + 2 * 24 * 60 * MINUTE };
  if (!workingRanges(day, timeZone, policy.workingHours).some((h) => contains(h, slot))) {
    warnings.push({ kind: "outside_your_working_hours" });
  }
  for (const a of ctx.attendees) {
    if (a.optional || !a.workingHours?.length) continue;
    if (!workingRanges(day, a.timeZone, a.workingHours).some((h) => contains(h, slot))) {
      warnings.push({ attendee: a.email, kind: "outside_required_attendee_hours", timeZone: a.timeZone });
    }
  }
  warnings.push(...slotWarnings(slot, ctx, day));

  return {
    ok: conflicts.length === 0,
    slot: describe(slot, timeZone),
    conflicts,
    warnings,
    ignoredEvents: ctx.ignored,
    unexpandedSeries: ctx.unexpandedSeries,
  };
}

export function main({ command, request }) {
  if (command === "slots") return findSlots(request);
  if (command === "check") return checkSlot(request);
  throw new Error(`Unknown command "${command}". Use "slots" or "check".`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [command, file] = process.argv.slice(2);
  if (!command || !file) {
    console.error("Usage: node scripts/schedule.mjs <slots|check> <request.json|->");
    process.exit(1);
  }
  try {
    const request = JSON.parse(readFileSync(file === "-" ? 0 : file, "utf8"));
    console.log(JSON.stringify(main({ command, request }), null, 2));
  } catch (err) {
    console.log(JSON.stringify({ error: err.message }, null, 2));
    process.exit(1);
  }
}
