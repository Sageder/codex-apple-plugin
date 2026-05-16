# Apple Productivity Codex Plugin

Local Codex plugin for Apple Mail, Apple Calendar, and Apple Reminders.

Mail currently talks to macOS through JXA via `/usr/bin/osascript`. Calendar
uses a local Swift/EventKit helper, and Reminders uses a native Swift/EventKit
helper. The plugin does not store persistent mail, calendar, or reminders
indexes; retrieval is live and ephemeral.

## Tools

Mail tools can list accounts, search/retrieve context, read selected messages,
compose drafts, send, archive, and delete by moving to Trash/Deleted Items.

Calendar tools can list EventKit-visible calendars, search events, read an event,
create events, update an event or recurring occurrence, delete an event or
recurring occurrence, and show an event in Calendar.app.

Reminders tools cover list discovery, live search, reading, creating, updating,
completing/reopening, deleting, and moving reminders between lists. The
Swift/EventKit backend supports title, notes/body, due date, reminder alarms,
priority, URL, recurrence, and completion state. Tags, subtasks, and attachments
are intentionally unsupported until Apple exposes a stable local automation path
for them.

Move/delete/archive/junk mail actions return stateless undo tokens. No local
move history database is stored.

The first Calendar or Reminders action on a Mac may trigger macOS privacy
prompts. If local Apple data is slow to authorize or sync, increase
`APPLE_PRODUCTIVITY_OSASCRIPT_TIMEOUT_MS`.

## Development

```bash
npm install
npm run build
npm run test
npm run smoke:mail
npm run smoke:calendar
```

`npm run build` also compiles `plugins/apple-productivity/dist/reminders/reminders-helper`
from the Swift source.

## Safety

Mail and Calendar share one access mode:

- `APPLE_PRODUCTIVITY_WRITE_MODE=draft|confirm|direct`
- `APPLE_PRODUCTIVITY_MAX_BODY_CHARS`
- `APPLE_PRODUCTIVITY_RETRIEVAL_CANDIDATE_LIMIT`
- `APPLE_PRODUCTIVITY_CONTEXT_TOP_K`
- `APPLE_PRODUCTIVITY_OSASCRIPT_TIMEOUT_MS` defaults to `60000`
- `APPLE_PRODUCTIVITY_DEFAULT_REMINDERS_LIST`

The default write mode is `draft`, which prevents irreversible writes after
install. Use `confirm` when tools should ask by default and require
`confirm: true` for writes. Use `direct` only in a trusted local setup where
full write access is intended.

Mail delete means "move to Trash/Deleted Items", not permanent deletion.
Calendar delete removes the event or excludes the selected recurring occurrence,
and is always guarded by the same access mode. Reminders delete is a real
reminder deletion and is therefore guarded by the same write mode.
