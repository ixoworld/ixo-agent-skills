# Scheduling Semantics

The rules `scripts/schedule.mjs` implements. Ported from the Portal scheduling engine proposed in ixoworld/ixo-portal#943, now owned by this skill.

## Availability Sources

- The connected user's Google Calendar events, via Composio.
- Busy ranges the user states in conversation (`busy`).
- Attendee busy ranges (`attendees[].busy`), from a free/busy tool when one works for that attendee, or from the user.
- The user's saved scheduling preferences, when the agent's context carries them: time zone, working hours, buffers, minimum notice, default duration, per-calendar overrides.

## Attendee Semantics

- Attendees are `required` (default) or optional (`optional: true` or `role: "optional"`).
- Required attendee busy time blocks slots. Optional attendee busy time only adds a warning to the slot.
- A required attendee's working hours narrow the search to the overlap with the user's hours. An optional attendee's working hours only warn.
- Each attendee's working hours are read in that attendee's own time zone.

## Event Semantics

Google Calendar events are normalised before they affect availability:

| Event | Effect | `ignoredEvents` reason |
|---|---|---|
| `status: "cancelled"` | ignored | `cancelled` |
| `transparency: "transparent"` (shown as free) | ignored | `marked_free` |
| user's own attendee entry is `declined` (matched by `self: true` or `selfEmails`) | ignored | `declined_by_you` |
| `status: "tentative"` | blocks | |
| all-day (`start.date`) | blocks the whole local day in the user's zone; `end.date` is exclusive | |
| recurring instance | blocks | |
| series master (`recurrence` without `recurringEventId`) | blocks its first occurrence only, listed in `unexpandedSeries`; re-list with instances expanded | |
| start/end missing or end not after start | ignored | `unreadable_time` |

## Booking Policy

- `durationMinutes` (default 30) and `stepMinutes` (default the smaller of the duration and 30). Slots start on local multiples of the step: 09:00, 09:30, and so on.
- `minimumNoticeMinutes`: no slot starts sooner than now plus the notice.
- `bufferBeforeMinutes`: free time kept between the previous event's end and the new meeting's start.
- `bufferAfterMinutes`: free time kept between the new meeting's end and the next event's start.
- `workingHours`: a list of `{ days, start, end }` in the user's zone, default Monday to Friday 09:00-17:00. Local wall-clock times, so they follow DST changes.

## Write-Time Check

Immediately before a create or move, the agent re-lists that day's events and runs `check` on the exact slot:

- A busy event overlapping the slot plus buffers, or a start inside the minimum notice or in the past, is a **conflict**. Do not write; show it and ask.
- Outside the user's working hours, outside a required attendee's hours, or clashing with an optional attendee is a **warning**. Tell the user before they confirm.
- Writing over a conflict needs the user's explicit override after seeing it.

## Provider Portability

A future calendar provider should be normalised into the same concepts before reaching the script: event status, free/busy transparency, the user's own response, all-day date ranges, expanded recurring instances, attendee role, and busy ranges with a source. Explain availability to the user from the script's output, not from provider-specific fields.
