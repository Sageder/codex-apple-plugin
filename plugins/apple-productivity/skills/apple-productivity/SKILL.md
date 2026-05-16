---
name: apple-productivity
description: Use Apple Mail and Reminders from Codex through the local Apple Productivity MCP plugin. Trigger when the user asks to search, read, summarize, draft, send, archive, or delete Apple Mail messages, or asks to list, search, read, create, update, complete, delete, or move Apple Reminders.
---

# Apple Productivity

Use this skill when a task should access local Apple apps, especially Apple Mail
or Apple Reminders.

## Mail workflow

- Prefer `mail_retrieve_context` for broad or fuzzy requests like "find what matters about X" or "use my email as context".
- Use `mail_search` when the user needs message candidates or handles.
- Use `mail_read` only for selected messages and keep body limits tight.
- Use `mail_compose` for drafts.
- Use `mail_send`, `mail_archive`, and `mail_delete` only when the configured write guard allows it.
- Treat delete as moving messages to Trash/Deleted Items, not permanent deletion.

## Reminders workflow

- Use `reminders_list_lists` when the user asks what lists are available or when a target list is ambiguous.
- Use `reminders_search` for reminder candidates and handles.
- Use `reminders_read` only for selected reminders and keep body limits tight.
- Use `reminders_create`, `reminders_update`, `reminders_complete`, `reminders_delete`, and `reminders_move` only when the configured write guard allows it.
- Treat `reminders_delete` as real reminder deletion, not a move-to-trash workflow.
- Swift/EventKit-backed Reminders support includes title, notes/body, due date, reminder alarms, priority, URL, recurrence, completion state, and moving between lists. Do not promise tags, subtasks, or attachments.

## Privacy

Do not paste large private email or reminder bodies unless the user explicitly
asks. Prefer concise summaries and cite handles, titles/subjects, lists/senders,
and dates.
