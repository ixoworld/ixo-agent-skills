---
name: calendar-scheduling
description: Find meeting times, book, reschedule, and cancel events on the user's connected Google Calendar through Composio, with correct time-zone math, working hours, buffers, minimum notice, required vs optional attendees, and a live conflict re-check before every write. Use when the user asks "when am I free", "find a slot with X", "book 30 minutes with the team next week", "move my 3pm", "cancel tomorrow's call", or wants to know why a time does not work. Never writes to the calendar without the user's explicit confirmation of the exact slot, attendees, and whether invitations are sent.
license: Apache-2.0
compatibility: claude
allowed-tools: shell
metadata:
  short-description: Find free time and book meetings safely on Google Calendar
  author: IXO World
  version: "1.0.0"
  category: productivity
---

# Calendar Scheduling

Use this skill to answer "when can we meet" with slots that are actually free, and to book, move, or cancel events without ever writing over something the user did not agree to.

## Operating Standard

- All calendar access goes through the Composio meta-tools: `COMPOSIO_MANAGE_CONNECTIONS` (toolkit `googlecalendar`), `COMPOSIO_SEARCH_TOOLS`, `COMPOSIO_GET_TOOL_SCHEMAS`, `COMPOSIO_MULTI_EXECUTE_TOOL`. App tools are not directly callable.
- Check the connection first. If `COMPOSIO_MANAGE_CONNECTIONS` returns a `redirect_url`, show it as a link and stop. Never write a link yourself.
- Do not compute free time in your head. Run `scripts/schedule.mjs` (below). Time zones, DST, buffers, and all-day events are where hand-computed answers go wrong.
- Every write (create, update, delete) needs an explicit "yes" to a concrete summary in this conversation: title, local start-end with time zone, calendar, attendees, and whether invitations or updates are emailed. A yes to an earlier, different summary does not count.
- Re-read the calendar and run `check` immediately before every create or move. If it reports a conflict, do not write. Show the conflict and ask.
- Book over a conflict only when the user explicitly says to after seeing it.
- Present times in the user's time zone, and in the attendee's zone too when they differ.

## Tools

Discover the Google Calendar tools with `COMPOSIO_SEARCH_TOOLS` and fetch their input schema with `COMPOSIO_GET_TOOL_SCHEMAS` before the first call. Slugs seen in IXO code, as a hint only: `GOOGLECALENDAR_LIST_CALENDARS`, `GOOGLECALENDAR_EVENTS_LIST`, `GOOGLECALENDAR_CREATE_EVENT`, `GOOGLECALENDAR_UPDATE_EVENT` / `GOOGLECALENDAR_PATCH_EVENT`, `GOOGLECALENDAR_DELETE_EVENT`. Trust the search result over this list.

When listing events, always request the calendar `primary` (unless the user named another), a time range covering the whole search window plus one day each side, and recurring events expanded into single instances.

Run every app tool through `COMPOSIO_MULTI_EXECUTE_TOOL` as `{ "tools": [{ "tool_slug": "<SLUG>", "arguments": { ... } }], "sync_response_to_workbench": false }`.

## The Scheduling Script

`scripts/schedule.mjs` has no dependencies. Write the request to a file (or pipe it) and run:

```bash
node scripts/schedule.mjs slots request.json   # free slots in a window
node scripts/schedule.mjs check request.json   # is this exact slot still free
```

Request shape (both commands):

```json
{
  "timeZone": "Europe/Berlin",
  "selfEmails": ["user@example.com"],
  "events": "<the raw EVENTS_LIST result, as returned>",
  "busy": [{ "start": "2026-09-28T13:00:00+02:00", "end": "2026-09-28T14:00:00+02:00", "label": "school run" }],
  "attendees": [
    { "email": "ana@example.com", "optional": false, "timeZone": "America/New_York",
      "workingHours": [{ "days": [1, 2, 3, 4, 5], "start": "09:00", "end": "17:00" }],
      "busy": [{ "start": "...", "end": "..." }] }
  ],
  "policy": { "durationMinutes": 30, "stepMinutes": 30, "minimumNoticeMinutes": 0,
              "bufferBeforeMinutes": 0, "bufferAfterMinutes": 0,
              "workingHours": [{ "days": [1, 2, 3, 4, 5], "start": "09:00", "end": "17:00" }] },
  "window": { "start": "2026-09-28T00:00:00+02:00", "end": "2026-10-02T23:59:00+02:00" },
  "limit": 20,
  "slot": { "start": "2026-09-28T10:00:00+02:00", "end": "2026-09-28T10:30:00+02:00" }
}
```

- `window` and `limit` are for `slots`; `slot` is for `check`. Everything else is shared. Only `timeZone` plus `window` or `slot` are required.
- `events` accepts the Composio response as-is; the script finds the event list inside it.
- `selfEmails` is the connected account's address, so events the user declined stop blocking.
- `days`: 0 = Sunday … 6 = Saturday. `bufferBeforeMinutes` is the gap kept after the previous meeting; `bufferAfterMinutes` the gap before the next one.
- `slots` returns `slots[]` (each with `local` text and `warnings[]`), `busy[]`, `ignoredEvents[]` with the reason each event was skipped, and `unexpandedSeries[]`.
- `check` returns `ok`, `conflicts[]` (which block the write) and `warnings[]` (which the user should hear before confirming).
- Invalid input exits 1 with `{ "error": "..." }`. Fix the request; do not fall back to mental math.

If no shell is available, say scheduling is unavailable in this session. Do not improvise the calculation.

## Workflow

### 1. Pin the request

Extract duration, window, attendees (required or optional), and time zone. Defaults: 30 minutes, the next five working days, the user's zone, weekdays 09:00-17:00, no buffers. Use the user's saved scheduling preferences if your context has them. Ask only for what changes the answer, and never more than one question.

### 2. Gather busy time

List the user's events for the window. For other attendees, use a free/busy or shared-calendar tool if `COMPOSIO_SEARCH_TOOLS` finds one that works for them; otherwise put what the user tells you into `attendees[].busy`, and say you could only check the user's own calendar.

### 3. Find slots

Run `slots`. If `unexpandedSeries` is not empty, re-list with recurring events expanded and run again. Offer 3-5 slots spread across different days, not the first five in a row, with any warnings in plain words ("Ana is optional and busy then"). If there are no slots, say which rule removed them (working hours, notice, a required attendee) and offer the smallest relaxation.

### 4. Confirm, re-check, write

After the user picks a slot, show the confirmation summary. On "yes": re-list the events for that day, run `check` with the chosen slot, then write only if `ok` is true. Report the result with the event link from the response.

### 5. Reschedule and cancel

Find the event by listing, not from memory. Confirm which event (title, local time) before touching it. A move follows step 4 with the new slot. A cancel needs its own confirmation, and states whether attendees are notified.

## Response Shape

- Proposals: a short list of local times (weekday, date, start-end, zone), one line of warnings each, and a question asking which one to book.
- Before a write: the confirmation summary, ending with a yes/no question.
- After a write: what changed, the event link, and who was notified.
- When a time does not work: the blocking reason from the script output, not a guess.

## Edge Cases

- **Declined, cancelled, or "free" events** do not block. Tentative ones do. See `ignoredEvents` when the user asks why a busy-looking time was offered.
- **All-day events** block the whole local day in the user's zone.
- **Travel across zones**: ask which zone the working hours apply to before searching.
- **Attendee outside working hours** (required): not offered by `slots`, warned by `check`. Optional: warned, still offered.
- **Other people's calendars**: never claim someone is free when you only saw the user's own calendar.

## References

- `references/scheduling-semantics.md` - the full availability, attendee, event, and booking rules the script implements.
- `tests/schedule.test.mjs` - executable examples of each rule (`node --test tests/schedule.test.mjs`).
