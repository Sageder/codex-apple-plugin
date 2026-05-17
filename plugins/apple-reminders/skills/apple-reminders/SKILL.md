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
- For "nearest reminder", "next reminder", and other upcoming scheduled-reminder requests, use `reminders_search` with `scheduled: "scheduled"`, `scheduledSince` set to the current local ISO datetime, `sort: "scheduled"`, and a small `limit`.
- Use `reminders_read` only for selected reminders and keep body limits tight.
- Use `reminders_create`, `reminders_update`, `reminders_complete`, `reminders_delete`, and `reminders_move` only when the configured write guard allows it.
- Treat `reminders_delete` as real reminder deletion, not a move-to-trash workflow.
- Swift/EventKit-backed Reminders support includes title, notes/body, due date, reminder alarms, priority, URL, recurrence, completion state, and moving between lists. Do not promise tags, subtasks, or attachments.

For relative dates, compute the actual current local ISO datetime before calling
tools. Reminders accepts ISO date or datetime strings.

## Access mode

- `APPLE_REMINDERS_WRITE_MODE=ask` is the default. Mutating tools return a preview or target summary unless the call includes `confirm: true`.
- `APPLE_REMINDERS_WRITE_MODE=direct` means full local write access.
- The old `APPLE_PRODUCTIVITY_WRITE_MODE` remains a fallback.

## Privacy

Do not paste large reminder notes unless the user explicitly asks. Prefer concise summaries and cite handles, titles, lists, and dates.
