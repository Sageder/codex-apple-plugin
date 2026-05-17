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

## Access mode

- `APPLE_CALENDAR_WRITE_MODE=ask` is the default. Mutating tools return a preview or target summary unless the call includes `confirm: true`.
- `APPLE_CALENDAR_WRITE_MODE=direct` means full local write access.

## Privacy

Do not paste large calendar notes unless the user explicitly asks. Prefer concise summaries and cite handles, titles, calendars, and dates.
