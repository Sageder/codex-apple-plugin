# Apple Productivity Codex Plugin

Local Codex plugin for Apple Mail and Apple Calendar, with the shared bridge
ready for Reminders next.

Mail currently talks to macOS through JXA via `/usr/bin/osascript`. Calendar
uses a local Swift/EventKit helper. The plugin does not store persistent mail or
calendar indexes; retrieval is live and ephemeral.

## Tools

Mail tools can list accounts, search/retrieve context, read selected messages,
compose drafts, send, archive, and delete by moving to Trash/Deleted Items.

Calendar tools can list EventKit-visible calendars, search events, read an event,
create events, update an event or recurring occurrence, delete an event or
recurring occurrence, and show an event in Calendar.app.

## Mail tools

- `mail_list_accounts` and `mail_list_mailboxes`
- `mail_search` across inbox, sent, archive, trash, junk, all mail, or a named mailbox
- `mail_retrieve_context` for live RAG-style snippets
- `mail_read`, `mail_compose`, and guarded `mail_send`
- `mail_archive`, `mail_delete`, `mail_junk`, `mail_move`, and `mail_undo_move`

Move/delete/archive/junk actions return stateless undo tokens. No local move
history database is stored.

## Development

```bash
npm install
npm run build
npm run test
npm run smoke:mail
npm run smoke:calendar
```

## Safety

Mail and Calendar share one access mode:

- `APPLE_PRODUCTIVITY_WRITE_MODE=draft|confirm|direct`
- `APPLE_PRODUCTIVITY_MAX_BODY_CHARS`
- `APPLE_PRODUCTIVITY_RETRIEVAL_CANDIDATE_LIMIT`
- `APPLE_PRODUCTIVITY_CONTEXT_TOP_K`
- `APPLE_PRODUCTIVITY_OSASCRIPT_TIMEOUT_MS` defaults to `60000`

The default write mode is `draft`, which prevents irreversible writes after
install. Use `confirm` when tools should ask by default and require
`confirm: true` for writes. Use `direct` only in a trusted local setup where
full write access is intended.

Mail delete means "move to Trash/Deleted Items", not permanent deletion.
Calendar delete removes the event or excludes the selected recurring occurrence,
and is always guarded by the same access mode.
