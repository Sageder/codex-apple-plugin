---
name: apple-calendar
description: Use Apple Calendar from Codex through the local Apple Calendar MCP plugin. Trigger for calendar lookup/read/create/update/delete/show workflows and relative-date requests like next event or upcoming meetings.
---

# Apple Calendar

Use this skill when a task should access local Apple Calendar.

## Fast routing

- First use, a new Mac, or permission failures: `calendar_request_permissions`. If it returns Full Access setup guidance, relay that before using Calendar tools.
- Calendar availability, next event, or dated event search: `calendar_search_events`, then `calendar_read_event` for the selected handle.
- Writes: call the mutating tool with `dryRun: true` for a preview, then repeat with `confirm: true` only after the user clearly confirms.

## Workflow

- Use `calendar_list_calendars` before creating events unless the target calendar id is already known.
- Use `calendar_search_events` for date-window and fuzzy event lookup.
- Use `calendar_read_event` for selected events and keep notes previews tight.
- Use `calendar_create_event`, `calendar_update_event`, and `calendar_delete_event` only when the write guard allows it.
- For recurring event update/delete, always choose `span: "this"` for one occurrence or `span: "all"` for the whole series.
- Use `calendar_show_event` when the user wants the event opened in Calendar.app.
- Attendees are read-only in v1.

For relative dates, compute the actual window before calling tools. Calendar
search timestamps should be UTC ISO strings ending in `Z`.

## Examples

Find the next event by searching a concrete UTC window, then read the selected event:

```text
calendar_search_events({"from":"2026-05-17T16:00:00Z","to":"2026-06-16T16:00:00Z","limit":5})
calendar_read_event({"handle":"<handle-from-search>"})
```

Search for a meeting on a specific day:

```text
calendar_search_events({"query":"research chat","from":"2026-05-18T00:00:00Z","to":"2026-05-19T00:00:00Z","limit":10})
```

Create an event with the write guard:

```text
calendar_list_calendars()
calendar_create_event({"calendarId":"<calendar-id-from-list>","summary":"Focus block","start":"2026-05-20T08:00:00Z","end":"2026-05-20T09:00:00Z","dryRun":true})
calendar_create_event({"calendarId":"<calendar-id-from-list>","summary":"Focus block","start":"2026-05-20T08:00:00Z","end":"2026-05-20T09:00:00Z","confirm":true})
```

Update or delete a recurring event occurrence:

```text
calendar_update_event({"handle":"<handle>","span":"this","patch":{"summary":"Updated title"},"dryRun":true})
calendar_update_event({"handle":"<handle>","span":"this","patch":{"summary":"Updated title"},"confirm":true})
calendar_delete_event({"handle":"<handle>","span":"this","dryRun":true})
calendar_delete_event({"handle":"<handle>","span":"this","confirm":true})
```

Open an event in Calendar.app:

```text
calendar_show_event({"handle":"<handle>"})
```

## Access mode

- `APPLE_CALENDAR_WRITE_MODE=ask` is the default. Mutating tools return a preview or target summary unless the call includes `confirm: true`.
- `APPLE_CALENDAR_WRITE_MODE=direct` means full local write access.

## Privacy

Do not paste large calendar notes unless the user explicitly asks. Prefer concise summaries and cite handles, titles, calendars, and dates.
