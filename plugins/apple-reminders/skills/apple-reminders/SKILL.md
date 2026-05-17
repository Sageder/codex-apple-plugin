---
name: apple-reminders
description: Use Apple Reminders from Codex through the local Apple Reminders MCP plugin. Trigger for reminder list/search/read/create/update/complete/delete/move workflows and relative-date requests like nearest reminder.
---

# Apple Reminders

Use this skill when a task should access local Apple Reminders.

## Fast routing

- First use, a new Mac, or permission failures: `reminders_request_permissions`.
- Reminder lookup, nearest reminder, or scheduled reminders: `reminders_search`, then `reminders_read` if body/details matter.
- Writes: call the mutating tool with `dryRun: true` for a preview, then repeat with `confirm: true` only after the user clearly confirms.

## Workflow

- Use `reminders_list_lists` when the user asks what lists are available or when a target list is ambiguous.
- Use `reminders_search` for reminder candidates and handles.
- For "nearest reminder", "next reminder", and other upcoming scheduled-reminder requests, use `reminders_search` with `completed: "incomplete"`, `scheduled: "scheduled"`, `scheduledSince` set to the current local ISO datetime, `sort: "scheduled"`, and a small `limit`.
- Do not infer "no upcoming reminders" from a broad incomplete-only search. Scheduled/date-range searches scan the complete selected lists before applying `limit`, because EventKit fetch order is not chronological; `maxScanPerList` is only a relevance-scan performance cap and should not be used as a correctness boundary for nearest/upcoming lookups.
- For due-only or reminder-alarm-only questions, use `dueSince`/`dueBefore` or `remindSince`/`remindBefore` directly. Those date-range searches also scan complete selected lists before limiting.
- Use `reminders_read` only for selected reminders and keep body limits tight.
- Use `reminders_create`, `reminders_update`, `reminders_complete`, `reminders_delete`, and `reminders_move` only when the configured write guard allows it.
- Treat `reminders_delete` as real reminder deletion, not a move-to-trash workflow.
- Swift/EventKit-backed Reminders support includes title, notes/body, due date, reminder alarms, priority, URL, recurrence, completion state, and moving between lists. Do not promise tags, subtasks, or attachments.

For relative dates, compute the actual current local ISO datetime before calling
tools. Reminders accepts ISO date or datetime strings.

## Examples

Find the next scheduled incomplete reminder:

```text
reminders_search({"completed":"incomplete","scheduled":"scheduled","scheduledSince":"2026-05-17T19:10:00+02:00","sort":"scheduled","limit":5})
```

Find overdue reminders by due date:

```text
reminders_search({"completed":"incomplete","dueBefore":"2026-05-17T19:10:00+02:00","sort":"scheduled","limit":10})
```

Search reminder titles/notes/list names:

```text
reminders_search({"query":"rent","completed":"all","limit":10})
reminders_read({"handles":["<handle-from-search>"],"maxBodyChars":1000})
```

Create a reminder with the write guard:

```text
reminders_create({"name":"Pay rent","dueDate":"2026-05-26T23:00:00+02:00","remindMeDate":"2026-05-26T23:00:00+02:00","dryRun":true})
reminders_create({"name":"Pay rent","dueDate":"2026-05-26T23:00:00+02:00","remindMeDate":"2026-05-26T23:00:00+02:00","confirm":true})
```

Complete, move, or delete a selected reminder:

```text
reminders_complete({"handles":["<handle>"],"dryRun":true})
reminders_complete({"handles":["<handle>"],"confirm":true})
reminders_move({"handles":["<handle>"],"list":"Tasks","dryRun":true})
reminders_move({"handles":["<handle>"],"list":"Tasks","confirm":true})
reminders_delete({"handles":["<handle>"],"dryRun":true})
reminders_delete({"handles":["<handle>"],"confirm":true})
```

## Access mode

- `APPLE_REMINDERS_WRITE_MODE=ask` is the default. Mutating tools return a preview or target summary unless the call includes `confirm: true`.
- `APPLE_REMINDERS_WRITE_MODE=direct` means full local write access.

## Privacy

Do not paste large reminder notes unless the user explicitly asks. Prefer concise summaries and cite handles, titles, lists, and dates.
