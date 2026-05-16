---
name: apple-productivity
description: Use Apple Mail from Codex through the local Apple Productivity MCP plugin. Trigger when the user asks to search, read, summarize, draft, send, archive, or delete Apple Mail messages, or asks about future Apple Calendar and Reminders support.
---

# Apple Productivity

Use this skill when a task should access local Apple apps, especially Apple Mail.

## Mail workflow

- Prefer `mail_retrieve_context` for broad or fuzzy requests like "find what matters about X" or "use my email as context".
- Use `mail_search` when the user needs message candidates or handles.
- Use `mail_read` only for selected messages and keep body limits tight.
- Use `mail_compose` for drafts.
- Use `mail_send`, `mail_archive`, and `mail_delete` only when the configured write guard allows it.
- Treat delete as moving messages to Trash/Deleted Items, not permanent deletion.

## Privacy

Do not paste large private email bodies unless the user explicitly asks. Prefer concise summaries and cite message handles, subjects, senders, and dates.

