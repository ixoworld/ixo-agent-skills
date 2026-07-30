# Action-Item Patterns

People rarely say "I will do X by Y." Most actions hide inside softer language. Catch them.

## Patterns that always encode an action

| Phrase in source | Likely action |
|---|---|
| "We should look into X" | Someone needs to research X. Owner usually unstated - flag `OWNER?`. |
| "I'll circle back on X" | Speaker owns X. Date usually unstated - flag `DATE?`. |
| "Let's set up a meeting about X" | Someone needs to schedule. Default owner: the speaker who proposed it. |
| "Can you send me X" | Recipient owns X. Date is usually "before next meeting" if unstated. |
| "We need to check with [team]" | Action: contact [team]. Owner: whoever speaks most about that area, else flag. |
| "Let's revisit this next week" | Action: re-raise on next agenda. Owner: meeting host. |
| "I'll think about it" | NOT an action. This is a punt. Log as Open question. |
| "We could maybe..." | NOT an action. Log as FYI or Open question. |

## Patterns that look like actions but are not

- "We agreed X" - that's a Decision, not an Action.
- "I think X is true" - opinion, not action.
- "Historically we've done X" - context, not action.

## Owner-assignment defaults (use only when source gives no owner)

1. The speaker who first raised the topic.
2. The person whose function it touches (engineering things → eng lead, money things → finance).
3. The meeting host as fallback - but flag this and ask the user to confirm.

## Date-assignment defaults

Never invent a date. Use these phrasings only when paraphrasing what the source actually said:

- "by next meeting" if the meeting cadence was mentioned
- "this week" if "soon" or "ASAP" was said
- `DATE?` otherwise

## Sanity check before returning the brief

For each action, ask: would the named owner know what to do tomorrow morning without re-reading the transcript? If no, the action is too vague - rewrite or flag `SCOPE?`.
