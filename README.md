# Apple Productivity Codex Plugin

Local Codex plugin for Apple Mail and Apple Reminders, with the shared bridge
ready for Apple Calendar next.

The plugin talks to local macOS apps without storing persistent Mail or
Reminders indexes. Mail currently uses JXA via `/usr/bin/osascript`; Reminders
uses a native Swift/EventKit helper. Retrieval is live and ephemeral.

## Tools

Mail tools cover account discovery, live search, RAG-style context retrieval,
reading, composing, sending, archiving, and moving messages to trash with
guarded writes.

Reminders tools cover list discovery, live search, reading, creating, updating,
completing/reopening, deleting, and moving reminders between lists. The
Swift/EventKit backend supports title, notes/body, due date, reminder alarms,
priority, URL, recurrence, and completion state. Tags, subtasks, and attachments
are intentionally unsupported until Apple exposes a stable local automation path
for them.

The first Reminders read/search/write on a Mac may trigger macOS Automation or
Reminders privacy prompts. If local Reminders is slow to authorize or sync,
increase `APPLE_PRODUCTIVITY_OSASCRIPT_TIMEOUT_MS`.

## Development

```bash
npm install
npm run build
npm run test
npm run smoke:mail
```

`npm run build` also compiles `plugins/apple-productivity/dist/reminders/reminders-helper`
from the Swift source.

## Safety

Write behavior is controlled by:

- `APPLE_PRODUCTIVITY_WRITE_MODE=draft|confirm|direct`
- `APPLE_PRODUCTIVITY_MAX_BODY_CHARS`
- `APPLE_PRODUCTIVITY_RETRIEVAL_CANDIDATE_LIMIT`
- `APPLE_PRODUCTIVITY_CONTEXT_TOP_K`
- `APPLE_PRODUCTIVITY_OSASCRIPT_TIMEOUT_MS`
- `APPLE_PRODUCTIVITY_DEFAULT_REMINDERS_LIST`

The default write mode is `draft`. Mail delete means "move to Trash/Deleted
Items", not permanent deletion. Reminders delete is a real reminder deletion and
is therefore guarded by the same write mode.
