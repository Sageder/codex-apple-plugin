---
name: apple-productivity
description: Use Apple Mail and Apple Calendar from Codex through the local Apple Productivity MCP plugin. Trigger when the user asks to search, read, summarize, draft, send, archive, or delete Apple Mail messages, or to list calendars, search/read/create/update/delete/show Apple Calendar events.
---

# Apple Productivity

Use this skill when a task should access local Apple apps, especially Apple Mail
or Apple Calendar.

Calendar access uses the Swift/EventKit helper, not JXA.

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

- `APPLE_PRODUCTIVITY_WRITE_MODE=confirm` means mutating tools ask by default and require `confirm: true`.
- `APPLE_PRODUCTIVITY_WRITE_MODE=direct` means full local write access.
- `APPLE_PRODUCTIVITY_WRITE_MODE=draft` is the safe default. Mail writes draft/preview where possible; Calendar writes return previews.

## Privacy

Do not paste large private email bodies or calendar notes unless the user explicitly asks.
Prefer concise summaries and cite handles, subjects or summaries, senders or calendars, and dates.
