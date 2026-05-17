---
name: apple-productivity
description: Use Apple Mail, Apple Calendar, and Apple Reminders from Codex through the local Apple Productivity MCP plugin. Trigger for mailbox questions, message search/read/context retrieval, drafting or sending mail, mail archive/delete/move, calendar lookup/read/create/update/delete/show, reminder list/search/read/create/update/complete/delete/move, and relative-date requests like newest email, next event, or nearest reminder.
---

# Apple Productivity

Use this skill when a task should access local Apple apps, especially Apple Mail
Apple Calendar, or Apple Reminders.

Mail uses a Swift ScriptingBridge/Apple Events helper. Calendar and Reminders
access use Swift/EventKit helpers.

## Fast routing

- Exact mail lookup or newest/latest email: `mail_search`, then `mail_read` only if the user needs body/details.
- Broad mail context such as "what matters about X": `mail_retrieve_context`.
- Calendar availability, next event, or dated event search: `calendar_search_events`, then `calendar_read_event` for the selected handle.
- Reminder lookup, nearest reminder, or scheduled reminders: `reminders_search`, then `reminders_read` if body/details matter.
- Writes: call the mutating tool with `dryRun: true` for a preview, then repeat with `confirm: true` only after the user clearly confirms.

For relative dates, compute the actual window before calling tools. Calendar
search timestamps should be UTC ISO strings ending in `Z`; Reminders accepts ISO
date or datetime strings.

## Common examples

Newest email:

```js
mail_search({ "scope": "inbox", "limit": 1 })
mail_read({ "handles": ["<handle from search>"], "maxBodyChars": 2000 })
```

Mail from or to a person:

```js
mail_search({ "scope": "inbox", "sender": "alice@example.com", "limit": 10 })
mail_search({ "scope": "sent", "recipient": "alice@example.com", "limit": 10 })
```

Broad mailbox context:

```js
mail_retrieve_context({
  "query": "project name or topic",
  "scope": "all",
  "topK": 5,
  "maxBodyChars": 4000
})
```

Next calendar events:

```js
calendar_search_events({
  "from": "2026-05-17T12:00:00Z",
  "to": "2026-05-24T12:00:00Z",
  "limit": 10
})
calendar_read_event({ "handle": "<handle from search>" })
```

Nearest scheduled reminder:

```js
reminders_search({
  "scheduled": "scheduled",
  "scheduledSince": "2026-05-17T14:00:00+02:00",
  "sort": "scheduled",
  "limit": 5
})
```

Create or change something safely:

```js
calendar_list_calendars()
calendar_create_event({
  "calendarName": "<calendar name from list>",
  "summary": "Meeting",
  "start": "2026-05-18T13:00:00Z",
  "end": "2026-05-18T13:30:00Z",
  "dryRun": true
})
calendar_create_event({
  "calendarName": "<calendar name from list>",
  "summary": "Meeting",
  "start": "2026-05-18T13:00:00Z",
  "end": "2026-05-18T13:30:00Z",
  "confirm": true
})
```

## Mail workflow

- Prefer `mail_retrieve_context` for broad or fuzzy requests like "find what matters about X" or "use my email as context".
- Use `mail_search` when the user needs message candidates or handles. Use explicit scopes for `sent`, `archive`, `trash`, and `junk` when the request names those areas.
- For sent-mail questions like "what did I send to X", use `scope: "sent"` plus `recipient`.
- Use `subject` for exact known-subject lookups; broad `query` is for metadata terms.
- Use `mail_read` only for selected messages and keep body limits tight.
- Use `mail_compose` for drafts.
- Use `mail_send`, `mail_archive`, `mail_delete`, `mail_junk`, `mail_move`, and `mail_undo_move` only when the configured write guard allows it.
- Treat delete as moving messages to Trash/Deleted Items, not permanent deletion.
- Keep undo tokens returned by move/archive/delete/junk actions if the user may want to reverse the move.

## Calendar workflow

- Use `calendar_list_calendars` before creating events unless the target calendar id is already known.
- Use `calendar_search_events` for date-window and fuzzy event lookup.
- Use `calendar_read_event` for selected events and keep notes previews tight.
- Use `calendar_create_event`, `calendar_update_event`, and `calendar_delete_event` only when the shared write guard allows it.
- For recurring event update/delete, always choose `span: "this"` for one occurrence or `span: "all"` for the whole series.
- Use `calendar_show_event` when the user wants the event opened in Calendar.app.
- Attendees are read-only in v1.

## Access mode

- Guarded Mail, Calendar, and Reminders mutating tools share the same write
  guard and accept `confirm` plus `dryRun`.
- `APPLE_PRODUCTIVITY_WRITE_MODE=ask` is the default. Mutating tools return a preview or target summary unless the call includes `confirm: true`.
- `APPLE_PRODUCTIVITY_WRITE_MODE=direct` means full local write access.
- `APPLE_PRODUCTIVITY_WRITE_MODE=confirm` is accepted as a legacy alias for `ask`.
- `mail_send` no longer creates drafts as a safety fallback. Use `mail_compose` explicitly when the user wants a draft.

## Reminders workflow

- Use `reminders_list_lists` when the user asks what lists are available or when a target list is ambiguous.
- Use `reminders_search` for reminder candidates and handles.
- For "nearest reminder", "next reminder", and other upcoming scheduled-reminder requests, use `reminders_search` with `scheduled: "scheduled"`, `scheduledSince` set to the current local ISO datetime, `sort: "scheduled"`, and a small `limit`. Do not put words like "nearest" or "upcoming" in `query` unless the user is searching reminder text.
- Use `reminders_read` only for selected reminders and keep body limits tight.
- Use `reminders_create`, `reminders_update`, `reminders_complete`, `reminders_delete`, and `reminders_move` only when the configured write guard allows it.
- Treat `reminders_delete` as real reminder deletion, not a move-to-trash workflow.
- Swift/EventKit-backed Reminders support includes title, notes/body, due date, reminder alarms, priority, URL, recurrence, completion state, and moving between lists. Do not promise tags, subtasks, or attachments.

## Privacy

Do not paste large private email bodies, calendar notes, or reminder bodies
unless the user explicitly asks. Prefer concise summaries and cite handles,
titles/subjects, lists/senders/calendars, and dates.
